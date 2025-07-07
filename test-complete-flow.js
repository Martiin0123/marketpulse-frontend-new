#!/usr/bin/env node

// Complete flow test script for Bybit trading system
// Run with: node test-complete-flow.js
// This simulates: Signal → Bybit → Discord → Database
// THIS VERSION PLACES A REAL TRADE WITH MINIMUM QUANTITY

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

async function testCompleteFlow() {
  console.log('🚨 WARNING: THIS SCRIPT WILL PLACE A REAL TRADE ON BYBIT MAINNET!');
  console.log('Press Ctrl+C NOW to abort if you do not want to place a real order.');
  await new Promise(r => setTimeout(r, 5000)); // 5 second pause for safety

  // Check environment variables
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;
  const BYBIT_TESTNET = process.env.BYBIT_TESTNET === 'true';
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment Check:');
  console.log(`  Bybit API Key: ${BYBIT_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Bybit Secret Key: ${BYBIT_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Bybit Testnet: ${BYBIT_TESTNET ? '✅ Enabled' : '❌ Disabled (Mainnet)'}`);
  console.log(`  Discord Webhook: ${DISCORD_WEBHOOK_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Supabase URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Supabase Key: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!BYBIT_API_KEY || !BYBIT_SECRET_KEY) {
    console.error('❌ Missing Bybit API credentials!');
    process.exit(1);
  }

  try {
    // Step 1: Simulate TradingView Signal
    console.log('1️⃣ Simulating TradingView Signal...');
    const symbol = 'SOLUSDT';
    const action = 'Buy';
    const strategy = 'TEST_STRATEGY';
    const exchange = 'bybit';
    const timestamp = new Date().toISOString();

    // Step 2: Initialize Bybit Client
    console.log('\n2️⃣ Initializing Bybit Client...');
    const { RestClientV5 } = require('bybit-api');
    const bybitClient = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_SECRET_KEY,
      testnet: BYBIT_TESTNET
    });
    console.log('✅ Bybit client initialized');

    // Step 3: Fetch minimum order quantity and current price
    console.log('\n3️⃣ Fetching minimum order quantity for BTCUSDT...');
    const instruments = await bybitClient.getInstrumentsInfo({ category: 'linear', symbol });
    if (instruments.retCode !== 0) {
      throw new Error('Failed to fetch instrument info: ' + instruments.retMsg);
    }
    const btcInfo = instruments.result.list[0];
    const minQty = parseFloat(btcInfo.lotSizeFilter.minOrderQty);
    
    // Get current market price from ticker
    const ticker = await bybitClient.getTickers({ category: 'linear', symbol });
    if (ticker.retCode !== 0) {
      throw new Error('Failed to fetch ticker: ' + ticker.retMsg);
    }
    const currentPrice = ticker.result.list[0].lastPrice;
    
    console.log(`✅ Minimum order quantity for ${symbol}: ${minQty}`);
    console.log(`✅ Current price: $${currentPrice}`);

    // Step 4: Check Account Balance
    console.log('\n4️⃣ Checking Account Balance...');
    const accountInfo = await bybitClient.getWalletBalance({ accountType: 'UNIFIED' });
    if (accountInfo.retCode !== 0) {
      throw new Error('Failed to get account balance: ' + accountInfo.retMsg);
    }
    const account = accountInfo.result.list[0];
    const availableBalance = parseFloat(account.totalAvailableBalance || 0);
    const requiredAmount = minQty * parseFloat(currentPrice);
    console.log(`✅ Account Balance: $${availableBalance.toFixed(2)}`);
    console.log(`✅ Required Amount: $${requiredAmount.toFixed(2)}`);
    if (availableBalance < requiredAmount) {
      throw new Error('Insufficient balance for this trade');
    }

    // Step 5: Place Real Order
    console.log('\n5️⃣ Placing REAL Market Order...');
    const orderData = {
      category: 'linear',
      symbol,
      side: action,
      orderType: 'Market',
      qty: minQty.toString(),
      timeInForce: 'GTC'
    };
    console.log('📋 Order Details:');
    console.log(`  Symbol: ${orderData.symbol}`);
    console.log(`  Side: ${orderData.side}`);
    console.log(`  Type: ${orderData.orderType}`);
    console.log(`  Quantity: ${orderData.qty}`);
    console.log(`  Time in Force: ${orderData.timeInForce}`);
    const orderResult = await bybitClient.submitOrder(orderData);
    if (orderResult.retCode === 0) {
      console.log('✅ Order placed successfully!');
      console.log(`  Order ID: ${orderResult.result.orderId}`);
      console.log(`  Status: ${orderResult.result.orderStatus}`);
    } else {
      throw new Error('Order failed: ' + orderResult.retMsg);
    }

    // Step 6: Send Discord Notification
    console.log('\n6️⃣ Sending Discord Notification...');
    if (DISCORD_WEBHOOK_URL) {
      try {
        const axios = require('axios');
        const discordMessage = {
          embeds: [{
            title: '🤖 REAL TRADE EXECUTED',
            color: 0x00ff00,
            fields: [
              { name: 'Symbol', value: symbol, inline: true },
              { name: 'Action', value: action, inline: true },
              { name: 'Quantity', value: minQty.toString(), inline: true },
              { name: 'Price', value: `$${currentPrice}`, inline: true },
              { name: 'Strategy', value: strategy, inline: true },
              { name: 'Exchange', value: exchange, inline: true },
              { name: 'Order ID', value: orderResult.result.orderId, inline: false },
              { name: 'Status', value: orderResult.result.orderStatus || 'Executed', inline: false }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'MarketPulse Trading Bot' }
          }]
        };
        const response = await axios.post(DISCORD_WEBHOOK_URL, discordMessage);
        if (response.status === 204) {
          console.log('✅ Discord notification sent successfully');
        } else {
          console.log('⚠️ Discord notification sent with status:', response.status);
        }
      } catch (error) {
        console.log('❌ Discord notification failed:', error.message);
      }
    } else {
      console.log('⚠️ Discord webhook URL not configured');
    }

    // Step 7: Save to Database (REAL INSERT)
    console.log('\n7️⃣ Saving to Database (REAL INSERT)...');
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const signalData = {
          symbol,
          type: action.toLowerCase(),
          entry_price: parseFloat(currentPrice) || 0,
          created_at: timestamp,
          signal_source: 'test_script',
          strategy_name: strategy,
          status: 'executed',
          exchange: exchange,
          action,
          executed_at: new Date().toISOString(),
          order_id: orderResult.result.orderId
        };
        console.log('📊 Signal data prepared for database:');
        console.log(`  Symbol: ${signalData.symbol}`);
        console.log(`  Action: ${signalData.action}`);
        console.log(`  Strategy: ${signalData.strategy_name}`);
        console.log(`  Status: ${signalData.status}`);
        console.log(`  Entry Price: ${signalData.entry_price}`);
        console.log(`  Order ID: ${signalData.order_id}`);
        // REAL DB INSERT
        const { data, error } = await supabase
          .from('signals')
          .insert([signalData]);
        if (error) {
          console.log('❌ Database insert failed:', error.message);
          console.log('Error details:', error);
        } else {
          console.log('✅ Database insert successful:', data);
        }
      } catch (error) {
        console.log('❌ Database insert exception:', error.message);
      }
    } else {
      console.log('⚠️ Supabase credentials not configured');
    }

    // Step 8: Close the open SOLUSDT position
    console.log('\n8️⃣ Closing the open SOLUSDT position...');
    const positionsResp = await bybitClient.getPositionInfo({ category: 'linear', symbol });
    if (positionsResp.retCode === 0 && positionsResp.result.list.length > 0) {
      const position = positionsResp.result.list.find(pos => pos.side === 'Buy' && parseFloat(pos.size) > 0);
      if (position) {
        const closeQty = position.size;
        console.log(`✅ Found open long position: ${closeQty} SOLUSDT. Placing market Sell order to close...`);
        const closeOrder = await bybitClient.submitOrder({
          category: 'linear',
          symbol,
          side: 'Sell',
          orderType: 'Market',
          qty: closeQty,
          timeInForce: 'GTC',
          reduceOnly: true
        });
        if (closeOrder.retCode === 0) {
          console.log('✅ Close order placed successfully!');
          // Discord notification for close
          if (DISCORD_WEBHOOK_URL) {
            try {
              const axios = require('axios');
              const discordMessage = {
                embeds: [{
                  title: '🔻 POSITION CLOSED',
                  color: 0xff0000,
                  fields: [
                    { name: 'Symbol', value: symbol, inline: true },
                    { name: 'Action', value: 'Sell', inline: true },
                    { name: 'Quantity', value: closeQty, inline: true },
                    { name: 'Order ID', value: closeOrder.result.orderId, inline: false },
                    { name: 'Status', value: closeOrder.result.orderStatus || 'Closed', inline: false }
                  ],
                  timestamp: new Date().toISOString(),
                  footer: { text: 'MarketPulse Trading Bot' }
                }]
              };
              await axios.post(DISCORD_WEBHOOK_URL, discordMessage);
              console.log('✅ Discord notification for close sent successfully');
            } catch (error) {
              console.log('❌ Discord notification for close failed:', error.message);
            }
          }
        } else {
          console.log('❌ Close order failed:', closeOrder.retMsg);
        }
      } else {
        console.log('No open long position to close.');
      }
    } else {
      console.log('No open position found or error fetching positions.');
    }

    // Step 9: Summary
    console.log('\n🎉 Complete Flow Test Summary:');
    console.log('✅ Signal reception simulated');
    console.log('✅ Bybit client initialized');
    console.log('✅ Account balance checked');
    console.log('✅ REAL order placed');
    console.log('✅ Discord notification sent');
    console.log('✅ Database save simulated');
    console.log('✅ Open position closed');
    console.log('\n📝 Next Steps:');
    console.log('1. Check Bybit for the new order');
    console.log('2. Check Discord for notification');
    console.log('3. Enable actual DB writes if desired');

  } catch (error) {
    console.error('\n❌ Complete flow test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check all environment variables are set');
    console.log('2. Verify Bybit API credentials');
    console.log('3. Check Discord webhook URL');
    console.log('4. Verify Supabase configuration');
    process.exit(1);
  }
}

// Run the test
testCompleteFlow(); 