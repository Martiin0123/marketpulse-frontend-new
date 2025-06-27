import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch positions', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      success: true,
      positions 
    }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, updates } = await request.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Position ID is required' }), { status: 400 })
    }

    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to update position', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      success: true,
      position: data 
    }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), { status: 500 })
  }
} 