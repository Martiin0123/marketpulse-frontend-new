#!/bin/bash

# Script to set up Redis for rate limiting
echo "🔧 Setting up Redis for rate limiting..."

# Check if Redis is already installed
if command -v redis-server &> /dev/null; then
    echo "✅ Redis is already installed"
else
    echo "📦 Installing Redis..."
    
    # Detect OS and install Redis
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y redis
        else
            echo "❌ Unsupported Linux distribution"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    else
        echo "❌ Unsupported operating system"
        exit 1
    fi
fi

# Start Redis if not running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "🚀 Starting Redis server..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    else
        sudo systemctl start redis
        sudo systemctl enable redis
    fi
else
    echo "✅ Redis server is already running"
fi

# Test Redis connection
echo "🧪 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis connection successful"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# Install Node.js Redis client
echo "📦 Installing ioredis..."
npm install ioredis

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env.local ]; then
    echo "REDIS_URL=redis://localhost:6379" >> .env.local
    echo "✅ Added REDIS_URL to .env.local"
else
    if ! grep -q "REDIS_URL" .env.local; then
        echo "REDIS_URL=redis://localhost:6379" >> .env.local
        echo "✅ Added REDIS_URL to .env.local"
    else
        echo "✅ REDIS_URL already exists in .env.local"
    fi
fi

echo ""
echo "🎉 Redis setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Check the console for Redis connection messages"
echo "3. Monitor rate limiting with: npm run perf:monitor"
echo ""
echo "🔗 Redis commands:"
echo "  - Start: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
echo "  - Stop: brew services stop redis (macOS) or sudo systemctl stop redis (Linux)"
echo "  - Status: brew services list | grep redis (macOS) or sudo systemctl status redis (Linux)"
echo "  - Monitor: redis-cli monitor" 