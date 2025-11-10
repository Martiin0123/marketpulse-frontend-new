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
        console.log(`  🔍 Fetching open orders for ${conn.broker_account_name}...`);
        
        // Fetch currently open orders
        const currentOpenOrders = await client.getOrders(
          conn.broker_account_name,
          'All' // Get all orders
        );

        const orders = currentOpenOrders;

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

        // Filter to only open/pending/submitted orders (not filled or cancelled)
        // These are orders that are currently open and need to be tracked
        // ProjectX API: status 1 = Open, other numbers = different states
        const openOrders = orders.filter(order => {
          const status = order.status || order.orderStatus || order.order_status;
          
          // Handle numeric status (ProjectX format: 1 = Open)
          if (typeof status === 'number') {
            return status === 1; // 1 = Open order
          }
          
          // Handle string status
          const statusStr = (status || '').toString().toUpperCase();
          return statusStr === 'PENDING' || 
                        statusStr === 'SUBMITTED' || 
                        statusStr === 'NEW' ||
                        statusStr === 'OPEN' ||
                        statusStr === 'ACTIVE' ||
                        statusStr === 'WORKING' ||
                        statusStr === 'PARTIALLY_FILLED' ||
                        statusStr === '1' ||
                        !statusStr; // If no status, assume it's open
        });

        console.log(`📈 Found ${openOrders.length} currently open order(s) out of ${orders.length} total`);

        // Get previously tracked open orders for this account (from copy_trade_logs)
        // These are orders that we've seen before and should still be open
        const { data: trackedOpenOrders, error: trackedError } = await adminSupabase
          .from('copy_trade_logs' as any)
          .select('id, source_order_id, order_id, order_status, destination_broker_connection_id, destination_account_id')
          .eq('source_account_id', conn.trading_account_id)
          .in('order_status', ['pending', 'submitted'])
          .not('source_order_id', 'is', null)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        if (trackedError) {
          console.warn(`  ⚠️ Error fetching tracked orders:`, trackedError);
        }

        // Create a set of currently open order IDs from the API
        const currentOpenOrderIds = new Set(
          openOrders.map((o: any) => (o.id || o.orderId || o.order_id)?.toString()).filter(Boolean)
        );

        // Find orders that were tracked as open but are no longer in the open orders list
        // These orders were either filled or cancelled
        const missingOrders = (trackedOpenOrders || []).filter((log: any) => {
          const sourceOrderId = log.source_order_id?.toString();
          if (!sourceOrderId) return false;
          
          // Check if this order is still in the open orders list
          const stillOpen = currentOpenOrderIds.has(sourceOrderId);
          
          if (!stillOpen) {
            console.log(`  🔍 Order ${sourceOrderId} is no longer in open orders list (was tracked, now missing)`);
          }
          
          return !stillOpen;
        });

        console.log(`🔍 Found ${missingOrders.length} tracked order(s) that are no longer open (may be filled or cancelled)`);

        // Filter new orders (orders we haven't tracked yet)
        const newOrders = openOrders.filter(order => {
          const orderId = (order.id || order.orderId || order.order_id)?.toString();
          if (!orderId) return false;
          
          // Check if we've already tracked this order
          const alreadyTracked = trackedOpenOrders?.some((log: any) => 
            log.source_order_id?.toString() === orderId
          );
          
          return !alreadyTracked;
        });

        console.log(`📈 Found ${newOrders.length} new order(s) (not yet tracked) and ${missingOrders.length} missing order(s) (no longer open)`);

        totalChecked += newOrders.length + missingOrders.length;

        console.log(`🔍 Processing ${newOrders.length} new order(s) and ${missingOrders.length} missing order(s) for account ${conn.broker_account_name}`);

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
            // Pass the source order ID so we can track it if it gets cancelled
            const copyResult = await processCopyTradeExecution(
              conn.trading_account_id,
              {
                symbol: orderSymbol,
                side: orderSide,
                quantity: orderQty,
                orderType: orderType,
                price: orderPrice,
                stopPrice: orderStopPrice,
                sourceOrderId: orderId.toString() // Store source order ID for cancellation tracking
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

        // Handle missing orders - these are orders that were tracked as open but are no longer in the open orders list
        // They could be filled or cancelled - we'll cancel them on follower accounts if they're still pending/submitted
        for (const log of missingOrders) {
          const sourceOrderId = log.source_order_id?.toString();
          if (!sourceOrderId) continue;

          console.log(`  🚫 Order ${sourceOrderId} is no longer in open orders - checking if we should cancel follower orders`);

          // Check if the destination order is still pending/submitted (hasn't been filled)
          // If it's still pending, we should cancel it
          if (log.order_status === 'pending' || log.order_status === 'submitted') {
            console.log(`  🔄 Order ${sourceOrderId} was tracked but is no longer open. Cancelling follower order ${log.order_id}...`);

            // Update logs to cancelled status and cancel destination orders
            // We already have all the log details we need from the query above
            let cancellationSuccess = false;
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
                      // Get the account ID from the broker connection
                      // broker_account_name should be the ProjectX account ID (numeric)
                      // broker_user_id might also be available as a fallback
                      const accountId = destConnection.broker_account_name || 
                                       destConnection.broker_user_id || 
                                       destConnection.trading_account_id;
                      
                      console.log(`  🚫 Attempting to cancel destination order ${log.order_id} on ${destConnection.broker_account_name}`);
                      console.log(`     Account ID: ${accountId}, Order ID: ${log.order_id}`);
                      console.log(`     Connection details:`, {
                        broker_account_name: destConnection.broker_account_name,
                        broker_user_id: destConnection.broker_user_id,
                        trading_account_id: destConnection.trading_account_id
                      });
                      
                      const cancelResult = await client.cancelOrder({
                        accountId: accountId,
                        orderId: log.order_id
                      });

                      if (cancelResult.success) {
                        cancellationSuccess = true;
                        console.log(`  ✅ Successfully cancelled destination order ${log.order_id} on ${destConnection.broker_account_name}`);
                      } else {
                        console.warn(`  ⚠️ Failed to cancel destination order ${log.order_id}: ${cancelResult.error}`);
                      }
                    } else {
                      console.warn(`  ⚠️ Could not initialize ProjectX client for cancellation`);
                    }
                  } else {
                    console.warn(`  ⚠️ Destination broker type ${destConnection?.broker_type} does not support order cancellation`);
                  }
                } catch (cancelError: any) {
                  console.error(`  ❌ Error cancelling destination order:`, cancelError);
                  console.error(`  Stack:`, cancelError.stack);
                }
              } else {
                console.log(`  ⏭️ Skipping cancellation - no order_id (${log.order_id}) or broker connection (${log.destination_broker_connection_id})`);
              }

            // Update log status to cancelled (regardless of whether we successfully cancelled the destination order)
            // The source order is no longer open, so the log should reflect that
            await adminSupabase
              .from('copy_trade_logs' as any)
              .update({ 
                order_status: 'cancelled',
                updated_at: new Date().toISOString(),
                error_message: cancellationSuccess ? null : (log.order_id ? 'Failed to cancel destination order' : 'No destination order ID to cancel')
              })
              .eq('id', log.id);

            console.log(`  ✅ Updated copy trade log ${log.id} to cancelled status${cancellationSuccess ? ' (destination order cancelled)' : ' (destination order cancellation failed or not attempted)'}`);
          } else {
            console.log(`  ⏭️ Skipping cancellation - destination order status is ${log.order_status} (not pending/submitted)`);
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

