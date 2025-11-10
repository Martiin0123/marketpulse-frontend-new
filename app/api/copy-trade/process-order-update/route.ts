import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { processCopyTradeExecution } from '@/utils/copy-trade/executor';
import { ProjectXClient } from '@/utils/projectx/client';

/**
 * Process a real-time order update from SignalR
 * This endpoint is called when a new order, modification, or cancellation is detected via SignalR WebSocket
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, tradingAccountId, order, action } = body;

    if (!connectionId || !tradingAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminSupabase = getSupabaseAdmin();

    // Handle order cancellation
    if (action === 'cancelled' && order?.id) {
      // Find the copy trade log for this order
      // There may be multiple logs with the same source_order_id (if order was processed multiple times)
      // Get the most recent one that's still active
      const { data: logs, error: logError } = await adminSupabase
        .from('copy_trade_logs' as any)
        .select('id, order_id, order_status, destination_broker_connection_id, destination_account_id, source_order_id, created_at')
        .eq('source_account_id', tradingAccountId)
        .eq('source_order_id', order.id.toString())
        .neq('order_status', 'cancelled') // Don't try to cancel already cancelled orders
        .order('created_at', { ascending: false });

      // Get the most recent active log
      let log = logs && logs.length > 0 ? logs[0] : null;

      // If not found by source_order_id, try to find any recent log for this account
      // (in case source_order_id wasn't set)
      if (!log) {
        const { data: altLogs } = await adminSupabase
          .from('copy_trade_logs' as any)
          .select('id, order_id, order_status, destination_broker_connection_id, destination_account_id, source_order_id, created_at')
          .eq('source_account_id', tradingAccountId)
          .neq('order_status', 'cancelled')
          .neq('order_status', 'filled')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (altLogs && altLogs.length > 0) {
          const altLog = altLogs[0];
          // Only use if it's very recent (within last 5 minutes) to avoid false matches
          const logAge = new Date().getTime() - new Date(altLog.created_at).getTime();
          if (logAge < 5 * 60 * 1000) {
            log = altLog;
          }
        }
      }
      
      // If multiple logs found, log a warning
      if (logs && logs.length > 1) {
        console.warn(`⚠️ Found ${logs.length} logs with same source_order_id ${order.id}, using most recent one`);
      }
      
      if (logError) {
        console.error('❌ Error looking up cancellation log:', logError);
      }

      if (log && log.order_id && log.destination_broker_connection_id) {
        // Get destination broker connection
        const { data: destConnection } = await adminSupabase
          .from('broker_connections' as any)
          .select('*')
          .eq('id', log.destination_broker_connection_id)
          .single();

        if (destConnection && destConnection.broker_type === 'projectx') {
          try {
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
              // For ProjectX, accountId should be the numeric account ID
              // broker_account_name should contain the ProjectX account ID (numeric)
              let accountId: string | number = destConnection.broker_account_name || 
                               destConnection.broker_user_id || 
                               destConnection.trading_account_id;
              
              // Ensure accountId is a number (ProjectX API requires integer)
              if (typeof accountId === 'string') {
                const parsed = parseInt(accountId);
                if (!isNaN(parsed)) {
                  accountId = parsed;
                } else {
                  console.error(`❌ Invalid accountId format: ${accountId}`);
                  return NextResponse.json({
                    cancelled: 0,
                    message: `Invalid accountId format: ${accountId}`
                  });
                }
              }
              
              const cancelResult = await client.cancelOrder({
                accountId: accountId,
                orderId: log.order_id
              });

              if (cancelResult.success) {
                // Cancel all logs with this source_order_id (in case there are duplicates)
                const cancelledCount = await adminSupabase
                  .from('copy_trade_logs' as any)
                  .update({ 
                    order_status: 'cancelled',
                    updated_at: new Date().toISOString()
                  })
                  .eq('source_account_id', tradingAccountId)
                  .eq('source_order_id', order.id.toString())
                  .neq('order_status', 'cancelled'); // Only update non-cancelled ones


                return NextResponse.json({
                  cancelled: cancelledCount.data?.length || 1,
                  message: 'Order cancelled successfully'
                });
              } else {
                console.error(`❌ Cancel failed: ${cancelResult.error}`);
                return NextResponse.json({
                  cancelled: 0,
                  message: `Cancel failed: ${cancelResult.error || 'Unknown error'}`
                });
              }
            } else {
              console.error(`❌ Client not initialized for cancellation`);
            }
          } catch (error: any) {
            console.error('❌ Error cancelling order:', error);
            return NextResponse.json({
              cancelled: 0,
              message: `Error: ${error.message || 'Unknown error'}`
            });
          }
        }
      }

      return NextResponse.json({
        cancelled: 0,
        message: 'No matching order found or already cancelled'
      });
    }

    // Handle new or modified orders
    if (!order) {
      return NextResponse.json(
        { error: 'Missing order data' },
        { status: 400 }
      );
    }

    // Check if this order has already been processed
    // Use .limit(1) instead of .maybeSingle() to avoid errors when multiple logs exist
    const { data: existingLogs } = await adminSupabase
      .from('copy_trade_logs' as any)
      .select('id, order_status, order_price, order_stop_price, order_id, destination_broker_connection_id, created_at')
      .eq('source_account_id', tradingAccountId)
      .eq('source_order_id', order.id.toString())
      .order('created_at', { ascending: false })
      .limit(10); // Get up to 10 to check for duplicates
    
    const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;
    
    // If multiple logs exist for this order, check if we should skip (duplicate detection)
    if (existingLogs && existingLogs.length > 1) {
      // Check if any of the recent logs were created in the last 5 seconds (likely duplicate)
      const recentLogs = existingLogs.filter((log: any) => {
        const logAge = new Date().getTime() - new Date(log.created_at).getTime();
        return logAge < 5000; // 5 seconds
      });
      
      if (recentLogs.length > 0) {
        return NextResponse.json({
          executed: 0,
          modified: 0,
          message: 'Order already being processed (duplicate detected)'
        });
      }
    }

    // If order exists and is still active (not filled/cancelled/rejected), check if it was modified
    if (existingLog && 
        existingLog.order_status !== 'filled' && 
        existingLog.order_status !== 'cancelled' && 
        existingLog.order_status !== 'rejected' &&
        existingLog.order_status !== 'error') {
      
      // Get multiplier first to properly calculate destination quantity for comparison
      const { data: config } = await adminSupabase
        .from('copy_trade_configs' as any)
        .select('multiplier')
        .eq('source_account_id', tradingAccountId)
        .eq('destination_account_id', existingLog.destination_account_id)
        .maybeSingle();
      
      const multiplier = config?.multiplier || 1;
      
      // Check if quantity changed (compare destination quantities)
      const newDestinationQuantity = order.quantity !== undefined && order.quantity !== null
        ? Math.round(order.quantity * multiplier)
        : null;
      
      const quantityChanged = newDestinationQuantity !== null &&
          existingLog.destination_quantity !== null &&
          Math.abs(Number(existingLog.destination_quantity) - Number(newDestinationQuantity)) > 0.01;
      
      // For stop orders (type 4), the price is in stopPrice, not limitPrice
      // Check if limit price changed (for limit orders)
      const limitPriceChanged = order.price !== undefined && order.price !== null && 
          existingLog.order_price !== null && 
          Math.abs(Number(existingLog.order_price) - Number(order.price)) > 0.01;
      
      // Check if stop price changed (for stop orders)
      // For stop orders, we compare stopPrice with order_price (since stop orders store price in order_price)
      const isStopOrder = order.orderType === 'Stop' || order.orderType === 'StopLimit';
      const stopPriceChanged = order.stopPrice !== undefined && order.stopPrice !== null && 
          existingLog.order_stop_price !== null && 
          Math.abs(Number(existingLog.order_stop_price) - Number(order.stopPrice)) > 0.01;
      
      // For stop orders, also check if the order_price (which contains stop price) changed
      const stopOrderPriceChanged = isStopOrder && order.price !== undefined && order.price !== null &&
          existingLog.order_price !== null &&
          Math.abs(Number(existingLog.order_price) - Number(order.price)) > 0.01;
      
      // Also check if stop price was added/changed when it didn't exist before
      const stopPriceAdded = order.stopPrice !== undefined && order.stopPrice !== null && 
          (existingLog.order_stop_price === null || existingLog.order_stop_price === undefined) && 
          order.stopPrice > 0;
      
      if (quantityChanged || limitPriceChanged || stopPriceChanged || stopOrderPriceChanged || stopPriceAdded) {

        // Get destination broker connection
        const { data: destConnection } = await adminSupabase
          .from('broker_connections' as any)
          .select('*')
          .eq('id', existingLog.destination_broker_connection_id)
          .single();

        if (destConnection && destConnection.broker_type === 'projectx') {
          try {
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

            if (client && existingLog.order_id) {
              const accountId = destConnection.broker_account_name || 
                               destConnection.broker_user_id || 
                               destConnection.trading_account_id;
              
              // Use multiplier already calculated above
              const newDestinationQuantity = quantityChanged && order.quantity 
                ? Math.round(order.quantity * multiplier)
                : undefined;
              
              // For stop orders, modify stopPrice; for limit orders, modify limitPrice
              const modifyParams: any = {
                accountId: accountId,
                orderId: existingLog.order_id
              };
              
              // Add quantity if it changed
              if (quantityChanged && newDestinationQuantity) {
                modifyParams.quantity = newDestinationQuantity;
              }
              
              if (isStopOrder) {
                // For stop orders, the price is the stop price
                if (stopOrderPriceChanged || stopPriceChanged || stopPriceAdded) {
                  modifyParams.stopPrice = order.price || order.stopPrice;
                }
              } else {
                // For limit orders, modify limit price
                if (limitPriceChanged && order.price) {
                  modifyParams.limitPrice = order.price;
                }
                // Stop price can also be set on limit orders (stop-limit orders)
                if ((stopPriceChanged || stopPriceAdded) && order.stopPrice) {
                  modifyParams.stopPrice = order.stopPrice;
                }
              }
              
              const modifyResult = await client.modifyOrder(modifyParams);

                  if (modifyResult.success) {
                    const updateData: any = {
                      updated_at: new Date().toISOString()
                    };
                    
                    // Update quantity if it changed
                    if (quantityChanged && newDestinationQuantity) {
                      updateData.destination_quantity = newDestinationQuantity;
                      updateData.source_quantity = order.quantity;
                    }
                    
                    // Update limit price if it changed
                    if (limitPriceChanged && order.price) {
                      updateData.order_price = order.price;
                    }
                    
                    // Update stop price if it changed
                    if ((stopPriceChanged || stopPriceAdded) && order.stopPrice) {
                      updateData.order_stop_price = order.stopPrice;
                    }
                    
                    await adminSupabase
                      .from('copy_trade_logs' as any)
                      .update(updateData)
                      .eq('id', existingLog.id);

                return NextResponse.json({
                  modified: 1,
                  message: 'Order modified successfully'
                });
              }
            }
          } catch (error: any) {
            console.error('❌ Error modifying order:', error);
          }
        }

        return NextResponse.json({
          modified: 0,
          message: 'Order modification failed'
        });
      }

      // Order already exists and hasn't changed
      return NextResponse.json({
        executed: 0,
        modified: 0,
        message: 'Order already processed'
      });
    }

    // New order - execute copy trade
    const copyResult = await processCopyTradeExecution(
      tradingAccountId,
      {
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        orderType: order.orderType,
        price: order.price,
        stopPrice: order.stopPrice,
        sourceOrderId: order.id.toString()
      },
      user.id
    );

    return NextResponse.json({
      executed: copyResult.copied,
      errors: copyResult.errors
    });
  } catch (error: any) {
    console.error('❌ Error processing order update:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process order update' },
      { status: 500 }
    );
  }
}

