import { createClient } from '@supabase/supabase-js'
import { 
  submitBybitOrder, 
  getBybitPosition, 
  getBybitAccount,
  convertSymbolFormat,
  getBybitTickerPrice
} from '@/utils/bybit/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper function to manually close a signal (for testing)
async function closeSignalManually(signalId, exitPrice, exitReason = 'manual') {
  try {
    const { data: signal, error: fetchError } = await supabase
      .from('signals')
      .select('*')
      .eq('id', signalId)
      .single()

    if (fetchError || !signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    if (signal.status === 'closed') {
      throw new Error(`Signal already closed: ${signalId}`);
    }

    const entryPrice = Number(signal.entry_price)
    const exitPriceNum = Number(exitPrice)
    const pnlPercentage = ((exitPriceNum - entryPrice) / entryPrice) * 100

    const { data: updatedSignal, error: updateError } = await supabase
      .from('signals')
      .update({
        status: 'closed',
        exit_price: exitPriceNum,
        exit_timestamp: new Date().toISOString(),
        pnl_percentage: pnlPercentage,
        exit_reason: exitReason
      })
      .eq('id', signalId)
      .select()
      .single()

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Manually closed signal:', {
      signal_id: signalId,
      symbol: signal.symbol,
      entry_price: entryPrice,
      exit_price: exitPriceNum,
      pnl_percentage: pnlPercentage
    });

    return updatedSignal;
  } catch (error) {
    console.error('❌ Error manually closing signal:', error);
    throw error;
  }
}

// Parse Pine Script alert message to extract signal data
  console.log('🔍 Parsing Pine Script alert for Bybit:', alertMessage);
  
  // Extract symbol and price from alert message
  // Format: "Primescope LONG Entry! Symbol: SOLUSDT, Price: 45.20"
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
  
  console.log('📊 Parsed signal data:', {
    symbol,
    price,
    action,
    signalType,
    exitReason
  });
  
  return {
    symbol,
    price,
    action,
    signalType,
    exitReason,
    originalMessage: alertMessage
  };
}

// Send success Discord notification
async function sendSuccessDiscordNotification(signal, orderDetails, webhookUrl, isEveryFifthTrade = false) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const getColor = (action) => {
      switch (action.toUpperCase()) {
        case 'BUY': return 0x00ff00; // Green
        case 'SELL': return 0xff0000; // Red
        case 'CLOSE': return 0xffa500; // Orange
        default: return 0x0099ff; // Blue
      }
    };

    const embed = {
      title: `✅ Bybit Order Executed: ${signal.symbol}`,
      description: `**${signal.action}** order completed successfully on Bybit`,
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
        },
        {
          name: '📦 Quantity',
          value: signal.quantity?.toString() || 'N/A',
          inline: true
        },
        {
          name: '🆔 Order ID',
          value: orderDetails.orderId || 'N/A',
          inline: true
        },
        {
          name: '🏢 Exchange',
          value: 'Bybit',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: isEveryFifthTrade ? 'Primescope Crypto Strategy - Bybit (Free Tier)' : 'Primescope Crypto Strategy - Bybit'
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

    const webhookData = {
      username: isEveryFifthTrade ? 'Primescope Free Trading Bot' : 'Primescope Bybit Trading Bot',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log(`📡 Sending success notification to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}:`, {
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
      orderId: orderDetails.orderId
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

    console.log(`✅ Success notification sent to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}`);
    return true;

  } catch (error) {
    console.error(`❌ Error sending success notification to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}:`, error);
    return false;
  }
}

// Send error Discord notification
async function sendErrorDiscordNotification(signal, error, webhookUrl) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const embed = {
      title: `❌ Bybit Order Failed: ${signal.symbol}`,
      description: `**${signal.action}** order failed on Bybit`,
      color: 0xff0000, // Red for error
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
          value: `$${signal.price?.toFixed(2) || 'N/A'}`,
          inline: true
        },
        {
          name: '🏢 Exchange',
          value: 'Bybit',
          inline: true
        },
        {
          name: '❌ Error',
          value: error.message || 'Unknown error',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Primescope Crypto Strategy - Bybit'
      }
    };

    const webhookData = {
      username: 'Primescope Bybit Trading Bot',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log('📡 Sending error notification to Discord:', {
      symbol: signal.symbol,
      action: signal.action,
      error: error.message
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

    console.log('✅ Error notification sent to Discord');
    return true;

  } catch (discordError) {
    console.error('❌ Error sending error notification to Discord:', discordError);
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
    console.log('📨 Received Pine Script alert for Bybit:', signalData);
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

  // Convert symbol format for Bybit (e.g., BTCUSD -> BTCUSDT)
  const bybitSymbol = convertSymbolFormat(symbol.toUpperCase(), true);
  
  // Parse and validate timestamp
  let validTimestamp
  let unixTimestamp
  try {
    const timestamp = body.timestamp || body.time || Date.now();
    if (typeof timestamp === 'string') {
      validTimestamp = new Date(timestamp).toISOString()
      unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000)
    } else {
      validTimestamp = new Date(Number(timestamp) * 1000).toISOString()
      unixTimestamp = Math.floor(Date.now() / 1000)
    }
      
    if (isNaN(new Date(validTimestamp).getTime())) {
      throw new Error('Invalid timestamp')
    }
  } catch (error) {
    validTimestamp = new Date().toISOString()
    unixTimestamp = Math.floor(Date.now() / 1000)
  }

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const discordFreeWebhookUrl = process.env.DISCORD_WEBHOOK_URL_FREE;
  
  // Get trade counter from database or initialize
  let tradeCounter = 1;
  try {
    const { data: counterData } = await supabase
      .from('trade_counter')
      .select('counter')
      .single();
    
    if (counterData) {
      tradeCounter = counterData.counter + 1;
    }
    
    // Update counter in database
    await supabase
      .from('trade_counter')
      .upsert({ id: 1, counter: tradeCounter, updated_at: new Date().toISOString() });
      
  } catch (error) {
    console.log('⚠️ Could not get trade counter, using default:', error.message);
  }
  
  const isEveryFifthTrade = tradeCounter % 5 === 0;
  console.log(`📊 Trade counter: ${tradeCounter}${isEveryFifthTrade ? ' (5th trade - sending to both webhooks)' : ''}`);

  try {
    // Get current price from Bybit if not provided
    let currentPrice = price;
    if (!currentPrice || currentPrice === 0) {
      try {
        const tickerPrice = await getBybitTickerPrice(bybitSymbol);
        currentPrice = tickerPrice;
        console.log('📊 Fetched current price from Bybit:', { symbol: bybitSymbol, price: currentPrice });
      } catch (priceError) {
        console.error('❌ Failed to fetch current price:', priceError);
        currentPrice = price; // Use provided price as fallback
      }
    }

    // Get Bybit account info
    const account = await getBybitAccount()
    console.log('📊 Bybit Account:', {
      totalEquity: account.totalEquity,
      totalWalletBalance: account.totalWalletBalance,
      totalAvailableBalance: account.totalAvailableBalance
    })

    let orderResult = null;
    let databaseResult = null;

    // Handle CLOSE action (exit signal from Pine Script)
    if (action.toUpperCase() === 'CLOSE') {
      try {
        // Check if position exists in Bybit
        const bybitPosition = await getBybitPosition(bybitSymbol)
        
        if (!bybitPosition) {
          const error = new Error('No open position found to close');
          console.log('⚠️ No position to close for:', bybitSymbol);
          
          if (discordWebhookUrl) {
            await sendErrorDiscordNotification({
              symbol: symbol.toUpperCase(),
              action: 'CLOSE',
              price: currentPrice
            }, error, discordWebhookUrl);
          }
          
          return new Response(JSON.stringify({ 
            message: 'No open position found to close',
            symbol: bybitSymbol
          }), { status: 404 })
        }

        // Submit sell order to close position
        orderResult = await submitBybitOrder({
          symbol: bybitSymbol,
          side: bybitPosition.side === 'Buy' ? 'Sell' : 'Buy', // Reverse the position
          orderType: 'Market',
          qty: bybitPosition.size,
          reduceOnly: true
        })

        console.log('🔴 Bybit position close order submitted:', {
          symbol: bybitSymbol,
          qty: bybitPosition.size,
          order_id: orderResult.orderId,
          status: orderResult.orderStatus,
          exit_reason: exitReason
        })

        // Find and update the original BUY signal with exit information
        const { data: originalSignal, error: findError } = await supabase
          .from('signals')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .eq('type', 'buy')
          .eq('status', 'active')
          .eq('exchange', 'bybit')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (originalSignal) {
          const entryPrice = Number(originalSignal.entry_price)
          const exitPrice = Number(currentPrice)
          const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100

          // Update the original BUY signal with exit information
          const { data: updatedSignal, error: updateSignalError } = await supabase
            .from('signals')
            .update({
              status: 'closed',
              exit_price: exitPrice,
              exit_timestamp: validTimestamp,
              pnl_percentage: pnlPercentage,
              exit_reason: exitReason || 'ma_cross'
            })
            .eq('id', originalSignal.id)
            .select()
            .single()

          if (updateSignalError) {
            console.error('❌ Error updating original signal:', updateSignalError);
          } else {
            console.log('✅ Updated original signal with exit data:', {
              signal_id: originalSignal.id,
              entry_price: entryPrice,
              exit_price: exitPrice,
              pnl_percentage: pnlPercentage
            });
            databaseResult = updatedSignal;
          }
        }

        // Create close signal with Pine Script metadata
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbol.toUpperCase(),
            type: 'close',
            entry_price: currentPrice,
            created_at: validTimestamp,
            strategy_name: 'Primescope Crypto',
            signal_source: 'pinescript',
            exchange: 'bybit',
            exit_reason: exitReason || 'ma_cross',
            status: 'closed',
            rsi_value: strategy_metadata.rsi_value,
            technical_metadata: strategy_metadata
          }])
          .select()
          .single()

        // Send success Discord notification
        if (discordWebhookUrl) {
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'CLOSE',
            price: currentPrice,
            timestamp: validTimestamp,
            strategy_metadata: strategy_metadata,
            exitReason: exitReason
          }, orderResult, discordWebhookUrl);
        }
        
        // Send to free webhook if it's every 5th trade
        if (isEveryFifthTrade && discordFreeWebhookUrl) {
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'CLOSE',
            price: currentPrice,
            timestamp: validTimestamp,
            strategy_metadata: strategy_metadata,
            exitReason: exitReason
          }, orderResult, discordFreeWebhookUrl, true);
        }

        return new Response(JSON.stringify({ 
          message: 'Bybit position close order submitted successfully',
          order_id: orderResult.orderId,
          symbol: bybitSymbol,
          bybit_position: bybitPosition,
          signal_id: signal?.id,
          pnl_percentage: databaseResult?.pnl_percentage || null,
          exit_reason: exitReason
        }), { status: 200 })

      } catch (error) {
        console.error('❌ Error closing position:', error);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'CLOSE',
            price: currentPrice
          }, error, discordWebhookUrl);
        }
        
        throw error;
      }
    }

    // Handle BUY action (long entry signal from Pine Script)
    if (action.toUpperCase() === 'BUY') {
      try {
        // Check for existing position in Bybit
        const existingBybitPosition = await getBybitPosition(bybitSymbol)
        
        if (existingBybitPosition) {
          const error = new Error('Position already exists');
          console.log('⚠️ Position already exists:', existingBybitPosition)
          
          if (discordWebhookUrl) {
            await sendErrorDiscordNotification({
              symbol: symbol.toUpperCase(),
              action: 'BUY',
              price: currentPrice
            }, error, discordWebhookUrl);
          }
          
          return new Response(JSON.stringify({ 
            message: 'Position already exists',
            symbol: bybitSymbol,
            position: existingBybitPosition
          }), { status: 200 })
        }

        // Submit buy order
        orderResult = await submitBybitOrder({
          symbol: bybitSymbol,
          side: 'Buy',
          orderType: 'Market',
          qty: quantity.toString()
        })

        console.log('🟢 Bybit buy order submitted:', {
          symbol: bybitSymbol,
          qty: quantity,
          order_id: orderResult.orderId,
          status: orderResult.orderStatus
        })

        // Create signal in database with Pine Script metadata
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbol.toUpperCase(),
            type: 'buy',
            entry_price: currentPrice,
            created_at: validTimestamp,
            strategy_name: 'Primescope Crypto',
            signal_source: 'pinescript',
            exchange: 'bybit',
            status: 'active',
            rsi_value: strategy_metadata.rsi_value,
            technical_metadata: strategy_metadata
          }])
          .select()
          .single()

        databaseResult = signal;

        // Send success Discord notification
        if (discordWebhookUrl) {
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'BUY',
            price: currentPrice,
            timestamp: validTimestamp,
            quantity: quantity,
            strategy_metadata: strategy_metadata
          }, orderResult, discordWebhookUrl);
        }

        return new Response(JSON.stringify({ 
          message: 'Bybit buy order submitted successfully',
          order_id: orderResult.orderId,
          signal_id: signal.id,
          symbol: bybitSymbol,
          entry_price: currentPrice,
          rsi_value: strategy_metadata.rsi_value
        }), { status: 200 })

      } catch (error) {
        console.error('❌ Error submitting buy order:', error);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'BUY',
            price: currentPrice
          }, error, discordWebhookUrl);
        }
        
        throw error;
      }
    }

    // Handle SELL action (short entry signal from Pine Script)
    if (action.toUpperCase() === 'SELL') {
      try {
        // Check for existing position in Bybit
        const existingBybitPosition = await getBybitPosition(bybitSymbol)
        
        if (existingBybitPosition) {
          const error = new Error('Position already exists');
          console.log('⚠️ Position already exists:', existingBybitPosition)
          
          if (discordWebhookUrl) {
            await sendErrorDiscordNotification({
              symbol: symbol.toUpperCase(),
              action: 'SELL',
              price: currentPrice
            }, error, discordWebhookUrl);
          }
          
          return new Response(JSON.stringify({ 
            message: 'Position already exists',
            symbol: bybitSymbol,
            position: existingBybitPosition
          }), { status: 200 })
        }

        // Submit sell order (short)
        orderResult = await submitBybitOrder({
          symbol: bybitSymbol,
          side: 'Sell',
          orderType: 'Market',
          qty: quantity.toString()
        })

        console.log('🔴 Bybit sell order submitted:', {
          symbol: bybitSymbol,
          qty: quantity,
          order_id: orderResult.orderId,
          status: orderResult.orderStatus
        })

        // Create signal in database with Pine Script metadata
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbol.toUpperCase(),
            type: 'sell',
            entry_price: currentPrice,
            created_at: validTimestamp,
            strategy_name: 'Primescope Crypto',
            signal_source: 'pinescript',
            exchange: 'bybit',
            status: 'active',
            rsi_value: strategy_metadata.rsi_value,
            technical_metadata: strategy_metadata
          }])
          .select()
          .single()

        databaseResult = signal;

        // Send success Discord notification
        if (discordWebhookUrl) {
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'SELL',
            price: currentPrice,
            timestamp: validTimestamp,
            quantity: quantity,
            strategy_metadata: strategy_metadata
          }, orderResult, discordWebhookUrl);
        }

        return new Response(JSON.stringify({ 
          message: 'Bybit sell order submitted successfully',
          order_id: orderResult.orderId,
          signal_id: signal.id,
          symbol: bybitSymbol,
          entry_price: currentPrice,
          rsi_value: strategy_metadata.rsi_value
        }), { status: 200 })

      } catch (error) {
        console.error('❌ Error submitting sell order:', error);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'SELL',
            price: currentPrice
          }, error, discordWebhookUrl);
        }
        
        throw error;
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action. Must be BUY, SELL, or CLOSE',
      received: signalData
    }), { status: 400 })

  } catch (error) {
    console.error('❌ Error processing Bybit Pine Script trading signal:', error)
    
    // Send error notification to Discord if not already sent
    if (discordWebhookUrl && !error.discordNotified) {
      try {
        await sendErrorDiscordNotification({
          symbol: symbol?.toUpperCase(),
          action: action,
          price: price
        }, error, discordWebhookUrl);
      } catch (discordError) {
        console.error('❌ Failed to send error notification to Discord:', discordError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process Bybit trading signal',
      details: error.message,
      received: body
    }), { status: 500 })
  }
} 