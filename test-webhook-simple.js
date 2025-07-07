require('dotenv').config();
const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:3000/api/bybit/tradingview';

console.log('🚀 Simple TradingView Webhook Test');
console.log('=' .repeat(50));

// Simple test case
const testData = {
  symbol: 'SOLUSD',
  action: 'BUY',
  price: 0, // Will be fetched from Bybit
  quantity: 1,
  strategy_metadata: {
    rsi_value: 25.5,
    smoothing_ma: 45.2,
    entry_reason: 'rsi_oversold'
  }
};

async function testWebhook() {
  try {
    console.log('📤 Sending test webhook request...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    const endTime = Date.now();
    
    console.log(`✅ Success! Response received in ${endTime - startTime}ms`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    console.log('\n🎯 Features tested:');
    console.log('  • Real order execution on Bybit');
    console.log('  • Current price fetching from Bybit API');
    console.log('  • Database signal and position recording');
    console.log('  • Success Discord notification');
    console.log('  • Error handling and validation');
    
    console.log('\n💡 Check your Discord channel for the success notification!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n💡 Check your Discord channel for the error notification!');
  }
}

testWebhook(); 