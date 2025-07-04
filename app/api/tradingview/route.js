import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.json()
  const { symbol, action, price, timestamp, reason, rsi, macd } = body

  if (!symbol || !action || !price) {
    return new Response(JSON.stringify({ error: 'Missing required fields: symbol, action, price' }), { status: 400 })
  }

  // Convert action to lowercase to match signals table constraint
  const side = action.toLowerCase() // 'buy' or 'sell'
  
  // Validate side
  if (!['buy', 'sell'].includes(side)) {
    return new Response(JSON.stringify({ error: 'Invalid action. Must be buy or sell' }), { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase()
  
  // Safely handle timestamp - ensure it's a valid number
  let validTimestamp = Math.floor(Date.now() / 1000) // Default to current time
  if (timestamp) {
    const parsedTimestamp = Number(timestamp)
    if (!isNaN(parsedTimestamp) && parsedTimestamp > 0) {
      validTimestamp = parsedTimestamp
    }
  }
  
  // Helper function to safely create ISO timestamp
  const createISOTimestamp = (ts) => {
    try {
      const date = new Date(ts * 1000)
      if (isNaN(date.getTime())) {
        return new Date().toISOString()
      }
      return date.toISOString()
    } catch (error) {
      console.error('Error creating timestamp:', error)
      return new Date().toISOString()
    }
  }

  // Check for existing open positions for this symbol
  const { data: existingPositions, error: fetchError } = await supabase
    .from('positions')
    .select('*')
    .eq('symbol', symbolUpper)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching existing positions:', fetchError)
    return new Response(JSON.stringify({ error: 'Database query failed', details: fetchError.message }), { status: 500 })
  }

  // If it's a sell signal, we only want to close existing buy positions
  if (side === 'sell') {
    const buyPosition = existingPositions?.find(pos => pos.side === 'BUY')
    if (!buyPosition) {
      return new Response(JSON.stringify({ 
        message: 'No open buy position to close',
        signal_created: false
      }), { status: 200 })
    }

    // Calculate PnL
    const entryPrice = Number(buyPosition.entry_price)
    const exitPrice = Number(price)
    const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100

    // Close the buy position
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        exit_time: createISOTimestamp(validTimestamp),
        pnl: pnlPercentage
      })
      .eq('id', buyPosition.id)

    if (updateError) {
      console.error('Error closing buy position:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to close buy position', 
        details: updateError.message 
      }), { status: 500 })
    }

    // Create a "close" signal
    const { error: closeSignalError } = await supabase.from('signals').insert([
      {
        symbol: symbolUpper,
        typ: 'close',
        price: exitPrice,
        timestamp: createISOTimestamp(validTimestamp),
        reason: reason || `Closed BUY position with ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}% PnL`,
        rsi: rsi ? Number(rsi) : null,
        macd: macd ? Number(macd) : null,
        risk: Math.abs(pnlPercentage) / 100
      }
    ])

    if (closeSignalError) {
      console.error('Error creating close signal:', closeSignalError)
    }

    return new Response(JSON.stringify({ 
      message: 'Buy position closed successfully',
      symbol: symbolUpper,
      closed_signal_created: !closeSignalError,
      closed_position: {
        id: buyPosition.id,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl: pnlPercentage.toFixed(2) + '%'
      }
    }), { status: 200 })
  }

  // For buy signals
  if (side === 'buy') {
    // Check if there's already an open buy position
    const existingBuy = existingPositions?.find(pos => pos.side === 'BUY')
    if (existingBuy) {
      return new Response(JSON.stringify({ 
        message: 'Buy position already exists, no new position created',
        signal_created: false,
        existing_position_id: existingBuy.id
      }), { status: 200 })
    }

    // Create new buy position
    const { error: positionError } = await supabase.from('positions').insert([
      {
        symbol: symbolUpper,
        side: 'BUY',
        entry_price: price,
        created_at: createISOTimestamp(validTimestamp),
        status: 'open',
        pnl: 0
      }
    ])

    if (positionError) {
      console.error('Supabase position insert error:', positionError)
      return new Response(JSON.stringify({ 
        error: 'Position creation failed', 
        details: positionError.message 
      }), { status: 500 })
    }

    // Create the buy signal
    const { error: signalError } = await supabase.from('signals').insert([
      {
        symbol: symbolUpper,
        typ: 'buy',
        price: price,
        timestamp: createISOTimestamp(validTimestamp),
        reason: reason || 'New BUY position opened',
        rsi: rsi ? Number(rsi) : null,
        macd: macd ? Number(macd) : null,
        risk: Math.random() * 0.8 + 0.2 // Random risk between 0.2-1.0
      }
    ])

    if (signalError) {
      console.error('Supabase signal insert error:', signalError)
      return new Response(JSON.stringify({ 
        message: 'Position created but signal creation failed',
        position_created: true,
        signal_created: false,
        error: 'Signal insert failed', 
        details: signalError.message 
      }), { status: 200 })
    }

    return new Response(JSON.stringify({ 
      message: 'New buy position and signal created successfully',
      symbol: symbolUpper,
      signal_created: true,
      position_created: true,
      entry_price: price
    }), { status: 200 })
  }
}
