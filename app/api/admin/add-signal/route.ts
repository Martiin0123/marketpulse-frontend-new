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
    
    console.log('🔍 Admin adding manual signal and opening position:', { symbol, type, entry_price });
    
    // First, open the position on Bybit via proxy
    const proxyResponse = await fetch('https://primescope-tradeapi-production.up.railway.app/place-order', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: type.toUpperCase(), // 'BUY' or 'SELL'
        symbol: symbol.toUpperCase()
      })
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('❌ Proxy API error:', proxyResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to open position on Bybit',
        details: errorText
      }, { status: 500 });
    }
    
    const orderResult = await proxyResponse.json();
    console.log('✅ Position opened on Bybit:', orderResult);
    
    // Get current price from the order result
    const currentPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || entry_price;
    
    // Add signal to database with actual order details
    const supabase = createSupabaseClient();
    
    const { data: signal, error: insertError } = await supabase
      .from('signals')
      .insert([{
        symbol: symbol.toUpperCase(),
        type: type,
        entry_price: Number(currentPrice), // Use actual execution price
        created_at: new Date().toISOString(),
        strategy_name: 'Manual Admin',
        signal_source: 'manual',
        exchange: 'bybit',
        status: 'active',
        order_id: orderResult.order?.orderId || orderResult.orderId || null,
        executed_at: new Date().toISOString()
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
    
    // Send Discord notification for the new position
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      try {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Primescope Admin',
            avatar_url: 'https://primescope.com/logo.png',
            embeds: [{
              title: `✅ ${symbol.toUpperCase()} ${type.toUpperCase()} opened (Admin)`,
              description: `**${type.toUpperCase()}** position opened successfully via admin panel`,
              color: type === 'buy' ? 0x00ff00 : 0xff0000,
              fields: [
                {
                  name: '🎯 Action',
                  value: type.toUpperCase(),
                  inline: true
                },
                {
                  name: '📈 Symbol',
                  value: symbol.toUpperCase(),
                  inline: true
                },
                {
                  name: '💰 Execution Price',
                  value: `$${Number(currentPrice).toFixed(2)}`,
                  inline: true
                },
                {
                  name: '🆔 Order ID',
                  value: orderResult.order?.orderId || 'N/A',
                  inline: true
                }
              ],
              timestamp: new Date().toISOString(),
              footer: {
                text: 'Primescope Admin - Manual Position'
              }
            }]
          })
        });
        console.log('✅ Discord notification sent for admin position');
      } catch (discordError) {
        console.error('❌ Failed to send Discord notification:', discordError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Position opened and signal added successfully',
      signal: signal,
      order: orderResult.order,
      execution_price: currentPrice
    });
    
  } catch (error) {
    console.error('❌ Error adding signal:', error);
    return NextResponse.json({ 
      error: 'Failed to add signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 