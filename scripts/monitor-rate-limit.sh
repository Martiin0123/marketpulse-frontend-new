#!/bin/bash

# Rate limiting monitoring script
echo "📊 Rate Limiting Monitor"
echo "========================"

# Check if Redis is running
if pgrep -x "redis-server" > /dev/null; then
    echo "✅ Redis server is running"
    
    # Test Redis connection
    if redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis connection is healthy"
        
        # Show Redis info
        echo ""
        echo "📈 Redis Statistics:"
        redis-cli info | grep -E "(connected_clients|used_memory|keyspace_hits|keyspace_misses)" | head -4
        
        # Show rate limiting keys
        echo ""
        echo "🔑 Rate Limiting Keys:"
        redis-cli keys "rate_limit:*" | wc -l | xargs echo "Active rate limit keys:"
        
    else
        echo "❌ Redis connection failed"
    fi
else
    echo "❌ Redis server is not running"
    echo "💡 Start Redis with: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
fi

echo ""
echo "🔍 Checking for rate limiting issues..."

# Check for 429 errors in logs (if available)
if [ -f ".next/logs/error.log" ]; then
    echo ""
    echo "📝 Recent 429 errors:"
    grep -i "429\|rate limit\|too many requests" .next/logs/error.log | tail -5
fi

# Check environment variables
echo ""
echo "🔧 Environment Configuration:"
echo "DISABLE_AUTH_MIDDLEWARE: ${DISABLE_AUTH_MIDDLEWARE:-not set}"
echo "REDIS_URL: ${REDIS_URL:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"

# Check if the app is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running on http://localhost:3000"
else
    echo "❌ Application is not running"
    echo "💡 Start with: npm run dev"
fi

echo ""
echo "📋 Quick Fixes:"
echo "1. If getting 429 errors: npm run dev:no-auth"
echo "2. If Redis issues: npm run setup:redis"
echo "3. If middleware issues: export DISABLE_AUTH_MIDDLEWARE=true"
echo "4. Monitor logs: tail -f .next/logs/error.log"

echo ""
echo "🔗 Useful Commands:"
echo "- Start Redis: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
echo "- Monitor Redis: redis-cli monitor"
echo "- Check Redis keys: redis-cli keys 'rate_limit:*'"
echo "- Clear Redis: redis-cli flushall"
echo "- View app logs: npm run dev 2>&1 | grep -E '(rate limit|429|auth)'" 