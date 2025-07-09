#!/bin/bash

# Test script for profit teaser notifications
echo "🎯 Testing Profit Teaser Notifications (>2% PnL)"
echo "================================================"

# Test 1: Close with 3.5% profit (should trigger teaser)
echo "📈 Test 1: Close signal with 3.5% profit (should trigger teaser)"
curl -X POST https://marketpulse-frontend-new.vercel.app/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "action": "close",
    "symbol": "BTCUSDT",
    "price": 103500,
    "timestamp": '$(date +%s)'000
  }'

echo -e "\n\n"

# Test 2: TradingView Strategy Alert (Buy with existing short position - should reverse and show profit)
echo "🔄 Test 2: Strategy alert causing position reversal with profit"
curl -X POST https://marketpulse-frontend-new.vercel.app/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "action": "buy",
    "symbol": "ETHUSDT",
    "price": 3200,
    "timestamp": '$(date +%s)'000,
    "position_after": 1
  }'

echo -e "\n\n"

# Test 3: Close with 1.5% profit (should NOT trigger teaser - below 2% threshold)
echo "📉 Test 3: Close with 1.5% profit (should NOT trigger teaser)"
curl -X POST https://marketpulse-frontend-new.vercel.app/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "action": "close",
    "symbol": "SOLUSDT", 
    "price": 180,
    "timestamp": '$(date +%s)'000
  }'

echo -e "\n\nTests completed! Check your Discord channels:"
echo "✅ Premium channel: Regular notifications + PnL display"
echo "🎯 Free channel: Profit teasers (>2% only) + every 5th trade" 