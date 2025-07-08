# Rate Limiting Guide

## Problem

You're experiencing 429 (Too Many Requests) errors from Supabase authentication endpoints. This is happening because your application is making too many authentication requests to Supabase.

## Solutions

### 1. Immediate Fix (Development)

#### Option A: Docker (Recommended)

For the easiest setup with auth middleware disabled:

```bash
# Quick start with auth disabled (recommended for development)
./scripts/docker-dev.sh

# Or with auth enabled (for testing authentication)
./scripts/docker-dev-auth.sh

# Manual Docker commands
docker-compose -f docker-compose.dev.yml up --build
```

#### Option B: Local Development

To reduce rate limiting during development, you can temporarily disable auth middleware:

```bash
# Run this script to disable auth middleware
./scripts/disable-auth.sh

# Or manually set the environment variable
export DISABLE_AUTH_MIDDLEWARE=true

# Restart your development server
npm run dev
```

### 2. Production Optimizations

The middleware has been updated with several optimizations:

- **Caching**: Auth results are cached for 30 seconds
- **Rate Limiting**: Max 10 auth requests per minute per IP
- **Selective Processing**: Only processes routes that need authentication
- **Error Handling**: Gracefully handles rate limit errors

### 3. Environment Variables

- `DISABLE_AUTH_MIDDLEWARE=true`: Disables auth middleware (development only)
- `NODE_ENV=development`: Enables development optimizations

### 4. Monitoring

Check your Supabase dashboard for:

- Authentication logs
- Rate limit metrics
- API usage statistics

### 5. Best Practices

- Avoid frequent page refreshes during development
- Use the disable script when testing
- Monitor your Supabase usage
- Consider upgrading your Supabase plan if needed

## Troubleshooting

### If you still get rate limited:

1. Wait 1-2 minutes for the rate limit to reset
2. Use the disable script
3. Check your Supabase dashboard for usage patterns
4. Consider implementing a more robust caching solution

### For production:

- Monitor your auth request patterns
- Consider implementing Redis for caching
- Optimize your authentication flow
- Upgrade your Supabase plan if necessary
