# Tradovate OAuth - Quick Start Guide

## Where to Find OAuth Registration

### Step-by-Step with Screenshots Location:

1. **Login to Tradovate**
   - URL: https://app.tradovate.com
   - Use your regular Tradovate account credentials

2. **Go to Application Settings**
   - Click your **profile icon** (top right)
   - Select **"Application Settings"** from the menu
   - Or go directly to: https://app.tradovate.com/#/settings

3. **Subscribe to API Access** (One-time purchase)
   - Click the **"Add-Ons"** tab
   - Find **"API Access"** in the list
   - Click **"Subscribe"** or **"Purchase"**
   - Complete payment (check current pricing)

4. **Register OAuth App**
   - Click the **"API Access"** tab
   - Look for **"OAuth Registration"** button
   - Click it to open the registration form

5. **Fill Out the Form**

   ```
   App Title: PrimeScope Journal
   Redirect URI: https://your-domain.com/api/broker/oauth/callback

   For local development:
   Redirect URI: http://localhost:3000/api/broker/oauth/callback
   ```

6. **Generate Credentials**
   - Click **"Generate"**
   - **IMPORTANT**: Copy both Client ID and Client Secret immediately
   - They will NOT be shown again!

## Exact Navigation Path

```
Tradovate Website
  → Login (top right)
  → Application Settings
    → Add-Ons tab
      → Subscribe to "API Access"
    → API Access tab
      → "OAuth Registration" button
        → Fill form → Generate
```

## Requirements

- ✅ Live Tradovate account
- ✅ Account equity > $1,000
- ✅ CME Information License Agreement completed
- ✅ API Access add-on purchased

## Troubleshooting

**"I don't see API Access tab"**

- Make sure you've subscribed to the API Access add-on first
- Check that your account meets the requirements (equity > $1,000)

**"I can't find OAuth Registration"**

- Make sure you're on the "API Access" tab (not "Add-Ons")
- Look for a button or link that says "OAuth Registration" or "Register OAuth App"

**"Redirect URI error"**

- Make sure the redirect URI matches EXACTLY (including http vs https, trailing slashes, etc.)
- For local dev: `http://localhost:3000/api/broker/oauth/callback`
- For production: `https://yourdomain.com/api/broker/oauth/callback`

## Support

- Tradovate Support: https://tradovate.zendesk.com
- OAuth Guide: https://tradovate.zendesk.com/hc/en-us/articles/4403100442515-How-Do-I-Register-an-OAuth-App
