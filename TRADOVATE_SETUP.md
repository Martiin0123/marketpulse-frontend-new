# Tradovate Integration Setup

This guide explains how to set up automatic trade syncing from Tradovate to your trading journal.

## Overview

The Tradovate integration allows you to:

- Connect your Tradovate account via OAuth
- Automatically sync trade executions to your journal
- Map Tradovate trades to your journal accounts
- Enable/disable auto-sync per account
- Manually trigger syncs

## Prerequisites

1. ✅ Tradovate account (any plan works - API access is free)
2. ✅ Tradovate API credentials (Client ID and Secret)
3. ✅ Trading journal account created

## Step 1: Get Tradovate API Credentials

1. **Log into Tradovate**
2. **Go to Settings** → API Management
3. **Create a new API application**:
   - Application Name: `PrimeScope Journal`
   - Redirect URI: `https://your-domain.com/api/tradovate/oauth/callback`
   - Scopes: `read`, `trade`
4. **Save your Client ID and Client Secret**

## Step 2: Configure Environment Variables

Add these to your `.env.local` (for development) and Vercel environment variables (for production):

```bash
# Tradovate OAuth Credentials
NEXT_PUBLIC_TRADOVATE_CLIENT_ID=your_client_id_here
TRADOVATE_CLIENT_SECRET=your_client_secret_here

# Optional: Custom API URL (defaults to production)
TRADOVATE_API_URL=https://api.tradovate.com/v1

# Optional: Cron secret for scheduled syncs
CRON_SECRET=your_random_secret_here
```

**Important Notes:**

- `NEXT_PUBLIC_TRADOVATE_CLIENT_ID` must be prefixed with `NEXT_PUBLIC_` because it's used in the browser
- `TRADOVATE_CLIENT_SECRET` should NEVER be exposed to the browser
- Keep your secrets secure and never commit them to git

## Step 3: Run Database Migration

Run the migration to create the necessary tables:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard
# Run: supabase/migrations/20250126000000_add_tradovate_integration.sql
```

## Step 4: Connect Your Account

1. **Go to Journal** → **Settings**
2. **Find your trading account** in the Account Management section
3. **Click "Connect Tradovate Account"**
4. **Authorize the connection** in the Tradovate OAuth flow
5. **You'll be redirected back** to the journal

## Step 5: Configure Auto-Sync

After connecting:

- **Auto-sync** is enabled by default
- Trades will sync automatically every 10 minutes (via cron job)
- You can toggle auto-sync on/off per account
- Use "Sync Now" to manually trigger a sync

## How It Works

### Automatic Syncing

1. **Cron job runs** every 10 minutes (`/api/cron/sync-tradovate`)
2. **Fetches all active connections** with auto-sync enabled
3. **Syncs trades** from Tradovate for each connection
4. **Maps trades** to your journal format
5. **Deduplicates** trades (won't import the same trade twice)

### Manual Syncing

- Click **"Sync Now"** button in the Tradovate connection card
- Useful for immediate sync or testing

### Trade Mapping

Tradovate fills are mapped to your journal trades:

- **Symbol**: Tradovate contract symbol
- **Side**: Buy → Long, Sell → Short
- **Entry/Exit Price**: Fill price
- **RR**: Calculated from realized PnL (may need adjustment)
- **Status**: Always "closed" (executed trades)
- **Sync Source**: Marked as "tradovate"

**Note**: The RR calculation is simplified. You may need to adjust the mapping logic in `utils/tradovate/sync-service.ts` based on your trading strategy.

## Troubleshooting

### Connection Issues

- **"OAuth failed"**: Check your redirect URI matches exactly in Tradovate settings
- **"Account not found"**: Verify the trading account exists and belongs to you
- **"Unauthorized"**: Make sure you're logged in

### Sync Issues

- **"No trades synced"**:
  - Check if you have trades in Tradovate for the selected account
  - Verify the account name matches between Tradovate and your connection
  - Check the sync date range (defaults to last 30 days)

- **"Token expired"**:
  - The system should auto-refresh tokens
  - If issues persist, disconnect and reconnect

- **"Sync error"**:
  - Check the error message in the connection card
  - Verify your Tradovate account is active
  - Check API rate limits

### Database Issues

- **"Table not found"**: Run the migration: `supabase/migrations/20250126000000_add_tradovate_integration.sql`
- **"Permission denied"**: Check RLS policies are enabled

## Security Notes

- **OAuth tokens** are stored encrypted in the database
- **Tokens auto-refresh** before expiration
- **RLS policies** ensure users can only access their own connections
- **API secrets** are never exposed to the browser

## API Endpoints

- `GET /api/tradovate/oauth` - Initiate OAuth flow
- `GET /api/tradovate/oauth/callback` - OAuth callback handler
- `POST /api/tradovate/sync?tradovate_account_id=xxx` - Manual sync
- `GET /api/cron/sync-tradovate` - Automatic sync (cron)

## Cost

- **API Access**: Free (included with any Tradovate account)
- **Trading Commissions**: Your existing Tradovate plan fees
- **No additional costs** for the integration

## Support

For issues or questions:

1. Check the error messages in the connection card
2. Review server logs for detailed errors
3. Verify your Tradovate API credentials are correct
4. Ensure the database migration has been applied
