import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncTradovateTrades } from '@/utils/tradovate/sync-service';

/**
 * Cron job to automatically sync Tradovate trades
 * Should be called by Vercel Cron or similar service every 5-15 minutes
 * 
 * To set up in Vercel:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-tradovate",
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

    // Get all active Tradovate connections with auto-sync enabled
    const { data: connections, error: connError } = await supabase
      .from('tradovate_accounts' as any)
      .select('id, user_id, auto_sync_enabled')
      .eq('auto_sync_enabled', true);

    if (connError) {
      console.error('Error fetching Tradovate connections:', connError);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        message: 'No active Tradovate connections to sync',
        synced: 0,
      });
    }

    // Sync each connection
    const results = await Promise.allSettled(
      connections.map((conn) =>
        syncTradovateTrades(conn.id, conn.user_id)
      )
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

