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
    const { symbol, password } = await request.json();
    
    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }
    
    console.log('🔍 Admin closing position for symbol:', symbol);
    
    // Call the proxy to close the position
    const proxyResponse = await fetch('https://primescope-tradeapi-production.up.railway.app/close-position', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol })
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('❌ Proxy API error:', proxyResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to close position',
        details: errorText
      }, { status: 500 });
    }
    
    const closeResult = await proxyResponse.json();
    
    // Update the corresponding signal in database
    const supabase = createSupabaseClient();
    
    // Find the active signal for this symbol
    const { data: activeSignal, error: findError } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .in('type', ['buy', 'sell'])
      .eq('status', 'active')
      .eq('exchange', 'bybit')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding active signal:', findError);
    }
    
    let pnlPercentage = null;
    
    if (activeSignal) {
      // Calculate PnL if we have price data
      if (closeResult.currentPrice && activeSignal.entry_price) {
        const entryPrice = Number(activeSignal.entry_price);
        const exitPrice = Number(closeResult.currentPrice);
        
        if (activeSignal.type === 'buy') {
          pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
        } else if (activeSignal.type === 'sell') {
          pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
        }
      }
      
      // Update the signal to closed
      const { error: updateError } = await supabase
        .from('signals')
        .update({
          status: 'closed',
          exit_price: closeResult.currentPrice || null,
          exit_timestamp: new Date().toISOString(),
          pnl_percentage: pnlPercentage
        })
        .eq('id', activeSignal.id);
      
      if (updateError) {
        console.error('❌ Error updating signal:', updateError);
      } else {
        console.log('✅ Updated signal to closed:', {
          signal_id: activeSignal.id,
          pnl_percentage: pnlPercentage
        });
      }
    }
    
    console.log('✅ Position closed successfully:', symbol);
    
    return NextResponse.json({
      success: true,
      message: 'Position closed successfully',
      symbol,
      order: closeResult.order,
      pnl_percentage: pnlPercentage
    });
    
  } catch (error) {
    console.error('❌ Error closing position:', error);
    return NextResponse.json({ 
      error: 'Failed to close position',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 