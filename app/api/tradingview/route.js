import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.json()
  const { symbol, action, price, timestamp } = body

  if (!symbol || !action || !price) {
    return new Response(JSON.stringify({ error: 'Missing required fields: symbol, action, price' }), { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase()
  
  // Parse and validate timestamp
  let validTimestamp
  try {
    // Handle both ISO string and Unix timestamp formats
    validTimestamp = typeof timestamp === 'string' 
      ? new Date(timestamp).toISOString()
      : new Date(Number(timestamp) * 1000).toISOString()
      
    if (isNaN(new Date(validTimestamp).getTime())) {
      throw new Error('Invalid timestamp')
    }
  } catch (error) {
    validTimestamp = new Date().toISOString()
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
        exit_timestamp: validTimestamp,
        pnl: pnlPercentage
      })
      .eq('id', openPosition.id)

    if (updateError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to close position', 
        details: updateError.message 
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
      // If existing position is a sell, close it first
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
      } else {
        // If existing position is already a buy, return without creating new
        return new Response(JSON.stringify({ 
          message: 'Buy position already exists',
          position_id: existingPosition.id
        }), { status: 200 })
      }
    }

    // Create new signal first
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbolUpper,
        type: 'buy',
        entry_price: price,
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

    // Create new position
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .insert([{
        symbol: symbolUpper,
        signal_id: signal.id,
        type: 'buy',
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
      // If existing position is a buy, close it first
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
      } else {
        // If existing position is already a sell, return without creating new
        return new Response(JSON.stringify({ 
          message: 'Sell position already exists',
          position_id: existingPosition.id
        }), { status: 200 })
      }
    }

    // Create new signal first
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbolUpper,
        type: 'sell',
        entry_price: price,
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
