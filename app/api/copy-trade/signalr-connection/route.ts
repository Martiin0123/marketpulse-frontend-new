import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { ProjectXClient } from '@/utils/projectx/client';

/**
 * Get SignalR connection details for real-time order updates
 * Returns JWT token and account ID for each active copy trade source account
 */
export async function GET(request: NextRequest) {
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
        connections: []
      });
    }

    // Get unique source account IDs
    const sourceAccountIds = [...new Set(configs.map((c: any) => c.source_account_id))];

    // Get broker connections for source accounts
    const { data: connections, error: connError } = await adminSupabase
      .from('broker_connections' as any)
      .select('*')
      .in('trading_account_id', sourceAccountIds)
      .eq('broker_type', 'projectx');

    if (connError || !connections || connections.length === 0) {
      return NextResponse.json({
        connections: []
      });
    }

    // For each connection, get the JWT session token
    const signalRConnections = await Promise.all(
      connections.map(async (conn: any) => {
        try {
          // Initialize ProjectX client to get session token
          const serviceType = (conn.api_service_type as 'topstepx' | 'alphaticks') || 'topstepx';
          let client: ProjectXClient;

          if (conn.api_key && conn.api_username) {
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
          } else {
            // Skip if no API key/username
            return null;
          }

          // Ensure authentication (this will get/create session token)
          await (client as any).ensureValidAuth();
          
          // Get the session token from the client
          const sessionToken = client.getSessionToken();

          if (!sessionToken) {
            console.warn(`⚠️ No session token for connection ${conn.id}`);
            return null;
          }

          // Determine the correct SignalR hub URL based on service type
          let hubUrl = 'https://rtc.alphaticks.projectx.com/hubs/user';
          if (serviceType === 'topstepx') {
            hubUrl = 'https://rtc.topstepx.com/hubs/user';
          }

          return {
            connectionId: conn.id,
            accountId: parseInt(conn.broker_account_name || conn.broker_user_id || '0'),
            tradingAccountId: conn.trading_account_id,
            jwtToken: sessionToken,
            hubUrl: hubUrl,
            serviceType: serviceType
          };
        } catch (error: any) {
          console.error(`❌ Error getting SignalR connection for ${conn.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values
    const validConnections = signalRConnections.filter((conn): conn is NonNullable<typeof conn> => conn !== null);

    return NextResponse.json({
      connections: validConnections
    });
  } catch (error: any) {
    console.error('❌ Error getting SignalR connections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get SignalR connections' },
      { status: 500 }
    );
  }
}

