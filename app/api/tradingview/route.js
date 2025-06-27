import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Achtung: nur auf Server verwenden
)

export async function POST(request) {
  const body = await request.json()
  const { symbol, action, price, timestamp } = body

  if (!symbol || !action || !price || !timestamp) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
  }

  const { data: existing, error: fetchError } = await supabase
    .from('signals')
    .select('id')
    .eq('symbol', symbol)
    .eq('timestamp', timestamp)

  if (existing?.length > 0) {
    return new Response(JSON.stringify({ message: 'Signal already exists' }), { status: 200 })
  }

  const { error } = await supabase.from('signals').insert([
    {
      symbol,
      typ: action,
      timestamp,
      price,
      reason: 'TradingView Alert',
      rsi: 0,
      macd: 0,
      risk: 1.0
    }
  ])

  if (error) {
    console.error('Supabase insert error:', error)
    return new Response(JSON.stringify({ error: 'Supabase insert failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ message: 'Signal saved' }), { status: 200 })
}
