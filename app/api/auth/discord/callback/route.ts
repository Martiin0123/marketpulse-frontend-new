import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://marketpulse.com/api/auth/discord/callback';
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export async function GET(req: NextRequest) {
  console.log('Discord callback started');
  
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  // Get base URL for absolute redirects
  const baseUrl = req.nextUrl.origin;
  
  console.log('Discord callback params:', { code: code ? 'present' : 'missing', error });
  
  if (error) {
    console.log('Discord OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_oauth_denied`);
  }
  
  if (!code) {
    console.log('No Discord code provided');
    return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_oauth_failed`);
  }

  try {
    console.log('Starting Discord token exchange');
    
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Discord token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_token_failed`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_token_invalid`);
    }

    // Get user info from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed:', await userRes.text());
      return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_user_failed`);
    }

    const discordUser = await userRes.json();

    // Add user to Discord server if bot token is available
    if (BOT_TOKEN && GUILD_ID) {
      try {
        const guildRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${discordUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: tokenData.access_token }),
        });

        if (!guildRes.ok) {
          console.warn('Failed to add user to Discord server:', await guildRes.text());
        } else {
          console.log('Successfully added user to Discord server:', discordUser.id);
        }
      } catch (error) {
        console.error('Error adding user to Discord server:', error);
      }
    }

    console.log('Discord user info received:', { id: discordUser.id, username: discordUser.username });
    
    // Store Discord user ID in Supabase
    const supabase = createClient();
    
    console.log('Getting current user from Supabase');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get current user:', userError);
      return NextResponse.redirect(`${baseUrl}/dashboard?error=user_not_found`);
    }
    
    console.log('Current user found:', { user_id: user.id });

    // Update user metadata with Discord ID
    const { error: updateError } = await supabase.auth.updateUser({
      data: { discord_user_id: discordUser.id, discord_username: discordUser.username }
    });

    if (updateError) {
      console.error('Failed to update user with Discord ID:', updateError);
      return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_save_failed`);
    }

    console.log('Successfully connected Discord account:', {
      user_id: user.id,
      discord_id: discordUser.id,
      discord_username: discordUser.username
    });

    console.log('Checking user subscription level');
    
    // Check if user has premium/VIP subscription to access dashboard
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        status,
        prices:price_id (
          products:product_id (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created', { ascending: false });

    console.log('Subscription check result:', { 
      subscriptions: subscriptions?.length || 0, 
      error: subscriptionError?.message,
      productNames: subscriptions?.map(s => s.prices?.products?.name)
    });

    // Check if user has premium or VIP subscription based on product name
    const hasPremiumAccess = subscriptions && subscriptions.length > 0 && 
      (subscriptions[0].prices?.products?.name?.toLowerCase().includes('premium') || 
       subscriptions[0].prices?.products?.name?.toLowerCase().includes('vip'));

    console.log('Premium access check:', { 
      hasPremiumAccess,
      productName: subscriptions?.[0]?.prices?.products?.name
    });

    // Redirect based on subscription level
    if (hasPremiumAccess) {
      console.log('Redirecting to dashboard');
      return NextResponse.redirect(`${baseUrl}/dashboard?discord=connected`);
    } else {
      console.log('Redirecting to pricing page');
      return NextResponse.redirect(`${baseUrl}/pricing?message=dashboard_access_required&discord=connected`);
    }

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard?error=discord_oauth_error`);
  }
} 