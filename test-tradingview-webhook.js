require('dotenv').config();
const axios = require('axios');

// Test configuration
const WEBHOOK_URL = 'http://localhost:3000/api/bybit/tradingview';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

console.log('🚀 Testing TradingView Webhook with Real Order Execution');
console.log('=' .repeat(60));

// Test cases
const testCases = [
  {
    name: 'BUY Signal - SOLUSDT',
    data: {
      symbol: 'SOLUSD',
      action: 'BUY',
      price: 0, // Will be fetched from Bybit
      quantity: 1,
      strategy_metadata: {
        rsi_value: 25.5,
        smoothing_ma: 45.2,
        entry_reason: 'rsi_oversold'
      }
    }
  },
  {
    name: 'SELL Signal - SOLUSDT',
    data: {
      symbol: 'SOLUSD',
      action: 'SELL',
      price: 0, // Will be fetched from Bybit
      quantity: 1,
      strategy_metadata: {
        rsi_value: 75.8,
        smoothing_ma: 52.1,
        entry_reason: 'rsi_overbought'
      }
    }
  },
  {
    name: 'CLOSE Signal - SOLUSDT',
    data: {
      symbol: 'SOLUSD',
      action: 'CLOSE',
      price: 0, // Will be fetched from Bybit
      strategy_metadata: {
        rsi_value: 50.0,
        smoothing_ma: 48.5
      },
      exit_reason: 'ma_cross'
    }
  },
  {
    name: 'Pine Script Alert - BUY',
    data: {
      alert_message: 'Symbol: SOLUSD\nPrice: 45.20\nLONG Entry signal triggered by RSI oversold condition'
    }
  },
  {
    name: 'Pine Script Alert - SELL',
    data: {
      alert_message: 'Symbol: SOLUSD\nPrice: 52.10\nSHORT Entry signal triggered by RSI overbought condition'
    }
  },
  {
    name: 'Pine Script Alert - CLOSE',
    data: {
      alert_message: 'Symbol: SOLUSD\nPrice: 48.50\nLONG Exit signal triggered by MA Cross'
    }
  }
];

async function testWebhook(testCase) {
  console.log(`\n📋 Testing: ${testCase.name}`);
  console.log('─'.repeat(40));
  
  try {
    console.log('📤 Sending webhook request...');
    console.log('Data:', JSON.stringify(testCase.data, null, 2));
    
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, testCase.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    const endTime = Date.now();
    
    console.log(`✅ Response received in ${endTime - startTime}ms`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check if Discord notification was sent
    if (DISCORD_WEBHOOK_URL) {
      console.log('📡 Discord notification should have been sent');
    } else {
      console.log('⚠️ No Discord webhook URL configured');
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      duration: endTime - startTime
    };
    
  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

async function runAllTests() {
  console.log('🔧 Environment Check:');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Discord Webhook:', DISCORD_WEBHOOK_URL ? 'Configured' : 'Not configured');
  console.log('Bybit API Key:', process.env.BYBIT_API_KEY ? 'Configured' : 'Not configured');
  console.log('Bybit Secret:', process.env.BYBIT_SECRET_KEY ? 'Configured' : 'Not configured');
  console.log('Bybit Testnet:', process.env.BYBIT_TESTNET === 'true' ? 'Yes' : 'No');
  
  console.log('\n' + '='.repeat(60));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testWebhook(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Wait between tests to avoid rate limiting
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Tests:');
    successful.forEach(result => {
      console.log(`  • ${result.name} (${result.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(result => {
      console.log(`  • ${result.name}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 Key Features Tested:');
  console.log('  • Real order execution on Bybit');
  console.log('  • Current price fetching from Bybit API');
  console.log('  • Database signal and position recording');
  console.log('  • Success/Error Discord notifications');
  console.log('  • Pine Script alert parsing');
  console.log('  • Symbol format conversion');
  console.log('  • Error handling and validation');
  
  console.log('\n💡 Next Steps:');
  console.log('  1. Check your Discord channel for notifications');
  console.log('  2. Verify orders in your Bybit account');
  console.log('  3. Check database for signal and position records');
  console.log('  4. Set up TradingView alerts to point to this webhook');
  
  return results;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log('\n🏁 Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testWebhook }; 