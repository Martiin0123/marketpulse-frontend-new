# Bybit Integration Testing Guide

This guide will help you test the Bybit API integration locally before deploying to production.

## 🚀 Quick Start

### 1. Environment Setup

First, ensure your `.env.local` file has the required variables:

```bash
# Bybit API Configuration
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET_KEY=your_bybit_secret_key
BYBIT_TESTNET=true  # Set to false for mainnet

# Discord Webhooks
DISCORD_WEBHOOK_URL=your_main_discord_webhook
DISCORD_WEBHOOK_URL_FREE=your_free_tier_discord_webhook
DISCORD_WEBHOOK_URL_REFUNDS=your_refunds_discord_webhook

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### 2. Database Migration

Run the database migrations to add Bybit support:

```bash
npm run supabase:push
```

### 3. Start Development Server

```bash
npm run dev
```

## 🧪 Testing Steps

### Step 1: Test Bybit API Connection

Run the connection test script:

```bash
node test-bybit-connection.js
```

**Expected Output:**

```
🔧 Testing Bybit API Connection...

📋 Environment Check:
  API Key: ✅ Set
  Secret Key: ✅ Set
  Testnet: ✅ Enabled

🔗 Testing API Connection...

1️⃣ Testing server time...
✅ Server time: 2025-01-08T10:30:00.000Z

2️⃣ Testing account info...
✅ Account info retrieved:
  Total Equity: $1000.00
  Available Balance: $950.00
  Used Margin: $50.00

3️⃣ Testing positions...
✅ Found 0 active positions

4️⃣ Testing instruments info...
✅ BTCUSDT instrument info:
  Symbol: BTCUSDT
  Status: Trading
  Min Order Qty: 0.001
  Max Order Qty: 1000

5️⃣ Testing order submission (dry run)...
✅ Order submission test successful
  Order ID: 123456789
  Status: New

🔄 Canceling test order...
✅ Test order canceled successfully

🎉 All tests completed successfully!
✅ Bybit API connection is working properly
```

### Step 2: Test Webhook Endpoint

Run the webhook test script:

```bash
node test-webhook.js
```

**Expected Output:**

```
🔧 Testing Bybit Webhook Endpoint...

📡 Testing webhook at: http://localhost:3000/api/bybit/tradingview

🧪 Testing: BUY Signal (Long Entry)
  Status: 200
  Response: {
    "message": "Bybit buy order submitted successfully",
    "order_id": "123456789",
    "signal_id": "uuid",
    "position_id": "uuid",
    "symbol": "BTCUSDT",
    "entry_price": 45000
  }
  ✅ Success

🧪 Testing: SELL Signal (Short Entry)
  Status: 200
  Response: {
    "message": "Bybit sell order submitted successfully",
    "order_id": "123456790",
    "signal_id": "uuid",
    "position_id": "uuid",
    "symbol": "ETHUSDT",
    "entry_price": 3200
  }
  ✅ Success
```

### Step 3: Test Discord Notifications

If you have Discord webhook configured, you should receive notifications like:

```
🔔 Bybit Signal: BTCUSD
Action: BUY
Symbol: BTCUSD
Price: $45000.00
Exchange: Bybit
```

### Step 4: Test No Loss Guarantee Discord Notifications

Run the Discord refund notification test:

```bash
node test-discord-refund.js
```

**Expected Output:**

```
🧪 Testing Discord Refund Notification...

📡 Testing Discord webhook URL: https://discord.com/api/webhooks/...

📤 Sending test refund request to Discord...

✅ Test refund request sent to Discord successfully!

📊 Test Data Sent:
   Request ID: TEST-REFUND-001
   User ID: test-user-123
   Month: 2025-01
   Refund Amount: $150.00
   Performance: $-150.00
   Signals: 25
   Win Rate: 32.0%
```

You should receive a Discord notification with an orange embed containing the refund request details.

### Step 5: Test Database Integration

Check your Supabase database for new records:

```sql
-- Check signals table
SELECT * FROM signals WHERE exchange = 'bybit' ORDER BY created_at DESC LIMIT 5;

-- Check positions table
SELECT * FROM positions WHERE exchange = 'bybit' ORDER BY entry_timestamp DESC LIMIT 5;
```

## 🔧 Manual Testing

### Test 1: Direct API Call

```bash
curl -X POST http://localhost:3000/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "alert_message": "Primescope LONG Entry! Symbol: BTCUSD, Price: 45000"
  }'
```

### Test 2: TradingView Alert Format

```bash
curl -X POST http://localhost:3000/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSD",
    "action": "BUY",
    "price": 45000,
    "quantity": 0.001,
    "timestamp": "2025-01-08T10:30:00Z"
  }'
```

### Test 3: Close Position

```bash
curl -X POST http://localhost:3000/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "alert_message": "Primescope LONG Exit (MA Cross)! Symbol: BTCUSD, Price: 44800"
  }'
```

## 🐛 Troubleshooting

### Common Issues

#### 1. API Connection Failed

**Symptoms:**

- "Connection test failed" error
- "API key not found" error

**Solutions:**

- Verify API keys are correct
- Check IP restrictions in Bybit
- Ensure testnet/mainnet setting matches your account

#### 2. Webhook Not Responding

**Symptoms:**

- 404 or 500 errors
- "Cannot connect" errors

**Solutions:**

- Ensure Next.js server is running (`npm run dev`)
- Check server logs for errors
- Verify environment variables are loaded

#### 3. Database Errors

**Symptoms:**

- "Table not found" errors
- Migration failures

**Solutions:**

- Run `npm run supabase:push`
- Check Supabase connection
- Verify service role key has proper permissions

#### 4. Order Execution Failed

**Symptoms:**

- "Insufficient balance" errors
- "Symbol not found" errors

**Solutions:**

- Check account balance on Bybit
- Verify symbol format (BTCUSD → BTCUSDT)
- Ensure you have trading permissions

### Debug Commands

#### Check Environment Variables

```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('BYBIT_API_KEY:', process.env.BYBIT_API_KEY ? 'Set' : 'Missing'); console.log('BYBIT_TESTNET:', process.env.BYBIT_TESTNET);"
```

#### Check Server Logs

```bash
# In your Next.js terminal, look for:
# ✅ Bybit client initialized
# ✅ Order submitted successfully
# ❌ Error messages
```

#### Test Database Connection

```bash
npm run supabase:status
```

## 📊 Performance Testing

### Load Test

Test multiple signals in quick succession:

```bash
# Create a load test script
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/bybit/tradingview \
    -H "Content-Type: application/json" \
    -d "{\"alert_message\": \"Test Signal $i! Symbol: BTCUSD, Price: 45000\"}" &
done
wait
```

### Memory Usage

Monitor memory usage during testing:

```bash
# Check Node.js memory usage
node -e "console.log('Memory usage:', process.memoryUsage())"
```

## 🎯 Production Testing

### 1. Switch to Mainnet

Update your `.env.local`:

```bash
BYBIT_TESTNET=false
```

### 2. Test with Real Money

Start with small amounts:

```bash
# Test with minimal quantity
curl -X POST https://your-domain.com/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSD",
    "action": "BUY",
    "price": 45000,
    "quantity": 0.001
  }'
```

### 3. Monitor Performance

Check your Bybit dashboard for:

- Order execution
- Position tracking
- PnL calculations

## ✅ Success Criteria

Your integration is working correctly when:

1. ✅ API connection test passes
2. ✅ Webhook responds to all signal types
3. ✅ Orders execute on Bybit
4. ✅ Database records are created
5. ✅ Discord notifications are sent
6. ✅ Position tracking works
7. ✅ Error handling works properly

## 🚨 Safety Notes

- **Always test on testnet first**
- **Use small quantities for initial testing**
- **Monitor your account balance**
- **Keep API keys secure**
- **Set up proper error monitoring**

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test each component individually
5. Contact support if problems persist

## 🎉 Ready for Production

Once all tests pass:

1. Update environment variables for production
2. Deploy to your hosting platform
3. Update TradingView webhook URL
4. Monitor performance and errors
5. Set up proper logging and monitoring

Your Bybit integration is now ready for live trading! 🚀
