#!/bin/bash

echo "🚀 Setting up Google Gemini for PrimeScope AI Chatbot"
echo "======================================================"

echo ""
echo "📋 Prerequisites:"
echo "1. Google account"
echo "2. Internet connection"
echo "3. Text editor for environment variables"
echo ""

echo "🔑 Step 1: Get Google AI API Key"
echo "--------------------------------"
echo "1. Go to: https://makersuite.google.com/app/apikey"
echo "2. Sign in with your Google account"
echo "3. Click 'Create API Key'"
echo "4. Give it a name like 'PrimeScope Chatbot'"
echo "5. Copy the API key (starts with AIza...)"
echo ""

read -p "📝 Paste your Google AI API key here: " API_KEY

if [[ -z "$API_KEY" ]]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Validate API key format
if [[ ! "$API_KEY" =~ ^AIza[0-9A-Za-z_-]{35}$ ]]; then
    echo "⚠️  Warning: API key doesn't match expected format (AIza...)"
    echo "   Please double-check your key from Google AI Studio"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🔧 Step 2: Test API Key"
echo "----------------------"

# Test the API key
echo "🧪 Testing API key..."
TEST_RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello, how are you?"}]
    }]
  }')

if [[ $? -eq 0 ]] && [[ "$TEST_RESPONSE" == *"candidates"* ]]; then
    echo "✅ API key test successful!"
    echo "📝 Sample response: $(echo "$TEST_RESPONSE" | grep -o '"text":"[^"]*"' | head -1 | cut -d'"' -f4 | cut -c1-50)..."
else
    echo "❌ API key test failed"
    echo "Response: $TEST_RESPONSE"
    echo ""
    echo "Please check:"
    echo "1. API key is correct"
    echo "2. You have internet connection"
    echo "3. Google AI Studio is accessible"
    exit 1
fi

echo ""
echo "📝 Step 3: Add to Environment Variables"
echo "-------------------------------------"

# Check if .env.local exists
if [[ -f ".env.local" ]]; then
    echo "📁 Found existing .env.local file"
    
    # Check if GOOGLE_AI_API_KEY already exists
    if grep -q "GOOGLE_AI_API_KEY" .env.local; then
        echo "🔄 Updating existing GOOGLE_AI_API_KEY..."
        # Update existing key
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/GOOGLE_AI_API_KEY=.*/GOOGLE_AI_API_KEY=$API_KEY/" .env.local
        else
            # Linux
            sed -i "s/GOOGLE_AI_API_KEY=.*/GOOGLE_AI_API_KEY=$API_KEY/" .env.local
        fi
    else
        echo "➕ Adding GOOGLE_AI_API_KEY to .env.local..."
        echo "" >> .env.local
        echo "# Google AI Configuration" >> .env.local
        echo "GOOGLE_AI_API_KEY=$API_KEY" >> .env.local
    fi
else
    echo "📁 Creating new .env.local file..."
    echo "# Google AI Configuration" > .env.local
    echo "GOOGLE_AI_API_KEY=$API_KEY" >> .env.local
    echo "" >> .env.local
    echo "# Add your other environment variables here" >> .env.local
fi

echo "✅ Environment variable added successfully!"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 What's been configured:"
echo "✅ Google Gemini API key added to .env.local"
echo "✅ API key tested and working"
echo "✅ Your chatbot will now use Google Gemini"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test your chatbot at: http://localhost:3000"
echo "3. Ask questions about PrimeScope in the chat widget"
echo ""
echo "📊 Free Tier Limits:"
echo "- 15 requests per minute"
echo "- 1M characters per month"
echo "- High-quality AI responses"
echo ""
echo "🔗 Monitor usage at: https://makersuite.google.com/app/apikey"
echo ""
echo "Your PrimeScope chatbot now uses Google Gemini for free AI responses! 🎉" 