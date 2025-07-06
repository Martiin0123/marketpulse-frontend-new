import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Discord webhook function
async function sendTradingSignalToDiscord(signal, webhookUrl) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const embed = {
      title: `🔔 Trading Signal: ${signal.symbol}`,
      description: `New ${signal.action} signal for ${signal.symbol}`,
      color: signal.action === 'BUY' ? 0x00ff00 : 0xff0000, // Green for BUY, Red for SELL
      fields: [
        {
          name: 'Action',
          value: signal.action,
          inline: true
        },
        {
          name: 'Symbol',
          value: signal.symbol,
          inline: true
        },
        {
          name: 'Price',
          value: `$${signal.price.toFixed(2)}`,
          inline: true
        }
      ],
      timestamp: signal.timestamp,
      footer: {
        text: 'MarketPulse Trading Signals'
      }
    };

    const webhookData = {
      username: 'MarketPulse Trading Bot',
      avatar_url: 'https://marketpulse.com/logo.png',
      embeds: [embed]
    };

    console.log('📡 Sending trading signal to Discord:', {
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
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

    console.log('✅ Trading signal sent to Discord successfully');
    return true;

  } catch (error) {
    console.error('❌ Error sending trading signal to Discord:', error);
    return false;
  }
}

export async function POST(request) {
  const body = await request.json()
  const { symbol, action, price, timestamp } = body

  if (!symbol || !action || !price) {
    return new Response(JSON.stringify({ error: 'Missing required fields: symbol, action, price' }), { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase()
  
  // Parse and validate timestamp
  let validTimestamp
  let unixTimestamp
  try {
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

  // Handle CLOSE action
  if (action.toUpperCase() === 'CLOSE') {
    // Find the open position for this symbol
    const { data: openPosition, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('symbol', symbolUpper)
      .eq('status', 'open')
      .single()

    if (fetchError || !openPosition) {
      return new Response(JSON.stringify({ 
        message: 'No open position found to close',
        error: fetchError?.message 
      }), { status: 404 })
    }

    // Calculate PnL
    const entryPrice = Number(openPosition.entry_price)
    const exitPrice = Number(price)
    const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100

            // Close the position
        const { error: updateError } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            exit_timestamp: validTimestamp, // Use ISO string for timestamptz
            pnl: pnlPercentage
          })
          .eq('id', openPosition.id)

    if (updateError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to close position', 
        details: updateError.message 
      }), { status: 500 })
    }

    // Create close signal for reporting
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbolUpper,
        type: 'close',
        price: price,
        created_at: validTimestamp
      }])
      .select()
      .single()

    if (signalError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create signal', 
        details: signalError.message 
      }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      message: 'Position closed successfully',
      position: {
        id: openPosition.id,
        symbol: symbolUpper,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl: pnlPercentage.toFixed(2) + '%'
      }
    }), { status: 200 })
  }

  // Handle BUY action
  if (action.toUpperCase() === 'BUY') {
    // Check for existing open position
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('*')
      .eq('symbol', symbolUpper)
      .eq('status', 'open')
      .single()

    if (existingPosition) {
      // If existing position is a sell, close it and create buy signal for reporting
      if (existingPosition.type === 'sell') {
        const entryPrice = Number(existingPosition.entry_price)
        const exitPrice = Number(price)
        const pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100 // For sell positions, profit when price goes down

        // Close the sell position
        const { error: updateError } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            exit_timestamp: validTimestamp,
            pnl: pnlPercentage
          })
          .eq('id', existingPosition.id)

        if (updateError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to close existing sell position', 
            details: updateError.message 
          }), { status: 500 })
        }

        // Create buy signal for reporting (but don't create position)
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbolUpper,
            type: 'buy',
            price: price,
            created_at: validTimestamp
          }])
          .select()
          .single()

        if (signalError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create signal', 
            details: signalError.message 
          }), { status: 500 })
        }

        // Send Discord notification for BUY signal
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhookUrl) {
          await sendTradingSignalToDiscord({
            symbol: symbolUpper,
            action: 'BUY',
            price: price,
            timestamp: validTimestamp
          }, discordWebhookUrl);
        }

        return new Response(JSON.stringify({ 
          message: 'Sell position closed and buy signal created',
          position_id: existingPosition.id,
          signal_id: signal.id,
          symbol: symbolUpper,
          exit_price: price
        }), { status: 200 })
      } else {
        // If existing position is already a buy, return without creating new
        return new Response(JSON.stringify({ 
          message: 'Buy position already exists',
          position_id: existingPosition.id
        }), { status: 200 })
      }
    }

    // No existing position, create new buy position
    // Create new signal first
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbolUpper,
        type: 'buy',
        price: price,
        created_at: validTimestamp
      }])
      .select()
      .single()

    if (signalError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create signal', 
        details: signalError.message 
      }), { status: 500 })
    }

    // Send Discord notification for BUY signal
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      await sendTradingSignalToDiscord({
        symbol: symbolUpper,
        action: 'BUY',
        price: price,
        timestamp: validTimestamp
      }, discordWebhookUrl);
    }

    // Create new position
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .insert([{
        symbol: symbolUpper,
        signal_id: signal.id,
        type: 'buy',
        entry_price: price,
        entry_timestamp: validTimestamp, // Use ISO string for timestamptz
        quantity: 1, // Default quantity
        status: 'open'
      }])
      .select()
      .single()

    if (positionError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create position', 
        details: positionError.message 
      }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      message: 'Signal and position created successfully',
      signal_id: signal.id,
      position_id: position.id,
      symbol: symbolUpper,
      entry_price: price
    }), { status: 200 })
  }

  // Handle SELL action
  if (action.toUpperCase() === 'SELL') {
    // Check for existing open position
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('*')
      .eq('symbol', symbolUpper)
      .eq('status', 'open')
      .single()

    if (existingPosition) {
      // If existing position is a buy, close it and create sell signal for reporting
      if (existingPosition.type === 'buy') {
        const entryPrice = Number(existingPosition.entry_price)
        const exitPrice = Number(price)
        const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100 // For buy positions, profit when price goes up

        // Close the buy position
        const { error: updateError } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            exit_timestamp: validTimestamp,
            pnl: pnlPercentage
          })
          .eq('id', existingPosition.id)

        if (updateError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to close existing buy position', 
            details: updateError.message 
          }), { status: 500 })
        }

        // Create sell signal for reporting (but don't create position)
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbolUpper,
            type: 'sell',
            price: price,
            created_at: validTimestamp
          }])
          .select()
          .single()

        if (signalError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create signal', 
            details: signalError.message 
          }), { status: 500 })
        }

        // Send Discord notification for SELL signal
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhookUrl) {
          await sendTradingSignalToDiscord({
            symbol: symbolUpper,
            action: 'SELL',
            price: price,
            timestamp: validTimestamp
          }, discordWebhookUrl);
        }

        // Create close signal for reporting
        const { data: closeSignal, error: closeSignalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbolUpper,
            type: 'close',
            price: price,
            created_at: validTimestamp
          }])
          .select()
          .single()

        if (closeSignalError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create close signal', 
            details: closeSignalError.message 
          }), { status: 500 })
        }

        return new Response(JSON.stringify({ 
          message: 'Buy position closed and sell signal created',
          position_id: existingPosition.id,
          signal_id: signal.id,
          symbol: symbolUpper,
          exit_price: price
        }), { status: 200 })
      } else {
        // If existing position is already a sell, return without creating new
        return new Response(JSON.stringify({ 
          message: 'Sell position already exists',
          position_id: existingPosition.id
        }), { status: 200 })
      }
    }

    // No existing position, create new sell position
    // Create new signal first
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbolUpper,
        type: 'sell',
        price: price,
        created_at: validTimestamp
      }])
      .select()
      .single()

    if (signalError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create signal', 
        details: signalError.message 
      }), { status: 500 })
    }

    // Send Discord notification for SELL signal
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      await sendTradingSignalToDiscord({
        symbol: symbolUpper,
        action: 'SELL',
        price: price,
        timestamp: validTimestamp
      }, discordWebhookUrl);
    }

    // Create new position
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .insert([{
        symbol: symbolUpper,
        signal_id: signal.id,
        type: 'sell',
        entry_price: price,
        entry_timestamp: validTimestamp,
        quantity: 1, // Default quantity
        status: 'open'
      }])
      .select()
      .single()

    if (positionError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create position', 
        details: positionError.message 
      }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      message: 'Signal and position created successfully',
      signal_id: signal.id,
      position_id: position.id,
      symbol: symbolUpper,
      entry_price: price
    }), { status: 200 })
  }

  return new Response(JSON.stringify({ 
    error: 'Invalid action. Must be BUY, SELL, or CLOSE' 
  }), { status: 400 })
}
