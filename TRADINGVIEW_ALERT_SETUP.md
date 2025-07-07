# TradingView Alert Setup for Primescope Pine Script

## 🎯 Overview

This guide shows you how to set up TradingView alerts to send signals from your Pine Script strategy to your Discord and Alpaca trading system.

## 📋 Prerequisites

1. ✅ Pine Script strategy loaded in TradingView
2. ✅ Webhook URL: `https://your-domain.com/api/tradingview`
3. ✅ Discord webhook URL configured
4. ✅ Alpaca API keys set up

## 🔧 Alert Configuration Steps

### Step 1: Access Alert Settings

1. Open your Pine Script strategy in TradingView
2. Click the **"Alert"** button (bell icon) in the top toolbar
3. Select **"Create Alert"**

### Step 2: Configure Alert Conditions

#### For Entry Signals (BUY/SELL)

**Alert Name:** `Primescope Entry Signal`

**Condition:**

- Select **"Strategy"** tab
- Choose **"Strategy Entry"**
- Select **"RSI_Long"** for BUY signals
- Select **"RSI_Short"** for SELL signals

**Actions:**

- ✅ **Webhook URL**
- ✅ **Discord**
- ✅ **Email** (optional)

#### For Exit Signals (CLOSE)

**Alert Name:** `Primescope Exit Signal`

**Condition:**

- Select **"Strategy"** tab
- Choose **"Strategy Exit"**
- Select **"Long_Exit"** for long position exits
- Select **"Short_Exit"** for short position exits

**Actions:**

- ✅ **Webhook URL**
- ✅ **Discord**
- ✅ **Email** (optional)

### Step 3: Webhook Configuration

#### Webhook URL Format

```
https://your-domain.com/api/tradingview
```

#### Alert Message Format

The webhook expects the alert message to contain:

- Symbol information
- Price information
- Action type (Entry/Exit)

Your Pine Script already includes the correct alert messages:

**Entry Alerts:**

```
"Primescope LONG Entry! Symbol: BTCUSD, Price: 45000"
"Primescope SHORT Entry! Symbol: ETHUSD, Price: 3200"
```

**Exit Alerts:**

```
"Primescope LONG Exit (MA Cross)! Symbol: BTCUSD, Price: 44800"
"Primescope SHORT Exit (MA Cross)! Symbol: ETHUSD, Price: 3180"
"Primescope LONG Exit (Stop/Trailing)! Symbol: BTCUSD, Price: 44500"
"Primescope SHORT Exit (Stop/Trailing)! Symbol: ETHUSD, Price: 3150"
```

### Step 4: Alert Frequency Settings

**For Entry Signals:**

- **Frequency:** `Once Per Bar Close`
- **Expiration:** `No Expiration`

**For Exit Signals:**

- **Frequency:** `Once Per Bar Close`
- **Expiration:** `No Expiration`

### Step 5: Advanced Settings

**Message Format:**

```
{{strategy.order.alert_message}}
```

**This will send the exact alert message from your Pine Script.**

## 🔍 Testing Your Alerts

### Test 1: Manual Alert Test

1. Go to your strategy chart
2. Click the **"Alert"** button
3. Select **"Test"** for your alert
4. Check your Discord channel for the message

### Test 2: Strategy Backtest

1. Run a strategy backtest
2. Look for alert triggers in the strategy tester
3. Verify signals are sent to Discord

### Test 3: Live Trading Test

1. Enable live trading mode
2. Wait for actual signal generation
3. Verify Alpaca orders are placed

## 📊 Expected Discord Messages

### Entry Signal Example:

```json
{
  "title": "🔔 Primescope Signal: BTCUSD",
  "description": "**BUY** signal triggered by Pine Script strategy",
  "fields": [
    { "name": "🎯 Action", "value": "BUY", "inline": true },
    { "name": "📈 Symbol", "value": "BTCUSD", "inline": true },
    { "name": "💰 Price", "value": "$45000.00", "inline": true },
    { "name": "📊 RSI", "value": "35.42", "inline": true },
    { "name": "📈 MA", "value": "32.18", "inline": true }
  ]
}
```

### Exit Signal Example:

```json
{
  "title": "🔔 Primescope Signal: BTCUSD",
  "description": "**CLOSE** signal triggered by Pine Script strategy",
  "fields": [
    { "name": "🎯 Action", "value": "CLOSE", "inline": true },
    { "name": "📈 Symbol", "value": "BTCUSD", "inline": true },
    { "name": "💰 Price", "value": "$44800.00", "inline": true },
    { "name": "🚪 Exit Reason", "value": "MA CROSS", "inline": true }
  ]
}
```

## 🚨 Troubleshooting

### Alert Not Triggering

1. Check strategy conditions are met
2. Verify alert is enabled
3. Check TradingView server status

### Webhook Not Receiving

1. Verify webhook URL is correct
2. Check server logs for errors
3. Test webhook with curl:

```bash
curl -X POST https://your-domain.com/api/tradingview \
  -H "Content-Type: application/json" \
  -d '{"alert_message": "Primescope LONG Entry! Symbol: BTCUSD, Price: 45000"}'
```

### Discord Not Receiving

1. Check Discord webhook URL
2. Verify bot permissions
3. Check Discord server status

### Alpaca Orders Not Placing

1. Verify API keys are set
2. Check account has sufficient funds
3. Verify symbol is tradeable

## 📈 Monitoring

### Check Signal Logs

```bash
# View recent signals
curl https://your-domain.com/api/signals

# View open positions
curl https://your-domain.com/api/positions
```

### Monitor Discord Channel

- All signals will appear in your configured Discord channel
- Check for error messages or failed orders

### Monitor Alpaca Dashboard

- Log into your Alpaca account
- Check for placed orders
- Monitor position status

## 🔄 Automation Flow

1. **Pine Script** generates signal
2. **TradingView** sends alert to webhook
3. **Webhook** parses signal and sends to:
   - **Discord** (notification)
   - **Alpaca** (order execution)
   - **Database** (signal tracking)
4. **Position** is opened/closed automatically
5. **PnL** is tracked and reported

## ✅ Success Checklist

- [ ] Pine Script strategy loaded
- [ ] TradingView alerts configured
- [ ] Webhook URL set correctly
- [ ] Discord webhook configured
- [ ] Alpaca API keys working
- [ ] Test alerts sent successfully
- [ ] Live trading enabled
- [ ] Discord notifications working
- [ ] Alpaca orders placing correctly
- [ ] Database tracking signals

## 🎉 You're Ready!

Your Pine Script strategy is now fully integrated with:

- ✅ Real-time Discord notifications
- ✅ Automatic Alpaca order execution
- ✅ Database signal tracking
- ✅ PnL calculation and reporting

Start trading and watch your signals flow automatically!
