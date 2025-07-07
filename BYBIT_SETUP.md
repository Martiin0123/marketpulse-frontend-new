# Bybit API Integration Setup for Copy Trading

This guide will help you set up Bybit API integration to execute trades from your TradingView signals and enable copy trading functionality.

## 🎯 Overview

The Bybit integration allows you to:

- Execute trades automatically from TradingView signals
- Track positions and performance on Bybit
- Enable copy trading for other traders
- Monitor trading activity via Discord notifications

## 📋 Prerequisites

1. ✅ Bybit account (main or testnet)
2. ✅ Bybit API keys with trading permissions
3. ✅ TradingView Pine Script strategy
4. ✅ Discord webhook URL (optional)

## 🔧 Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Bybit API Configuration
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET_KEY=your_bybit_secret_key
BYBIT_TESTNET=true  # Set to false for mainnet

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

## 🔑 Creating Bybit API Keys

### Step 1: Access API Management

1. **Log into your Bybit account**
2. **Go to Account Settings** → API Management
3. **Click "Create New Key"**

### Step 2: Configure API Permissions

**Required Permissions:**

- ✅ **Read** (for account and position data)
- ✅ **Trade** (for order execution)
- ✅ **Copy Trading** (for copy trading features)

**Security Settings:**

- **IP Restriction**: Add your server's IP address
- **Key Name**: `Primescope Trading Bot`
- **Expiration**: Set appropriate expiration date

### Step 3: Save API Credentials

**Important Security Notes:**

- Never share your API keys
- Store keys securely in environment variables
- Use testnet for initial testing
- Regularly rotate API keys

## 🚀 API Endpoints

### TradingView Webhook Endpoint

**URL:** `https://your-domain.com/api/bybit/tradingview`

**Method:** POST

**Supported Actions:**

- `BUY` - Open long position
- `SELL` - Open short position
- `CLOSE` - Close existing position

### Example TradingView Alert Message

```
"Primescope LONG Entry! Symbol: BTCUSD, Price: 45000"
"Primescope SHORT Entry! Symbol: ETHUSD, Price: 3200"
"Primescope LONG Exit (MA Cross)! Symbol: BTCUSD, Price: 44800"
```

## 📊 Database Schema

The integration adds exchange tracking to your existing schema:

### Signals Table

```sql
ALTER TABLE signals ADD COLUMN exchange VARCHAR(20) DEFAULT 'alpaca';
```

### Positions Table

```sql
ALTER TABLE positions ADD COLUMN exchange VARCHAR(20) DEFAULT 'alpaca';
```

## 🔄 Trading Flow

### 1. Signal Reception

```
TradingView → Webhook → Bybit API → Database
```

### 2. Order Execution

- **Entry Signals**: Create market orders
- **Exit Signals**: Close positions with reduce-only orders
- **Position Tracking**: Monitor via Bybit API

### 3. Copy Trading Setup

**For Copy Trading Leaders:**

1. Execute trades on your Bybit account
2. Share your leader ID with followers
3. Monitor copy trading performance

**For Copy Trading Followers:**

1. Find a leader ID
2. Set copy amount and ratio
3. Start copying trades automatically

## 🛠️ Implementation Details

### Symbol Conversion

The system automatically converts symbol formats:

- **TradingView**: `BTCUSD` → **Bybit**: `BTCUSDT`
- **TradingView**: `ETHUSD` → **Bybit**: `ETHUSDT`

### Order Types

**Supported Order Types:**

- **Market Orders**: Immediate execution
- **Limit Orders**: Price-based execution
- **Reduce-Only**: For position closing

### Position Management

**Features:**

- Automatic position tracking
- PnL calculation
- Risk management
- Stop-loss and take-profit

## 📈 Performance Monitoring

### Database Views

**Multi-Exchange Performance:**

```sql
SELECT * FROM multi_exchange_signal_performance;
```

**Exchange Statistics:**

```sql
SELECT * FROM calculate_exchange_signal_stats('bybit');
```

### Discord Notifications

**Signal Notifications Include:**

- Action (BUY/SELL/CLOSE)
- Symbol and price
- Exchange (Bybit)
- Technical indicators
- Exit reasons

## 🔧 Testing

### 1. Test Environment Setup

```bash
# Set testnet mode
BYBIT_TESTNET=true

# Use test API keys
BYBIT_API_KEY=your_test_api_key
BYBIT_SECRET_KEY=your_test_secret_key
```

### 2. Test Signal

```bash
curl -X POST https://your-domain.com/api/bybit/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "alert_message": "Primescope LONG Entry! Symbol: BTCUSD, Price: 45000"
  }'
```

### 3. Verify Execution

- Check Bybit dashboard for orders
- Monitor Discord notifications
- Review database records

## 🚨 Error Handling

### Common Issues

**API Key Errors:**

- Verify API key permissions
- Check IP restrictions
- Ensure keys are active

**Order Execution Errors:**

- Verify account balance
- Check symbol availability
- Review order parameters

**Webhook Errors:**

- Test webhook URL
- Check server logs
- Verify request format

## 📊 Copy Trading Features

### Leader Setup

1. **Create Leader Account**
   - Set up dedicated Bybit account
   - Configure risk management
   - Share leader ID

2. **Performance Tracking**
   - Monitor win rate
   - Track drawdown
   - Calculate returns

### Follower Setup

1. **Find Leader**
   - Research performance
   - Check risk profile
   - Verify track record

2. **Configure Copy Settings**
   - Set copy amount
   - Choose copy ratio
   - Set risk limits

## 🔒 Security Best Practices

### API Key Security

- Use environment variables
- Restrict IP addresses
- Set appropriate permissions
- Regular key rotation

### Account Security

- Enable 2FA
- Use strong passwords
- Monitor account activity
- Regular security audits

## 📞 Support

### Troubleshooting

**Order Not Executing:**

1. Check API permissions
2. Verify account balance
3. Review symbol format
4. Check server logs

**Copy Trading Issues:**

1. Verify leader ID
2. Check copy settings
3. Review account status
4. Contact support

### Resources

- [Bybit API Documentation](https://bybit-exchange.github.io/docs/v5/intro)
- [Copy Trading Guide](https://www.bybit.com/en/help-center/article/Copy-Trading)
- [TradingView Webhook Setup](TRADINGVIEW_ALERT_SETUP.md)

## ✅ Success Checklist

- [ ] Bybit account created
- [ ] API keys generated with correct permissions
- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Webhook endpoint tested
- [ ] Discord notifications working
- [ ] Test trades executed successfully
- [ ] Copy trading configured (optional)
- [ ] Performance monitoring active

## 🎉 You're Ready!

Your Bybit integration is now complete and ready for:

- ✅ Automatic trade execution from TradingView signals
- ✅ Multi-exchange position tracking
- ✅ Copy trading functionality
- ✅ Real-time Discord notifications
- ✅ Performance analytics

Start trading and watch your signals execute automatically on Bybit!
