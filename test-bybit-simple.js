#!/usr/bin/env node

// Simple test script for Bybit API connection
// Run with: node test-bybit-simple.js

require('dotenv').config({ path: '.env.local' });

// Simple crypto polyfill
const crypto = require('crypto');

// Create a minimal crypto polyfill
if (!global.crypto) {
  global.crypto = {
    subtle: {
      importKey: async (format, keyData, algorithm, extractable, keyUsages) => {
        return {
          algorithm,
          keyData: Buffer.from(keyData),
          format,
          extractable,
          keyUsages
        };
      },
      sign: async (algorithm, key, data) => {
        const hmac = crypto.createHmac('sha256', key.keyData);
        hmac.update(data);
        return hmac.digest();
      }
    }
  };
}

async function testBybitSimple() {
  console.log('🔧 Testing Bybit API Connection (Simple)...\n');

  // Check environment variables
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;
  const BYBIT_TESTNET = process.env.BYBIT_TESTNET === 'true';

  console.log('📋 Environment Check:');
  console.log(`  API Key: ${BYBIT_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Secret Key: ${BYBIT_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Testnet: ${BYBIT_TESTNET ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('');

  if (!BYBIT_API_KEY || !BYBIT_SECRET_KEY) {
    console.error('❌ Missing required environment variables!');
    console.log('Please set BYBIT_API_KEY and BYBIT_SECRET_KEY in your .env.local file');
    process.exit(1);
  }

  try {
    // Import Bybit client after polyfill
    const { RestClientV5 } = require('bybit-api');

    // Initialize Bybit client
    const client = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_SECRET_KEY,
      testnet: BYBIT_TESTNET
    });

    console.log('🔗 Testing API Connection...');

    // Test 1: Get server time (no authentication required)
    console.log('\n1️⃣ Testing server time...');
    const serverTime = await client.getServerTime();
    if (serverTime.retCode === 0) {
      console.log('✅ Server time:', new Date(serverTime.result.timeNano / 1000000).toISOString());
    } else {
      throw new Error(`Server time failed: ${serverTime.retMsg}`);
    }

    // Test 2: Get account info (requires authentication)
    console.log('\n2️⃣ Testing account info...');
    const accountInfo = await client.getWalletBalance({ accountType: 'UNIFIED' });
    if (accountInfo.retCode === 0) {
      const account = accountInfo.result.list[0];
      console.log('✅ Account info retrieved:');
      console.log(`  Total Equity: $${parseFloat(account.totalEquity).toFixed(2)}`);
      console.log(`  Available Balance: $${parseFloat(account.totalAvailableBalance).toFixed(2)}`);
      console.log(`  Used Margin: $${parseFloat(account.totalUsedMargin).toFixed(2)}`);
    } else {
      console.log('⚠️ Account info failed:', accountInfo.retMsg);
      console.log('This might be due to API permissions or invalid credentials');
    }

    console.log('\n🎉 Basic connection test completed!');
    console.log('✅ Bybit API connection is working');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API keys are correct');
    console.log('2. Verify IP restrictions allow your server IP');
    console.log('3. Ensure you have the required permissions (Read, Trade)');
    console.log('4. Check if you\'re using testnet vs mainnet correctly');
    console.log('5. Make sure your API key is for the demo/testnet environment');
    process.exit(1);
  }
}

// Run the test
testBybitSimple(); 