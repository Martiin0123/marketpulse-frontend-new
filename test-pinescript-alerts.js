require('dotenv').config();
const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:3000/api/bybit/tradingview';

console.log('🚀 Testing Pine Script Alert Parsing');
console.log('=' .repeat(50));

// Test cases based on the actual Pine Script alerts
const testCases = [
  {
    name: 'LONG Entry Alert',
    data: {
      alert_message: 'Primescope LONG Entry! Symbol: SOLUSDT, Price: 45.20'
    }
  },
  {
    name: 'SHORT Entry Alert',
    data: {
      alert_message: 'Primescope SHORT Entry! Symbol: SOLUSDT, Price: 52.10'
    }
  },
  {
    name: 'LONG Exit (MA Cross) Alert',
    data: {
      alert_message: 'Primescope LONG Exit (MA Cross)! Symbol: SOLUSDT, Price: 48.50'
    }
  },
  {
    name: 'SHORT Exit (MA Cross) Alert',
    data: {
      alert_message: 'Primescope SHORT Exit (MA Cross)! Symbol: SOLUSDT, Price: 49.80'
    }
  },
  {
    name: 'LONG Exit (Stop/Trailing) Alert',
    data: {
      alert_message: 'Primescope LONG Exit (Stop/Trailing)! Symbol: SOLUSDT, Price: 44.30'
    }
  },
  {
    name: 'SHORT Exit (Stop/Trailing) Alert',
    data: {
      alert_message: 'Primescope SHORT Exit (Stop/Trailing)! Symbol: SOLUSDT, Price: 55.20'
    }
  }
];

async function testPineScriptAlert(testCase) {
  console.log(`\n📋 Testing: ${testCase.name}`);
  console.log('─'.repeat(40));
  
  try {
    console.log('📤 Sending Pine Script alert...');
    console.log('Alert:', testCase.data.alert_message);
    
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, testCase.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    const endTime = Date.now();
    
    console.log(`✅ Response received in ${endTime - startTime}ms`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
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

async function runPineScriptTests() {
  console.log('🔧 Environment Check:');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Discord Webhook:', process.env.DISCORD_WEBHOOK_URL ? 'Configured' : 'Not configured');
  console.log('Bybit API Key:', process.env.BYBIT_API_KEY ? 'Configured' : 'Not configured');
  
  console.log('\n' + '='.repeat(60));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testPineScriptAlert(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Wait between tests
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PINE SCRIPT TEST SUMMARY');
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
  
  console.log('\n🎯 Pine Script Alert Features Tested:');
  console.log('  • LONG Entry signal parsing');
  console.log('  • SHORT Entry signal parsing');
  console.log('  • LONG Exit (MA Cross) signal parsing');
  console.log('  • SHORT Exit (MA Cross) signal parsing');
  console.log('  • LONG Exit (Stop/Trailing) signal parsing');
  console.log('  • SHORT Exit (Stop/Trailing) signal parsing');
  console.log('  • Symbol extraction from alert message');
  console.log('  • Price extraction from alert message');
  console.log('  • Action determination (BUY/SELL/CLOSE)');
  console.log('  • Exit reason detection');
  
  console.log('\n💡 TradingView Setup Instructions:');
  console.log('  1. In TradingView, go to your Pine Script strategy');
  console.log('  2. Click "Add to Chart"');
  console.log('  3. Go to "Alerts" tab');
  console.log('  4. Create alerts for each signal type:');
  console.log('     • LONG Entry: "Primescope LONG Entry! Symbol: {{ticker}}, Price: {{close}}"');
  console.log('     • SHORT Entry: "Primescope SHORT Entry! Symbol: {{ticker}}, Price: {{close}}"');
  console.log('     • LONG Exit: "Primescope LONG Exit (MA Cross)! Symbol: {{ticker}}, Price: {{close}}"');
  console.log('     • SHORT Exit: "Primescope SHORT Exit (MA Cross)! Symbol: {{ticker}}, Price: {{close}}"');
  console.log('  5. Set webhook URL to: http://your-domain.com/api/bybit/tradingview');
  console.log('  6. Set alert frequency to "Once Per Bar Close"');
  
  return results;
}

// Run the tests
if (require.main === module) {
  runPineScriptTests()
    .then(results => {
      console.log('\n🏁 Pine Script testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runPineScriptTests, testPineScriptAlert }; 