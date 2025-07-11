import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://marketpulse.com/api/auth/discord/callback';
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return NextResponse.redirect('/dashboard?error=discord_oauth_denied');
  }
  
  if (!code) {
    return NextResponse.redirect('/dashboard?error=discord_oauth_failed');
  }

  try {
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
      return NextResponse.redirect('/dashboard?error=discord_token_failed');
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect('/dashboard?error=discord_token_invalid');
    }

    // Get user info from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed:', await userRes.text());
      return NextResponse.redirect('/dashboard?error=discord_user_failed');
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

    // Store Discord user ID in Supabase
    const supabase = createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get current user:', userError);
      return NextResponse.redirect('/dashboard?error=user_not_found');
    }

    // Update user metadata with Discord ID
    const { error: updateError } = await supabase.auth.updateUser({
      data: { discord_user_id: discordUser.id, discord_username: discordUser.username }
    });

    if (updateError) {
      console.error('Failed to update user with Discord ID:', updateError);
      return NextResponse.redirect('/dashboard?error=discord_save_failed');
    }

    console.log('Successfully connected Discord account:', {
      user_id: user.id,
      discord_id: discordUser.id,
      discord_username: discordUser.username
    });

    // Redirect back to dashboard with success message
    return NextResponse.redirect('/dashboard?discord=connected');

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect('/dashboard?error=discord_oauth_error');
  }
} 