import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    // Format the data for debugging
    const debugData = positions?.map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      type: pos.type,
      status: pos.status,
      entry_timestamp: pos.entry_timestamp,
      entry_timestamp_type: typeof pos.entry_timestamp,
      entry_timestamp_parsed: pos.entry_timestamp ? new Date(pos.entry_timestamp * 1000).toISOString() : null,
      exit_timestamp: pos.exit_timestamp,
      exit_timestamp_type: typeof pos.exit_timestamp,
      created_at: pos.created_at,
      pnl: pos.pnl
    }))

    return new Response(JSON.stringify({ 
      positions: debugData,
      count: positions?.length || 0
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
} 