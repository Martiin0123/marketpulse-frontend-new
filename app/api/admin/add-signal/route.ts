import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, type, entry_price, password } = await request.json();
    
    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!symbol || !type || !entry_price) {
      return NextResponse.json({ 
        error: 'Missing required fields: symbol, type, entry_price' 
      }, { status: 400 });
    }
    
    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be "buy" or "sell"' 
      }, { status: 400 });
    }
    
    console.log('🔍 Admin adding manual signal:', { symbol, type, entry_price });
    
    // Add signal to database
    const supabase = createSupabaseClient();
    
    const { data: signal, error: insertError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbol.toUpperCase(),
        type: type,
        entry_price: Number(entry_price),
        created_at: new Date().toISOString(),
        strategy_name: 'Manual Admin',
        signal_source: 'manual',
        exchange: 'bybit',
        status: 'active'
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting signal:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add signal to database',
        details: insertError.message
      }, { status: 500 });
    }
    
    console.log('✅ Signal added successfully:', signal.id);
    
    return NextResponse.json({
      success: true,
      message: 'Signal added successfully',
      signal: signal
    });
    
  } catch (error) {
    console.error('❌ Error adding signal:', error);
    return NextResponse.json({ 
      error: 'Failed to add signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 