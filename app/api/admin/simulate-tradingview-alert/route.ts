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
    const { symbol, alertType, password } = await request.json();
    
    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!symbol || !alertType) {
      return NextResponse.json({ 
        error: 'Missing required fields: symbol, alertType' 
      }, { status: 400 });
    }
    
    const validAlertTypes = ['LONG_ENTRY', 'SHORT_ENTRY', 'LONG_EXIT', 'SHORT_EXIT'];
    if (!validAlertTypes.includes(alertType)) {
      return NextResponse.json({ 
        error: 'Invalid alert type. Must be one of: LONG_ENTRY, SHORT_ENTRY, LONG_EXIT, SHORT_EXIT' 
      }, { status: 400 });
    }
    
    console.log('🔍 Admin simulating TradingView alert:', { symbol, alertType });
    
    // Note: We no longer need to determine action here since the webhook will parse it from the alert message
    
    // Create alert message exactly like TradingView script
    const alertMessages = {
      'LONG_ENTRY': `Primescope LONG Entry! Symbol: ${symbol.toUpperCase()}`,
      'SHORT_ENTRY': `Primescope SHORT Entry! Symbol: ${symbol.toUpperCase()}`,
      'LONG_EXIT': `Primescope LONG Exit (MA Cross)! Symbol: ${symbol.toUpperCase()}`,
      'SHORT_EXIT': `Primescope SHORT Exit (MA Cross)! Symbol: ${symbol.toUpperCase()}`
    };
    
    const alertMessage = alertMessages[alertType as keyof typeof alertMessages];
    
    // Send alert to our own TradingView webhook endpoint (just like TradingView would)
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/bybit/tradingview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alert_message: alertMessage,
        symbol: symbol.toUpperCase()
      })
    });
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ TradingView webhook error:', webhookResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to process TradingView alert',
        details: errorText
      }, { status: 500 });
    }
    
    const webhookResult = await webhookResponse.json();
    console.log('✅ TradingView webhook processed successfully:', webhookResult);
    
    return NextResponse.json({
      success: true,
      message: 'TradingView alert simulated successfully',
      symbol: symbol.toUpperCase(),
      alertType,
      webhook_result: webhookResult
    });
    
  } catch (error) {
    console.error('❌ Error simulating TradingView alert:', error);
    return NextResponse.json({ 
      error: 'Failed to simulate TradingView alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 