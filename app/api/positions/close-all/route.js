import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    // Get all open positions
    const { data: openPositions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('status', 'open')

    if (fetchError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch open positions', details: fetchError.message }), { status: 500 })
    }

    if (openPositions.length === 0) {
      return new Response(JSON.stringify({ message: 'No open positions to close' }), { status: 200 })
    }

    // Update all open positions to closed with sample exit prices
    const updates = openPositions.map(position => {
      // Generate sample exit prices (entry price +/- 1-5%)
      const priceChange = (Math.random() - 0.5) * 0.1 // -5% to +5%
      const exitPrice = position.entry_price * (1 + priceChange)
      const pnlPercentage = position.side === 'BUY' 
        ? (exitPrice - position.entry_price) / position.entry_price
        : (position.entry_price - exitPrice) / position.entry_price

      return {
        id: position.id,
        status: 'closed',
        exit_price: Math.round(exitPrice * 100) / 100,
        exit_time: new Date().toISOString(),
        pnl: Math.round(pnlPercentage * 10000) / 100, // Store as percentage
        rr: Math.round(Math.abs(pnlPercentage) * 100) / 100
      }
    })

    // Update all positions
    const updatePromises = updates.map(update => 
      supabase
        .from('positions')
        .update({
          status: update.status,
          exit_price: update.exit_price,
          exit_time: update.exit_time,
          pnl: update.pnl,
          rr: update.rr
        })
        .eq('id', update.id)
    )

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Some positions failed to update', 
        details: errors.map(e => e.error.message) 
      }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Closed ${openPositions.length} positions`,
      closedPositions: updates.length
    }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), { status: 500 })
  }
} 