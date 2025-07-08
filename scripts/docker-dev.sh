#!/bin/bash

# Script to run Docker development with auth middleware disabled
# This helps avoid Supabase rate limiting during development

echo "🚀 Starting MarketPulse development with auth middleware disabled..."
echo "This will prevent Supabase rate limiting issues during development"
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

echo "📦 Building and starting development container..."
echo "🔧 Auth middleware will be disabled (DISABLE_AUTH_MIDDLEWARE=true)"
echo "🌐 Application will be available at: http://localhost:3004"
echo ""

# Use the development docker-compose file
docker-compose -f docker-compose.dev.yml up --build

echo ""
echo "✅ Development server stopped." 