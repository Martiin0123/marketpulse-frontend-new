#!/bin/bash

# Script to run Docker development with auth middleware enabled
# Use this when you want to test authentication features

echo "🚀 Starting MarketPulse development with auth middleware enabled..."
echo "This will enable authentication checks - use only for testing auth features"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Make sure your environment variables are set."
    echo "You can copy .env.example to .env and fill in your values."
fi

echo "📦 Building and starting development container with auth enabled..."
echo "🔧 Auth middleware will be enabled (DISABLE_AUTH_MIDDLEWARE=false)"
echo "🌐 Application will be available at: http://localhost:3004"
echo "⚠️  Note: You may experience Supabase rate limiting with auth enabled"
echo ""

# Use the regular docker-compose file but override the auth middleware setting
DISABLE_AUTH_MIDDLEWARE=false docker-compose up --build

echo ""
echo "✅ Development server stopped." 