#!/bin/bash

# Script to check rate limiting status

echo "🔍 Checking rate limiting status..."

# Check if auth middleware is disabled
if [ "$DISABLE_AUTH_MIDDLEWARE" = "true" ]; then
    echo "✅ Auth middleware is DISABLED"
    echo "📝 This should prevent 429 errors"
else
    echo "⚠️  Auth middleware is ENABLED"
    echo "📝 You may experience 429 errors"
    echo ""
    echo "To disable auth middleware, run:"
    echo "source scripts/disable-auth.sh"
fi

echo ""
echo "🔧 Current environment:"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "DISABLE_AUTH_MIDDLEWARE: ${DISABLE_AUTH_MIDDLEWARE:-not set}"

echo ""
echo "📊 To monitor for 429 errors, check your browser's Network tab"
echo "🔗 Or run: curl -s http://localhost:3001 | grep -i '429'" 