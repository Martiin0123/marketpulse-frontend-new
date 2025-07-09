#!/bin/bash

# Railway Environment Variables Setup Script
set -e

echo "🚂 Setting up Railway environment variables..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Installing now..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    railway login
fi

echo "⚙️  Setting Supabase environment variables..."
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://aehfqzahaorltbhfctsd.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaGZxemFoYW9ybHRiaGZjdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTUzMTEsImV4cCI6MjA2NzI3MTMxMX0.Ehzjr0Xr1e4IsigAnQmzxNc8z8ql9hJyfkWSfdPSJL4"

echo "⚙️  Please set the following environment variables manually:"
echo ""
echo "REQUIRED - Replace with your actual values:"
echo "  railway variables set SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key\""
echo "  railway variables set STRIPE_SECRET_KEY=\"your-stripe-secret\""
echo "  railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\"your-stripe-publishable-key\""
echo "  railway variables set STRIPE_WEBHOOK_SECRET=\"your-stripe-webhook-secret\""
echo "  railway variables set BYBIT_API_KEY=\"your-bybit-api-key\""
echo "  railway variables set BYBIT_SECRET_KEY=\"your-bybit-secret\""
echo "  railway variables set DISCORD_CLIENT_ID=\"your-discord-client-id\""
echo "  railway variables set DISCORD_CLIENT_SECRET=\"your-discord-secret\""
echo "  railway variables set DISCORD_BOT_TOKEN=\"your-discord-bot-token\""
echo "  railway variables set NEXT_PUBLIC_SITE_URL=\"https://your-app.railway.app\""
echo "  railway variables set CRON_SECRET_TOKEN=\"your-cron-token\""
echo ""
echo "OPTIONAL - Set if you use them:"
echo "  railway variables set DISCORD_REDIRECT_URI=\"https://your-app.railway.app/api/auth/discord/callback\""
echo "  railway variables set DISCORD_GUILD_ID=\"your-guild-id\""
echo "  railway variables set DISCORD_WEBHOOK_URL=\"your-webhook-url\""
echo "  railway variables set DISCORD_WEBHOOK_URL_FREE=\"your-free-webhook\""
echo "  railway variables set DISCORD_WEBHOOK_URL_WHITELIST=\"your-whitelist-webhook\""
echo "  railway variables set DISCORD_WEBHOOK_URL_REFUNDS=\"your-refunds-webhook\""
echo "  railway variables set DISCORD_ROLE_FREE=\"your-free-role\""
echo "  railway variables set DISCORD_ROLE_PRO=\"your-pro-role\""
echo "  railway variables set DISCORD_ROLE_PREMIUM=\"your-premium-role\""
echo "  railway variables set STRIPE_SECRET_KEY_LIVE=\"your-live-stripe-secret\""
echo "  railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=\"your-live-publishable-key\""
echo ""
echo "✅ Basic Supabase variables set! Please set the remaining variables and then redeploy:"
echo "   railway up" 