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

        // Fetch recent orders (pending/submitted) for immediate detection
        // We check orders instead of executions to catch trades as soon as they're placed
        console.log(`  🔍 Fetching orders for ${conn.broker_account_name}...`);
        
        const orders = await client.getOrders(
          conn.broker_account_name,
          'All' // Get all orders (pending, submitted, filled) to catch new ones
        );

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

        console.log(`📈 Found ${newOrders.length} new order(s) (pending/submitted) out of ${orders.length} total`);

        totalChecked += newOrders.length;

        console.log(`🔍 Checking ${newOrders.length} new order(s) for account ${conn.broker_account_name}`);

        // Check each new order to see if it's already been processed
        for (const order of newOrders) {
          // ProjectX API format: id, contractId, side (1=BUY, 0=SELL), size, type, limitPrice, stopPrice
          const orderId = order.id || order.orderId || order.order_id || 'unknown';
          const orderSymbol = order.contractId || order.contract_id || order.symbol || order.contractName || order.contract_name || 'unknown';
          
          // Map side: 1 = BUY, 0 = SELL (ProjectX format) or string values
          let orderSide = 'unknown';
          if (order.side === 1 || order.side === '1' || order.side === 'BUY' || order.side === 'buy' || order.side === 'long') {
            orderSide = 'BUY';
          } else if (order.side === 0 || order.side === '0' || order.side === 'SELL' || order.side === 'sell' || order.side === 'short') {
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

