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

    // Check each broker connection for new opening executions
    for (const conn of brokerConnections) {
      try {
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

        // Fetch recent executions (last 2 minutes for real-time detection)
        const endTime = new Date();
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() - 2); // Check last 2 minutes

        const executions = await client.getTrades(
          conn.broker_account_name,
          startTime,
          endTime
        );

        // Filter to only filled executions with PnL=0 (opening executions)
        const openingExecutions = executions.filter(exec => {
          const status = (exec.status || '').toUpperCase();
          const isFilled = status === 'FILLED' || 
                          status === 'CLOSED' || 
                          status === 'COMPLETED' || 
                          status === 'EXECUTED' ||
                          status === 'FILL';
          const isOpening = !exec.pnl || exec.pnl === 0;
          return isFilled && isOpening;
        });

        totalChecked += openingExecutions.length;

        // Check each opening execution to see if it's new
        for (const exec of openingExecutions) {
          // Check if this execution was already processed
          const { data: existingLog } = await adminSupabase
            .from('copy_trade_logs' as any)
            .select('id')
            .eq('source_account_id', conn.trading_account_id)
            .eq('order_status', 'submitted')
            .or(`order_status.eq.filled,order_status.eq.error`)
            .gte('created_at', startTime.toISOString())
            .single();

          // Check if execution exists in trade_entries
          const { data: existingTrade } = await adminSupabase
            .from('trade_entries' as any)
            .select('id')
            .eq('broker_trade_id', `projectx_${exec.id}`)
            .single();

          // If it's a new execution (not in logs and not in trades), execute copy trade
          if (!existingLog && !existingTrade) {
            console.log(`🔄 NEW opening execution detected: ${exec.symbol} ${exec.side} ${exec.quantity || (exec as any).size || 1}`);

            // Execute copy trade for this source account
            const copyResult = await processCopyTradeExecution(
              conn.trading_account_id,
              {
                symbol: exec.symbol,
                side: exec.side,
                quantity: exec.quantity || (exec as any).size || 1,
                orderType: 'Market'
              },
              user.id
            );

            if (copyResult.copied > 0) {
              totalExecuted += copyResult.copied;
              console.log(`✅ Executed ${copyResult.copied} copy trade(s) for ${exec.symbol}`);
            }
            if (copyResult.errors.length > 0) {
              errors.push(...copyResult.errors);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error checking broker connection ${conn.id}:`, error);
        errors.push(`Error checking ${conn.broker_account_name}: ${error.message}`);
      }
    }

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

