import { createClient } from '@supabase/supabase-js'
import { 
  alpacaClient, 
  submitOrder, 
  getPosition, 
  getAccount,
  calculatePnLPercentage 
} from '@/utils/alpaca/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Parse Pine Script alert message to extract signal data
function parsePineScriptAlert(alertMessage) {
  console.log('🔍 Parsing Pine Script alert:', alertMessage);
  
  // Extract symbol and price from alert message
  const symbolMatch = alertMessage.match(/Symbol:\s*([A-Z]+)/);
  const priceMatch = alertMessage.match(/Price:\s*([\d.]+)/);
  
  const symbol = symbolMatch ? symbolMatch[1] : null;
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
  
  // Determine action based on alert message
  let action = null;
  let signalType = null;
  let exitReason = null;
  
  if (alertMessage.includes('LONG Entry')) {
    action = 'BUY';
    signalType = 'entry';
  } else if (alertMessage.includes('SHORT Entry')) {
    action = 'SELL';
    signalType = 'entry';
  } else if (alertMessage.includes('LONG Exit') || alertMessage.includes('SHORT Exit')) {
    action = 'CLOSE';
    signalType = 'exit';
    if (alertMessage.includes('MA Cross')) {
      exitReason = 'ma_cross';
    } else if (alertMessage.includes('Stop/Trailing')) {
      exitReason = 'stop_trailing';
    }
  }
  
  return {
    symbol,
    price,
    action,
    signalType,
    exitReason,
    originalMessage: alertMessage
  };
}

// Enhanced Discord webhook function for Pine Script signals
async function sendTradingSignalToDiscord(signal, webhookUrl) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    // Determine color based on action
    const getColor = (action) => {
      switch (action.toUpperCase()) {
        case 'BUY': return 0x00ff00; // Green
        case 'SELL': return 0xff0000; // Red
        case 'CLOSE': return 0xffa500; // Orange
        default: return 0x0099ff; // Blue
      }
    };

    // Create enhanced embed with Pine Script data
    const embed = {
      title: `🔔 Primescope Signal: ${signal.symbol}`,
      description: `**${signal.action}** signal triggered by Pine Script strategy`,
      color: getColor(signal.action),
      fields: [
        {
          name: '🎯 Action',
          value: signal.action,
          inline: true
        },
        {
          name: '📈 Symbol',
          value: signal.symbol,
          inline: true
        },
        {
          name: '💰 Price',
          value: `$${signal.price.toFixed(2)}`,
          inline: true
        }
      ],
      timestamp: signal.timestamp,
      footer: {
        text: 'Primescope Crypto Strategy'
      }
    };

    // Add technical indicators if available
    if (signal.strategy_metadata) {
      const techFields = [];
      
      if (signal.strategy_metadata.rsi_value) {
        techFields.push({
          name: '📊 RSI',
          value: signal.strategy_metadata.rsi_value.toFixed(2),
          inline: true
        });
      }
      
      if (signal.strategy_metadata.smoothing_ma) {
        techFields.push({
          name: '📈 MA',
          value: signal.strategy_metadata.smoothing_ma.toFixed(2),
          inline: true
        });
      }
      
      if (signal.strategy_metadata.divergence) {
        techFields.push({
          name: '🔄 Divergence',
          value: signal.strategy_metadata.divergence ? 'Yes' : 'No',
          inline: true
        });
      }

      if (techFields.length > 0) {
        embed.fields.push(...techFields);
      }
    }

    // Add exit reason if available
    if (signal.exitReason) {
      embed.fields.push({
        name: '🚪 Exit Reason',
        value: signal.exitReason.replace('_', ' ').toUpperCase(),
        inline: true
      });
    }

    // Add position size if available
    if (signal.quantity) {
      embed.fields.push({
        name: '📦 Quantity',
        value: signal.quantity.toString(),
        inline: true
      });
    }

    const webhookData = {
      username: 'Primescope Trading Bot',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log('📡 Sending Pine Script signal to Discord:', {
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
      rsi: signal.strategy_metadata?.rsi_value,
      exitReason: signal.exitReason,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
    }

    console.log('✅ Pine Script signal sent to Discord successfully');
    return true;

  } catch (error) {
    console.error('❌ Error sending Pine Script signal to Discord:', error);
    return false;
  }
}

export async function POST(request) {
  const body = await request.json()
  
  // Handle both direct API calls and Pine Script alerts
  let signalData;
  
  if (body.alert_message) {
    // Parse Pine Script alert message
    signalData = parsePineScriptAlert(body.alert_message);
    console.log('📨 Received Pine Script alert:', signalData);
  } else {
    // Direct API call format
    signalData = {
      symbol: body.symbol,
      price: body.price,
      action: body.action,
      quantity: body.quantity || 1,
      strategy_metadata: body.strategy_metadata || {},
      signalType: body.signal_type || 'entry',
      exitReason: body.exit_reason
    };
  }

  const { symbol, price, action, quantity = 1, strategy_metadata = {}, signalType = 'entry', exitReason } = signalData;

  if (!symbol || !action || !price) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: symbol, action, price',
      received: body
    }), { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase()
  
  // Parse and validate timestamp
  let validTimestamp
  let unixTimestamp
  try {
    const timestamp = body.timestamp || body.time || Date.now();
    // Handle both ISO string and Unix timestamp formats
    if (typeof timestamp === 'string') {
      validTimestamp = new Date(timestamp).toISOString()
      unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000)
    } else {
      validTimestamp = new Date(Number(timestamp) * 1000).toISOString()
      unixTimestamp = Number(timestamp)
    }
      
    if (isNaN(new Date(validTimestamp).getTime())) {
      throw new Error('Invalid timestamp')
    }
  } catch (error) {
    validTimestamp = new Date().toISOString()
    unixTimestamp = Math.floor(Date.now() / 1000)
  }

  try {
    // Get Alpaca account info
    const account = await getAccount()
    console.log('📊 Alpaca Account:', {
      portfolio_value: account.portfolio_value,
      buying_power: account.buying_power,
      cash: account.cash
    })

    // Handle CLOSE action (exit signal from Pine Script)
    if (action.toUpperCase() === 'CLOSE') {
      // Check if position exists in Alpaca
      const alpacaPosition = await getPosition(symbolUpper)
      
      if (!alpacaPosition) {
        console.log('⚠️ No position to close for:', symbolUpper);
        return new Response(JSON.stringify({ 
          message: 'No open position found to close',
          symbol: symbolUpper
        }), { status: 404 })
      }

      // Submit sell order to close position
      const closeOrder = await submitOrder({
        symbol: symbolUpper,
        qty: parseFloat(alpacaPosition.qty),
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      })

      console.log('🔴 Position close order submitted:', {
        symbol: symbolUpper,
        qty: alpacaPosition.qty,
        order_id: closeOrder.id,
        status: closeOrder.status,
        exit_reason: exitReason
      })

      // Update local database
      const { data: openPosition, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('symbol', symbolUpper)
        .eq('status', 'open')
        .single()

      if (openPosition) {
        const entryPrice = Number(openPosition.entry_price)
        const exitPrice = Number(price)
        const pnlPercentage = calculatePnLPercentage(entryPrice, exitPrice, openPosition.type === 'buy' ? 'buy' : 'sell')

        await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            exit_timestamp: validTimestamp,
            pnl: pnlPercentage,
            exit_reason: exitReason || 'ma_cross'
          })
          .eq('id', openPosition.id)
      }

      // Create close signal with Pine Script metadata
      const { data: signal, error: signalError } = await supabase
        .from('signals')
        .insert([{
          symbol: symbolUpper,
          type: 'close',
          entry_price: price,
          created_at: validTimestamp,
          strategy_name: 'Primescope Crypto',
          signal_source: 'pinescript',
          exit_reason: exitReason || 'ma_cross',
          status: 'closed',
          rsi_value: strategy_metadata.rsi_value,
          technical_metadata: strategy_metadata
        }])
        .select()
        .single()

      // Send Discord notification for exit
      const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhookUrl) {
        await sendTradingSignalToDiscord({
          symbol: symbolUpper,
          action: 'CLOSE',
          price: price,
          timestamp: validTimestamp,
          strategy_metadata: strategy_metadata,
          exitReason: exitReason
        }, discordWebhookUrl);
      }

      return new Response(JSON.stringify({ 
        message: 'Position close order submitted successfully',
        order_id: closeOrder.id,
        symbol: symbolUpper,
        alpaca_position: alpacaPosition,
        signal_id: signal?.id,
        pnl_percentage: openPosition ? pnlPercentage : null,
        exit_reason: exitReason
      }), { status: 200 })
    }

    // Handle BUY action (long entry signal from Pine Script)
    if (action.toUpperCase() === 'BUY') {
      // Check for existing position in Alpaca
      const existingAlpacaPosition = await getPosition(symbolUpper)
      
      if (existingAlpacaPosition) {
        console.log('⚠️ Position already exists:', existingAlpacaPosition)
        return new Response(JSON.stringify({ 
          message: 'Position already exists',
          symbol: symbolUpper,
          position: existingAlpacaPosition
        }), { status: 200 })
      }

      // Submit buy order
      const buyOrder = await submitOrder({
        symbol: symbolUpper,
        qty: quantity,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      })

      console.log('🟢 Buy order submitted:', {
        symbol: symbolUpper,
        qty: quantity,
        order_id: buyOrder.id,
        status: buyOrder.status
      })

      // Create signal in database with Pine Script metadata
      const { data: signal, error: signalError } = await supabase
        .from('signals')
        .insert([{
          symbol: symbolUpper,
          type: 'buy',
          entry_price: price,
          created_at: validTimestamp,
          strategy_name: 'Primescope Crypto',
          signal_source: 'pinescript',
          status: 'active',
          rsi_value: strategy_metadata.rsi_value,
          technical_metadata: strategy_metadata
        }])
        .select()
        .single()

      // Create position record
      const { data: position, error: positionError } = await supabase
        .from('positions')
        .insert([{
          symbol: symbolUpper,
          signal_id: signal.id,
          type: 'buy',
          entry_price: price,
          entry_timestamp: validTimestamp,
          quantity: quantity,
          status: 'open',
          strategy_name: 'Primescope Crypto',
          entry_reason: strategy_metadata.entry_reason || 'rsi_ma_cross',
          rsi: strategy_metadata.rsi_value
        }])
        .select()
        .single()

      // Send Discord notification for entry
      const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhookUrl) {
        await sendTradingSignalToDiscord({
          symbol: symbolUpper,
          action: 'BUY',
          price: price,
          timestamp: validTimestamp,
          quantity: quantity,
          strategy_metadata: strategy_metadata
        }, discordWebhookUrl);
      }

      return new Response(JSON.stringify({ 
        message: 'Buy order submitted successfully',
        order_id: buyOrder.id,
        signal_id: signal.id,
        position_id: position.id,
        symbol: symbolUpper,
        entry_price: price,
        rsi_value: strategy_metadata.rsi_value
      }), { status: 200 })
    }

    // Handle SELL action (short entry signal from Pine Script)
    if (action.toUpperCase() === 'SELL') {
      // Check for existing position in Alpaca
      const existingAlpacaPosition = await getPosition(symbolUpper)
      
      if (existingAlpacaPosition) {
        console.log('⚠️ Position already exists:', existingAlpacaPosition)
        return new Response(JSON.stringify({ 
          message: 'Position already exists',
          symbol: symbolUpper,
          position: existingAlpacaPosition
        }), { status: 200 })
      }

      // Submit sell order (short)
      const sellOrder = await submitOrder({
        symbol: symbolUpper,
        qty: quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      })

      console.log('🔴 Sell order submitted:', {
        symbol: symbolUpper,
        qty: quantity,
        order_id: sellOrder.id,
        status: sellOrder.status
      })

      // Create signal in database with Pine Script metadata
      const { data: signal, error: signalError } = await supabase
        .from('signals')
        .insert([{
          symbol: symbolUpper,
          type: 'sell',
          entry_price: price,
          created_at: validTimestamp,
          strategy_name: 'Primescope Crypto',
          signal_source: 'pinescript',
          status: 'active',
          rsi_value: strategy_metadata.rsi_value,
          technical_metadata: strategy_metadata
        }])
        .select()
        .single()

      // Create position record
      const { data: position, error: positionError } = await supabase
        .from('positions')
        .insert([{
          symbol: symbolUpper,
          signal_id: signal.id,
          type: 'sell',
          entry_price: price,
          entry_timestamp: validTimestamp,
          quantity: quantity,
          status: 'open',
          strategy_name: 'Primescope Crypto',
          entry_reason: strategy_metadata.entry_reason || 'rsi_ma_cross',
          rsi: strategy_metadata.rsi_value
        }])
        .select()
        .single()

      // Send Discord notification for short entry
      const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhookUrl) {
        await sendTradingSignalToDiscord({
          symbol: symbolUpper,
          action: 'SELL',
          price: price,
          timestamp: validTimestamp,
          quantity: quantity,
          strategy_metadata: strategy_metadata
        }, discordWebhookUrl);
      }

      return new Response(JSON.stringify({ 
        message: 'Sell order submitted successfully',
        order_id: sellOrder.id,
        signal_id: signal.id,
        position_id: position.id,
        symbol: symbolUpper,
        entry_price: price,
        rsi_value: strategy_metadata.rsi_value
      }), { status: 200 })
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action. Must be BUY, SELL, or CLOSE',
      received: signalData
    }), { status: 400 })

  } catch (error) {
    console.error('❌ Error processing Pine Script trading signal:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process trading signal',
      details: error.message,
      received: body
    }), { status: 500 })
  }
}
