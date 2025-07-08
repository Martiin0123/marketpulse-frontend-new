#!/bin/bash

# Monitor script to track spam/infinite loop issues
# Usage: ./scripts/monitor-spam.sh

echo "🔍 MarketPulse Spam Monitor"
echo "============================"

# Check for running processes
echo "📊 Checking running processes..."
ps aux | grep -E "(next|node)" | grep -v grep

echo ""
echo "🌐 Checking network connections..."
lsof -i -P | grep LISTEN

echo ""
echo "📁 Checking for build cache..."
if [ -d ".next" ]; then
    echo "✅ .next directory exists"
    echo "   Size: $(du -sh .next | cut -f1)"
else
    echo "❌ .next directory not found"
fi

echo ""
echo "🔧 Checking for node_modules cache..."
if [ -d "node_modules/.cache" ]; then
    echo "✅ node_modules/.cache exists"
    echo "   Size: $(du -sh node_modules/.cache | cut -f1)"
else
    echo "❌ node_modules/.cache not found"
fi

echo ""
echo "📋 Recent log entries (last 50 lines):"
tail -50 .next/server.log 2>/dev/null || echo "No server log found"

echo ""
echo "🚀 Quick fixes to try:"
echo "1. Clear cache: rm -rf .next node_modules/.cache"
echo "2. Restart dev server: npm run dev"
echo "3. Check browser console for client-side errors"
echo "4. Monitor network tab for repeated requests" 