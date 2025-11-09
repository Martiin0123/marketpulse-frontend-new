import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TradovateClient } from '@/utils/tradovate/client';

/**
 * Handle Tradovate OAuth callback
 * GET /api/tradovate/oauth/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=tradovate_oauth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=tradovate_oauth_failed`
      );
    }

    // Verify user is authenticated
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=unauthorized`
      );
    }

    // Extract trading account ID from state
    const tradingAccountId = state.split('_')[0];

    // Verify trading account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('trading_accounts' as any)
      .select('id')
      .eq('id', tradingAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=account_not_found`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/tradovate/oauth/callback`;
    const tokens = await TradovateClient.exchangeCodeForToken(code, redirectUri);

    // Get user info from Tradovate
    const client = new TradovateClient(
      tokens.access_token,
      tokens.refresh_token,
      new Date(Date.now() + tokens.expires_in * 1000)
    );

    const userInfo = await client.getUserInfo();
    const accounts = await client.getAccounts();

    // Store connection in database
    const { error: insertError } = await supabase
      .from('tradovate_accounts' as any)
      .upsert({
        user_id: user.id,
        trading_account_id: tradingAccountId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        tradovate_user_id: userInfo.id?.toString(),
        tradovate_username: userInfo.username || userInfo.name,
        tradovate_account_name: accounts[0]?.name || accounts[0]?.id?.toString(),
        auto_sync_enabled: true,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error saving Tradovate connection:', insertError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=save_failed`
      );
    }

    // Redirect back to journal
    return NextResponse.redirect(
      `${request.nextUrl.origin}/journal?tradovate_connected=true`
    );
  } catch (error: any) {
    console.error('Tradovate OAuth callback error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/journal?error=tradovate_oauth_error`
    );
  }
}

