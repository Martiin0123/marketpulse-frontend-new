#!/bin/bash

# Script to disable auth middleware for development
# This prevents 429 rate limit errors from Supabase

echo "🔧 Disabling auth middleware for development..."

# Set environment variable to disable auth middleware
export DISABLE_AUTH_MIDDLEWARE=true

echo "✅ Auth middleware disabled"
echo "📝 Environment variable set: DISABLE_AUTH_MIDDLEWARE=true"
echo ""
echo "🚀 You can now run: npm run dev"
echo "⚠️  Remember: This is for development only!"
echo ""
echo "To re-enable auth middleware, unset the environment variable:"
echo "unset DISABLE_AUTH_MIDDLEWARE" 