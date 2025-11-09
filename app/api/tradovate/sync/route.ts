import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncTradovateTrades } from '@/utils/tradovate/sync-service';

/**
 * Sync trades from Tradovate
 * POST /api/tradovate/sync?tradovate_account_id=xxx
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tradovateAccountId = searchParams.get('tradovate_account_id');

    if (!tradovateAccountId) {
      return NextResponse.json(
        { error: 'tradovate_account_id is required' },
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

    // Verify Tradovate connection belongs to user
    const { data: connection, error: connError } = await supabase
      .from('tradovate_accounts' as any)
      .select('id, user_id')
      .eq('id', tradovateAccountId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Tradovate connection not found' },
        { status: 404 }
      );
    }

    // Sync trades
    const result = await syncTradovateTrades(tradovateAccountId, user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Tradovate sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync trades' },
      { status: 500 }
    );
  }
}

