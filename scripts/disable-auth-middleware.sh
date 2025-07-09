#!/bin/bash

# Emergency script to disable auth middleware in production
# Use this if Supabase rate limiting becomes severe

echo "🚨 EMERGENCY: Disabling auth middleware in production"
echo ""
echo "This will disable ALL authentication checks in middleware."
echo "Use only as a temporary measure during rate limit emergencies."
echo ""
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    if command -v railway &> /dev/null; then
        echo "Setting DISABLE_AUTH_MIDDLEWARE=true in Railway..."
        railway variables set DISABLE_AUTH_MIDDLEWARE=true
        echo "✅ Auth middleware disabled"
        echo ""
        echo "To re-enable auth middleware later, run:"
        echo "   railway variables set DISABLE_AUTH_MIDDLEWARE=false"
        echo ""
        echo "🔄 You may need to redeploy for changes to take effect:"
        echo "   railway up"
    else
        echo "❌ Railway CLI not found. Please install it first:"
        echo "   npm install -g @railway/cli"
    fi
else
    echo "❌ Operation cancelled"
fi 