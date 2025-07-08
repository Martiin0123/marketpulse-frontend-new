#!/bin/bash

# Railway Deployment Script for MarketPulse Frontend
set -e

echo "🚂 Starting Railway deployment for MarketPulse Frontend..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    echo "   railway login"
    exit 1
fi

# Check if project exists
if railway status &> /dev/null; then
    echo "📱 Railway project already exists. Deploying updates..."
    railway up
else
    echo "🆕 Creating new Railway project..."
    
    # Initialize the project
    railway login
    railway init
    
    echo "⚙️  Setting up environment variables..."
    echo "Please set your environment variables using Railway dashboard or CLI:"
    echo "   railway variables set VARIABLE_NAME=value"
    echo ""
    echo "Required environment variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - STRIPE_SECRET_KEY"
    echo "   - STRIPE_SECRET_KEY_LIVE"
    echo "   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE"
    echo "   - STRIPE_WEBHOOK_SECRET"
    echo "   - BYBIT_API_KEY"
    echo "   - BYBIT_SECRET_KEY"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - DISCORD_CLIENT_SECRET"
    echo "   - DISCORD_REDIRECT_URI"
    echo "   - DISCORD_GUILD_ID"
    echo "   - DISCORD_BOT_TOKEN"
    echo "   - DISCORD_WEBHOOK_URL"
    echo "   - DISCORD_WEBHOOK_URL_FREE"
    echo "   - DISCORD_WEBHOOK_URL_WHITELIST"
    echo "   - DISCORD_WEBHOOK_URL_REFUNDS"
    echo "   - DISCORD_ROLE_FREE"
    echo "   - DISCORD_ROLE_PRO"
    echo "   - DISCORD_ROLE_PREMIUM"
    echo "   - NEXT_PUBLIC_SITE_URL"
    echo "   - CRON_SECRET_TOKEN"
    echo ""
    echo "After setting environment variables, run:"
    echo "   railway up"
fi

echo "✅ Deployment script completed!"
echo "🌐 Your app will be available at: https://your-app.railway.app" 