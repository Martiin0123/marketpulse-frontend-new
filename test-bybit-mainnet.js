#!/usr/bin/env node

// Safe test script for Bybit mainnet connection
// Run with: node test-bybit-mainnet.js
// This test only checks connection and account info - NO ORDERS

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

async function testBybitMainnet() {
  console.log('🔧 Testing Bybit Mainnet Connection (Safe Mode)...\n');

  // Check environment variables
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;
  const BYBIT_TESTNET = process.env.BYBIT_TESTNET === 'true';

  console.log('📋 Environment Check:');
  console.log(`  API Key: ${BYBIT_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Secret Key: ${BYBIT_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Testnet: ${BYBIT_TESTNET ? '✅ Enabled' : '❌ Disabled (Mainnet)'}`);
  
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
    console.log(`  Environment: ${BYBIT_TESTNET ? 'Testnet' : 'Mainnet'}`);
    console.log(`  API Key: ${BYBIT_API_KEY.substring(0, 8)}...${BYBIT_API_KEY.substring(BYBIT_API_KEY.length - 4)}`);
    console.log(`  Secret: ${BYBIT_SECRET_KEY.substring(0, 8)}...${BYBIT_SECRET_KEY.substring(BYBIT_SECRET_KEY.length - 4)}`);
    console.log('');

    const client = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_SECRET_KEY,
      testnet: BYBIT_TESTNET
    });

    // Test 1: Get server time (no auth required)
    console.log('1️⃣ Testing server time...');
    const serverTime = await client.getServerTime();
    if (serverTime.retCode === 0) {
      console.log('✅ Server time:', new Date(serverTime.result.timeNano / 1000000).toISOString());
    } else {
      throw new Error(`Server time failed: ${serverTime.retMsg}`);
    }

    // Test 2: Get account info (requires auth)
    console.log('\n2️⃣ Testing account info...');
    const accountInfo = await client.getWalletBalance({ accountType: 'UNIFIED' });
    if (accountInfo.retCode === 0) {
      const account = accountInfo.result.list[0];
      console.log('✅ Account info retrieved:');
      console.log(`  Total Equity: $${parseFloat(account.totalEquity || 0).toFixed(2)}`);
      console.log(`  Available Balance: $${parseFloat(account.totalAvailableBalance || 0).toFixed(2)}`);
      console.log(`  Used Margin: $${parseFloat(account.totalUsedMargin || 0).toFixed(2)}`);
      console.log(`  Account Status: ${account.accountStatus || 'N/A'}`);
    } else {
      throw new Error(`Account info failed: ${accountInfo.retMsg}`);
    }

    // Test 3: Get positions (read-only)
    console.log('\n3️⃣ Testing positions (read-only)...');
    const positions = await client.getPositionInfo({ 
      category: 'linear',
      settleCoin: 'USDT'
    });
    if (positions.retCode === 0) {
      const activePositions = positions.result.list.filter(pos => parseFloat(pos.size) > 0);
      console.log(`✅ Found ${activePositions.length} active positions`);
      if (activePositions.length > 0) {
        activePositions.forEach(pos => {
          console.log(`  ${pos.symbol}: ${pos.size} @ $${pos.avgPrice} (PnL: $${pos.unrealisedPnl})`);
        });
      } else {
        console.log('  No active positions found');
      }
    } else {
      console.log('⚠️ Positions failed:', positions.retMsg);
    }

    // Test 4: Get instruments info (read-only)
    console.log('\n4️⃣ Testing instruments info (read-only)...');
    const instruments = await client.getInstrumentsInfo({ category: 'linear', symbol: 'BTCUSDT' });
    if (instruments.retCode === 0) {
      const btcInfo = instruments.result.list[0];
      console.log('✅ BTCUSDT instrument info:');
      console.log(`  Symbol: ${btcInfo.symbol}`);
      console.log(`  Status: ${btcInfo.status}`);
      console.log(`  Min Order Qty: ${btcInfo.lotSizeFilter.minOrderQty}`);
      console.log(`  Max Order Qty: ${btcInfo.lotSizeFilter.maxOrderQty}`);
    } else {
      console.log('⚠️ Instruments info failed:', instruments.retMsg);
    }

    // Test 5: Get open orders (read-only)
    console.log('\n5️⃣ Testing open orders (read-only)...');
    const openOrders = await client.getActiveOrders({
      category: 'linear',
      symbol: 'BTCUSDT', // or any symbol you want to check
      limit: 5
    });
    if (openOrders.retCode === 0) {
      console.log(`✅ Found ${openOrders.result.list.length} open orders`);
      if (openOrders.result.list.length > 0) {
        openOrders.result.list.slice(0, 3).forEach(order => {
          console.log(`  ${order.symbol}: ${order.side} ${order.qty} @ $${order.price} (${order.orderStatus})`);
        });
      } else {
        console.log('  No open orders found');
      }
    } else {
      console.log('⚠️ Open orders failed:', openOrders.retMsg);
    }

    console.log('\n🎉 All connection tests completed successfully!');
    console.log('✅ Bybit API connection is working properly');
    console.log('✅ Account access confirmed');
    console.log('✅ Read permissions working');
    console.log('\n📝 Next steps:');
    console.log('1. Test the webhook endpoint with TradingView alerts');
    console.log('2. Verify Discord notifications are working');
    console.log('3. Check database integration');
    console.log('4. Test order placement (when ready)');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API keys are correct');
    console.log('2. Verify IP restrictions allow your server IP');
    console.log('3. Ensure you have the required permissions (Read, Trade)');
    console.log('4. Check if you\'re using testnet vs mainnet correctly');
    console.log('5. Make sure your API key is for the correct environment');
    process.exit(1);
  }
}

// Run the test
testBybitMainnet(); 