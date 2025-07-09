# Vercel Environment Variables Setup

This guide helps you set up environment variables for Vercel deployment.

## 📋 Environment Variables Checklist

Copy these to your Vercel dashboard: `https://vercel.com/[team]/[project]/settings/environment-variables`

### 🗄️ Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 💳 Stripe Configuration

**Test Mode (Development):**

```bash
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Live Mode (Production):**

```bash
STRIPE_SECRET_KEY_LIVE=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_publishable_key
```

### 📈 Bybit Configuration

```bash
BYBIT_API_KEY=your-bybit-api-key
BYBIT_SECRET_KEY=your-bybit-secret-key
BYBIT_TESTNET=true
```

### 🤖 Discord Configuration

```bash
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://your-app.vercel.app/api/auth/discord/callback
DISCORD_GUILD_ID=your-discord-guild-id
DISCORD_BOT_TOKEN=your-discord-bot-token

# Discord Webhooks
DISCORD_WEBHOOK_URL=your-main-webhook-url
DISCORD_WEBHOOK_URL_FREE=your-free-tier-webhook-url
DISCORD_WEBHOOK_URL_WHITELIST=your-whitelist-webhook-url
DISCORD_WEBHOOK_URL_REFUNDS=your-refunds-webhook-url

# Discord Roles
DISCORD_ROLE_FREE=your-free-role-id
DISCORD_ROLE_PRO=your-pro-role-id
DISCORD_ROLE_PREMIUM=your-premium-role-id
```

### 🌐 Site Configuration

```bash
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
CRON_SECRET_TOKEN=your-random-secret-token
```

### ⚡ Performance Configuration

```bash
DISABLE_AUTH_MIDDLEWARE=false
```

## 🚀 Quick Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel@latest
```

### 2. Login and Link Project

```bash
vercel login
vercel link
```

### 3. Set Environment Variables

Either use the Vercel dashboard or CLI:

```bash
# Example using CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter value when prompted
```

### 4. Deploy

```bash
# Deploy using our script
npm run vercel:deploy

# Or deploy manually
vercel --prod
```

## 🔧 Post-Deployment Configuration

### 1. Update Stripe Webhook

In your Stripe dashboard, update webhook URL to:

```
https://your-app.vercel.app/api/webhook
```

### 2. Update Discord Redirect URI

In your Discord application settings, update redirect URI to:

```
https://your-app.vercel.app/api/auth/discord/callback
```

### 3. Update Environment Variables

Set `NEXT_PUBLIC_SITE_URL` to your actual Vercel URL:

```
https://your-app.vercel.app
```

## 🏗️ Vercel-Specific Optimizations

### Function Configuration

Our `vercel.json` includes:

- **30s timeout** for webhook functions
- **60s timeout** for cron jobs
- **Proper routing** for App Router
- **CORS headers** for external APIs

### Serverless Optimization

- ✅ Removed `output: 'standalone'` from Next.js config
- ✅ Optimized middleware to run only on auth-required routes
- ✅ Excluded static assets and external APIs from auth checks
- ✅ Added proper function timeouts for long-running operations

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**: Check environment variables are set correctly
2. **Webhook Failures**: Verify webhook URL in Stripe dashboard
3. **Auth Issues**: Ensure `DISABLE_AUTH_MIDDLEWARE=false` in production
4. **Discord Login**: Verify redirect URI matches Vercel URL

### Debugging Commands

```bash
# Check deployment logs
npm run vercel:logs

# List environment variables
npm run vercel:env

# Open Vercel dashboard
npm run vercel:open
```

## 📊 Performance Benefits of Vercel

- **Edge Network**: Global CDN for faster loading
- **Serverless Functions**: Auto-scaling, no cold starts
- **Build Optimization**: Incremental static regeneration
- **Preview Deployments**: Test changes before production
- **Analytics**: Built-in performance monitoring

## 🔒 Security Best Practices

- ✅ Use Vercel's encrypted environment variables
- ✅ Enable preview protection for staging deployments
- ✅ Set up Vercel's DDoS protection
- ✅ Use proper CORS configuration
- ✅ Regularly rotate API keys and secrets

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Support**: Contact via Vercel dashboard or GitHub issues
