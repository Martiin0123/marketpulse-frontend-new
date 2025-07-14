# 🆓 Google Gemini Setup Guide

This guide shows you how to set up Google Gemini API for your PrimeScope chatbot - **completely free!**

## 🎯 **Google Gemini Free Tier Benefits**

- ✅ **15 requests per minute** (900 per hour)
- ✅ **1M characters per month** (generous limit)
- ✅ **High-quality AI responses**
- ✅ **No credit card required**
- ✅ **Easy setup**

## 🚀 **Step-by-Step Setup**

### Step 1: Get Google AI API Key

1. **Go to Google AI Studio**
   - Visit: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key"
   - Give it a name like "PrimeScope Chatbot"
   - Copy the API key (starts with `AIza...`)

3. **Add to Environment Variables**
   ```bash
   # Add to your .env.local file
   GOOGLE_AI_API_KEY=AIzaSyYourActualKeyHere
   ```

### Step 2: Test the Setup

1. **Test API Key**

   ```bash
   # Test the API key
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": [{
         "parts": [{"text": "Hello, how are you?"}]
       }]
     }'
   ```

2. **Test Your Chatbot**
   - Start your development server
   - Open the chat widget
   - Ask a question about PrimeScope

## 🔧 **Environment Variables**

### For Local Development:

Create `.env.local` in your project root:

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=AIzaSyYourActualKeyHere

# Your other existing environment variables...
```

### For Production (Vercel/Railway):

Add the environment variable to your deployment platform:

**Vercel:**

- Go to your project dashboard
- Settings → Environment Variables
- Add `GOOGLE_AI_API_KEY` with your key

**Railway:**

- Go to your project dashboard
- Variables tab
- Add `GOOGLE_AI_API_KEY` with your key

## 📊 **Free Tier Limits**

| Metric               | Limit      | Usage                   |
| -------------------- | ---------- | ----------------------- |
| Requests per minute  | 15         | Good for most use cases |
| Characters per month | 1M         | Very generous           |
| Model                | Gemini Pro | High quality            |

## 🎯 **How It Works**

Your chatbot will now try AI providers in this order:

1. **OpenAI** (if API key is set and working)
2. **Google Gemini** (if API key is set and working) ⭐ **FREE**
3. **Ollama** (if running locally)
4. **Fallback Responses** (always works)

## 🧪 **Testing Your Setup**

### Quick Test:

```bash
# Test the API directly
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Tell me about PrimeScope trading signals"}]
    }]
  }'
```

### Test in Browser:

1. Start your dev server: `npm run dev`
2. Open: `http://localhost:3000`
3. Click the chat widget
4. Ask: "What are your pricing plans?"

## 🔒 **Security Best Practices**

1. **Never commit API keys** to your repository
2. **Use environment variables** (not hardcoded)
3. **Monitor usage** in Google AI Studio
4. **Rotate keys** if needed

## 💡 **Troubleshooting**

### Common Issues:

**"No Google AI API key found"**

- Check your `.env.local` file
- Restart your development server
- Verify the key format: `AIzaSy...`

**"API error: 400"**

- Check your API key is correct
- Verify the request format
- Check usage limits

**"Rate limit exceeded"**

- Wait a minute and try again
- Consider upgrading to paid tier
- Use fallback responses temporarily

## 🎉 **Benefits of Google Gemini**

### ✅ **Advantages:**

- **Completely free** for reasonable usage
- **High-quality responses**
- **No credit card required**
- **Easy setup**
- **Good documentation**

### ⚠️ **Limitations:**

- 15 requests per minute
- 1M characters per month
- Requires internet connection

## 🚀 **Next Steps**

1. **Get your API key** from Google AI Studio
2. **Add it to environment variables**
3. **Test your chatbot**
4. **Monitor usage** in Google AI Studio dashboard

## 📈 **Usage Monitoring**

Monitor your usage at:

- [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check your usage dashboard
- Set up alerts if needed

Your chatbot will now use Google Gemini for free, high-quality AI responses! 🎉
