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

  // Convert action to uppercase to match database constraint
  const side = action.toUpperCase() // 'BUY' or 'SELL'
  
  // Validate side
  if (!['BUY', 'SELL'].includes(side)) {
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

  // Check if there's already a position in the same direction
  const sameDirectionPosition = existingPositions?.find(pos => pos.side === side)
  if (sameDirectionPosition) {
    return new Response(JSON.stringify({ 
      message: 'Position already exists in same direction',
      symbol: symbolUpper,
      side: side,
      existing_position_id: sameDirectionPosition.id
    }), { status: 200 })
  }

  // Check if there's an opposite direction position to close
  const oppositeDirection = side === 'BUY' ? 'SELL' : 'BUY'
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
      return new Response(JSON.stringify({ error: 'Failed to close opposite position', details: updateError.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      message: 'Opposite position closed',
      symbol: symbolUpper,
      closed_position: {
        id: oppositePosition.id,
        side: oppositePosition.side,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl: pnlPercentage.toFixed(2) + '%'
      }
    }), { status: 200 })
  }

  // Create new position (no existing positions found)
  const { error } = await supabase.from('positions').insert([
    {
      symbol: symbolUpper,
      side: side,
      entry_price: price,
      entry_time: createISOTimestamp(validTimestamp),
      status: 'open',
      pnl: 0
    }
  ])

  if (error) {
    console.error('Supabase insert error:', error)
    return new Response(JSON.stringify({ error: 'Supabase insert failed', details: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ 
    message: 'Position created successfully',
    symbol: symbolUpper,
    side: side,
    entry_price: price
  }), { status: 200 })
}
