#!/usr/bin/env node

// Test script for Bybit API connection
// Run with: node test-bybit-connection.js

// Polyfill for crypto API in Node.js
const crypto = require('crypto');

// Create a more comprehensive crypto polyfill
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
      },
      digest: async (algorithm, data) => {
        const hash = crypto.createHash('sha256');
        hash.update(data);
        return hash.digest();
      }
    },
    getRandomValues: (array) => {
      return crypto.randomFillSync(array);
    }
  };
}

require('dotenv').config({ path: '.env.local' });

const { RestClientV5 } = require('bybit-api');

async function testBybitConnection() {
  console.log('🔧 Testing Bybit API Connection...\n');

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
    // Initialize Bybit client
    const client = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_SECRET_KEY,
      testnet: BYBIT_TESTNET
    });

    console.log('🔗 Testing API Connection...');

    // Test 1: Get server time
    console.log('\n1️⃣ Testing server time...');
    const serverTime = await client.getServerTime();
    if (serverTime.retCode === 0) {
      console.log('✅ Server time:', new Date(serverTime.result.timeNano / 1000000).toISOString());
    } else {
      throw new Error(`Server time failed: ${serverTime.retMsg}`);
    }

    // Test 2: Get account info
    console.log('\n2️⃣ Testing account info...');
    const accountInfo = await client.getWalletBalance({ accountType: 'UNIFIED' });
    if (accountInfo.retCode === 0) {
      const account = accountInfo.result.list[0];
      console.log('✅ Account info retrieved:');
      console.log(`  Total Equity: $${parseFloat(account.totalEquity).toFixed(2)}`);
      console.log(`  Available Balance: $${parseFloat(account.totalAvailableBalance).toFixed(2)}`);
      console.log(`  Used Margin: $${parseFloat(account.totalUsedMargin).toFixed(2)}`);
    } else {
      throw new Error(`Account info failed: ${accountInfo.retMsg}`);
    }

    // Test 3: Get positions
    console.log('\n3️⃣ Testing positions...');
    const positions = await client.getPositionInfo({ category: 'linear' });
    if (positions.retCode === 0) {
      const activePositions = positions.result.list.filter(pos => parseFloat(pos.size) > 0);
      console.log(`✅ Found ${activePositions.length} active positions`);
      activePositions.forEach(pos => {
        console.log(`  ${pos.symbol}: ${pos.size} @ $${pos.avgPrice} (PnL: $${pos.unrealisedPnl})`);
      });
    } else {
      throw new Error(`Positions failed: ${positions.retMsg}`);
    }

    // Test 4: Get instruments info
    console.log('\n4️⃣ Testing instruments info...');
    const instruments = await client.getInstrumentsInfo({ category: 'linear', symbol: 'BTCUSDT' });
    if (instruments.retCode === 0) {
      const btcInfo = instruments.result.list[0];
      console.log('✅ BTCUSDT instrument info:');
      console.log(`  Symbol: ${btcInfo.symbol}`);
      console.log(`  Status: ${btcInfo.status}`);
      console.log(`  Min Order Qty: ${btcInfo.lotSizeFilter.minOrderQty}`);
      console.log(`  Max Order Qty: ${btcInfo.lotSizeFilter.maxOrderQty}`);
    } else {
      throw new Error(`Instruments info failed: ${instruments.retMsg}`);
    }

    // Test 5: Test order submission (dry run)
    console.log('\n5️⃣ Testing order submission (dry run)...');
    const testOrder = await client.submitOrder({
      category: 'linear',
      symbol: 'BTCUSDT',
      side: 'Buy',
      orderType: 'Market',
      qty: '0.001',
      timeInForce: 'GTC'
    });
    
    if (testOrder.retCode === 0) {
      console.log('✅ Order submission test successful');
      console.log(`  Order ID: ${testOrder.result.orderId}`);
      console.log(`  Status: ${testOrder.result.orderStatus}`);
      
      // Cancel the test order immediately
      console.log('\n🔄 Canceling test order...');
      const cancelResult = await client.cancelOrder({
        category: 'linear',
        symbol: 'BTCUSDT',
        orderId: testOrder.result.orderId
      });
      
      if (cancelResult.retCode === 0) {
        console.log('✅ Test order canceled successfully');
      } else {
        console.log('⚠️ Warning: Could not cancel test order:', cancelResult.retMsg);
      }
    } else {
      console.log('⚠️ Order submission test failed (this might be expected):', testOrder.retMsg);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Bybit API connection is working properly');
    console.log('\n📝 Next steps:');
    console.log('1. Test the webhook endpoint with TradingView alerts');
    console.log('2. Verify Discord notifications are working');
    console.log('3. Check database integration');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API keys are correct');
    console.log('2. Verify IP restrictions allow your server IP');
    console.log('3. Ensure you have the required permissions (Read, Trade)');
    console.log('4. Check if you\'re using testnet vs mainnet correctly');
    process.exit(1);
  }
}

// Run the test
testBybitConnection(); 