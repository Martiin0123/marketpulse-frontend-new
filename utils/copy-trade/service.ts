/**
 * Copy Trade Service
 * Handles automatic copying of trades between accounts based on copy trade configurations
 */

import { getSupabaseAdmin } from '@/utils/supabase/admin';
import type { TradeEntry } from '@/types/journal';

interface CopyTradeConfig {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  multiplier: number;
  enabled: boolean;
  min_rr?: number | null;
  max_rr?: number | null;
  symbols?: string[] | null;
  exclude_symbols?: string[] | null;
}

/**
 * Copy a trade to destination accounts based on active copy trade configurations
 * @param sourceTrade The trade to copy
 * @param sourceAccountId The account ID where the trade was created
 * @param userId The user ID who owns the trade
 */
export async function copyTradeToDestinationAccounts(
  sourceTrade: TradeEntry,
  sourceAccountId: string,
  userId: string
): Promise<{ copied: number; errors: string[] }> {
  console.log('🔄 Copy Trade Service Called:', {
    sourceTradeId: sourceTrade.id,
    sourceAccountId,
    userId,
    symbol: sourceTrade.symbol,
    side: sourceTrade.side,
    pnl: sourceTrade.pnl_amount,
    rr: sourceTrade.rr
  });

  const supabase = getSupabaseAdmin();
  const result = { copied: 0, errors: [] as string[] };

  try {
    // Get all active copy trade configs where this account is the source
    console.log('🔍 Fetching copy trade configs for account:', sourceAccountId);
    const { data: configs, error: configError } = await supabase
      .from('copy_trade_configs' as any)
      .select('*')
      .eq('source_account_id', sourceAccountId)
      .eq('enabled', true);

    if (configError) {
      console.error('❌ Error fetching copy trade configs:', configError);
      result.errors.push(`Failed to fetch copy trade configs: ${configError.message}`);
      return result;
    }

    console.log(`📋 Found ${configs?.length || 0} active copy trade config(s) for account ${sourceAccountId}`);

    if (!configs || configs.length === 0) {
      // No copy trade configs for this account
      console.log('ℹ️ No active copy trade configs found for this account');
      return result;
    }

    console.log('📋 Copy trade configs:', configs.map((c: CopyTradeConfig) => ({
      id: c.id,
      destination: c.destination_account_id,
      multiplier: c.multiplier,
      enabled: c.enabled
    })));

    // Get destination account details to calculate RR properly
    const destinationAccountIds = configs.map((c: CopyTradeConfig) => c.destination_account_id);
    const { data: destinationAccounts, error: accountsError } = await supabase
      .from('trading_accounts' as any)
      .select('id, risk_per_r, currency')
      .in('id', destinationAccountIds);

    if (accountsError || !destinationAccounts) {
      console.error('Error fetching destination accounts:', accountsError);
      result.errors.push(`Failed to fetch destination accounts: ${accountsError?.message || 'Unknown error'}`);
      return result;
    }

    // Create a map of account ID to account data
    const accountMap = new Map(
      destinationAccounts.map((acc: any) => [acc.id, acc])
    );

    // Process each copy trade config
    console.log(`🔄 Processing ${configs.length} copy trade config(s)...`);
    for (const config of configs as CopyTradeConfig[]) {
      try {
        console.log(`🔍 Processing config ${config.id}:`, {
          destination: config.destination_account_id,
          multiplier: config.multiplier,
          min_rr: config.min_rr,
          max_rr: config.max_rr,
          symbols: config.symbols,
          exclude_symbols: config.exclude_symbols
        });

        // Check filters
        if (!shouldCopyTrade(sourceTrade, config)) {
          console.log(`⏭️ Skipping trade copy due to filters:`, {
            tradeId: sourceTrade.id,
            configId: config.id,
            symbol: sourceTrade.symbol,
            rr: sourceTrade.rr,
            tradeRR: sourceTrade.rr,
            minRR: config.min_rr,
            maxRR: config.max_rr,
            allowedSymbols: config.symbols,
            excludedSymbols: config.exclude_symbols
          });
          continue;
        }

        console.log(`✅ Trade passed filters, proceeding with copy...`);

        const destinationAccount = accountMap.get(config.destination_account_id);
        if (!destinationAccount) {
          console.error(`❌ Destination account ${config.destination_account_id} not found`);
          result.errors.push(`Destination account ${config.destination_account_id} not found`);
          continue;
        }

        console.log(`📊 Destination account details:`, {
          accountId: destinationAccount.id,
          risk_per_r: destinationAccount.risk_per_r
        });

        // Create copied trade with multiplier applied
        console.log(`🔧 Creating copied trade with multiplier ${config.multiplier}x...`);
        const copiedTrade = createCopiedTrade(
          sourceTrade,
          config.destination_account_id,
          userId,
          config.multiplier,
          destinationAccount.risk_per_r || 100
        );

        console.log(`📝 Copied trade data:`, {
          symbol: copiedTrade.symbol,
          side: copiedTrade.side,
          size: copiedTrade.size,
          pnl_amount: copiedTrade.pnl_amount,
          rr: copiedTrade.rr,
          entry_price: copiedTrade.entry_price,
          exit_price: copiedTrade.exit_price
        });

        // Check if this trade was already copied (prevent duplicates)
        // We'll use a combination of source trade ID/broker_trade_id and config ID to identify copies
        const sourceIdentifier = sourceTrade.id || sourceTrade.broker_trade_id || 'unknown';
        const copyIdentifier = `copy_${sourceIdentifier}_${config.id}`;
        
        const { data: existingCopy } = await supabase
          .from('trade_entries' as any)
          .select('id')
          .eq('broker_trade_id', copyIdentifier)
          .single();

        if (existingCopy) {
          console.log(`⏭️ Trade already copied: ${copyIdentifier}`);
          continue;
        }

        // Insert the copied trade
        console.log(`💾 Inserting copied trade with identifier: ${copyIdentifier}`);
        const { error: insertError, data: insertedData } = await supabase
          .from('trade_entries' as any)
          .insert({
            ...copiedTrade,
            broker_trade_id: copyIdentifier, // Mark as a copied trade
            sync_source: 'copy_trade' // Indicate this is a copied trade
          })
          .select();

        if (insertError) {
          console.error(`❌ Error copying trade to account ${config.destination_account_id}:`, {
            error: insertError,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          result.errors.push(
            `Failed to copy trade to ${destinationAccount.id}: ${insertError.message}`
          );
        } else {
          result.copied++;
          console.log(`✅ Successfully copied trade ${sourceTrade.id} to account ${config.destination_account_id} with multiplier ${config.multiplier}x`, {
            insertedTradeId: insertedData?.[0]?.id,
            copyIdentifier
          });
        }
      } catch (error: any) {
        console.error(`Error processing copy config ${config.id}:`, error);
        result.errors.push(`Error processing config ${config.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in copyTradeToDestinationAccounts:', {
      error,
      message: error.message,
      stack: error.stack,
      sourceAccountId,
      userId
    });
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  console.log(`📊 Copy trade result:`, {
    copied: result.copied,
    errors: result.errors.length,
    errorMessages: result.errors
  });

  return result;
}

/**
 * Check if a trade should be copied based on config filters
 */
function shouldCopyTrade(trade: TradeEntry, config: CopyTradeConfig): boolean {
  // Check RR filters
  if (config.min_rr !== null && config.min_rr !== undefined) {
    if (trade.rr === null || trade.rr === undefined || trade.rr < config.min_rr) {
      return false;
    }
  }

  if (config.max_rr !== null && config.max_rr !== undefined) {
    if (trade.rr === null || trade.rr === undefined || trade.rr > config.max_rr) {
      return false;
    }
  }

  // Check symbol filters
  if (config.symbols && config.symbols.length > 0) {
    if (!config.symbols.includes(trade.symbol)) {
      return false;
    }
  }

  if (config.exclude_symbols && config.exclude_symbols.length > 0) {
    if (config.exclude_symbols.includes(trade.symbol)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a copied trade with multiplier applied
 */
function createCopiedTrade(
  sourceTrade: TradeEntry,
  destinationAccountId: string,
  userId: string,
  multiplier: number,
  destinationRiskPerR: number
): Partial<TradeEntry> {
  // Apply multiplier to size
  const copiedSize = (sourceTrade.size || 1) * multiplier;

  // Apply multiplier to PnL
  const copiedPnL = (sourceTrade.pnl_amount || 0) * multiplier;

  // Calculate RR for destination account
  // RR = PnL / risk_per_r
  const copiedRR = destinationRiskPerR > 0 ? copiedPnL / destinationRiskPerR : null;

  // Calculate PnL percentage (if entry price exists)
  let copiedPnLPercentage: number | null = null;
  if (sourceTrade.entry_price && sourceTrade.entry_price > 0) {
    const costBasis = sourceTrade.entry_price * copiedSize;
    if (costBasis > 0) {
      copiedPnLPercentage = (copiedPnL / costBasis) * 100;
    }
  }

  // Create the copied trade
  const copiedTrade: Partial<TradeEntry> = {
    account_id: destinationAccountId,
    user_id: userId,
    symbol: sourceTrade.symbol,
    side: sourceTrade.side,
    entry_date: sourceTrade.entry_date,
    exit_date: sourceTrade.exit_date,
    entry_price: sourceTrade.entry_price, // Price stays the same
    exit_price: sourceTrade.exit_price, // Price stays the same
    size: copiedSize,
    pnl_amount: copiedPnL,
    pnl_percentage: copiedPnLPercentage,
    rr: copiedRR,
    max_adverse: sourceTrade.max_adverse ? sourceTrade.max_adverse * multiplier : null,
    risk_multiplier: sourceTrade.risk_multiplier,
    status: sourceTrade.status,
    notes: sourceTrade.notes ? `[Copied] ${sourceTrade.notes}` : '[Copied trade]',
    image_url: sourceTrade.image_url,
    exit_levels: sourceTrade.exit_levels ? JSON.stringify(
      JSON.parse(sourceTrade.exit_levels as any).map((level: any) => ({
        ...level,
        qty: level.qty * multiplier,
        pnl: level.pnl * multiplier
      }))
    ) : null
  };

  return copiedTrade;
}

