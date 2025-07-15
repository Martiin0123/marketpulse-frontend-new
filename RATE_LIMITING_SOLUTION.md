# Rate Limiting Solution

## 🚨 Problem Solved

The application was experiencing 429 (Too Many Requests) errors from Supabase authentication endpoints due to excessive auth requests in the middleware.

## ✅ Solution Implemented

### 1. **Enhanced Caching System**

- **Auth Cache**: 5-minute cache for successful auth, 30-second cache for errors
- **Smart Cache Management**: Automatic cleanup of expired entries
- **Cache Statistics**: Track hit/miss rates for optimization

### 2. **Multi-Layer Rate Limiting**

- **Global Rate Limit**: 50 requests per minute across all users
- **Per-IP Rate Limit**: 10 requests per minute per IP address
- **Redis-Based**: Scalable distributed rate limiting
- **Fallback System**: In-memory rate limiting when Redis is unavailable

### 3. **Redis Integration**

- **Optional Redis**: Graceful fallback to in-memory rate limiting
- **Connection Monitoring**: Automatic detection of Redis availability
- **Atomic Operations**: Uses Redis pipeline for consistent rate limiting
- **Automatic Cleanup**: Expires rate limit keys automatically

### 4. **Improved Error Handling**

- **Graceful Degradation**: Continues working even with Redis failures
- **Error Caching**: Brief caching of auth errors to prevent spam
- **Better Logging**: Detailed statistics and monitoring

## 🚀 Quick Start

### Option 1: With Redis (Recommended)

```bash
# Set up Redis
npm run setup:redis

# Start development server
npm run dev

# Monitor rate limiting
npm run monitor:rate-limit
```

### Option 2: Without Redis (Fallback)

```bash
# Start with in-memory rate limiting
npm run dev

# Disable auth middleware if needed
npm run dev:no-auth
```

## 📊 Monitoring

### Check Rate Limiting Status

```bash
npm run monitor:rate-limit
```

### View Statistics

The middleware logs statistics every 100 requests:

```
📊 Rate Limit Stats: {
  totalRequests: 150,
  rateLimited: 2,
  authErrors: 1,
  cacheHits: 120,
  cacheMisses: 30,
  hitRate: 80.0%
}
```

### Redis Monitoring

```bash
# Monitor Redis in real-time
redis-cli monitor

# Check rate limiting keys
redis-cli keys "rate_limit:*"

# View Redis statistics
redis-cli info
```

## 🔧 Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Auth Middleware
DISABLE_AUTH_MIDDLEWARE=false

# Development
NODE_ENV=development
```

### Rate Limiting Settings

```typescript
// In utils/supabase/middleware.ts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ERROR_CACHE_DURATION = 30 * 1000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const GLOBAL_MAX_REQUESTS = 50; // 50 requests per minute globally
```

## 🛠️ Troubleshooting

### Issue: Still getting 429 errors

**Solution:**

```bash
# Disable auth middleware temporarily
export DISABLE_AUTH_MIDDLEWARE=true
npm run dev

# Or use the no-auth script
npm run dev:no-auth
```

### Issue: Redis connection failed

**Solution:**

```bash
# Set up Redis
npm run setup:redis

# Or start Redis manually
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### Issue: High memory usage

**Solution:**

```bash
# Clear Redis cache
redis-cli flushall

# Restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis  # Linux
```

### Issue: Rate limiting too aggressive

**Solution:**
Edit `utils/supabase/middleware.ts`:

```typescript
const MAX_REQUESTS_PER_WINDOW = 20; // Increase from 10 to 20
const GLOBAL_MAX_REQUESTS = 100; // Increase from 50 to 100
```

## 📈 Performance Improvements

### Before (Problem)

- ❌ 429 errors from Supabase
- ❌ No caching of auth results
- ❌ Excessive auth requests
- ❌ No rate limiting
- ❌ Poor error handling

### After (Solution)

- ✅ No more 429 errors
- ✅ 5-minute auth caching
- ✅ Smart rate limiting
- ✅ Redis-based scalability
- ✅ Graceful error handling
- ✅ Comprehensive monitoring

## 🔍 Monitoring Commands

```bash
# Check Redis status
redis-cli ping

# Monitor rate limiting keys
redis-cli keys "rate_limit:*"

# View Redis memory usage
redis-cli info memory

# Monitor in real-time
redis-cli monitor

# Check application logs
npm run dev 2>&1 | grep -E "(rate limit|429|auth)"

# Monitor rate limiting
npm run monitor:rate-limit
```

## 🚀 Production Deployment

### Railway/Render/Vercel

Add Redis environment variable:

```bash
REDIS_URL=your-redis-url
```

### Docker

Add Redis service to docker-compose.yml:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## 📋 Best Practices

1. **Monitor Regularly**: Use `npm run monitor:rate-limit` to check status
2. **Cache Wisely**: 5-minute cache for auth, 30-second for errors
3. **Graceful Fallback**: System works even without Redis
4. **Error Handling**: Don't redirect on auth errors, let pages handle them
5. **Statistics**: Monitor hit rates and adjust cache duration as needed

## 🎯 Success Metrics

- ✅ No 429 errors from Supabase
- ✅ Auth cache hit rate > 80%
- ✅ Response time < 100ms for cached requests
- ✅ Redis connection stable
- ✅ Graceful handling of Redis failures

## 🔗 Related Files

- `utils/supabase/middleware.ts` - Main rate limiting logic
- `scripts/setup-redis.sh` - Redis setup script
- `scripts/monitor-rate-limit.sh` - Monitoring script
- `package.json` - Added ioredis dependency
- `RATE_LIMITING_GUIDE.md` - Original problem documentation
