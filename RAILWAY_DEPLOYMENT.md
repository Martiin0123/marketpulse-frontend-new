# Railway Deployment Guide

This guide will help you migrate your MarketPulse Frontend from Render to Railway.

## Prerequisites

1. **Install Railway CLI**

   ```bash
   npm install -g @railway/cli
   # or
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Create a Railway account and login**
   ```bash
   railway login
   ```

## Quick Migration Steps

### 1. Automated Deployment (Recommended)

Run the deployment script:

```bash
./scripts/deploy-railway.sh
```

This script will:

- Check if Railway CLI is installed
- Verify you're logged in
- Initialize the project if it doesn't exist
- Guide you through setting environment variables

### 2. Manual Deployment

If you prefer manual control:

```bash
# Login to Railway
railway login

# Initialize the project
railway init

# Set environment variables (see section below)
railway variables set NEXT_PUBLIC_SUPABASE_URL="your-value"

# Deploy
railway up
```

### 3. Deploy from GitHub (Alternative)

You can also connect your GitHub repository directly:

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Set environment variables in the dashboard
6. Railway will automatically deploy

## Environment Variables

You need to migrate all environment variables from Render. You can set them using:

### CLI Method

```bash
railway variables set VARIABLE_NAME="value"
```

### Dashboard Method

1. Go to your project dashboard
2. Click on "Variables" tab
3. Add each environment variable

### Required Environment Variables

Copy these from your Render dashboard:

#### Supabase Configuration

```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### Stripe Configuration

```bash
railway variables set STRIPE_SECRET_KEY="your-stripe-secret"
railway variables set STRIPE_SECRET_KEY_LIVE="your-stripe-live-secret"
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-publishable-key"
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE="your-live-publishable-key"
railway variables set STRIPE_WEBHOOK_SECRET="your-webhook-secret"
```

#### Bybit Configuration

```bash
railway variables set BYBIT_API_KEY="your-bybit-api-key"
railway variables set BYBIT_SECRET_KEY="your-bybit-secret"
```

#### Discord Configuration

```bash
railway variables set DISCORD_CLIENT_ID="your-discord-client-id"
railway variables set DISCORD_CLIENT_SECRET="your-discord-secret"
railway variables set DISCORD_REDIRECT_URI="your-redirect-uri"
railway variables set DISCORD_GUILD_ID="your-guild-id"
railway variables set DISCORD_BOT_TOKEN="your-bot-token"
railway variables set DISCORD_WEBHOOK_URL="your-webhook-url"
railway variables set DISCORD_WEBHOOK_URL_FREE="your-free-webhook"
railway variables set DISCORD_WEBHOOK_URL_WHITELIST="your-whitelist-webhook"
railway variables set DISCORD_WEBHOOK_URL_REFUNDS="your-refunds-webhook"
railway variables set DISCORD_ROLE_FREE="your-free-role"
railway variables set DISCORD_ROLE_PRO="your-pro-role"
railway variables set DISCORD_ROLE_PREMIUM="your-premium-role"
```

#### Site Configuration

```bash
railway variables set NEXT_PUBLIC_SITE_URL="https://your-app.railway.app"
railway variables set CRON_SECRET_TOKEN="your-cron-token"
```

### View Current Environment Variables

```bash
railway variables
```

## Domain Configuration

### Custom Domain (Optional)

1. **Add your domain in Railway Dashboard**
   - Go to your project settings
   - Click on "Domains" tab
   - Add your custom domain

2. **Add DNS records** (provided by Railway after adding domain)
   - Add CNAME record pointing to Railway's domain

3. **SSL Certificate** - Railway automatically handles SSL certificates

## Monitoring and Management

### View app status

```bash
railway status
```

### View logs

```bash
railway logs
```

### Deploy updates

```bash
railway up
```

### Open app in browser

```bash
railway open
```

### View dashboard

```bash
railway dashboard
```

## Configuration Files

The following files have been created for Railway deployment:

- `railway.toml` - Main Railway configuration
- `scripts/deploy-railway.sh` - Automated deployment script
- `Dockerfile` - Already optimized for production (unchanged)
- `.dockerignore` - Optimized build context (unchanged)

## Important Notes

1. **Update NEXT_PUBLIC_SITE_URL**: Make sure to update this to your Railway URL (`https://your-app.railway.app`)

2. **Discord Redirect URI**: Update your Discord app settings to include the new Railway URL

3. **Stripe Webhooks**: Update your Stripe webhook endpoints to point to the new Railway URL

4. **Database**: Your Supabase database configuration remains the same

5. **Costs**: Railway has different pricing than Render. They offer:
   - $5/month for Hobby plan
   - Usage-based pricing for Pro plan
   - Free tier with 500 execution hours

## Migration Checklist

- [ ] Install Railway CLI
- [ ] Create Railway account
- [ ] Run deployment script or deploy manually
- [ ] Set all environment variables
- [ ] Test the deployed application
- [ ] Update external service webhooks/redirects
- [ ] Configure custom domain (if needed)
- [ ] Update DNS records
- [ ] Verify all functionality works
- [ ] Decommission Render app (when ready)

## Deployment Options

### Option 1: CLI Deployment

```bash
railway up
```

### Option 2: GitHub Integration

- Connect your GitHub repository
- Automatic deployments on push
- PR deployments available

### Option 3: Docker Deployment

Railway will automatically detect your Dockerfile and use it for deployment.

## Troubleshooting

### Common Issues

1. **Build failures**: Check build logs in Railway dashboard
2. **Environment variables**: Verify with `railway variables`
3. **Memory issues**: Upgrade to higher plan if needed
4. **Port issues**: Ensure your app listens on PORT environment variable

### Logs and Debugging

```bash
# View real-time logs
railway logs --follow

# View specific service logs
railway logs [service-name]
```

### Health Checks

Railway automatically monitors your application health through the configured healthcheck path (`/`).

## Support

- Railway Documentation: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Help Center: https://help.railway.app/
- This project's issues: Create an issue in the repository

## Cost Optimization

- **Hobby Plan**: $5/month with generous limits
- **Usage-based**: Pay only for what you use
- **Sleep mode**: Apps automatically sleep when inactive (free tier)
- **Resource limits**: Set limits to control costs

## Advantages of Railway over Render

1. **Faster deployments**: Railway typically deploys faster
2. **Better pricing**: More transparent and often cheaper
3. **Excellent DX**: Great developer experience and tooling
4. **Database hosting**: Easy to add databases (PostgreSQL, MySQL, Redis)
5. **Preview deployments**: Automatic PR deployments
6. **Better monitoring**: Built-in metrics and monitoring

## Additional Railway Features

### Add a Database

```bash
railway add postgresql
# or
railway add mysql
# or
railway add redis
```

### Environment Management

```bash
# Create staging environment
railway environment create staging

# Switch environments
railway environment staging
```

### Metrics and Monitoring

- Built-in CPU, memory, and network monitoring
- Application metrics dashboard
- Log aggregation and search
