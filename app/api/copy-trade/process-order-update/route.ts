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
      console.log(`🚫 Processing real-time order cancellation: ${order.id} for account ${tradingAccountId}`);

      // Find the copy trade log for this order (check all statuses except already cancelled)
      const { data: log, error: logError } = await adminSupabase
        .from('copy_trade_logs' as any)
        .select('id, order_id, order_status, destination_broker_connection_id, destination_account_id, source_order_id')
        .eq('source_account_id', tradingAccountId)
        .eq('source_order_id', order.id.toString())
        .neq('order_status', 'cancelled') // Don't try to cancel already cancelled orders
        .maybeSingle();

      console.log(`🔍 Cancellation lookup result:`, {
        found: !!log,
        logId: log?.id,
        orderId: log?.order_id,
        status: log?.order_status,
        sourceOrderId: log?.source_order_id,
        error: logError
      });

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
              const accountId = destConnection.broker_account_name || 
                               destConnection.broker_user_id || 
                               destConnection.trading_account_id;
              
              const cancelResult = await client.cancelOrder({
                accountId: accountId,
                orderId: log.order_id
              });

              if (cancelResult.success) {
                await adminSupabase
                  .from('copy_trade_logs' as any)
                  .update({ 
                    order_status: 'cancelled',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', log.id);

                return NextResponse.json({
                  cancelled: 1,
                  message: 'Order cancelled successfully'
                });
              }
            }
          } catch (error: any) {
            console.error('❌ Error cancelling order:', error);
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
    const { data: existingLog } = await adminSupabase
      .from('copy_trade_logs' as any)
      .select('id, order_status, order_price, order_stop_price, order_id, destination_broker_connection_id')
      .eq('source_account_id', tradingAccountId)
      .eq('source_order_id', order.id.toString())
      .maybeSingle();

    // If order exists and is still active (not filled/cancelled/rejected), check if it was modified
    if (existingLog && 
        existingLog.order_status !== 'filled' && 
        existingLog.order_status !== 'cancelled' && 
        existingLog.order_status !== 'rejected' &&
        existingLog.order_status !== 'error') {
      
      console.log(`🔍 Checking for modifications:`, {
        existingPrice: existingLog.order_price,
        newPrice: order.price,
        existingStopPrice: existingLog.order_stop_price,
        newStopPrice: order.stopPrice
      });
      
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
      
      console.log(`🔍 Modification detection:`, {
        isStopOrder,
        limitPriceChanged,
        stopPriceChanged,
        stopOrderPriceChanged,
        stopPriceAdded,
        willModify: limitPriceChanged || stopPriceChanged || stopOrderPriceChanged || stopPriceAdded
      });
      
      if (limitPriceChanged || stopPriceChanged || stopOrderPriceChanged || stopPriceAdded) {
        const priceChange = limitPriceChanged ? `${existingLog.order_price} → ${order.price}` : '';
        const stopChange = stopPriceChanged ? `stop: ${existingLog.order_stop_price} → ${order.stopPrice}` : 
                          stopPriceAdded ? `stop: added ${order.stopPrice}` : '';
        console.log(`✏️ Processing real-time order modification: ${order.id} (${priceChange}${priceChange && stopChange ? ', ' : ''}${stopChange})`);

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
              
              // For stop orders, modify stopPrice; for limit orders, modify limitPrice
              const modifyParams: any = {
                accountId: accountId,
                orderId: existingLog.order_id
              };
              
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
              
              console.log(`✏️ Modifying order with params:`, modifyParams);
              
              const modifyResult = await client.modifyOrder(modifyParams);

              if (modifyResult.success) {
                const updateData: any = {
                  updated_at: new Date().toISOString()
                };
                
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
    console.log(`🔄 Processing real-time new order: ${order.symbol} ${order.side} ${order.quantity} (ID: ${order.id})`);

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

