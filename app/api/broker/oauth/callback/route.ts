import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TradovateClient } from '@/utils/tradovate/client';
import { ProjectXClient } from '@/utils/projectx/client';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

const brokerNames: Record<string, string> = {
  tradovate: 'Tradovate',
  projectx: 'Project X'
};

/**
 * Handle broker OAuth callback
 * GET /api/broker/oauth/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=broker_oauth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=broker_oauth_failed`
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

    // Extract broker type and trading account ID from state
    const stateParts = state.split('_');
    const broker = stateParts[0];
    const isNewAccount = stateParts[1] === 'new';
    const tradingAccountId = isNewAccount ? null : stateParts[1];

    if (!['tradovate', 'projectx'].includes(broker)) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=invalid_broker`
      );
    }

    // If trading_account_id is provided, verify it belongs to user
    // Otherwise, we'll create a new account after OAuth
    let accountId = tradingAccountId;
    if (!accountId) {
      // Will create account after getting broker account info
      accountId = null;
    } else {
      const { data: account, error: accountError } = await supabase
        .from('trading_accounts' as any)
        .select('id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (accountError || !account) {
        return NextResponse.redirect(
          `${request.nextUrl.origin}/journal?error=account_not_found`
        );
      }
    }

    // Exchange code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/broker/oauth/callback`;
    let tokens: any;
    let userInfo: any;
    let accounts: any[];

    if (broker === 'tradovate') {
      tokens = await TradovateClient.exchangeCodeForToken(code, redirectUri);
      const client = new TradovateClient(
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000)
      );
      userInfo = await client.getUserInfo();
      accounts = await client.getAccounts();
    } else if (broker === 'projectx') {
      tokens = await ProjectXClient.exchangeCodeForToken(code, redirectUri);
      const client = new ProjectXClient(
        undefined, // apiKey
        undefined, // apiUsername
        undefined, // apiSecret
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000)
      );
      userInfo = await client.getUserInfo();
      accounts = await client.getAccounts();
    } else {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=unsupported_broker`
      );
    }

    // If no trading account ID, create one automatically
    if (!accountId && accounts.length > 0) {
      const brokerAccount = accounts[0];
      const { data: newAccount, error: createError } = await supabase
        .from('trading_accounts' as any)
        .insert({
          user_id: user.id,
          name: brokerAccount.name || `${brokerNames[broker]} Account`,
          currency: brokerAccount.currency || 'USD',
          initial_balance: brokerAccount.balance || 0,
          fixed_risk: 1 // Default 1%
        })
        .select()
        .single();

      if (createError || !newAccount) {
        console.error('Error creating trading account:', createError);
        return NextResponse.redirect(
          `${request.nextUrl.origin}/journal?error=create_account_failed`
        );
      }

      accountId = newAccount.id;
    }

    if (!accountId) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=no_account_available`
      );
    }

    // Store connection in database
    const { error: insertError } = await supabase
      .from('broker_connections' as any)
      .upsert({
        user_id: user.id,
        trading_account_id: accountId,
        broker_type: broker,
        auth_method: 'oauth',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        broker_user_id: userInfo.id?.toString() || userInfo.userId?.toString(),
        broker_username: userInfo.username || userInfo.name || userInfo.email,
        broker_account_name: accounts[0]?.name || accounts[0]?.id?.toString(),
        auto_sync_enabled: true,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error saving broker connection:', insertError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/journal?error=save_failed`
      );
    }

    // Redirect back to journal
    return NextResponse.redirect(
      `${request.nextUrl.origin}/journal?broker_connected=${broker}`
    );
  } catch (error: any) {
    console.error('Broker OAuth callback error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/journal?error=broker_oauth_error`
    );
  }
}

