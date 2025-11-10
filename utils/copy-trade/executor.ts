/**
 * Copy Trade Executor
 * Executes trades on destination broker accounts when trades are detected on source accounts
 */

import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { ProjectXClient } from '@/utils/projectx/client';

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

interface BrokerConnection {
  id: string;
  broker_type: string;
  broker_account_name: string;
  api_key?: string;
  api_username?: string;
  api_secret?: string;
  api_service_type?: string;
  api_base_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  trading_account_id: string;
}

interface TradeExecution {
  symbol: string;
  side: 'BUY' | 'SELL' | 'long' | 'short';
  quantity: number;
  price?: number; // Optional for market orders, required for limit orders
  orderType?: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  stopPrice?: number; // Required for stop and stop-limit orders
  sourceOrderId?: string; // Source broker order ID for tracking cancellations
}

/**
 * Execute a copy trade on a destination broker account
 */
export async function executeCopyTrade(
  sourceTrade: TradeExecution,
  destinationConnection: BrokerConnection,
  multiplier: number
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    console.log('🚀 Executing copy trade:', {
      symbol: sourceTrade.symbol,
      side: sourceTrade.side,
      quantity: sourceTrade.quantity,
      multiplier,
      destinationAccount: destinationConnection.broker_account_name
    });

    // Calculate destination quantity with multiplier
    const destinationQuantity = Math.round(sourceTrade.quantity * multiplier);
    
    if (destinationQuantity <= 0) {
      return { success: false, error: 'Calculated quantity is 0 or negative' };
    }

    // Normalize side (BUY/SELL vs long/short)
    const normalizedSide = sourceTrade.side === 'BUY' || sourceTrade.side === 'long' ? 'BUY' : 'SELL';

    // Determine order type - preserve the source order type
    const orderType = sourceTrade.orderType || 'Market';

    // Execute based on broker type
    if (destinationConnection.broker_type === 'projectx') {
      return await executeProjectXOrder(
        destinationConnection,
        {
          symbol: sourceTrade.symbol,
          side: normalizedSide,
          quantity: destinationQuantity,
          price: sourceTrade.price,
          orderType: orderType,
          stopPrice: sourceTrade.stopPrice
        }
      );
    }

    return { success: false, error: `Unsupported broker type: ${destinationConnection.broker_type}` };
  } catch (error: any) {
    console.error('❌ Error executing copy trade:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Execute an order on ProjectX broker
 */
async function executeProjectXOrder(
  connection: BrokerConnection,
  order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    orderType?: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
    stopPrice?: number;
  }
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // Initialize ProjectX client
    const serviceType = (connection.api_service_type as 'topstepx' | 'alphaticks') || 'topstepx';
    
    let client: ProjectXClient;
    
    if (connection.api_key && connection.api_username) {
      client = new ProjectXClient(
        connection.api_key,
        connection.api_username,
        undefined,
        undefined,
        undefined,
        undefined,
        serviceType
      );
      
      if (connection.api_base_url) {
        client.setBaseUrl(connection.api_base_url);
      }
    } else if (connection.access_token) {
      client = new ProjectXClient(
        undefined,
        undefined,
        undefined,
        connection.access_token,
        connection.refresh_token || undefined,
        connection.token_expires_at ? new Date(connection.token_expires_at) : undefined
      );
    } else {
      return { success: false, error: 'No valid authentication for ProjectX connection' };
    }

    // Place order via ProjectX API
    // Note: We need to check the ProjectX Gateway API docs for the exact endpoint
    // Common patterns: POST /api/Order/place, POST /api/Order/submit, POST /api/Order/create
    const orderResult = await client.placeOrder({
      accountId: connection.broker_account_name,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      orderType: order.orderType || 'Market',
      price: order.price,
      stopPrice: order.stopPrice
    });

    if (orderResult.success) {
      console.log('✅ Order placed successfully:', orderResult.orderId);
      return { success: true, orderId: orderResult.orderId };
    } else {
      return { success: false, error: orderResult.error || 'Failed to place order' };
    }
  } catch (error: any) {
    console.error('❌ Error placing ProjectX order:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Process a new trade execution and copy it to destination accounts
 */
export async function processCopyTradeExecution(
  sourceAccountId: string,
  tradeExecution: TradeExecution,
  userId: string
): Promise<{ copied: number; errors: string[] }> {
  const supabase = getSupabaseAdmin();
  const result = { copied: 0, errors: [] as string[] };

  try {
    console.log('🔄 Processing copy trade execution:', {
      sourceAccountId,
      symbol: tradeExecution.symbol,
      side: tradeExecution.side,
      quantity: tradeExecution.quantity
    });

    // Get all active copy trade configs where this account is the source
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

    if (!configs || configs.length === 0) {
      console.log('ℹ️ No active copy trade configs found for this account');
      return result;
    }

    console.log(`📋 Found ${configs.length} active copy trade config(s)`);

    // Get destination broker connections
    const destinationAccountIds = configs
      .map((c: CopyTradeConfig) => c.destination_account_id)
      .filter((id: string) => id && id !== 'undefined' && id !== 'null'); // Filter out invalid IDs

    if (destinationAccountIds.length === 0) {
      console.error('❌ No valid destination account IDs found in configs');
      result.errors.push('No valid destination account IDs found');
      return result;
    }

    console.log(`🔍 Fetching destination accounts:`, destinationAccountIds);

    const { data: destinationAccounts, error: accountsError } = await supabase
      .from('trading_accounts' as any)
      .select('id')
      .in('id', destinationAccountIds);

    if (accountsError) {
      console.error('❌ Error fetching destination accounts:', accountsError);
      result.errors.push(`Failed to fetch destination accounts: ${accountsError.message}`);
      return result;
    }

    if (!destinationAccounts || destinationAccounts.length === 0) {
      console.error('❌ No destination accounts found');
      result.errors.push('No destination accounts found');
      return result;
    }

    const validAccountIds = destinationAccounts.map((acc: any) => acc.id).filter((id: any) => id);
    console.log(`✅ Found ${validAccountIds.length} destination account(s):`, validAccountIds);

    // Get broker connections for destination accounts
    const { data: brokerConnections, error: connectionsError } = await supabase
      .from('broker_connections' as any)
      .select('*')
      .in('trading_account_id', validAccountIds);

    if (connectionsError) {
      console.error('❌ Error fetching broker connections:', connectionsError);
      result.errors.push(`Failed to fetch broker connections: ${connectionsError.message}`);
      return result;
    }

    // Create a map of account ID to broker connection
    const connectionMap = new Map(
      (brokerConnections || []).map((conn: BrokerConnection) => [conn.trading_account_id, conn])
    );

    // Process each copy trade config
    for (const config of configs as CopyTradeConfig[]) {
      try {
        // Check filters
        if (!shouldExecuteCopyTrade(tradeExecution, config)) {
          console.log(`⏭️ Skipping copy trade execution due to filters:`, {
            configId: config.id,
            symbol: tradeExecution.symbol
          });
          continue;
        }

        const brokerConnection = connectionMap.get(config.destination_account_id);
        if (!brokerConnection) {
          console.log(`⏭️ No broker connection found for destination account ${config.destination_account_id}`);
          continue;
        }

        // Log the copy trade attempt
        const logId = await logCopyTradeExecution(
          supabase,
          userId,
          config.id,
          sourceAccountId,
          tradeExecution,
          config.destination_account_id,
          brokerConnection.id,
          config.multiplier,
          'pending'
        );

        // Execute the copy trade
        const executionResult = await executeCopyTrade(
          tradeExecution,
          brokerConnection,
          config.multiplier
        );

        // Update log with execution result
        if (logId) {
          await updateCopyTradeLog(
            supabase,
            logId,
            executionResult.success ? 'submitted' : 'error',
            executionResult.orderId,
            undefined,
            undefined,
            undefined,
            executionResult.error
          );
        }

        if (executionResult.success) {
          result.copied++;
          console.log(`✅ Successfully executed copy trade on ${brokerConnection.broker_account_name}`);
        } else {
          result.errors.push(
            `Failed to execute copy trade on ${brokerConnection.broker_account_name}: ${executionResult.error}`
          );
        }
      } catch (error: any) {
        console.error(`❌ Error processing copy config ${config.id}:`, error);
        result.errors.push(`Error processing config ${config.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in processCopyTradeExecution:', error);
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  console.log(`📊 Copy trade execution result:`, {
    copied: result.copied,
    errors: result.errors.length
  });

  return result;
}

/**
 * Check if a trade execution should be copied based on config filters
 */
function shouldExecuteCopyTrade(
  tradeExecution: TradeExecution,
  config: CopyTradeConfig
): boolean {
  // Symbol filters
  if (config.symbols && config.symbols.length > 0) {
    if (!config.symbols.includes(tradeExecution.symbol)) {
      return false;
    }
  }

  if (config.exclude_symbols && config.exclude_symbols.length > 0) {
    if (config.exclude_symbols.includes(tradeExecution.symbol)) {
      return false;
    }
  }

  // Note: RR filters can't be checked at execution time since we don't know the PnL yet
  // These will be checked when the trade is closed and synced

  return true;
}

/**
 * Log a copy trade execution attempt
 */
async function logCopyTradeExecution(
  supabase: any,
  userId: string,
  configId: string,
  sourceAccountId: string,
  tradeExecution: TradeExecution,
  destinationAccountId: string,
  brokerConnectionId: string,
  multiplier: number,
  status: string
): Promise<string | null> {
  try {
    const insertData: any = {
      user_id: userId,
      copy_trade_config_id: configId,
      source_account_id: sourceAccountId,
      source_symbol: tradeExecution.symbol,
      source_side: tradeExecution.side,
      source_quantity: tradeExecution.quantity,
      destination_account_id: destinationAccountId,
      destination_broker_connection_id: brokerConnectionId,
      destination_symbol: tradeExecution.symbol,
      destination_side: tradeExecution.side,
      destination_quantity: Math.round(tradeExecution.quantity * multiplier),
      multiplier: multiplier,
      order_status: status,
      order_type: tradeExecution.orderType || 'Market',
      order_price: tradeExecution.price || null,
    };

    // Store source order ID if available (for tracking cancellations)
    if (tradeExecution.sourceOrderId) {
      insertData.source_order_id = tradeExecution.sourceOrderId;
    }

    const { data, error } = await supabase
      .from('copy_trade_logs' as any)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error logging copy trade execution:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in logCopyTradeExecution:', error);
    return null;
  }
}

/**
 * Update a copy trade log
 */
async function updateCopyTradeLog(
  supabase: any,
  logId: string,
  status: string,
  orderId?: string,
  filledQuantity?: number,
  filledPrice?: number,
  filledAt?: Date,
  errorMessage?: string
): Promise<void> {
  try {
    const updateData: any = {
      order_status: status,
      updated_at: new Date().toISOString()
    };

    if (orderId) updateData.order_id = orderId;
    if (filledQuantity !== undefined) updateData.filled_quantity = filledQuantity;
    if (filledPrice !== undefined) updateData.filled_price = filledPrice;
    if (filledAt) updateData.filled_at = filledAt.toISOString();
    if (errorMessage) updateData.error_message = errorMessage;

    await supabase
      .from('copy_trade_logs' as any)
      .update(updateData)
      .eq('id', logId);
  } catch (error) {
    console.error('Error updating copy trade log:', error);
  }
}

