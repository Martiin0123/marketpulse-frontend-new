/**
 * Project X Sync Service
 * Syncs trades from Project X to the journal
 */

import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { ProjectXClient } from './client';
import type { TradeEntry } from '@/types/journal';

interface ProjectXTrade {
  id: string;
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedPrice: number;
  executedQuantity: number;
  timestamp: string;
  pnl: number;
  commission: number;
  status: string;
}

interface SyncResult {
  success: boolean;
  tradesSynced: number;
  tradesSkipped: number;
  errors: string[];
}

/**
 * Group individual executions into round-trip trades
 * ProjectX Gateway API may return executions (fills) that need to be grouped,
 * OR it may return completed trades with profitAndLoss already calculated.
 * 
 * Strategy:
 * 1. If an execution has profitAndLoss (PnL), use it as-is (it's a completed trade)
 * 2. Otherwise, group executions by matching entry/exit pairs
 */
function groupExecutionsIntoTrades(executions: ProjectXTrade[]): ProjectXTrade[] {
  // Sort executions by timestamp
  const sorted = [...executions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Separate executions that already have PnL (completed trades from API)
  // vs executions that need to be grouped
  const completedTradesFromAPI: ProjectXTrade[] = [];
  const executionsToGroup: ProjectXTrade[] = [];
  
  for (const exec of sorted) {
    // Check if this is a completed trade from the API
    // ProjectX API returns completed trades with:
    // - EntryPrice and ExitPrice (different values)
    // - PnL (profit and loss)
    // - Type (Long or Short)
    // - EnteredAt and ExitedAt (timestamps)
    
    // If it has PnL AND different entry/exit prices, it's a completed trade
    const hasDifferentPrices = exec.price !== exec.executedPrice && 
                               exec.executedPrice !== 0 && 
                               exec.price !== 0;
    
    // Also check if it has the Type field (indicates completed trade from API)
    const hasTypeField = (exec as any).tradeType || (exec as any).Type || (exec as any).type;
    
    // If it has Type field, it's definitely a completed trade from the API
    // Use it directly without grouping
    if (hasTypeField) {
      completedTradesFromAPI.push(exec);
    } else if (exec.pnl !== null && exec.pnl !== undefined && exec.pnl !== 0 && hasDifferentPrices) {
      // This is a completed trade with PnL AND separate entry/exit prices - use it as-is
      completedTradesFromAPI.push(exec);
    } else {
      // No Type field, no PnL, or same prices - this is just an execution that needs to be grouped
      executionsToGroup.push(exec);
    }
  }
  
  console.log(`📊 Grouping: ${completedTradesFromAPI.length} completed trades from API, ${executionsToGroup.length} executions to group`);
  
  // Log first completed trade to verify structure
  if (completedTradesFromAPI.length > 0) {
    const firstTrade = completedTradesFromAPI[0];
    console.log(`📋 First completed trade from API:`, {
      id: firstTrade.id,
      symbol: firstTrade.symbol,
      side: firstTrade.side,
      price: firstTrade.price,
      executedPrice: firstTrade.executedPrice,
      pnl: firstTrade.pnl,
      quantity: firstTrade.quantity,
      type: (firstTrade as any).Type || (firstTrade as any).type
    });
  }

  console.log(`📊 Grouping executions: ${completedTradesFromAPI.length} completed trades from API, ${executionsToGroup.length} executions to group`);

  // Group remaining executions by symbol
  const bySymbol = new Map<string, ProjectXTrade[]>();
  executionsToGroup.forEach((exec) => {
    if (!bySymbol.has(exec.symbol)) {
      bySymbol.set(exec.symbol, []);
    }
    bySymbol.get(exec.symbol)!.push(exec);
  });

  const completedTrades: ProjectXTrade[] = [...completedTradesFromAPI];

  // Process each symbol separately
  const symbolEntries = Array.from(bySymbol.entries());
  for (const [symbol, symbolExecutions] of symbolEntries) {
    // Track open positions using FIFO (First In, First Out) matching
    // Each position tracks: direction, entries, exits
    interface OpenPosition {
      direction: 'LONG' | 'SHORT';
      entries: ProjectXTrade[];
      exits: ProjectXTrade[];
    }
    
    const openPositions: OpenPosition[] = [];

    for (const exec of symbolExecutions) {
      const isBuy = exec.side === 'BUY';
      const isSell = exec.side === 'SELL';

      if (isBuy) {
        // BUY can be:
        // 1. Entry for a LONG position (if no open SHORT)
        // 2. Exit for a SHORT position (if open SHORT exists)
        
        // First, try to close an open SHORT position (FIFO)
        const openShortIndex = openPositions.findIndex(
          p => p.direction === 'SHORT' && p.entries.length > p.exits.length
        );
        
        if (openShortIndex >= 0) {
          // Close the SHORT position
          const position = openPositions[openShortIndex];
          position.exits.push(exec);
          
          // Check if fully closed
          const totalEntryQty = position.entries.reduce((sum, e) => sum + e.quantity, 0);
          const totalExitQty = position.exits.reduce((sum, e) => sum + e.quantity, 0);
          
          if (totalExitQty >= totalEntryQty) {
            // Position fully closed, create trade
            const trade = createTradeFromPosition(position, symbol, exec.accountId);
            completedTrades.push(trade);
            openPositions.splice(openShortIndex, 1);
          }
        } else {
          // No open SHORT - this is a new LONG entry
          openPositions.push({
            direction: 'LONG',
            entries: [exec],
            exits: []
          });
        }
      } else if (isSell) {
        // SELL can be:
        // 1. Entry for a SHORT position (if no open LONG)
        // 2. Exit for a LONG position (if open LONG exists)
        
        // First, try to close an open LONG position (FIFO)
        const openLongIndex = openPositions.findIndex(
          p => p.direction === 'LONG' && p.entries.length > p.exits.length
        );
        
        if (openLongIndex >= 0) {
          // Close the LONG position
          const position = openPositions[openLongIndex];
          position.exits.push(exec);
          
          // Check if fully closed
          const totalEntryQty = position.entries.reduce((sum, e) => sum + e.quantity, 0);
          const totalExitQty = position.exits.reduce((sum, e) => sum + e.quantity, 0);
          
          if (totalExitQty >= totalEntryQty) {
            // Position fully closed, create trade
            const trade = createTradeFromPosition(position, symbol, exec.accountId);
            completedTrades.push(trade);
            openPositions.splice(openLongIndex, 1);
          }
        } else {
          // No open LONG - this is a new SHORT entry
          openPositions.push({
            direction: 'SHORT',
            entries: [exec],
            exits: []
          });
        }
      }
    }

    // Handle any remaining open positions (incomplete trades)
    // For now, we'll skip them - they're not closed yet
    if (openPositions.length > 0) {
      console.log(`⚠️ ${openPositions.length} open positions remaining for ${symbol} (incomplete trades)`);
    }
  }

  return completedTrades;
}

/**
 * Create a completed trade from a position (entry + exit executions)
 */
function createTradeFromPosition(
  position: { entries: ProjectXTrade[]; exits: ProjectXTrade[] },
  symbol: string,
  accountId: string
): ProjectXTrade {
  // For individual executions, price is the execution/fill price
  // Calculate weighted average entry price from entry executions
  let totalEntryValue = 0;
  let totalEntryQty = 0;
  position.entries.forEach((e) => {
    // Use price as the execution price (it's the fill price for that execution)
    const execPrice = e.price || 0;
    totalEntryValue += execPrice * e.quantity;
    totalEntryQty += e.quantity;
  });
  const avgEntryPrice = totalEntryQty > 0 ? totalEntryValue / totalEntryQty : 0;

  // Calculate weighted average exit price from exit executions
  let totalExitValue = 0;
  let totalExitQty = 0;
  position.exits.forEach((e) => {
    // Use price as the execution price (it's the fill price for that execution)
    const execPrice = e.price || 0;
    totalExitValue += execPrice * e.quantity;
    totalExitQty += e.quantity;
  });
  const avgExitPrice = totalExitQty > 0 ? totalExitValue / totalExitQty : 0;

  // Determine direction based on first entry
  const direction = position.entries[0].side;
  const isLong = direction === 'BUY';

  // Calculate PnL
  // For LONG: PnL = (Exit Price - Entry Price) * Quantity
  // For SHORT: PnL = (Entry Price - Exit Price) * Quantity
  const quantity = Math.min(totalEntryQty, totalExitQty); // Use the smaller quantity
  
  // Try to use PnL from executions if available (sum all PnLs from entries and exits)
  // This is more accurate than calculating manually
  let pnl = 0;
  const totalPnLFromExecutions = 
    position.entries.reduce((sum, e) => sum + (e.pnl || 0), 0) +
    position.exits.reduce((sum, e) => sum + (e.pnl || 0), 0);
  
  if (totalPnLFromExecutions !== 0) {
    // Use PnL from API if available (more accurate)
    pnl = totalPnLFromExecutions;
  } else {
    // Calculate manually if API didn't provide PnL
    if (isLong) {
      pnl = (avgExitPrice - avgEntryPrice) * quantity;
    } else {
      pnl = (avgEntryPrice - avgExitPrice) * quantity;
    }
  }

  // Sum commissions
  const totalCommission = 
    position.entries.reduce((sum, e) => sum + (e.commission || 0), 0) +
    position.exits.reduce((sum, e) => sum + (e.commission || 0), 0);

  // Use entry timestamp for trade date
  const entryTimestamp = position.entries[0].timestamp;
  const exitTimestamp = position.exits[position.exits.length - 1].timestamp;

  // Create unique ID from all execution IDs
  const executionIds = [
    ...position.entries.map((e) => e.id),
    ...position.exits.map((e) => e.id)
  ].join('_');

  return {
    id: executionIds,
    accountId,
    symbol,
    side: isLong ? 'BUY' : 'SELL',
    quantity,
    price: avgEntryPrice,
    executedPrice: avgExitPrice,
    executedQuantity: quantity,
    timestamp: exitTimestamp, // Use exit timestamp as trade completion time
    pnl: pnl - totalCommission, // Net PnL after commissions
    commission: totalCommission,
    status: 'FILLED',
    // Add entry/exit timestamps for proper date mapping
    entryTimestamp,
    exitTimestamp
  } as ProjectXTrade & { entryTimestamp: string; exitTimestamp: string };
}

/**
 * Map Project X trade to journal trade entry
 */
function mapProjectXTradeToJournal(
  trade: ProjectXTrade,
  accountId: string,
  userId: string,
  fixedRisk: number
): Partial<TradeEntry> {
  // Determine direction
  const side = trade.side === 'BUY' ? 'long' : 'short';

  // Extract currency amounts
  // Use the exact entry/exit prices from the trade object
  // These should have been extracted from the API response in the client
  // trade.price = entry price, trade.executedPrice = exit price (from client mapping)
  let entryPrice = trade.price || 0;
  let exitPrice = trade.executedPrice || 0;
  
  // If exit price is 0 or same as entry, try to get it from executedPrice
  if (exitPrice === 0 || exitPrice === entryPrice) {
    exitPrice = trade.executedPrice || trade.price || 0;
  }
  
  const size = Math.abs(trade.executedQuantity || trade.quantity || 0);
  
  // PnL from ProjectX - this should be the profitAndLoss from the API
  // If it's a grouped trade, it will be calculated from the executions
  const pnlAmount = trade.pnl || 0;
  
  // Only calculate from PnL as a last resort if prices are still the same
  // This should rarely happen if the API provides proper entry/exit prices
  if (entryPrice === exitPrice && pnlAmount !== 0 && size > 0 && entryPrice > 0) {
    console.warn(`⚠️ Entry and exit prices are the same but PnL is ${pnlAmount}. API might not provide separate prices.`);
    
    // Calculate price difference from PnL as fallback
    const totalPriceDiff = Math.abs(pnlAmount / size);
    const halfDiff = totalPriceDiff / 2;
    const midpoint = entryPrice;
    
    if (side === 'long') {
      if (pnlAmount > 0) {
        entryPrice = midpoint - halfDiff;
        exitPrice = midpoint + halfDiff;
      } else {
        entryPrice = midpoint + halfDiff;
        exitPrice = midpoint - halfDiff;
      }
    } else {
      if (pnlAmount > 0) {
        entryPrice = midpoint + halfDiff;
        exitPrice = midpoint - halfDiff;
      } else {
        entryPrice = midpoint - halfDiff;
        exitPrice = midpoint + halfDiff;
      }
    }
    
    entryPrice = Math.round(entryPrice * 100) / 100;
    exitPrice = Math.round(exitPrice * 100) / 100;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Fallback: Calculated entry/exit from PnL:`, {
        originalPrice: midpoint,
        pnl: pnlAmount,
        size,
        entryPrice,
        exitPrice
      });
    }
  }
  
  // Log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Mapping trade:`, {
      symbol: trade.symbol,
      side: trade.side,
      entryPrice,
      exitPrice,
      size,
      pnl: pnlAmount,
      timestamp: trade.timestamp
    });
  }
  
  // Log in development to debug
  if (process.env.NODE_ENV === 'development' && pnlAmount === 0 && size > 0 && entryPrice > 0) {
    console.warn(`⚠️ PnL is 0 for trade:`, {
      pnl: trade.pnl,
      price: trade.price,
      executedPrice: trade.executedPrice,
      quantity: trade.quantity,
      executedQuantity: trade.executedQuantity,
      size,
      entryPrice,
      exitPrice
    });
  }

  // Parse timestamp - handle various date formats from ProjectX API
  let tradeDate: Date;
  try {
    if (trade.timestamp) {
      // Check if it's already a valid ISO string
      tradeDate = new Date(trade.timestamp);
      
      // Validate date - must be valid and not epoch (1970)
      if (isNaN(tradeDate.getTime()) || tradeDate.getTime() <= 0) {
        console.warn(`Invalid date format: ${trade.timestamp}, using current date`);
        tradeDate = new Date();
      } else {
        // Log successful date parsing in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Parsed date: ${trade.timestamp} -> ${tradeDate.toISOString()}`);
        }
      }
    } else {
      console.warn('No timestamp in trade, using current date');
      tradeDate = new Date();
    }
  } catch (error) {
    console.warn('Error parsing trade date:', error);
    tradeDate = new Date();
  }

  // Parse entry and exit dates separately if available
  // ProjectX API provides EnteredAt and ExitedAt for completed trades
  let entryDate: Date;
  let exitDate: Date;
  
  try {
    // Check for EnteredAt/ExitedAt from API (for completed trades)
    // These should be stored in the trade object from the client
    const tradeAny = trade as any;
    const entryTimestamp = tradeAny.enteredAt || tradeAny.EnteredAt || tradeAny.entryTimestamp || trade.timestamp;
    const exitTimestamp = tradeAny.exitedAt || tradeAny.ExitedAt || tradeAny.exitTimestamp || trade.timestamp;
    
    entryDate = new Date(entryTimestamp);
    exitDate = new Date(exitTimestamp);
    
    // Validate dates
    if (isNaN(entryDate.getTime()) || entryDate.getTime() <= 0) {
      entryDate = new Date(trade.timestamp);
    }
    if (isNaN(exitDate.getTime()) || exitDate.getTime() <= 0) {
      exitDate = new Date(trade.timestamp);
    }
  } catch (error) {
    entryDate = new Date(trade.timestamp);
    exitDate = new Date(trade.timestamp);
  }

  // Format dates as ISO strings for database
  const entryDateString = entryDate.toISOString();
  const exitDateString = exitDate.toISOString();

  // Calculate PnL percentage based on entry price and size
  // PnL % = (PnL / Cost Basis) * 100
  // Cost Basis = Entry Price * Size
  let pnlPercentage = null;
  const costBasis = entryPrice * size;
  if (costBasis > 0 && pnlAmount !== 0) {
    pnlPercentage = (pnlAmount / costBasis) * 100;
  } else if (costBasis > 0 && pnlAmount === 0) {
    pnlPercentage = 0;
  }
  
  // Log calculation in development
  if (process.env.NODE_ENV === 'development' && costBasis > 0) {
    console.log(`📊 PnL Calculation: PnL=${pnlAmount}, CostBasis=${costBasis}, Percentage=${pnlPercentage}%`);
  }

  // Calculate RR from PnL and fixed risk
  // RR = PnL / Risk, where Risk = Entry Price * Size * (Fixed Risk % / 100)
  let rr: number | null = null;
  if (fixedRisk > 0 && entryPrice && size && entryPrice * size > 0) {
    const riskAmount = entryPrice * size * (fixedRisk / 100);
    if (riskAmount > 0) {
      rr = pnlAmount / riskAmount;
    }
  }

  return {
    account_id: accountId,
    symbol: trade.symbol,
    side: side,
    // Currency fields
    entry_price: entryPrice,
    exit_price: exitPrice,
    pnl_amount: pnlAmount,
    pnl_percentage: pnlPercentage ?? undefined,
    // RR fields
    rr: rr ?? undefined,
    status: 'closed',
    entry_date: entryDateString, // Use entry date
    exit_date: exitDateString, // Use exit date
    sync_source: 'projectx',
    // Store Project X trade ID for deduplication
    broker_trade_id: `projectx_${trade.id}`,
    // Size field (database has this column even if TypeScript type doesn't)
    size: size,
  } as any;
}

/**
 * Update account statistics after syncing trades
 * Updates account name from broker connection and recalculates stats
 */
async function updateAccountStats(
  accountId: string,
  brokerAccountName: string | null,
  supabase: any
): Promise<void> {
  try {
    // Get all closed trades for this account
    const { data: trades, error: tradesError } = await supabase
      .from('trade_entries' as any)
      .select('rr, pnl_amount, entry_date')
      .eq('account_id', accountId)
      .eq('status', 'closed')
      .order('entry_date', { ascending: true });

    if (tradesError) {
      console.error('Error fetching trades for account stats:', tradesError);
      return;
    }

    // Calculate stats
    const totalTrades = trades?.length || 0;
    
    // Calculate total RR (sum of all RR values)
    const totalRR = trades?.reduce((sum: number, trade: any) => {
      return sum + (trade.rr || 0);
    }, 0) || 0;

    // Calculate total PnL (sum of all PnL amounts)
    const totalPnL = trades?.reduce((sum: number, trade: any) => {
      return sum + (trade.pnl_amount || 0);
    }, 0) || 0;

    // Get current account
    const { data: account, error: accountError } = await supabase
      .from('trading_accounts' as any)
      .select('initial_balance, currency, name')
      .eq('id', accountId)
      .single();

    if (accountError) {
      console.error('Error fetching account:', accountError);
      return;
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update account name from broker connection if provided and different
    if (brokerAccountName && brokerAccountName !== account.name) {
      updateData.name = brokerAccountName;
    }

    // Update account
    const { error: updateError } = await supabase
      .from('trading_accounts' as any)
      .update(updateData)
      .eq('id', accountId);

    if (updateError) {
      console.error('Error updating account stats:', updateError);
    } else {
      const nameUpdate = brokerAccountName && brokerAccountName !== account.name 
        ? ` (name updated to: ${brokerAccountName})` 
        : '';
      console.log(`✅ Updated account stats: ${totalTrades} trades, ${totalRR >= 0 ? '+' : ''}${totalRR.toFixed(2)}R, ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ${account?.currency || 'USD'}${nameUpdate}`);
    }
  } catch (error) {
    console.error('Error in updateAccountStats:', error);
  }
}

/**
 * Sync trades from Project X for a specific account
 */
export async function syncProjectXTrades(
  brokerConnectionId: string,
  userId: string
): Promise<SyncResult> {
  // Use admin client for server-side operations to bypass RLS
  // This is safe because we verify the connection belongs to the user before calling this
  const supabase = getSupabaseAdmin();
  const result: SyncResult = {
    success: true,
    tradesSynced: 0,
    tradesSkipped: 0,
    errors: [],
  };

  try {
    // Get broker connection from database
    const { data: connection, error: connError } = await supabase
      .from('broker_connections' as any)
      .select('*')
      .eq('id', brokerConnectionId)
      .eq('user_id', userId)
      .eq('broker_type', 'projectx')
      .single();
    
    // Type cast to avoid TypeScript errors
    const conn = connection as any;

    if (connError || !conn) {
      throw new Error('Project X connection not found');
    }

    // Initialize Project X client (support both API key and OAuth)
    const authMethod = conn.auth_method || 'api_key';
    let client: ProjectXClient;
    
    if (authMethod === 'api_key' && conn.api_key) {
      // Project X: username + API key (no secret)
      const serviceType = (conn.api_service_type as 'topstepx' | 'alphaticks') || 'topstepx';
      if (conn.api_username) {
        client = new ProjectXClient(
          conn.api_key,
          conn.api_username,
          undefined,
          undefined,
          undefined,
          undefined,
          serviceType
        );
        
        // Override base URL if custom URL is stored (handle case where column might not exist)
        if (conn.api_base_url) {
          client.setBaseUrl(conn.api_base_url);
        }
      } else if (conn.api_secret) {
        // Backward compatibility: API key + secret
        client = new ProjectXClient(
          conn.api_key,
          undefined,
          conn.api_secret,
          undefined,
          undefined,
          undefined,
          serviceType
        );
      } else {
        throw new Error('Project X requires username and API key');
      }
    } else if (conn.access_token) {
      // Use OAuth authentication
      client = new ProjectXClient(
        undefined,
        undefined,
        undefined,
        conn.access_token,
        conn.refresh_token,
        conn.token_expires_at ? new Date(conn.token_expires_at) : undefined
      );
    } else {
      throw new Error('No valid authentication method found for Project X connection');
    }

    // Get trading account to get fixed_risk
    const { data: tradingAccount, error: accountError } = await supabase
      .from('trading_accounts' as any)
      .select('fixed_risk')
      .eq('id', conn.trading_account_id)
      .single();

    if (accountError || !tradingAccount) {
      throw new Error('Trading account not found');
    }

    const fixedRisk = (tradingAccount as any).fixed_risk || 1; // Default to 1% if not set

    // Get Project X account ID
    const projectXAccountId = conn.broker_account_name;

    // Get trades - for first sync, fetch ALL historical trades
    // For subsequent syncs, only fetch since last sync
    const endTime = new Date();
    const startTime = conn.last_sync_at
      ? new Date(conn.last_sync_at)
      : new Date(0); // Start from epoch (1970) to get ALL historical trades on first sync

    // Fetch executions from Project X
    const executions = await client.getTrades(projectXAccountId, startTime, endTime);
    
    console.log(`📥 Fetched ${executions.length} items from ProjectX API`);

    // Group executions into round-trip trades
    // ProjectX returns individual executions (fills), not completed trades
    // We need to match entry and exit executions to form complete trades
    const groupedTrades = groupExecutionsIntoTrades(executions);
    
    console.log(`✅ Grouped into ${groupedTrades.length} completed trades (from ${executions.length} executions)`);

    // Map and insert trades
    // IMPORTANT: This sync only ADDS new trades. It never deletes or modifies existing trades.
    // Existing trades are identified by broker_trade_id and skipped.
    const tradesToInsert: any[] = [];

    for (const trade of groupedTrades) {
      // Check if trade already exists (deduplication)
      // We use broker_trade_id to identify trades that were already synced
      const { data: existingTrade } = await supabase
        .from('trade_entries' as any)
        .select('id')
        .eq('broker_trade_id', `projectx_${trade.id}`)
        .single();

      if (existingTrade) {
        // Trade already exists - skip it (never delete or modify)
        result.tradesSkipped++;
        continue;
      }

      // Map trade to journal entry
      const tradeData = mapProjectXTradeToJournal(
        trade,
        conn.trading_account_id,
        userId,
        fixedRisk
      );

      tradesToInsert.push(tradeData);
    }

    // Insert trades in batch
    if (tradesToInsert.length > 0) {
      console.log(`💾 Inserting ${tradesToInsert.length} completed trades into database`);
      
      // Log sample of what we're inserting
      if (tradesToInsert.length > 0) {
        console.log(`📋 Sample trade being inserted:`, {
          symbol: tradesToInsert[0].symbol,
          side: tradesToInsert[0].side,
          entry_price: tradesToInsert[0].entry_price,
          exit_price: tradesToInsert[0].exit_price,
          pnl_amount: tradesToInsert[0].pnl_amount,
          rr: tradesToInsert[0].rr,
          status: tradesToInsert[0].status,
          broker_trade_id: tradesToInsert[0].broker_trade_id
        });
      }
      
      const { error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert(tradesToInsert);

      if (insertError) {
        result.errors.push(`Failed to insert trades: ${insertError.message}`);
        result.success = false;
      } else {
        result.tradesSynced = tradesToInsert.length;
        console.log(`✅ Successfully inserted ${result.tradesSynced} trades`);
      }
    } else {
      console.log(`ℹ️ No new trades to insert (all ${groupedTrades.length} trades already exist)`);
    }

    // Update last sync time
    await supabase
      .from('broker_connections' as any)
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.success ? 'success' : 'error',
        last_sync_error: result.errors.length > 0 ? result.errors.join('; ') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brokerConnectionId);

    // Update account stats after sync (even if no new trades, to refresh stats)
    if (result.success) {
      await updateAccountStats(
        conn.trading_account_id,
        conn.broker_account_name || null,
        supabase
      );
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message || 'Unknown error');
    
    // Update sync status
    await supabase
      .from('broker_connections' as any)
      .update({
        last_sync_status: 'error',
        last_sync_error: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', brokerConnectionId);
  }

  return result;
}

