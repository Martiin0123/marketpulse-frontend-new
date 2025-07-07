import { createClient } from '@supabase/supabase-js'
import { getPositions as getAlpacaPositions, getAccount } from '@/utils/alpaca/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    // Get Alpaca account and positions
    const [account, alpacaPositions] = await Promise.all([
      getAccount(),
      getAlpacaPositions()
    ])

    console.log('📊 Syncing Alpaca positions:', {
      total_positions: alpacaPositions.length,
      portfolio_value: account.portfolio_value,
      buying_power: account.buying_power
    })

    // Get local positions
    const { data: localPositions, error: localError } = await supabase
      .from('positions')
      .select('*')
      .eq('status', 'open')

    if (localError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch local positions',
        details: localError.message 
      }), { status: 500 })
    }

    const updatedPositions = []
    const closedPositions = []

    // Update local positions with Alpaca data
    for (const localPosition of localPositions) {
      const alpacaPosition = alpacaPositions.find(
        ap => ap.symbol === localPosition.symbol
      )

      if (alpacaPosition) {
        // Position still exists in Alpaca - update with current data
        const currentPrice = parseFloat(alpacaPosition.current_price)
        const entryPrice = parseFloat(localPosition.entry_price)
        const unrealizedPl = parseFloat(alpacaPosition.unrealized_pl)
        const unrealizedPlpc = parseFloat(alpacaPosition.unrealized_plpc)

        const { data: updatedPosition, error: updateError } = await supabase
          .from('positions')
          .update({
            quantity: parseFloat(alpacaPosition.qty),
            updated_at: new Date().toISOString(),
            // Store Alpaca's calculated PnL
            pnl: unrealizedPlpc * 100, // Convert to percentage
            // Additional Alpaca data
            technical_metadata: {
              alpaca_position_id: alpacaPosition.asset_id,
              market_value: alpacaPosition.market_value,
              cost_basis: alpacaPosition.cost_basis,
              unrealized_pl: alpacaPosition.unrealized_pl,
              unrealized_plpc: alpacaPosition.unrealized_plpc,
              current_price: alpacaPosition.current_price,
              lastday_price: alpacaPosition.lastday_price,
              change_today: alpacaPosition.change_today
            }
          })
          .eq('id', localPosition.id)
          .select()
          .single()

        if (!updateError && updatedPosition) {
          updatedPositions.push(updatedPosition)
        }
      } else {
        // Position no longer exists in Alpaca - mark as closed
        const { data: closedPosition, error: closeError } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_timestamp: new Date().toISOString(),
            exit_reason: 'position_closed_externally'
          })
          .eq('id', localPosition.id)
          .select()
          .single()

        if (!closeError && closedPosition) {
          closedPositions.push(closedPosition)
        }
      }
    }

    // Create new positions for any Alpaca positions not in local DB
    const newPositions = []
    for (const alpacaPosition of alpacaPositions) {
      const localPosition = localPositions.find(
        lp => lp.symbol === alpacaPosition.symbol
      )

      if (!localPosition) {
        // Create new position record
        const { data: newPosition, error: insertError } = await supabase
          .from('positions')
          .insert([{
            symbol: alpacaPosition.symbol,
            type: alpacaPosition.side === 'long' ? 'buy' : 'sell',
            entry_price: parseFloat(alpacaPosition.avg_entry_price),
            entry_timestamp: new Date().toISOString(),
            quantity: parseFloat(alpacaPosition.qty),
            status: 'open',
            strategy_name: 'Primescope Crypto',
            entry_reason: 'external_position',
            pnl: parseFloat(alpacaPosition.unrealized_plpc) * 100,
            technical_metadata: {
              alpaca_position_id: alpacaPosition.asset_id,
              market_value: alpacaPosition.market_value,
              cost_basis: alpacaPosition.cost_basis,
              unrealized_pl: alpacaPosition.unrealized_pl,
              unrealized_plpc: alpacaPosition.unrealized_plpc,
              current_price: alpacaPosition.current_price,
              lastday_price: alpacaPosition.lastday_price,
              change_today: alpacaPosition.change_today
            }
          }])
          .select()
          .single()

        if (!insertError && newPosition) {
          newPositions.push(newPosition)
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Positions synced successfully',
      account: {
        portfolio_value: account.portfolio_value,
        buying_power: account.buying_power,
        cash: account.cash,
        equity: account.equity
      },
      alpaca_positions: alpacaPositions.length,
      updated_positions: updatedPositions.length,
      closed_positions: closedPositions.length,
      new_positions: newPositions.length,
      summary: {
        total_positions: alpacaPositions.length,
        total_value: account.portfolio_value,
        total_pnl: alpacaPositions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl), 0)
      }
    }), { status: 200 })

  } catch (error) {
    console.error('❌ Error syncing Alpaca positions:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to sync positions',
      details: error.message
    }), { status: 500 })
  }
} 