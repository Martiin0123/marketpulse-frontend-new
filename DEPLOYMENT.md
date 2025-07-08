# Deployment Guide for Render

This guide will help you deploy the MarketPulse frontend to Render.

## Prerequisites

1. A Render account
2. All environment variables configured
3. Supabase project set up
4. Stripe account configured
5. Discord bot configured (if using Discord features)
6. Bybit API keys (if using trading features)

## Environment Variables

You'll need to configure the following environment variables in your Render dashboard:

### Supabase Configuration

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Stripe Configuration

- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_SECRET_KEY_LIVE` - Your Stripe live secret key (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE` - Your Stripe live publishable key (optional)
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Bybit Configuration

- `BYBIT_API_KEY` - Your Bybit API key
- `BYBIT_SECRET_KEY` - Your Bybit secret key
- `BYBIT_TESTNET` - Set to "true" for testnet, "false" for mainnet

### Discord Configuration (Optional)

- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `DISCORD_CLIENT_SECRET` - Your Discord application client secret
- `DISCORD_REDIRECT_URI` - Your Discord redirect URI
- `DISCORD_GUILD_ID` - Your Discord server ID
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_WEBHOOK_URL` - Your Discord webhook URL
- `DISCORD_WEBHOOK_URL_FREE` - Your Discord free tier webhook URL
- `DISCORD_WEBHOOK_URL_WHITELIST` - Your Discord whitelist webhook URL
- `DISCORD_WEBHOOK_URL_REFUNDS` - Your Discord refunds webhook URL
- `DISCORD_ROLE_FREE` - Discord role ID for free users
- `DISCORD_ROLE_PRO` - Discord role ID for pro users
- `DISCORD_ROLE_PREMIUM` - Discord role ID for premium users

### Site Configuration

- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., https://your-app.onrender.com)
- `NEXT_PUBLIC_VERCEL_URL` - Your Vercel URL (if applicable)

### Other Configuration

- `CRON_SECRET_TOKEN` - Secret token for cron jobs
- `DISABLE_AUTH_MIDDLEWARE` - Set to "true" to disable auth middleware (development only)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Connect your GitHub repository to Render
2. Render will automatically detect the `render.yaml` file
3. Configure all environment variables in the Render dashboard
4. Deploy

### Option 2: Manual Setup

1. Create a new Web Service in Render
2. Connect your GitHub repository
3. Configure the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add all environment variables listed above
5. Deploy

## Post-Deployment

1. Update your Supabase project settings with the new domain
2. Update your Stripe webhook endpoints
3. Update your Discord application redirect URIs
4. Test all functionality

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in package.json
2. **Environment variables missing**: Ensure all required env vars are set
3. **Database connection issues**: Verify Supabase configuration
4. **Webhook failures**: Check webhook URLs and secrets

### Health Check

The application includes a health check endpoint at `/` that Render uses to verify the service is running.

## Security Notes

- Never commit environment variables to your repository
- Use Render's environment variable management
- Regularly rotate API keys and secrets
- Monitor your application logs for any issues

## Support

If you encounter issues during deployment, check:

1. Render application logs
2. Environment variable configuration
3. External service configurations (Supabase, Stripe, etc.)
