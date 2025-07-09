#!/bin/bash

# Vercel Deployment Script for MarketPulse Frontend
set -e

echo "▲ Starting Vercel deployment for MarketPulse Frontend..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel@latest
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel first:"
    vercel login
fi

echo "🔍 Checking current project status..."

# Check if project is linked
if [ -f .vercel/project.json ]; then
    echo "📱 Vercel project already linked. Deploying updates..."
    
    # Deploy to preview first
    echo "🚀 Deploying to preview environment..."
    vercel --confirm
    
    # Ask if user wants to deploy to production
    read -p "Deploy to production? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "🌟 Deploying to production..."
        vercel --prod --confirm
    else
        echo "✅ Preview deployment completed!"
        echo "🔗 Your preview URL is available in the output above"
    fi
else
    echo "🆕 Linking new Vercel project..."
    
    # Link the project (this will prompt for team/project details)
    vercel link
    
    echo "⚙️  Setting up environment variables..."
    echo ""
    echo "Please add these environment variables in your Vercel dashboard:"
    echo "https://vercel.com/[your-team]/[your-project]/settings/environment-variables"
    echo ""
    echo "📋 Required Environment Variables:"
    echo ""
    echo "🗄️  Supabase Configuration:"
    echo "  NEXT_PUBLIC_SUPABASE_URL"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "💳 Stripe Configuration:"
    echo "  STRIPE_SECRET_KEY"
    echo "  STRIPE_SECRET_KEY_LIVE"
    echo "  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE"
    echo "  STRIPE_WEBHOOK_SECRET"
    echo ""
    echo "📈 Bybit Configuration:"
    echo "  BYBIT_API_KEY"
    echo "  BYBIT_SECRET_KEY"
    echo "  BYBIT_TESTNET=true"
    echo ""
    echo "🤖 Discord Configuration:"
    echo "  DISCORD_CLIENT_ID"
    echo "  DISCORD_CLIENT_SECRET"
    echo "  DISCORD_REDIRECT_URI"
    echo "  DISCORD_GUILD_ID"
    echo "  DISCORD_BOT_TOKEN"
    echo "  DISCORD_WEBHOOK_URL"
    echo "  DISCORD_WEBHOOK_URL_FREE"
    echo "  DISCORD_WEBHOOK_URL_WHITELIST"
    echo "  DISCORD_WEBHOOK_URL_REFUNDS"
    echo "  DISCORD_ROLE_FREE"
    echo "  DISCORD_ROLE_PRO"
    echo "  DISCORD_ROLE_PREMIUM"
    echo ""
    echo "🌐 Site Configuration:"
    echo "  NEXT_PUBLIC_SITE_URL"
    echo "  CRON_SECRET_TOKEN"
    echo ""
    echo "⚡ Performance Configuration:"
    echo "  DISABLE_AUTH_MIDDLEWARE=false"
    echo ""
    echo "After setting environment variables, run this script again to deploy!"
fi

echo ""
echo "📝 Important Post-Deployment Steps:"
echo ""
echo "1. 🔗 Update your Stripe webhook URL to:"
echo "   https://your-app.vercel.app/api/webhook"
echo ""
echo "2. 🤖 Update Discord redirect URI to:"
echo "   https://your-app.vercel.app/api/auth/discord/callback"
echo ""
echo "3. 🗄️  Update NEXT_PUBLIC_SITE_URL environment variable to:"
echo "   https://your-app.vercel.app"
echo ""
echo "4. 🧪 Test the deployment:"
echo "   - Authentication flow"
echo "   - Stripe payments"
echo "   - Discord integration"
echo "   - API endpoints"
echo ""
echo "✅ Deployment script completed!" 