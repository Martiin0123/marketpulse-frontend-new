#!/usr/bin/env node

// Test script for Bybit webhook endpoint
// Run with: node test-webhook.js

require('dotenv').config({ path: '.env.local' });

async function testWebhook() {
  console.log('🔧 Testing Bybit Webhook Endpoint...\n');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/bybit/tradingview`;

  console.log(`📡 Testing webhook at: ${webhookUrl}\n`);

  const testCases = [
    {
      name: 'BUY Signal (Long Entry)',
      data: {
        alert_message: 'Primescope LONG Entry! Symbol: BTCUSD, Price: 45000'
      }
    },
    {
      name: 'SELL Signal (Short Entry)',
      data: {
        alert_message: 'Primescope SHORT Entry! Symbol: ETHUSD, Price: 3200'
      }
    },
    {
      name: 'CLOSE Signal (Exit)',
      data: {
        alert_message: 'Primescope LONG Exit (MA Cross)! Symbol: BTCUSD, Price: 44800'
      }
    },
    {
      name: 'Direct API Call',
      data: {
        symbol: 'BTCUSD',
        action: 'BUY',
        price: 45000,
        quantity: 0.001,
        timestamp: new Date().toISOString()
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Response:`, JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('  ✅ Success\n');
      } else {
        console.log('  ❌ Failed\n');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('📝 Webhook Test Summary:');
  console.log('1. Check if your Next.js server is running (npm run dev)');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Check server logs for detailed error messages');
  console.log('4. Ensure Bybit API connection is working');
}

// Run the test
testWebhook(); 