// Test script to simulate TradingView alerts
// Run with: node test-tradingview-webhook.js

const testWebhook = async (alertType, symbol = 'BTCUSDT') => {
  const testPayloads = {
    // Test Pine Script alert format
    buy_alert: {
      alert_message: `Primescope LONG Entry! Symbol: ${symbol}, Price: 45000`,
      timestamp: Date.now()
    },
    
    sell_alert: {
      alert_message: `Primescope SHORT Entry! Symbol: ${symbol}, Price: 45000`,
      timestamp: Date.now()
    },
    
    close_alert: {
      alert_message: `Primescope LONG Exit! Symbol: ${symbol}, MA Cross`,
      timestamp: Date.now()
    },
    
    // Test user's TradingView strategy format (simulating what TradingView sends)
    strategy_buy: {
      action: "buy",
      symbol: symbol,
      timestamp: Date.now()
    },
    
    strategy_sell: {
      action: "sell", 
      symbol: symbol,
      timestamp: Date.now()
    },
    
    strategy_close: {
      action: "close",
      symbol: symbol,
      timestamp: Date.now()
    },
    
    // Test Pine Script JSON alerts (from alert() function calls)
    pine_json_buy: {
      message: '{"action":"buy","symbol":"' + symbol + '","price":45000,"timestamp":' + Date.now() + '}',
      timestamp: Date.now()
    },
    
    pine_json_sell: {
      message: '{"action":"sell","symbol":"' + symbol + '","price":45000,"timestamp":' + Date.now() + '}',
      timestamp: Date.now()
    },
    
    pine_json_close: {
      message: '{"action":"close","symbol":"' + symbol + '","price":45000,"timestamp":' + Date.now() + '}',
      timestamp: Date.now()
    },
    
    // Test direct API format
    buy_direct: {
      symbol: symbol,
      action: 'BUY',
      price: 45000,
      timestamp: Date.now()
    },
    
    sell_direct: {
      symbol: symbol,
      action: 'SELL', 
      price: 45000,
      timestamp: Date.now()
    },
    
    close_direct: {
      symbol: symbol,
      action: 'CLOSE',
      price: 45000,
      exit_reason: 'ma_cross',
      timestamp: Date.now()
    }
  };

  const payload = testPayloads[alertType];
  if (!payload) {
    console.error('❌ Invalid alert type. Use: buy_alert, sell_alert, close_alert, strategy_buy, strategy_sell, strategy_close, pine_json_buy, pine_json_sell, pine_json_close, buy_direct, sell_direct, close_direct');
    return;
  }

  // Replace with your actual webhook URL
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/bybit/tradingview';
  
  console.log('🚀 Testing webhook:', alertType);
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  console.log('🔗 URL:', webhookUrl);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers));
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));
    } catch {
      console.log('📥 Response Text:', responseText);
    }
    
    if (response.ok) {
      console.log('✅ Test successful!');
    } else {
      console.log('❌ Test failed!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
};

// Main test function
const runTests = async () => {
  console.log('🧪 Starting TradingView Webhook Tests\n');
  
  // Get test parameters from command line
  const args = process.argv.slice(2);
  const testType = args[0] || 'buy_alert';
  const symbol = args[1] || 'BTCUSDT';
  
  if (args.includes('--all')) {
    // Run all tests
    const testTypes = ['buy_alert', 'sell_alert', 'close_alert', 'strategy_buy', 'strategy_sell', 'strategy_close', 'pine_json_buy', 'pine_json_sell', 'pine_json_close', 'buy_direct', 'sell_direct', 'close_direct'];
    for (const type of testTypes) {
      await testWebhook(type, symbol);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    }
  } else {
    // Run single test
    await testWebhook(testType, symbol);
  }
  
  console.log('🏁 Testing complete!');
};

// Usage examples
console.log(`
🧪 TradingView Webhook Test Script

Usage:
  node test-tradingview-webhook.js [test_type] [symbol]
  
Test Types:
  buy_alert     - Pine Script buy alert (text format)
  sell_alert    - Pine Script sell alert (text format)
  close_alert   - Pine Script close alert (text format)
  strategy_buy  - TradingView strategy buy ({{strategy.order.action}})
  strategy_sell - TradingView strategy sell
  strategy_close- TradingView strategy close
  pine_json_buy - Pine Script JSON alert() buy
  pine_json_sell- Pine Script JSON alert() sell
  pine_json_close- Pine Script JSON alert() close
  buy_direct    - Direct API buy
  sell_direct   - Direct API sell
  close_direct  - Direct API close

Examples:
  node test-tradingview-webhook.js buy_alert BTCUSDT
  node test-tradingview-webhook.js --all ETHUSDT
  WEBHOOK_URL=https://your-domain.com/api/bybit/tradingview node test-tradingview-webhook.js buy_alert

Environment Variables:
  WEBHOOK_URL - Your webhook endpoint (default: http://localhost:3000/api/bybit/tradingview)
`);

// Run tests
runTests().catch(console.error); 