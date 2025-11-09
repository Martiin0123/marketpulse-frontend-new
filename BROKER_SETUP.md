# Broker Integration Setup Guide

This guide explains how to set up automatic trade syncing from Tradovate and Project X to your trading journal.

## Overview

The broker integration allows you to:

- Connect multiple broker accounts (Tradovate, Project X) via OAuth
- Automatically sync trade executions to your journal
- Map broker trades to your journal accounts
- Enable/disable auto-sync per account
- Manually trigger syncs

## Prerequisites

1. ✅ Broker account (Tradovate or Project X)
2. ✅ Broker API credentials (Client ID and Secret)
3. ✅ Trading journal account created

## Error: "TRADOVATE_CLIENT_ID not configured"

This error means you need to set up the environment variables for the broker you want to use.

## Step 1: Get Broker API Credentials

### For Tradovate:

**Prerequisites:**

- ✅ Live Tradovate account with more than $1,000 in equity
- ✅ Completed CME Information License Agreement

**Steps:**

1. **Log into your Tradovate account**
   - Go to: https://app.tradovate.com

2. **Navigate to Application Settings**
   - Click your profile/account menu
   - Select **"Application Settings"**

3. **Subscribe to API Access** (if not already subscribed)
   - Go to the **"Add-Ons"** tab
   - Find **"API Access"** and subscribe to it
   - This is a paid add-on (check current pricing on Tradovate)

4. **Register OAuth Application**
   - Go to the **"API Access"** tab in Application Settings
   - Click **"OAuth Registration"** button
   - Fill in the form:
     - **App Title**: `PrimeScope Journal` (or your app name)
     - **Redirect URI**:
       - For production: `https://your-domain.com/api/broker/oauth/callback`
       - For local dev: `http://localhost:3000/api/broker/oauth/callback`
     - **Optional**: Privacy policy URL, Terms URL, Logo
   - Set permissions (typically: `read`, `trade`)
   - Click **"Generate"**

5. **Save Your Credentials** ⚠️
   - **Client ID** and **Client Secret** will be shown **ONLY ONCE**
   - Copy them immediately and store securely
   - You cannot retrieve them again if lost

**Direct Links:**

- Tradovate Login: https://app.tradovate.com
- Application Settings: https://app.tradovate.com/#/settings
- OAuth Registration Guide: https://tradovate.zendesk.com/hc/en-us/articles/4403100442515-How-Do-I-Register-an-OAuth-App

### For Project X:

**Note:** "Project X" may refer to a different broker. If you're using a broker called "Project X", please check their documentation for OAuth registration. The steps are typically similar:

1. **Log into your Project X account**
2. **Navigate to API/Settings section**
3. **Create OAuth application** with:
   - Application Name: `PrimeScope Journal`
   - Redirect URI: `https://your-domain.com/api/broker/oauth/callback`
4. **Save your Client ID and Client Secret**

If "Project X" doesn't have OAuth yet, you may need to:

- Contact their support for API access
- Use API keys instead (if supported)
- Wait for OAuth support to be added

## Step 2: Configure Environment Variables

Add these to your `.env.local` (for development) and Vercel environment variables (for production):

### For Tradovate:

```bash
# Tradovate OAuth Credentials
NEXT_PUBLIC_TRADOVATE_CLIENT_ID=your_tradovate_client_id_here
TRADOVATE_CLIENT_SECRET=your_tradovate_client_secret_here

# Optional: Custom API URL (defaults to production)
TRADOVATE_API_URL=https://api.tradovate.com/v1
```

### For Project X:

**No environment variables needed!** Project X uses API key authentication where users enter their credentials directly in the frontend.

**Optional:** If Project X uses a different API base URL, you can set:

```bash
# Optional: Custom API URL (defaults to https://api.projectx.com/v1)
PROJECTX_API_URL=https://api.projectx.com/v1
```

**Note:** Users will enter their own API Key and API Secret in the Journal Settings page. These are stored securely in the database per user.

### Common Settings:

```bash
# Optional: Cron secret for scheduled syncs
CRON_SECRET=your_random_secret_here
```

**Important Notes:**

- Variables prefixed with `NEXT_PUBLIC_` are used in the browser (Client ID)
- Secret variables (without `NEXT_PUBLIC_`) should NEVER be exposed to the browser
- Keep your secrets secure and never commit them to git
- You can set up both Tradovate and Project X if you use both brokers

## Step 3: Run Database Migration

Run the migration to create/update the necessary tables:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard
# Run: supabase/migrations/20250126000001_add_projectx_integration.sql
```

**Note:** This migration renames `tradovate_accounts` to `broker_connections` to support multiple brokers.

## Step 4: Connect Your Account

1. **Go to Journal** → **Settings**
2. **Find your trading account** in the Account Management section
3. **Click "Connect Tradovate Account"** or **"Connect Project X Account"**
4. **Authorize the connection** in the broker's OAuth flow
5. **You'll be redirected back** to the journal

## Step 5: Configure Auto-Sync

After connecting:

- **Auto-sync** is enabled by default
- Trades will sync automatically every 10 minutes (via cron job)
- You can toggle auto-sync on/off per account
- Use "Sync Now" to manually trigger a sync

## How It Works

### Automatic Syncing

1. **Cron job runs** every 10 minutes (`/api/cron/sync-brokers`)
2. **Fetches all active connections** with auto-sync enabled (both Tradovate and Project X)
3. **Syncs trades** from each broker for each connection
4. **Maps trades** to your journal format
5. **Deduplicates** trades (won't import the same trade twice)

### Manual Syncing

- Click **"Sync Now"** button in the broker connection card
- Useful for immediate sync or testing

### Trade Mapping

Broker trades are mapped to your journal trades:

- **Symbol**: Broker contract symbol
- **Side**: Buy → Long, Sell → Short
- **Entry/Exit Price**: Fill/execution price
- **RR**: Calculated from realized PnL using account's fixed_risk
- **Status**: Always "closed" (executed trades)
- **Sync Source**: Marked as "tradovate" or "projectx"

## Troubleshooting

### Connection Issues

- **"OAuth failed"**: Check your redirect URI matches exactly in broker settings
- **"Account not found"**: Verify the trading account exists and belongs to you
- **"Unauthorized"**: Make sure you're logged in
- **"CLIENT_ID not configured"**: Set the environment variables (see Step 2)

### Sync Issues

- **"No trades synced"**:
  - Check if you have trades in the broker for the selected account
  - Verify the account name matches between broker and your connection
  - Check the sync date range (defaults to last 30 days)

- **"Token expired"**:
  - The system should auto-refresh tokens
  - If issues persist, disconnect and reconnect

- **"Sync error"**:
  - Check the error message in the connection card
  - Verify your broker account is active
  - Check API rate limits

### Database Issues

- **"Table not found"**: Run the migration: `supabase/migrations/20250126000001_add_projectx_integration.sql`
- **"Permission denied"**: Check RLS policies are enabled

## API Endpoints

- `GET /api/broker/oauth?broker=tradovate|projectx&trading_account_id=xxx` - Initiate OAuth flow
- `GET /api/broker/oauth/callback` - OAuth callback handler
- `POST /api/broker/sync?broker_connection_id=xxx` - Manual sync
- `GET /api/cron/sync-brokers` - Automatic sync (cron)

## Cost

- **API Access**: Free (included with broker accounts)
- **Trading Commissions**: Your existing broker plan fees
- **No additional costs** for the integration

## Support

For issues or questions:

1. Check the error messages in the connection card
2. Review server logs for detailed errors
3. Verify your broker API credentials are correct
4. Ensure the database migration has been applied
