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
 * TopStep API returns individual executions (fills) with PnL already calculated.
 * 
 * KEY INSIGHT: 
 * - PnL = 0 means this execution OPENED a position
 * - PnL != 0 means this execution CLOSED a position (partial or full)
 * - Multiple closes can belong to the same opening position
 * 
 * LOGIC:
 * 1. Sort all executions by timestamp
 * 2. Group by symbol
 * 3. For each symbol, track open positions:
 *    - When PnL = 0: This opens a new position (BUY = LONG, SELL = SHORT)
 *    - When PnL != 0: This closes an existing position (BUY closes SHORT, SELL closes LONG)
 * 4. Match closes to opens using FIFO
 * 5. Create a trade when a position is fully closed (sum of closes >= sum of opens)
 */
/**
 * Calculate signed quantity from a fill
 * side: 0 = BUY (long/cover) → positive
 * side: 1 = SELL (short) → negative
 */
function signedQty(exec: ProjectXTrade): number {
  // Get quantity (might be quantity or size field)
  const qty = exec.quantity || (exec as any).size || 0;
  
  // Map side to signed quantity
  // side: 0 = BUY (long/cover) → positive
  // side: 1 = SELL (short) → negative
  // Also handle string values 'BUY'/'SELL'
  const sideNum = exec.side === 'BUY' ? 0 : 
                  exec.side === 'SELL' ? 1 : 
                  (exec as any).side;
  
  return sideNum === 0 ? qty : -qty;
}

function groupExecutionsIntoTrades(executions: ProjectXTrade[]): ProjectXTrade[] {
  if (executions.length === 0) {
    return [];
  }

  // Group by (accountId, symbol)
  const byAccountSymbol = new Map<string, ProjectXTrade[]>();
  executions.forEach((exec) => {
    const key = `${exec.accountId}_${exec.symbol}`;
    if (!byAccountSymbol.has(key)) {
      byAccountSymbol.set(key, []);
    }
    byAccountSymbol.get(key)!.push(exec);
  });

  const completedTrades: ProjectXTrade[] = [];

  // Process each (accountId, symbol) separately
  const accountSymbolEntries = Array.from(byAccountSymbol.entries());
  for (const [key, fills] of accountSymbolEntries) {
    const [accountId, symbol] = key.split('_');
    
    // Sort by creationTimestamp (and id as tiebreaker)
    const sorted = [...fills].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      // Use id as tiebreaker
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idA - idB;
    });

    interface CurrentTrade {
      direction: 'LONG' | 'SHORT';
      qtyOpen: number;
      entryNotional: number;
      exitNotional: number;
      realizedPnL: number;
      totalFees: number;
      openTime: string;
      closeTime: string;
      fillIds: string[];
      entries: ProjectXTrade[];
      exits: ProjectXTrade[];
    }

    let current: CurrentTrade | null = null;
    let netPos = 0;
    let tradeCounter = 1;

    for (const f of sorted) {
      // Skip voided fills
      if ((f as any).voided) continue;

      const qty = signedQty(f); // buy=+, sell=-
      let remaining = qty;

      while (remaining !== 0) {
        // flat -> new trade
        if (netPos === 0) {
          const dir = remaining > 0 ? 'LONG' : 'SHORT';
          current = {
            direction: dir,
            qtyOpen: 0,
            entryNotional: 0,
            exitNotional: 0,
            realizedPnL: 0,
            totalFees: 0,
            openTime: f.timestamp,
            closeTime: f.timestamp,
            fillIds: [],
            entries: [],
            exits: []
          };
        }

        if (!current) throw new Error('Current trade missing');

        const sameDirection =
          (netPos >= 0 && remaining > 0) || (netPos <= 0 && remaining < 0);

        // Add to position (opening / scaling in)
        if (sameDirection || netPos === 0) {
          const openQty = remaining;
          current.qtyOpen += Math.abs(openQty);
          current.entryNotional += Math.abs(openQty) * f.price;
          current.totalFees += f.commission || 0;
          current.fillIds.push(f.id);
          current.entries.push(f);
          netPos += openQty;
          remaining = 0;
          current.closeTime = f.timestamp;
        } else {
          // This fill is (partially) closing)
          const closeQty = Math.min(Math.abs(remaining), Math.abs(netPos));
          const closeSign = remaining > 0 ? 1 : -1; // buy closes short, sell closes long

          current.exitNotional += closeQty * f.price;
          current.totalFees += (f.commission || 0) * (closeQty / Math.abs(qty));
          current.fillIds.push(f.id);
          current.exits.push(f);
          netPos += closeSign * closeQty;
          remaining -= closeSign * closeQty;
          current.closeTime = f.timestamp;

          // if flat -> finalize this trade
          if (netPos === 0) {
            const finalQty = current.qtyOpen;
            const avgEntry = current.entryNotional / finalQty;
            const avgExit = current.exitNotional / finalQty;
            
            // Calculate realized PnL from API (sum of PnL from exit fills)
            const realizedPnL = current.exits.reduce((sum, e) => sum + (e.pnl || 0), 0);
            
            // Create completed trade
            const trade = createTradeFromPosition(
              { entries: current.entries, exits: current.exits },
              symbol,
              accountId
            );
            
            // Override with calculated values (but preserve exitLevels)
            trade.price = avgEntry;
            trade.executedPrice = avgExit;
            trade.quantity = finalQty;
            trade.executedQuantity = finalQty;
            trade.pnl = realizedPnL - current.totalFees;
            trade.commission = current.totalFees;
            trade.timestamp = current.closeTime;
            // exitLevels should already be set by createTradeFromPosition if exits.length > 1
            
            completedTrades.push(trade);
            current = null;
          }
        }
      }
    }

    // Log any remaining open position (incomplete trade)
    if (current && netPos !== 0) {
      console.log(`⚠️ Incomplete trade for ${symbol}: ${current.direction} ${current.qtyOpen} qty, netPos=${netPos}`);
    }
  }

  console.log(`✅ Created ${completedTrades.length} completed trades from ${executions.length} executions`);
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
  // TopStep API already provides PnL on each closing execution
  // Sum all the PnL from exit executions (this is the actual PnL from the broker)
  const quantity = Math.min(totalEntryQty, totalExitQty); // Use the smaller quantity
  
  // Sum PnL from all exit executions (this is what TopStep calculated)
  // This is more accurate than calculating from prices
  const totalPnLFromExits = position.exits.reduce((sum, e) => sum + (e.pnl || 0), 0);
  
  // Also calculate from price difference as a sanity check
  let calculatedPnL = 0;
  if (isLong) {
    calculatedPnL = (avgExitPrice - avgEntryPrice) * quantity;
  } else {
    calculatedPnL = (avgEntryPrice - avgExitPrice) * quantity;
  }
  
  // Use the PnL from exits (broker's calculation) as it's more accurate
  const pnl = totalPnLFromExits;
  
  // Log calculation for debugging (only if there's a significant difference)
  const pnlDifference = Math.abs(totalPnLFromExits - calculatedPnL);
  if (pnlDifference > 10) { // Only log if difference is significant
    console.log(`⚠️ PnL mismatch for ${isLong ? 'LONG' : 'SHORT'}: API=${totalPnLFromExits}, Calculated=${calculatedPnL}, Diff=${pnlDifference}`);
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

  // Store exit levels information for display
  // Each exit represents a partial exit (can be profit or loss)
  // Only create exitLevels if there are multiple exits (multiple partial exits)
  const exitLevels = position.exits.length > 1 
    ? position.exits.map((exit, index) => ({
        level: index + 1,
        quantity: exit.quantity,
        price: exit.price,
        pnl: exit.pnl || 0,
        timestamp: exit.timestamp,
        commission: exit.commission || 0
      }))
    : undefined;

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
    status: 'FILLED', // Always mark grouped trades as FILLED (they're completed)
    // Add entry/exit timestamps for proper date mapping
    entryTimestamp,
    exitTimestamp,
    // Store exit levels for display in UI
    exitLevels
  } as ProjectXTrade & { entryTimestamp: string; exitTimestamp: string; exitLevels: Array<{ level: number; quantity: number; price: number; pnl: number; timestamp: string; commission: number }> };
}

/**
 * Map Project X trade to journal trade entry
 */
function mapProjectXTradeToJournal(
  trade: ProjectXTrade,
  accountId: string,
  userId: string,
  riskPerR: number
): Partial<TradeEntry> {
  // Determine direction
  const side = trade.side === 'BUY' ? 'long' : 'short';

  // Extract currency amounts
  // For grouped trades, price = weighted avg entry price, executedPrice = weighted avg exit price
  // For direct API trades, price = EntryPrice, executedPrice = ExitPrice
  let entryPrice = trade.price || 0;
  let exitPrice = trade.executedPrice || 0;
  
  const size = Math.abs(trade.executedQuantity || trade.quantity || 0);
  
  // PnL from ProjectX - this should be the profitAndLoss from the API
  // For grouped trades, this is calculated in createTradeFromPosition
  // For direct API trades, this comes from the API
  let pnlAmount = trade.pnl || 0;
  
  // If PnL is 0 but we have different entry/exit prices, calculate it
  // This handles cases where the API doesn't provide PnL but we have prices
  if (pnlAmount === 0 && entryPrice !== exitPrice && entryPrice > 0 && exitPrice > 0 && size > 0) {
    const side = trade.side === 'BUY' ? 'long' : 'short';
    if (side === 'long') {
      pnlAmount = (exitPrice - entryPrice) * size;
    } else {
      pnlAmount = (entryPrice - exitPrice) * size;
    }
    console.log(`📊 Calculated PnL from prices: ${pnlAmount} (${side}, entry: ${entryPrice}, exit: ${exitPrice}, size: ${size})`);
  }
  
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

  // Calculate RR from PnL and risk_per_r
  // RR = PnL / risk_per_r
  let rr: number | null = null;
  if (riskPerR > 0 && pnlAmount !== 0) {
    rr = pnlAmount / riskPerR;
  }

  // Store exit levels in exit_levels field if multiple exits exist
  const tradeAny = trade as any;
  let exitLevels: Array<{ tp: number; qty: number; price: number; pnl: number; timestamp?: string }> | undefined = undefined;
  
  // Check if trade has exitLevels (from createTradeFromPosition)
  if (tradeAny.exitLevels && Array.isArray(tradeAny.exitLevels) && tradeAny.exitLevels.length > 1) {
    // Store exit levels as structured data
    exitLevels = tradeAny.exitLevels.map((level: any) => ({
      tp: level.level || level.tp || 0,
      qty: level.quantity || level.qty || 0,
      price: level.price || 0,
      pnl: level.pnl || 0,
      timestamp: level.timestamp
    }));
    
    // Log for debugging
    if (exitLevels) {
      console.log(`📊 Storing ${exitLevels.length} exit levels for trade ${trade.symbol}:`, exitLevels);
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
    // Store exit levels in dedicated field
    exit_levels: exitLevels ? JSON.stringify(exitLevels) : undefined,
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

    // Get trading account to get risk_per_r
    const { data: tradingAccount, error: accountError } = await supabase
      .from('trading_accounts' as any)
      .select('risk_per_r')
      .eq('id', conn.trading_account_id)
      .single();

    if (accountError || !tradingAccount) {
      throw new Error('Trading account not found');
    }

    const riskPerR = (tradingAccount as any).risk_per_r || 100; // Default $100 = 1R

    // Get Project X account ID
    const projectXAccountId = conn.broker_account_name;

    // Calculate date range for sync
    // Add 1 day buffer to endTime to ensure we get all trades including today
    const endTime = new Date();
    endTime.setHours(23, 59, 59, 999); // End of today to include all trades
    
    // Determine start time based on last sync
    // If first sync, fetch from 30 days ago to get recent trades
    // If not first sync, fetch from 7 days before last sync to catch any missed trades
    let startTime: Date;
    if (!conn.last_sync_at) {
      // First sync: fetch last 30 days of trades
      startTime = new Date();
      startTime.setDate(startTime.getDate() - 30);
      startTime.setHours(0, 0, 0, 0);
      console.log(`📅 First sync: fetching trades from last 30 days`);
    } else {
      // Subsequent sync: fetch from 7 days before last sync to catch any missed trades
      const lastSyncDate = new Date(conn.last_sync_at);
      startTime = new Date(lastSyncDate);
      startTime.setDate(startTime.getDate() - 7);
      startTime.setHours(0, 0, 0, 0);
      console.log(`📅 Incremental sync: fetching trades from 7 days before last sync`);
    }
    
    console.log(`📅 Date range for sync: ${startTime.toISOString()} to ${endTime.toISOString()}`);
    console.log(`📅 Last sync was: ${conn.last_sync_at ? new Date(conn.last_sync_at).toISOString() : 'Never (first sync)'}`);

    // Don't delete existing trades - only add new ones
    // We'll check for duplicates using broker_trade_id before inserting

    // Fetch executions from Project X
    const executions = await client.getTrades(projectXAccountId, startTime, endTime);
    
    console.log(`\n📥 ========== FETCHED EXECUTIONS FROM PROJECTX API ==========`);
    console.log(`Total executions fetched: ${executions.length}`);
    
    // Log EXACT structure of first 10 executions after mapping
    console.log(`\n📋 First 10 executions (after mapping to ProjectXTrade format):`);
    executions.slice(0, 10).forEach((exec: any, idx: number) => {
      console.log(`\n--- Execution ${idx + 1} ---`);
      console.log(`ID: ${exec.id}`);
      console.log(`Symbol: ${exec.symbol}`);
      console.log(`Side: ${exec.side}`);
      console.log(`Quantity: ${exec.quantity}`);
      console.log(`Price: ${exec.price}`);
      console.log(`ExecutedPrice: ${exec.executedPrice}`);
      console.log(`PnL: ${exec.pnl}`);
      console.log(`Commission: ${exec.commission}`);
      console.log(`Timestamp: ${exec.timestamp}`);
      console.log(`Status: ${exec.status}`);
      console.log(`EnteredAt: ${(exec as any).enteredAt || 'N/A'}`);
      console.log(`ExitedAt: ${(exec as any).exitedAt || 'N/A'}`);
      console.log(`TradeType: ${(exec as any).tradeType || 'N/A'}`);
      console.log(`Full object:`, JSON.stringify(exec, null, 2));
    });
    console.log(`\n📥 ========== END FETCHED EXECUTIONS ==========\n`);

    // Filter to only include filled/completed trades
    // Only process trades that are fully executed (status: 'FILLED', 'closed', or similar)
    const filledExecutions = executions.filter(exec => {
      const status = (exec.status || '').toUpperCase();
      // Include filled, closed, completed, or executed trades
      // Exclude pending, cancelled, rejected, etc.
      return status === 'FILLED' || 
             status === 'CLOSED' || 
             status === 'COMPLETED' || 
             status === 'EXECUTED' ||
             status === 'FILL' ||
             // If no status field, assume it's filled if it has PnL or different entry/exit prices
             (!status && (exec.pnl !== 0 || (exec.price !== exec.executedPrice && exec.executedPrice !== 0)));
    });
    
    const filteredCount = executions.length - filledExecutions.length;
    if (filteredCount > 0) {
      console.log(`🔍 Filtered out ${filteredCount} non-filled executions (status: pending, cancelled, etc.)`);
    }
    
    console.log(`✅ Processing ${filledExecutions.length} filled executions`);

    // Log summary of fetched executions
    const opens = filledExecutions.filter(e => e.pnl === 0 || e.pnl === null).length;
    const closes = filledExecutions.filter(e => e.pnl !== 0 && e.pnl !== null).length;
    console.log(`📊 Fetched ${filledExecutions.length} filled executions (${opens} opens, ${closes} closes)`);
    
    // Show date range of executions
    if (filledExecutions.length > 0) {
      const dates = filledExecutions.map(e => new Date(e.timestamp));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      console.log(`📅 Execution date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
      
      // Log November 7th executions specifically for debugging
      const nov7Executions = filledExecutions.filter(e => {
        const execDate = new Date(e.timestamp);
        return execDate.getFullYear() === 2025 && 
               execDate.getMonth() === 10 && // November (0-indexed)
               execDate.getDate() === 7;
      });
      if (nov7Executions.length > 0) {
        console.log(`📅 November 7th executions: ${nov7Executions.length} (${nov7Executions.filter(e => e.pnl === 0 || e.pnl === null).length} opens, ${nov7Executions.filter(e => e.pnl !== 0 && e.pnl !== null).length} closes)`);
        nov7Executions.slice(0, 10).forEach((e, idx) => {
          console.log(`  Nov7 ${idx + 1}: ${e.side} ${e.quantity} @ ${e.price}, PnL=${e.pnl}, time=${e.timestamp}`);
        });
      }
    }

    // Group executions into round-trip trades
    // TopStep API: PnL=0/null means opening, PnL!=0 means closing
    // Multiple closes can belong to the same opening position
    // The API returns individual executions, not completed trades, so we need to group them
    const groupedTrades = groupExecutionsIntoTrades(filledExecutions);
    
    // Use grouped trades as all trades (API doesn't return pre-completed trades)
    const allTrades = groupedTrades;
    
    // Log summary with date range
    if (allTrades.length > 0) {
      const tradeDates = allTrades.map(t => new Date(t.timestamp));
      const minTradeDate = new Date(Math.min(...tradeDates.map(d => d.getTime())));
      const maxTradeDate = new Date(Math.max(...tradeDates.map(d => d.getTime())));
      console.log(`✅ Created ${allTrades.length} trades from ${filledExecutions.length} executions`);
      console.log(`📅 Trade date range: ${minTradeDate.toISOString().split('T')[0]} to ${maxTradeDate.toISOString().split('T')[0]}`);
    } else {
      console.log(`⚠️ No trades created from ${filledExecutions.length} executions`);
    }

    // Map and insert trades
    // IMPORTANT: This sync only ADDS new trades. It never deletes or modifies existing trades.
    // Existing trades are identified by broker_trade_id and skipped.
    const tradesToInsert: any[] = [];

    for (const trade of allTrades) {
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
        riskPerR
      );

      tradesToInsert.push(tradeData);

      // Check if this is a new trade execution (not a completed trade) and trigger copy trade execution
      // Only trigger for opening executions (PnL = 0 or no PnL yet)
      if (!trade.pnl || trade.pnl === 0) {
        try {
          const { processCopyTradeExecution } = await import('@/utils/copy-trade/executor');
          await processCopyTradeExecution(
            conn.trading_account_id,
            {
              symbol: trade.symbol,
              side: trade.side,
              quantity: trade.quantity || (trade as any).size || 1,
              orderType: 'Market' // Default to market order for copy trades
            },
            userId
          );
        } catch (copyError) {
          // Don't fail the sync if copy execution fails
          console.error('Error executing copy trade:', copyError);
        }
      }
    }

    // Insert trades in batch
    if (tradesToInsert.length > 0) {
      console.log(`💾 Inserting ${tradesToInsert.length} completed trades into database`);
      
      
      const { error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert(tradesToInsert);

      if (insertError) {
        result.errors.push(`Failed to insert trades: ${insertError.message}`);
        result.success = false;
      } else {
        result.tradesSynced = tradesToInsert.length;
        console.log(`✅ Successfully inserted ${result.tradesSynced} trades`);
        
        // Copy trades to destination accounts if copy trade configs exist
        // Fetch the inserted trades to get their IDs, then copy them
        try {
          const { copyTradeToDestinationAccounts } = await import('@/utils/copy-trade/service');
          
          // Fetch the trades we just inserted (using broker_trade_id to identify them)
          const brokerTradeIds = tradesToInsert
            .map((t: any) => t.broker_trade_id)
            .filter((id: any) => id);
          
          if (brokerTradeIds.length > 0) {
            const { data: insertedTrades } = await supabase
              .from('trade_entries' as any)
              .select('*')
              .in('broker_trade_id', brokerTradeIds)
              .eq('account_id', conn.trading_account_id);
            
            if (insertedTrades && insertedTrades.length > 0) {
              let totalCopied = 0;
              for (const trade of insertedTrades) {
                const copyResult = await copyTradeToDestinationAccounts(
                  trade as any,
                  conn.trading_account_id,
                  userId
                );
                totalCopied += copyResult.copied;
                if (copyResult.errors.length > 0) {
                  console.warn('⚠️ Some copy trades failed:', copyResult.errors);
                }
              }
              if (totalCopied > 0) {
                console.log(`✅ Copied ${totalCopied} trades to destination accounts`);
              }
            }
          }
        } catch (copyError) {
          // Don't fail the sync if copy fails
          console.error('Error copying trades:', copyError);
        }
      }
    } else {
      console.log(`ℹ️ No new trades to insert (all ${filledExecutions.length} trades already exist)`);
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

