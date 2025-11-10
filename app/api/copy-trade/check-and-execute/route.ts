import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { ProjectXClient } from '@/utils/projectx/client';
import { processCopyTradeExecution } from '@/utils/copy-trade/executor';

/**
 * Check for new opening executions and execute copy trades in real-time
 * This endpoint should be polled frequently (every 5-10 seconds) from the frontend
 * POST /api/copy-trade/check-and-execute
 */
export async function POST(request: NextRequest) {
  console.log('🚀 Copy trade check-and-execute endpoint called');
  
  try {
    // Verify user is authenticated
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ User authenticated: ${user.id}`);

    const adminSupabase = getSupabaseAdmin();

    // Get all active copy trade configs for this user
    console.log('🔍 Fetching copy trade configs...');
    const { data: configs, error: configError } = await adminSupabase
      .from('copy_trade_configs' as any)
      .select('*, source_account:trading_accounts!copy_trade_configs_source_account_id_fkey(id, name)')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (configError) {
      console.error('❌ Error fetching configs:', configError);
    }

    if (configError || !configs || configs.length === 0) {
      console.log('⚠️ No active copy trade configurations found');
      return NextResponse.json({
        checked: 0,
        executed: 0,
        message: 'No active copy trade configurations found'
      });
    }

    console.log(`✅ Found ${configs.length} active copy trade config(s)`);

    // Get unique source account IDs
    const sourceAccountIds = [...new Set(configs.map((c: any) => c.source_account_id))];

    // Get broker connections for source accounts
    console.log(`🔍 Fetching broker connections for ${sourceAccountIds.length} source account(s)...`);
    const { data: brokerConnections, error: connError } = await adminSupabase
      .from('broker_connections' as any)
      .select('*')
      .in('trading_account_id', sourceAccountIds)
      .eq('broker_type', 'projectx');

    if (connError) {
      console.error('❌ Error fetching broker connections:', connError);
    }

    if (connError || !brokerConnections || brokerConnections.length === 0) {
      console.log('⚠️ No active broker connections found for source accounts');
      return NextResponse.json({
        checked: 0,
        executed: 0,
        message: 'No active broker connections found for source accounts'
      });
    }

    console.log(`✅ Found ${brokerConnections.length} active broker connection(s)`);

    let totalChecked = 0;
    let totalExecuted = 0;
    const errors: string[] = [];

    console.log(`\n🔍 Checking ${brokerConnections.length} broker connection(s) for new orders`);

    // Check each broker connection for new orders
    for (const conn of brokerConnections) {
      try {
        console.log(`\n📡 Processing broker connection: ${conn.broker_account_name} (Account ID: ${conn.trading_account_id})`);
        console.log(`   Connection details:`, {
          id: conn.id,
          broker_type: conn.broker_type,
          auth_method: conn.auth_method,
          api_service_type: conn.api_service_type,
          has_api_key: !!conn.api_key,
          has_api_username: !!conn.api_username
        });
        
        // Initialize ProjectX client
        const authMethod = conn.auth_method || 'api_key';
        const serviceType = (conn.api_service_type as 'topstepx' | 'alphaticks') || 'topstepx';
        
        let client: ProjectXClient;
        
        if (authMethod === 'api_key' && conn.api_key && conn.api_username) {
          client = new ProjectXClient(
            conn.api_key,
            conn.api_username,
            undefined,
            undefined,
            undefined,
            undefined,
            serviceType
          );
          
          if (conn.api_base_url) {
            client.setBaseUrl(conn.api_base_url);
          }
        } else if (conn.access_token) {
          client = new ProjectXClient(
            undefined,
            undefined,
            undefined,
            conn.access_token,
            conn.refresh_token || undefined,
            conn.token_expires_at ? new Date(conn.token_expires_at) : undefined
          );
        } else {
          console.log(`  ⚠️ Skipping connection - no valid authentication`);
          continue; // Skip if no valid auth
        }

        console.log(`  ✅ ProjectX client initialized successfully`);

        // Fetch recent orders for immediate detection
        // We check orders instead of executions to catch trades as soon as they're placed
        // Also check for cancelled orders
        console.log(`  🔍 Fetching orders for ${conn.broker_account_name}...`);
        
        // Fetch open orders (for new orders)
        const openOrders = await client.getOrders(
          conn.broker_account_name,
          'All' // Get all orders to catch new ones and cancelled ones
        );

        // Also try to fetch cancelled orders if the API supports it
        // For now, we'll check status in the openOrders response
        const orders = openOrders;

        console.log(`📊 Fetched ${orders.length} total order(s) from API`);

        // Log all orders for debugging
        if (orders.length > 0) {
          console.log(`📋 All orders received:`, orders.map((o: any) => ({
            id: o.id || o.orderId || o.order_id,
            symbol: o.symbol || o.contractName || o.contract_name,
            side: o.side || o.direction,
            quantity: o.quantity || o.size || o.qty,
            status: o.status || o.orderStatus || o.order_status,
            type: o.orderType || o.order_type || o.type
          })));
        }

        // Filter to only new/pending/submitted orders (not filled or cancelled)
        // These are orders that were just placed and need to be copied
        // ProjectX API: status 1 = Open, other numbers = different states
        const newOrders = orders.filter(order => {
          const status = order.status || order.orderStatus || order.order_status;
          
          // Handle numeric status (ProjectX format: 1 = Open)
          if (typeof status === 'number') {
            const isNew = status === 1; // 1 = Open order
            if (!isNew) {
              console.log(`  ⏭️ Filtered out order with numeric status: ${status}`);
            }
            return isNew;
          }
          
          // Handle string status
          const statusStr = (status || '').toString().toUpperCase();
          const isNew = statusStr === 'PENDING' || 
                        statusStr === 'SUBMITTED' || 
                        statusStr === 'NEW' ||
                        statusStr === 'OPEN' ||
                        statusStr === 'ACTIVE' ||
                        statusStr === 'WORKING' ||
                        statusStr === 'PARTIALLY_FILLED' ||
                        statusStr === '1' ||
                        !statusStr; // If no status, assume it's new
          
          if (!isNew) {
            console.log(`  ⏭️ Filtered out order with status: ${statusStr || status}`);
          }
          
          return isNew;
        });

        // Also check for cancelled orders (status changed from open to cancelled)
        // ProjectX API: status 3 = Cancelled (or check for cancelled status)
        const cancelledOrders = orders.filter(order => {
          const status = order.status || order.orderStatus || order.order_status;
          
          // Handle numeric status (ProjectX format: 3 = Cancelled)
          if (typeof status === 'number') {
            return status === 3; // 3 = Cancelled
          }
          
          // Handle string status
          const statusStr = (status || '').toString().toUpperCase();
          return statusStr === 'CANCELLED' || statusStr === 'CANCELED' || statusStr === '3';
        });

        console.log(`📈 Found ${newOrders.length} new order(s) (pending/submitted) and ${cancelledOrders.length} cancelled order(s) out of ${orders.length} total`);

        totalChecked += newOrders.length + cancelledOrders.length;

        console.log(`🔍 Checking ${newOrders.length} new order(s) and ${cancelledOrders.length} cancelled order(s) for account ${conn.broker_account_name}`);

        // Check each new order to see if it's already been processed
        for (const order of newOrders) {
          // ProjectX API format: id, contractId, side (0=BUY/Bid, 1=SELL/Ask), size, type, limitPrice, stopPrice
          const orderId = order.id || order.orderId || order.order_id || 'unknown';
          const orderSymbol = order.contractId || order.contract_id || order.symbol || order.contractName || order.contract_name || 'unknown';
          
          // Map side: 0 = BUY (Bid), 1 = SELL (Ask) - CORRECT ProjectX format
          let orderSide = 'unknown';
          if (order.side === 0 || order.side === '0' || order.side === 'BUY' || order.side === 'buy' || order.side === 'long' || order.side === 'Bid' || order.side === 'bid') {
            orderSide = 'BUY';
          } else if (order.side === 1 || order.side === '1' || order.side === 'SELL' || order.side === 'sell' || order.side === 'short' || order.side === 'Ask' || order.side === 'ask') {
            orderSide = 'SELL';
          } else if (order.direction) {
            orderSide = order.direction.toUpperCase();
          } else if (order.side) {
            orderSide = order.side.toString().toUpperCase();
          }
          
          const orderQty = order.size || order.quantity || order.qty || 1;
          
          // Map order type: type (number) or orderType (string)
          // ProjectX: type 4 = Stop, 1 = Market, 2 = Limit, etc.
          let orderType = 'Market';
          if (order.type === 4 || order.type === '4') {
            orderType = order.limitPrice ? 'StopLimit' : 'Stop';
          } else if (order.type === 2 || order.type === '2') {
            orderType = 'Limit';
          } else if (order.type === 1 || order.type === '1') {
            orderType = 'Market';
          } else if (order.orderType || order.order_type) {
            orderType = order.orderType || order.order_type;
          }
          
          const orderPrice = order.limitPrice || order.limit_price || order.price;
          const orderStopPrice = order.stopPrice || order.stop_price || order.triggerPrice || order.trigger_price;
          
          console.log(`  📋 Checking order: ${orderSymbol} ${orderSide} ${orderQty} (ID: ${orderId}, Type: ${orderType})`);

          // Check if this order was already processed (using maybeSingle to avoid errors)
          // We check by order ID from the broker
          const { data: existingLog, error: logError } = await adminSupabase
            .from('copy_trade_logs' as any)
            .select('id, order_status, created_at')
            .eq('source_account_id', conn.trading_account_id)
            .eq('source_symbol', orderSymbol)
            .eq('source_side', orderSide)
            .eq('source_quantity', orderQty)
            .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Check last minute
            .maybeSingle();

          if (logError) {
            console.warn(`  ⚠️ Error checking logs:`, logError);
          }

          // If it's a new order (not in logs), execute copy trade
          if (!existingLog) {
            console.log(`  🔄 NEW order detected: ${orderSymbol} ${orderSide} ${orderQty} (ID: ${orderId})`);

            console.log(`  🚀 Executing copy trade with params:`, {
              symbol: orderSymbol,
              side: orderSide,
              quantity: orderQty,
              orderType,
              price: orderPrice,
              stopPrice: orderStopPrice
            });

            // Execute copy trade for this source account
            const copyResult = await processCopyTradeExecution(
              conn.trading_account_id,
              {
                symbol: orderSymbol,
                side: orderSide,
                quantity: orderQty,
                orderType: orderType,
                price: orderPrice,
                stopPrice: orderStopPrice
              },
              user.id
            );

            if (copyResult.copied > 0) {
              totalExecuted += copyResult.copied;
              console.log(`  ✅ Executed ${copyResult.copied} copy trade(s) for ${orderSymbol}`);
            }
            if (copyResult.errors.length > 0) {
              console.error(`  ❌ Copy trade errors:`, copyResult.errors);
              errors.push(...copyResult.errors);
            }
          } else {
            console.log(`  ⏭️ Order already processed (status: ${existingLog.order_status})`);
          }
        }

        // Handle cancelled orders - cancel corresponding destination orders
        for (const order of cancelledOrders) {
          const orderId = order.id || order.orderId || order.order_id || 'unknown';
          const orderSymbol = order.contractId || order.contract_id || order.symbol || order.contractName || order.contract_name || 'unknown';
          
          // Extract side and quantity for matching
          // Map side: 0 = BUY (Bid), 1 = SELL (Ask) - CORRECT ProjectX format
          let orderSide = 'unknown';
          if (order.side === 0 || order.side === '0' || order.side === 'BUY' || order.side === 'buy' || order.side === 'long' || order.side === 'Bid' || order.side === 'bid') {
            orderSide = 'BUY';
          } else if (order.side === 1 || order.side === '1' || order.side === 'SELL' || order.side === 'sell' || order.side === 'short' || order.side === 'Ask' || order.side === 'ask') {
            orderSide = 'SELL';
          } else if (order.direction) {
            orderSide = order.direction.toUpperCase();
          } else if (order.side) {
            orderSide = order.side.toString().toUpperCase();
          }
          
          const orderQty = order.size || order.quantity || order.qty || 1;
          
          console.log(`  🚫 Checking for cancelled order: ${orderSymbol} ${orderSide} ${orderQty} (ID: ${orderId})`);

          // Find copy trade logs for this order that are still pending/submitted
          // Match by symbol, side, and quantity (since we don't have a direct source order ID)
          const { data: activeLogs, error: logsError } = await adminSupabase
            .from('copy_trade_logs' as any)
            .select('id, order_id, order_status, destination_broker_connection_id, source_side, source_quantity')
            .eq('source_account_id', conn.trading_account_id)
            .eq('source_symbol', orderSymbol)
            .in('order_status', ['pending', 'submitted'])
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

          if (logsError) {
            console.warn(`  ⚠️ Error checking logs for cancelled order:`, logsError);
            continue;
          }

          // Filter logs to match the cancelled order's side and quantity more closely
          // This helps when multiple orders exist for the same symbol
          const matchingLogs = activeLogs?.filter((log: any) => {
            // Try to match by side and quantity (within reasonable range)
            const sideMatch = log.source_side === orderSide || 
                             (orderSide === 'SELL' && (log.source_side === '0' || log.source_side === 'SELL')) ||
                             (orderSide === 'BUY' && (log.source_side === '1' || log.source_side === 'BUY'));
            const qtyMatch = Math.abs(Number(log.source_quantity) - Number(orderQty)) < 0.01; // Allow small floating point differences
            
            return sideMatch && qtyMatch;
          }) || [];

          if (logsError) {
            console.warn(`  ⚠️ Error checking logs for cancelled order:`, logsError);
            continue;
          }

          if (matchingLogs && matchingLogs.length > 0) {
            console.log(`  🔄 Found ${matchingLogs.length} active copy trade log(s) to cancel for order ${orderId}`);

            // Update logs to cancelled status
            for (const log of matchingLogs) {
              // Try to cancel the destination order if we have an order_id
              if (log.order_id && log.destination_broker_connection_id) {
                try {
                  // Get broker connection to cancel order
                  const { data: destConnection } = await adminSupabase
                    .from('broker_connections' as any)
                    .select('*')
                    .eq('id', log.destination_broker_connection_id)
                    .single();

                  if (destConnection && destConnection.broker_type === 'projectx') {
                    // Cancel order on destination broker
                    const { ProjectXClient } = await import('@/utils/projectx/client');
                    const serviceType = (destConnection.api_service_type as 'topstepx' | 'alphaticks') || 'topstepx';
                    
                    let client: any;
                    if (destConnection.api_key && destConnection.api_username) {
                      client = new ProjectXClient(
                        destConnection.api_key,
                        destConnection.api_username,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        serviceType
                      );
                      if (destConnection.api_base_url) {
                        client.setBaseUrl(destConnection.api_base_url);
                      }
                    }

                    if (client) {
                      // Cancel order (we'll need to implement cancelOrder method)
                      console.log(`  🚫 Attempting to cancel destination order ${log.order_id} on ${destConnection.broker_account_name}`);
                      // TODO: Implement cancelOrder method in ProjectXClient
                    }
                  }
                } catch (cancelError: any) {
                  console.warn(`  ⚠️ Error cancelling destination order:`, cancelError.message);
                }
              }

              // Update log status to cancelled
              await adminSupabase
                .from('copy_trade_logs' as any)
                .update({ 
                  order_status: 'cancelled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', log.id);

              console.log(`  ✅ Updated copy trade log ${log.id} to cancelled status`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error checking broker connection ${conn.id}:`, error);
        errors.push(`Error checking ${conn.broker_account_name}: ${error.message}`);
      }
    }

    console.log(`\n📊 Check-and-execute summary:`, {
      checked: totalChecked,
      executed: totalExecuted,
      errors: errors.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      checked: totalChecked,
      executed: totalExecuted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in check-and-execute:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check and execute copy trades' },
      { status: 500 }
    );
  }
}

