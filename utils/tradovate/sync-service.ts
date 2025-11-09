/**
 * Tradovate Sync Service
 * Syncs trades from Tradovate to the journal
 */

import { createClient } from '@/utils/supabase/server';
import { TradovateClient } from './client';
import type { TradeEntry } from '@/types/journal';

interface TradovateFill {
  id: number;
  accountId: number;
  contract: {
    symbol: string;
    name: string;
  };
  fillQuantity: number;
  fillPrice: number;
  fillTime: string;
  side: 'Buy' | 'Sell';
  realizedPnL: number;
  orderType: string;
  orderStatus: string;
}

interface SyncResult {
  success: boolean;
  tradesSynced: number;
  tradesSkipped: number;
  errors: string[];
}

/**
 * Map Tradovate fill to journal trade entry
 * Note: This is a simplified mapping. You may need to group fills into trades
 * based on your trading strategy (e.g., entry + exit = one trade)
 */
function mapTradovateFillToTrade(
  fill: TradovateFill,
  accountId: string,
  userId: string,
  fixedRisk: number
): Partial<TradeEntry> {
  // Determine direction
  const side = fill.side === 'Buy' ? 'long' : 'short';

  // Extract currency amounts from fill
  const entryPrice = fill.fillPrice;
  const exitPrice = fill.fillPrice; // For fills, entry and exit are the same
  const size = Math.abs(fill.fillQuantity);
  const pnlAmount = fill.realizedPnL || 0;

  // Calculate PnL percentage
  const pnlPercentage =
    entryPrice && size && entryPrice * size > 0
      ? (pnlAmount / (entryPrice * size)) * 100
      : null;

  // Calculate RR from PnL and fixed risk
  // RR = PnL / (Entry Price * Size * Fixed Risk %)
  let rr = null;
  if (fixedRisk > 0 && entryPrice && size && entryPrice * size > 0) {
    const riskAmount = entryPrice * size * (fixedRisk / 100);
    rr = riskAmount > 0 ? pnlAmount / riskAmount : null;
  }

  return {
    account_id: accountId,
    symbol: fill.contract.symbol,
    side: side,
    // Currency fields
    entry_price: entryPrice,
    exit_price: exitPrice,
    size: size,
    pnl_amount: pnlAmount,
    pnl_percentage: pnlPercentage,
    // RR fields
    rr: rr,
    status: 'closed',
    entry_date: fill.fillTime,
    exit_date: fill.fillTime,
    sync_source: 'tradovate',
    // Store Tradovate fill ID for deduplication
    broker_trade_id: `tradovate_${fill.id}`,
  };
}

/**
 * Sync trades from Tradovate for a specific account
 */
export async function syncTradovateTrades(
  tradovateAccountId: string,
  userId: string
): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = {
    success: true,
    tradesSynced: 0,
    tradesSkipped: 0,
    errors: [],
  };

  try {
    // Get broker connection from database
    const { data: tradovateConnection, error: connError } = await supabase
      .from('broker_connections' as any)
      .select('*')
      .eq('id', tradovateAccountId)
      .eq('user_id', userId)
      .eq('broker_type', 'tradovate')
      .single();

    if (connError || !tradovateConnection) {
      throw new Error('Tradovate connection not found');
    }

    // Initialize Tradovate client
    const client = new TradovateClient(
      tradovateConnection.access_token,
      tradovateConnection.refresh_token,
      new Date(tradovateConnection.token_expires_at)
    );

    // Get trading account to get fixed_risk
    const { data: tradingAccount, error: accountError } = await supabase
      .from('trading_accounts' as any)
      .select('fixed_risk')
      .eq('id', tradovateConnection.trading_account_id)
      .single();

    if (accountError || !tradingAccount) {
      throw new Error('Trading account not found');
    }

    const fixedRisk = tradingAccount.fixed_risk || 1; // Default to 1% if not set

    // Get Tradovate account ID (the actual account number from Tradovate)
    const tradovateAccountNumber = tradovateConnection.broker_account_name;

    // Get fills from last 30 days (or since last sync)
    const endTime = new Date();
    const startTime = tradovateConnection.last_sync_at
      ? new Date(tradovateConnection.last_sync_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Get all accounts to find the right one
    const accounts = await client.getAccounts();
    const account = accounts.find(
      (acc) => acc.name === tradovateAccountNumber || acc.id.toString() === tradovateAccountNumber
    );

    if (!account) {
      throw new Error('Tradovate account not found');
    }

    // Fetch fills from Tradovate
    const fills = await client.getFills(account.id, startTime, endTime);

    // Group fills into trades (simplified - you may need more sophisticated logic)
    // For now, we'll treat each fill as a separate trade entry
    const tradesToInsert: any[] = [];

    for (const fill of fills) {
      // Check if trade already exists (deduplication)
      const { data: existingTrade } = await supabase
        .from('trade_entries' as any)
        .select('id')
        .eq('broker_trade_id', `tradovate_${fill.id}`)
        .single();

      if (existingTrade) {
        result.tradesSkipped++;
        continue;
      }

      // Map fill to trade entry
      const tradeData = mapTradovateFillToTrade(
        fill,
        tradovateConnection.trading_account_id,
        userId,
        fixedRisk
      );

      tradesToInsert.push(tradeData);
    }

    // Insert trades in batch
    if (tradesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert(tradesToInsert);

      if (insertError) {
        result.errors.push(`Failed to insert trades: ${insertError.message}`);
        result.success = false;
      } else {
        result.tradesSynced = tradesToInsert.length;
      }
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
      .eq('id', tradovateAccountId);

    // Note: Token refresh is handled automatically by the client
    // The updated tokens are stored in the client instance
    // If you need to persist refreshed tokens, you can access them via the client
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
      .eq('id', tradovateAccountId);
  }

  return result;
}

