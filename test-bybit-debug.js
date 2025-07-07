#!/usr/bin/env node

// Debug test script for Bybit API connection
// Run with: node test-bybit-debug.js

require('dotenv').config({ path: '.env.local' });

// Simple crypto polyfill
const crypto = require('crypto');

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

async function testBybitDebug() {
  console.log('🔧 Testing Bybit API Connection (Debug)...\n');

  // Check environment variables
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;
  const BYBIT_TESTNET = process.env.BYBIT_TESTNET === 'true';

  console.log('📋 Environment Check:');
  console.log(`  API Key: ${BYBIT_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Secret Key: ${BYBIT_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Testnet: ${BYBIT_TESTNET ? '✅ Enabled' : '❌ Disabled'}`);
  
  if (BYBIT_API_KEY) {
    console.log(`  API Key length: ${BYBIT_API_KEY.length} characters`);
    console.log(`  API Key starts with: ${BYBIT_API_KEY.substring(0, 8)}...`);
  }
  
  if (BYBIT_SECRET_KEY) {
    console.log(`  Secret Key length: ${BYBIT_SECRET_KEY.length} characters`);
    console.log(`  Secret Key starts with: ${BYBIT_SECRET_KEY.substring(0, 8)}...`);
  }
  
  console.log('');

  if (!BYBIT_API_KEY || !BYBIT_SECRET_KEY) {
    console.error('❌ Missing required environment variables!');
    console.log('Please set BYBIT_API_KEY and BYBIT_SECRET_KEY in your .env.local file');
    process.exit(1);
  }

  try {
    const { RestClientV5 } = require('bybit-api');

    console.log('🔗 Initializing Bybit client...');
    console.log(`  Testnet: ${BYBIT_TESTNET}`);
    console.log(`  API Key: ${BYBIT_API_KEY.substring(0, 8)}...${BYBIT_API_KEY.substring(BYBIT_API_KEY.length - 4)}`);
    console.log(`  Secret: ${BYBIT_SECRET_KEY.substring(0, 8)}...${BYBIT_SECRET_KEY.substring(BYBIT_SECRET_KEY.length - 4)}`);
    console.log('');

    const client = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_SECRET_KEY,
      testnet: BYBIT_TESTNET
    });

    // Test 1: Get server time (no auth required)
    console.log('1️⃣ Testing server time (no auth)...');
    const serverTime = await client.getServerTime();
    console.log('Server time response:', JSON.stringify(serverTime, null, 2));
    
    if (serverTime.retCode === 0) {
      console.log('✅ Server time successful');
    } else {
      console.log('❌ Server time failed:', serverTime.retMsg);
    }

    // Test 2: Get account info (requires auth)
    console.log('\n2️⃣ Testing account info (requires auth)...');
    try {
      const accountInfo = await client.getWalletBalance({ accountType: 'UNIFIED' });
      console.log('Account info response:', JSON.stringify(accountInfo, null, 2));
      
      if (accountInfo.retCode === 0) {
        console.log('✅ Account info successful');
      } else {
        console.log('❌ Account info failed:', accountInfo.retMsg);
        console.log('Error code:', accountInfo.retCode);
      }
    } catch (error) {
      console.log('❌ Account info exception:', error.message);
    }

    // Test 3: Try to get positions
    console.log('\n3️⃣ Testing positions...');
    try {
      const positions = await client.getPositionInfo({ category: 'linear' });
      console.log('Positions response:', JSON.stringify(positions, null, 2));
      
      if (positions.retCode === 0) {
        console.log('✅ Positions successful');
      } else {
        console.log('❌ Positions failed:', positions.retMsg);
        console.log('Error code:', positions.retCode);
      }
    } catch (error) {
      console.log('❌ Positions exception:', error.message);
    }

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('Full error:', error);
  }
}

// Run the test
testBybitDebug(); 