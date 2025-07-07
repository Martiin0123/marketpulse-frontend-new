# Discord Integration Setup Guide

This guide will help you set up Discord OAuth2 and role assignment for your MarketPulse application.

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "MarketPulse Bot")
3. Go to the "OAuth2" section in the left sidebar
4. Copy the **Client ID** and **Client Secret**
   1391868026839633950
   SQa2APA2ViZ_zW9qv6-7QPs7Vo0Ukail

https://discord.com/oauth2/authorize?client_id=1391868026839633950&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fdiscord%2Fcallback&scope=guilds.join+identify

## 2. Configure OAuth2 Redirect

1. In the OAuth2 section, add a redirect URL:
   - For development: `http://localhost:3004/api/auth/discord/callback`
   - For production: `https://yourdomain.com/api/auth/discord/callback`

2. Set the scopes to include:
   - `identify` (to get user info)
   - `guilds.join` (to add users to your server)

## 3. Create a Discord Bot

1. Go to the "Bot" section in your Discord application
2. Click "Add Bot"
3. Copy the **Bot Token**
4. Enable the following bot permissions:
   - Manage Roles
   - Send Messages
   - Use Slash Commands

MTM5MTg2ODAyNjgzOTYzMzk1MA.GDTDMY.g3xpL_Aqlg9mSnreQxAtySPlfNibKa4PRfX8xo

## 4. Add Bot to Your Discord Server

1. Go to the "OAuth2" → "URL Generator" section
2. Select the "bot" scope
3. Select the following permissions:
   - Manage Roles
   - Send Messages
4. Copy the generated URL and open it in a browser
5. Select your Discord server and authorize the bot

## 5. Get Discord Server (Guild) ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on your server name and select "Copy Server ID"

## 6. Create Discord Roles

1. In your Discord server, create roles for different subscription tiers:
   - Free Tier (e.g., "Free Member")
   - Pro Tier (e.g., "Pro Member")
   - Premium Tier (e.g., "Premium Member")

2. Right-click each role and copy the Role ID

## 7. Environment Variables

Add these environment variables to your `.env.local` file and Vercel:

```env
# Discord OAuth2
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id

# Discord Role IDs
DISCORD_ROLE_FREE=role_id_for_free_tier
DISCORD_ROLE_PRO=role_id_for_pro_tier
DISCORD_ROLE_PREMIUM=role_id_for_premium_tier
```

## 8. Bot Permissions

Make sure your bot has the following permissions in your Discord server:

1. **Manage Roles** - To assign/remove roles
2. **Send Messages** - To send notifications
3. **Use Slash Commands** - For future bot commands

The bot must be **above** the roles it needs to manage in the server's role hierarchy.

## 9. Testing the Integration

1. **Connect Discord Account:**
   - Go to your dashboard
   - Click "Connect Discord Account"
   - Complete the OAuth flow
   - You should see "Connected to Discord" status

2. **Assign Discord Role:**
   - Click "Assign Role" button
   - Check your Discord server to see the role assigned
   - You should receive a success notification

## 10. Automatic Role Assignment

The system will automatically assign roles based on subscription status:

- **Free users** → Free tier role
- **Active/Pro users** → Pro tier role
- **Premium users** → Premium tier role

## 11. Troubleshooting

### Common Issues:

1. **"Failed to assign Discord role"**
   - Check that the bot token is correct
   - Ensure the bot has "Manage Roles" permission
   - Verify the bot is above the target role in hierarchy

2. **"Discord account not connected"**
   - User needs to complete the OAuth flow first
   - Check that the Discord user ID is stored in user metadata

3. **"No role configured for this plan"**
   - Verify the role IDs are set in environment variables
   - Check that the role IDs match your Discord server roles

### Debug Steps:

1. Check the browser console for client-side errors
2. Check your server logs for API errors
3. Verify all environment variables are set correctly
4. Test the Discord API endpoints manually

## 12. Security Notes

- Never expose your bot token in client-side code
- Use environment variables for all sensitive data
- Regularly rotate your Discord application secrets
- Monitor Discord API rate limits

## 13. Next Steps

Once this is working, you can:

1. **Add automatic role assignment** when subscription status changes
2. **Send Discord notifications** for new trading signals
3. **Create Discord slash commands** for user interactions
4. **Add role-based channel access** for premium features

---

For support, check the Discord Developer documentation or contact your development team.
