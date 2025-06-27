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

  // Check for existing open positions for this symbol (for position management)
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

  // Position management logic
  const sideUpper = side.toUpperCase() // For positions table compatibility
  
  // Check if there's already a position in the same direction
  const sameDirectionPosition = existingPositions?.find(pos => pos.side === sideUpper)
  if (sameDirectionPosition) {
    // Don't create a signal if position already exists in same direction
    return new Response(JSON.stringify({ 
      message: 'Position already exists in same direction, no signal created',
      symbol: symbolUpper,
      side: side,
      signal_created: false,
      existing_position_id: sameDirectionPosition.id
    }), { status: 200 })
  }

  // Check if there's an opposite direction position to close
  const oppositeDirection = sideUpper === 'BUY' ? 'SELL' : 'BUY'
  const oppositePosition = existingPositions?.find(pos => pos.side === oppositeDirection)
  
  if (oppositePosition) {
    // Calculate PnL
    const entryPrice = Number(oppositePosition.entry_price)
    const exitPrice = Number(price)
    let pnlPercentage = 0
    
    if (oppositePosition.side === 'BUY') {
      // For BUY positions, profit when exit price > entry price
      pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100
    } else {
      // For SELL positions, profit when exit price < entry price
      pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100
    }

    // Close the opposite position
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        exit_time: createISOTimestamp(validTimestamp),
        pnl: pnlPercentage
      })
      .eq('id', oppositePosition.id)

    if (updateError) {
      console.error('Error closing opposite position:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to close opposite position', 
        details: updateError.message 
      }), { status: 500 })
    }

    // Create a "close" signal to show the position closure
    const { error: closeSignalError } = await supabase.from('signals').insert([
      {
        symbol: symbolUpper,
        typ: 'close',
        price: exitPrice,
        timestamp: createISOTimestamp(validTimestamp),
        reason: `Closed ${oppositePosition.side} position with ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}% PnL`,
        rsi: rsi ? Number(rsi) : null,
        macd: macd ? Number(macd) : null,
        risk: Math.abs(pnlPercentage) / 100 // Risk based on PnL magnitude
      }
    ])

    if (closeSignalError) {
      console.error('Error creating close signal:', closeSignalError)
    }

    // Now create the new position
    const { error: positionError } = await supabase.from('positions').insert([
      {
        symbol: symbolUpper,
        side: sideUpper,
        entry_price: price,
        entry_time: createISOTimestamp(validTimestamp),
        status: 'open',
        pnl: 0
      }
    ])

    if (positionError) {
      console.error('Supabase position insert error:', positionError)
      return new Response(JSON.stringify({ 
        message: 'Position closed but failed to create new position',
        closed_signal_created: !closeSignalError,
        error: 'New position creation failed', 
        details: positionError.message 
      }), { status: 500 })
    }

    // Create the new entry signal
    const { error: entrySignalError } = await supabase.from('signals').insert([
      {
        symbol: symbolUpper,
        typ: side,
        price: price,
        timestamp: createISOTimestamp(validTimestamp),
        reason: reason || `New ${side.toUpperCase()} position opened`,
        rsi: rsi ? Number(rsi) : null,
        macd: macd ? Number(macd) : null,
        risk: Math.random() * 0.8 + 0.2 // Random risk between 0.2-1.0
      }
    ])

    if (entrySignalError) {
      console.error('Error creating entry signal:', entrySignalError)
    }

    return new Response(JSON.stringify({ 
      message: 'Position closed and new position created',
      symbol: symbolUpper,
      side: side,
      closed_signal_created: !closeSignalError,
      entry_signal_created: !entrySignalError,
      new_position_created: true,
      closed_position: {
        id: oppositePosition.id,
        side: oppositePosition.side,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl: pnlPercentage.toFixed(2) + '%'
      }
    }), { status: 200 })
  }

  // Create new position (no existing positions found) - also create entry signal
  const { error: positionError } = await supabase.from('positions').insert([
    {
      symbol: symbolUpper,
      side: sideUpper,
      entry_price: price,
      entry_time: createISOTimestamp(validTimestamp),
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

  // Create the entry signal
  const { error: signalError } = await supabase.from('signals').insert([
    {
      symbol: symbolUpper,
      typ: side,
      price: price,
      timestamp: createISOTimestamp(validTimestamp),
      reason: reason || `New ${side.toUpperCase()} position opened`,
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
    message: 'New position and signal created successfully',
    symbol: symbolUpper,
    side: side,
    signal_created: true,
    position_created: true,
    entry_price: price
  }), { status: 200 })
}
