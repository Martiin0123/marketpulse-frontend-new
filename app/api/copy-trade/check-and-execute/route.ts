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

    const adminSupabase = getSupabaseAdmin();

    // Get all active copy trade configs for this user
    const { data: configs, error: configError } = await adminSupabase
      .from('copy_trade_configs' as any)
      .select('*, source_account:trading_accounts!copy_trade_configs_source_account_id_fkey(id, name)')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json({
        checked: 0,
        executed: 0,
        message: 'No active copy trade configurations found'
      });
    }

    // Get unique source account IDs
    const sourceAccountIds = [...new Set(configs.map((c: any) => c.source_account_id))];

    // Get broker connections for source accounts
    const { data: brokerConnections, error: connError } = await adminSupabase
      .from('broker_connections' as any)
      .select('*')
      .in('trading_account_id', sourceAccountIds)
      .eq('broker_type', 'projectx')
      .eq('enabled', true);

    if (connError || !brokerConnections || brokerConnections.length === 0) {
      return NextResponse.json({
        checked: 0,
        executed: 0,
        message: 'No active broker connections found for source accounts'
      });
    }

    let totalChecked = 0;
    let totalExecuted = 0;
    const errors: string[] = [];

    console.log(`🔍 Checking ${brokerConnections.length} broker connection(s) for new opening executions`);

    // Check each broker connection for new opening executions
    for (const conn of brokerConnections) {
      try {
        console.log(`\n📡 Processing broker connection: ${conn.broker_account_name} (Account ID: ${conn.trading_account_id})`);
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
          continue; // Skip if no valid auth
        }

        // Fetch recent executions (last 30 seconds for immediate detection)
        const endTime = new Date();
        const startTime = new Date();
        startTime.setSeconds(startTime.getSeconds() - 30); // Check last 30 seconds for immediate response

        console.log(`🔍 Fetching executions for ${conn.broker_account_name} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
        
        const executions = await client.getTrades(
          conn.broker_account_name,
          startTime,
          endTime
        );

        console.log(`📊 Fetched ${executions.length} total execution(s) from API`);

        // Filter to only filled executions with PnL=0 (opening executions)
        const openingExecutions = executions.filter(exec => {
          const status = (exec.status || '').toUpperCase();
          const isFilled = status === 'FILLED' || 
                          status === 'CLOSED' || 
                          status === 'COMPLETED' || 
                          status === 'EXECUTED' ||
                          status === 'FILL' ||
                          !status; // Some APIs might not return status
          const isOpening = !exec.pnl || exec.pnl === 0;
          const result = isFilled && isOpening;
          
          if (!result && exec.pnl === 0) {
            console.log(`  ⏭️ Skipping execution: status=${status}, pnl=${exec.pnl}, isFilled=${isFilled}`);
          }
          
          return result;
        });

        console.log(`📈 Found ${openingExecutions.length} opening execution(s) (PnL=0, filled)`);

        totalChecked += openingExecutions.length;

        console.log(`🔍 Checking ${openingExecutions.length} opening execution(s) for account ${conn.broker_account_name}`);

        // Check each opening execution to see if it's new
        for (const exec of openingExecutions) {
          const execId = exec.id || (exec as any).executionId || 'unknown';
          const execSymbol = exec.symbol || 'unknown';
          const execSide = exec.side || 'unknown';
          const execQty = exec.quantity || (exec as any).size || 1;
          
          console.log(`  📋 Checking execution: ${execSymbol} ${execSide} ${execQty} (ID: ${execId})`);

          // Check if this execution was already processed (using maybeSingle to avoid errors)
          const { data: existingLog, error: logError } = await adminSupabase
            .from('copy_trade_logs' as any)
            .select('id, order_status, created_at')
            .eq('source_account_id', conn.trading_account_id)
            .eq('source_symbol', execSymbol)
            .eq('source_side', execSide)
            .eq('source_quantity', execQty)
            .gte('created_at', startTime.toISOString())
            .maybeSingle();

          if (logError) {
            console.warn(`  ⚠️ Error checking logs:`, logError);
          }

          // Check if execution exists in trade_entries (using maybeSingle)
          const { data: existingTrade, error: tradeError } = await adminSupabase
            .from('trade_entries' as any)
            .select('id')
            .eq('broker_trade_id', `projectx_${execId}`)
            .maybeSingle();

          if (tradeError) {
            console.warn(`  ⚠️ Error checking trades:`, tradeError);
          }

          // If it's a new execution (not in logs and not in trades), execute copy trade
          if (!existingLog && !existingTrade) {
            console.log(`  🔄 NEW opening execution detected: ${execSymbol} ${execSide} ${execQty} (ID: ${execId})`);

            // Extract order type and prices from execution
            const orderType = (exec as any).orderType || 'Market';
            const price = exec.price;
            const stopPrice = (exec as any).stopPrice;

            console.log(`  🚀 Executing copy trade with params:`, {
              symbol: execSymbol,
              side: execSide,
              quantity: execQty,
              orderType,
              price,
              stopPrice
            });

            // Execute copy trade for this source account
            const copyResult = await processCopyTradeExecution(
              conn.trading_account_id,
              {
                symbol: execSymbol,
                side: execSide,
                quantity: execQty,
                orderType: orderType,
                price: price,
                stopPrice: stopPrice
              },
              user.id
            );

            if (copyResult.copied > 0) {
              totalExecuted += copyResult.copied;
              console.log(`  ✅ Executed ${copyResult.copied} copy trade(s) for ${execSymbol}`);
            }
            if (copyResult.errors.length > 0) {
              console.error(`  ❌ Copy trade errors:`, copyResult.errors);
              errors.push(...copyResult.errors);
            }
          } else {
            if (existingLog) {
              console.log(`  ⏭️ Execution already logged (status: ${existingLog.order_status})`);
            }
            if (existingTrade) {
              console.log(`  ⏭️ Execution already in trade_entries`);
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

