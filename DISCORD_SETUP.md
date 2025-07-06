# Discord Webhook Setup for Trading Signals

This guide will help you set up Discord webhook notifications for trading signals from your TradingView API.

## Environment Variables

Add the following variable to your `.env.local` file:

```bash
# Discord Webhook Configuration
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

## Creating a Discord Webhook

1. **Open Discord** and navigate to your server
2. **Go to Server Settings** → Integrations → Webhooks
3. **Click "New Webhook"**
4. **Configure the webhook:**
   - Name: `MarketPulse Trading Bot`
   - Channel: Choose where you want to receive trading signals
   - Avatar: Upload your bot avatar (optional)
5. **Copy the Webhook URL** - it should look like:
   ```
   https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
   ```
6. **Add the URL** to your `.env.local` file

## What Gets Sent to Discord

When a trading signal is received via the TradingView API, the following information will be posted to Discord:

### Trading Signal Embed

- **Title**: 🔔 Trading Signal: [SYMBOL]
- **Action**: BUY or SELL
- **Symbol**: Stock/trading symbol
- **Price**: Current price at signal time
- **Timestamp**: When the signal was received
- **Color**: Green for BUY, Red for SELL

### Example Discord Message

```
🔔 Trading Signal: AAPL
Action: BUY
Symbol: AAPL
Price: $150.25
```

## Testing the Integration

1. **Start your application** with the Discord webhook configured
2. **Send a test signal** to your TradingView API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/tradingview \
     -H "Content-Type: application/json" \
     -d '{
       "symbol": "AAPL",
       "action": "BUY",
       "price": 150.25,
       "timestamp": "2025-07-05T15:30:00Z"
     }'
   ```
3. **Check Discord** for the trading signal notification

## Troubleshooting

### Common Issues

1. **No Discord notifications**
   - Verify the webhook URL is correct
   - Check that `DISCORD_WEBHOOK_URL` is set in your environment
   - Ensure the webhook URL includes `discord.com/api/webhooks/`

2. **Invalid webhook URL**
   - Make sure you copied the complete webhook URL
   - The URL should be long and contain both an ID and token

3. **Discord permissions**
   - Ensure the webhook has permission to send messages in the channel
   - Check that the webhook hasn't been deleted or disabled

### Debug Information

The application will log:

- When a trading signal is received
- Discord webhook sending attempts
- Success/failure status
- Any error details

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your Discord webhook URL private
- Consider using different webhooks for different environments
- Regularly rotate webhook URLs if needed

## Integration Details

The Discord integration is added to your existing TradingView API at:

- `app/api/tradingview/route.js`

It sends notifications for:

- ✅ BUY signals (when new buy position is created)
- ✅ SELL signals (when new sell position is created)
- ❌ CLOSE signals (not sent to Discord - only for position management)

The system will automatically send Discord notifications whenever trading signals are received from your TradingView integration.
