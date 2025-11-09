# Why Do I Need API Keys? OAuth Explained

## The Good News: You DO Log In Via Browser! 🎉

**You don't enter API keys yourself.** Here's how it actually works:

1. **You click "Connect Tradovate Account"** in the journal settings
2. **You get redirected to Tradovate's website** (in your browser)
3. **You log in with your Tradovate username/password** (on Tradovate's site)
4. **Tradovate redirects you back** to the journal
5. **Done!** Your account is connected

## So Why Do I Need API Credentials?

The API credentials are needed **behind the scenes** to complete the OAuth flow. Here's what happens:

### Step-by-Step OAuth Flow:

```
1. You click "Connect"
   ↓
2. Our app redirects you to: https://api.tradovate.com/oauth/authorize?client_id=XXX
   ↓
3. You log in on Tradovate's website (with YOUR credentials)
   ↓
4. Tradovate redirects back with a temporary "authorization code"
   ↓
5. Our SERVER exchanges that code for access tokens (THIS is where Client Secret is needed)
   ↓
6. We store the tokens securely and can now sync your trades
```

### Why the Client Secret?

The **Client Secret** is required by OAuth 2.0 security standards. It proves to Tradovate that the token exchange request is coming from **your legitimate application**, not a malicious third party.

**Think of it like this:**

- **Client ID** = Your app's public username (safe to expose)
- **Client Secret** = Your app's private password (never exposed, only used server-side)

## What You Need to Do

### One-Time Setup (5 minutes):

1. **Register your app with Tradovate/Project X** (one-time):
   - Go to their API settings
   - Create an OAuth app
   - Get Client ID and Client Secret
   - Set redirect URI: `https://your-domain.com/api/broker/oauth/callback`

2. **Add credentials to your project** (one-time):

   ```bash
   # In .env.local or Vercel environment variables
   NEXT_PUBLIC_TRADOVATE_CLIENT_ID=your_client_id
   TRADOVATE_CLIENT_SECRET=your_client_secret
   ```

3. **That's it!** Now users can connect their accounts via browser login.

## Security Notes

✅ **Client ID** (NEXT*PUBLIC*\*) - Safe to expose in browser code  
✅ **Client Secret** - Only used server-side, never exposed to users  
✅ **User credentials** - Never shared, users log in directly on broker's site  
✅ **Access tokens** - Stored encrypted in database, auto-refresh

## Alternative: Could We Skip the Secret?

Some OAuth implementations support **PKCE (Proof Key for Code Exchange)** which doesn't require a client secret for public clients. However:

- Most broker APIs (including Tradovate) use standard OAuth 2.0
- They require a Client Secret for security
- This is the industry standard for web applications

## Summary

- ✅ **Users log in via browser** - No API keys needed from users
- ✅ **One-time setup** - You register your app once, then all users can connect
- ✅ **Secure** - Client Secret stays on your server, never exposed
- ✅ **Standard OAuth** - This is how all major apps work (Google, GitHub, etc.)

The API credentials are like your app's "registration" with the broker - you set it up once, then users can connect their accounts easily via browser login!
