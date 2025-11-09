import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TradovateClient } from '@/utils/tradovate/client';

/**
 * Initiate Tradovate OAuth flow
 * GET /api/tradovate/oauth?trading_account_id=xxx&redirect_uri=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tradingAccountId = searchParams.get('trading_account_id');
    const redirectUri = searchParams.get('redirect_uri') || `${request.nextUrl.origin}/journal`;

    if (!tradingAccountId) {
      return NextResponse.json(
        { error: 'trading_account_id is required' },
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

    // Verify trading account belongs to user
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

    // Generate state token (store in session or database for security)
    const state = `${tradingAccountId}_${Date.now()}`;

    // Get authorization URL
    const authUrl = TradovateClient.getAuthorizationUrl(
      `${request.nextUrl.origin}/api/tradovate/oauth/callback`,
      state
    );

    // Store state in session (you might want to use a more secure method)
    // For now, we'll include it in the callback URL
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Tradovate OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

