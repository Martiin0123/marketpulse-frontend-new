import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncTradovateTrades } from '@/utils/tradovate/sync-service';
import { syncProjectXTrades } from '@/utils/projectx/sync-service';

/**
 * Sync trades from broker
 * POST /api/broker/sync?broker_connection_id=xxx
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brokerConnectionId = searchParams.get('broker_connection_id');

    if (!brokerConnectionId) {
      return NextResponse.json(
        { error: 'broker_connection_id is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify broker connection belongs to user
    const { data: connection, error: connError } = await supabase
      .from('broker_connections' as any)
      .select('id, broker_type, user_id')
      .eq('id', brokerConnectionId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Broker connection not found' },
        { status: 404 }
      );
    }

    // Sync trades based on broker type
    let result;
    if (connection.broker_type === 'tradovate') {
      result = await syncTradovateTrades(brokerConnectionId, user.id);
    } else if (connection.broker_type === 'projectx') {
      result = await syncProjectXTrades(brokerConnectionId, user.id);
    } else {
      return NextResponse.json(
        { error: 'Unsupported broker type' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Broker sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync trades' },
      { status: 500 }
    );
  }
}

