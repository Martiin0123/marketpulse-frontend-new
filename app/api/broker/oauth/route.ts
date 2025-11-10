import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TradovateClient } from '@/utils/tradovate/client';
import { ProjectXClient } from '@/utils/projectx/client';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

/**
 * Generic broker OAuth flow
 * GET /api/broker/oauth?broker=tradovate|projectx&trading_account_id=xxx&redirect_uri=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker = searchParams.get('broker') as 'tradovate' | 'projectx';
    const tradingAccountId = searchParams.get('trading_account_id'); // Optional - if not provided, will create account in callback
    const redirectUri = searchParams.get('redirect_uri') || `${request.nextUrl.origin}/journal`;

    if (!broker || !['tradovate', 'projectx'].includes(broker)) {
      return NextResponse.json(
        { error: 'Invalid broker type. Must be "tradovate" or "projectx"' },
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

    // If trading_account_id is provided, verify it belongs to user
    if (tradingAccountId) {
      const { data: account, error: accountError } = await supabase
        .from('trading_accounts' as any)
        .select('id')
        .eq('id', tradingAccountId)
        .eq('user_id', user.id)
        .single();

      if (accountError || !account) {
        return NextResponse.json(
          { error: 'Trading account not found' },
          { status: 404 }
        );
      }
    }

    // Generate state token (include trading_account_id if provided, otherwise just broker)
    const state = tradingAccountId 
      ? `${broker}_${tradingAccountId}_${Date.now()}`
      : `${broker}_new_${Date.now()}`;

    // Get authorization URL based on broker type
    let authUrl: string;
    const callbackUrl = `${request.nextUrl.origin}/api/broker/oauth/callback`;

    try {
      if (broker === 'tradovate') {
        authUrl = TradovateClient.getAuthorizationUrl(callbackUrl, state);
      } else if (broker === 'projectx') {
        authUrl = ProjectXClient.getAuthorizationUrl(callbackUrl, state);
      } else {
        return NextResponse.json(
          { error: 'Unsupported broker type' },
          { status: 400 }
        );
      }

      return NextResponse.redirect(authUrl);
    } catch (error: any) {
      // If Client ID is not configured, redirect back with helpful error
      if (error.message?.includes('not configured')) {
        return NextResponse.redirect(
          `${request.nextUrl.origin}/journal?error=broker_not_configured&broker=${broker}&message=${encodeURIComponent(error.message)}`
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Broker OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

