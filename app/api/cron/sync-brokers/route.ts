import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncTradovateTrades } from '@/utils/tradovate/sync-service';
import { syncProjectXTrades } from '@/utils/projectx/sync-service';

/**
 * Cron job to automatically sync trades from all brokers
 * Should be called by Vercel Cron or similar service every 5-15 minutes
 * 
 * To set up in Vercel:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-brokers",
 *     "schedule": "every 10 minutes"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient();

    // Get all active broker connections with auto-sync enabled
    const { data: connections, error: connError } = await supabase
      .from('broker_connections' as any)
      .select('id, user_id, broker_type, auto_sync_enabled')
      .eq('auto_sync_enabled', true);

    if (connError) {
      console.error('Error fetching broker connections:', connError);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        message: 'No active broker connections to sync',
        synced: 0,
      });
    }

    // Sync each connection based on broker type
    const results = await Promise.allSettled(
      connections.map((conn) => {
        if (conn.broker_type === 'tradovate') {
          return syncTradovateTrades(conn.id, conn.user_id);
        } else if (conn.broker_type === 'projectx') {
          return syncProjectXTrades(conn.id, conn.user_id);
        } else {
          return Promise.reject(new Error(`Unsupported broker type: ${conn.broker_type}`));
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      message: `Synced ${successful} connections, ${failed} failed`,
      total: connections.length,
      successful,
      failed,
    });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync trades' },
      { status: 500 }
    );
  }
}

