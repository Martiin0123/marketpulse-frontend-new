import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const REDIRECT_URI = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'https://primescope.app/api/auth/discord/callback');
const SCOPE = 'identify guilds.join';

export async function GET(req: NextRequest) {
  // Redirect user to Discord OAuth2
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;
  return NextResponse.redirect(discordAuthUrl);
} 