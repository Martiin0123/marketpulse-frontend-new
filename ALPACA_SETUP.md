# Alpaca Trading API Setup

This guide will help you set up Alpaca's trading API for real-time trading and PnL tracking.

## Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Alpaca API Configuration
ALPACA_API_KEY=your-alpaca-api-key
ALPACA_SECRET_KEY=your-alpaca-secret-key
ALPACA_PAPER=true  # Set to false for live trading
```

## Getting Alpaca API Keys

1. **Create Alpaca Account**:
   - Go to [alpaca.markets](https://alpaca.markets)
   - Sign up for a free account
   - Complete identity verification

2. **Get API Keys**:
   - Navigate to **Paper Trading** (recommended for testing)
   - Go to **API Keys** section
   - Generate new API key pair
   - Copy both the **API Key ID** and **Secret Key**

3. **Paper vs Live Trading**:
   - **Paper Trading**: Free, no real money, perfect for testing
   - **Live Trading**: Real money, requires account funding

## What Alpaca Provides

### PnL Tracking (No Manual Calculation Needed)

Alpaca automatically calculates and provides:

- **Real-time PnL**: `unrealized_pl` and `unrealized_plpc` (percentage)
- **Position Data**: Current price, market value, cost basis
- **Account Overview**: Portfolio value, buying power, cash
- **Trade History**: Complete order and trade history

### Key Endpoints Used

```javascript
// Account Information
GET / v2 / account;
// Returns: portfolio_value, buying_power, cash, equity

// Current Positions
GET / v2 / positions;
// Returns: symbol, qty, avg_entry_price, unrealized_pl, current_price

// Submit Orders
POST / v2 / orders;
// Submit: buy/sell orders with various types (market, limit, stop)

// Portfolio History
GET / v2 / account / portfolio / history;
// Returns: daily portfolio value changes
```

## Database Schema Benefits

With Alpaca integration, you can:

1. **Remove Manual PnL Calculation**: Alpaca provides accurate PnL
2. **Real-time Position Updates**: Sync with Alpaca's live data
3. **Enhanced Metadata**: Store Alpaca's technical data
4. **Order Tracking**: Link orders to positions

### Updated Schema Features

```sql
-- Enhanced positions table with Alpaca data
ALTER TABLE positions ADD COLUMN technical_metadata JSONB;
-- Stores: alpaca_position_id, market_value, unrealized_pl, etc.

-- Enhanced signals table
ALTER TABLE signals ADD COLUMN strategy_name VARCHAR(100);
ALTER TABLE signals ADD COLUMN signal_source VARCHAR(50);
-- Tracks: Pine Script strategy, signal source, technical indicators
```

## Testing the Integration

1. **Test Paper Trading**:

   ```bash
   # Test account info
   curl -X GET "https://paper-api.alpaca.markets/v2/account" \
     -H "APCA-API-KEY-ID: your-api-key" \
     -H "APCA-API-SECRET-KEY: your-secret-key"
   ```

2. **Test Position Sync**:

   ```bash
   # Sync positions with your database
   curl -X GET "http://localhost:3000/api/alpaca/sync-positions"
   ```

3. **Test Trading Signal**:
   ```bash
   # Send test signal
   curl -X POST "http://localhost:3000/api/tradingview" \
     -H "Content-Type: application/json" \
     -d '{
       "symbol": "AAPL",
       "action": "BUY",
       "price": 150.25,
       "quantity": 1,
       "strategy_metadata": {
         "rsi_value": 65.4,
         "smoothing_ma": 62.1,
         "divergence": null
       }
     }'
   ```

## ai_algorithm Integration

Update your ai_algorithm alerts to include strategy metadata:

```ai_algorithm
// Enhanced alert message with technical data
alert("Primescope LONG Entry! Symbol: " + syminfo.ticker +
      ", Price: " + str.tostring(close) +
      ", RSI: " + str.tostring(rsi) +
      ", MA: " + str.tostring(smoothingMA),
      alert.freq_once_per_bar)
```

## Benefits of Alpaca Integration

### ✅ What You Get

1. **Accurate PnL**: No manual calculation errors
2. **Real-time Data**: Live position updates
3. **Order Management**: Professional order types
4. **Risk Management**: Built-in position sizing
5. **Compliance**: SEC-regulated broker
6. **Paper Trading**: Risk-free testing

### ❌ What You Don't Need

1. **Manual PnL Calculation**: Alpaca handles this
2. **Price Tracking**: Real-time from Alpaca
3. **Order Execution**: Professional execution
4. **Account Management**: Alpaca handles this

## Security Best Practices

1. **Environment Variables**: Never commit API keys
2. **Paper Trading**: Test with paper account first
3. **API Key Rotation**: Regularly rotate keys
4. **Error Handling**: Implement proper error handling
5. **Rate Limiting**: Respect API rate limits

## Monitoring and Logging

The integration includes comprehensive logging:

```javascript
// Account monitoring
console.log('📊 Alpaca Account:', {
  portfolio_value: account.portfolio_value,
  buying_power: account.buying_power,
  cash: account.cash
});

// Order tracking
console.log('🟢 Buy order submitted:', {
  symbol: symbolUpper,
  qty: quantity,
  order_id: buyOrder.id,
  status: buyOrder.status
});
```

## Next Steps

1. **Install Dependencies**: `npm install @alpacahq/alpaca-trade-api`
2. **Set Environment Variables**: Add Alpaca API keys
3. **Run Migration**: Apply database schema updates
4. **Test Integration**: Use paper trading first
5. **Monitor Performance**: Track PnL and positions

## Support

- **Alpaca Documentation**: [docs.alpaca.markets](https://docs.alpaca.markets)
- **API Reference**: [alpaca.markets/docs/api-documentation](https://alpaca.markets/docs/api-documentation)
- **Community**: [alpaca.markets/community](https://alpaca.markets/community)
