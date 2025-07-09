#!/bin/bash

# TradingView Webhook Test Script
# Usage: ./test-webhook.sh [url] [test_type]

WEBHOOK_URL=${1:-"http://localhost:3000/api/bybit/tradingview"}
TEST_TYPE=${2:-"buy_alert"}

echo "🧪 Testing TradingView Webhook"
echo "🔗 URL: $WEBHOOK_URL"
echo "🎯 Test Type: $TEST_TYPE"
echo ""

case $TEST_TYPE in
  "buy_alert")
    echo "📤 Testing Pine Script BUY alert..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "alert_message": "Primescope LONG Entry! Symbol: BTCUSDT, Price: 45000",
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  "sell_alert") 
    echo "📤 Testing Pine Script SELL alert..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "alert_message": "Primescope SHORT Entry! Symbol: BTCUSDT, Price: 45000", 
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  "close_alert")
    echo "📤 Testing Pine Script CLOSE alert..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "alert_message": "Primescope LONG Exit! Symbol: BTCUSDT, MA Cross",
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  "buy_direct")
    echo "📤 Testing Direct API BUY..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "symbol": "BTCUSDT",
        "action": "BUY", 
        "price": 45000,
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  "sell_direct")
    echo "📤 Testing Direct API SELL..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "symbol": "BTCUSDT",
        "action": "SELL",
        "price": 45000, 
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  "close_direct")
    echo "📤 Testing Direct API CLOSE..."
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "symbol": "BTCUSDT",
        "action": "CLOSE",
        "price": 45000,
        "exit_reason": "ma_cross",
        "timestamp": '$(date +%s000)'
      }' | jq '.' 2>/dev/null || cat
    ;;
    
  *)
    echo "❌ Invalid test type: $TEST_TYPE"
    echo "Valid types: buy_alert, sell_alert, close_alert, buy_direct, sell_direct, close_direct"
    exit 1
    ;;
esac

echo ""
echo "✅ Test completed!"
echo ""
echo "Examples:"
echo "  ./test-webhook.sh https://your-domain.com/api/bybit/tradingview buy_alert"
echo "  ./test-webhook.sh http://localhost:3000/api/bybit/tradingview sell_direct" 