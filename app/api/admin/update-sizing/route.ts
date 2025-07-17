import { NextRequest, NextResponse } from 'next/server';
import { updateExchangePositionSizing } from '@/utils/supabase/exchanges';

export async function POST(request: NextRequest) {
  try {
    const { positionSizing, exchangeName = 'bybit' } = await request.json();
    
    // Check for admin authentication cookie
    const authCookie = request.cookies.get('admin_auth');
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
    }
    
    // Validate position sizing
    if (typeof positionSizing !== 'number' || positionSizing < 0 || positionSizing > 100) {
      return NextResponse.json({ 
        error: 'Invalid position sizing. Must be a number between 0 and 100.' 
      }, { status: 400 });
    }
    
    console.log('🔍 Admin updating position sizing:', { exchangeName, positionSizing });
    
    // Update position sizing in database
    const dbSuccess = await updateExchangePositionSizing(exchangeName, positionSizing);
    
    if (!dbSuccess) {
      return NextResponse.json({ 
        error: 'Failed to update position sizing in database'
      }, { status: 500 });
    }
    
    // Send sizing update to proxy
    const proxyResponse = await fetch('https://primescope-tradeapi-production.up.railway.app/update-sizing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`
      },
      body: JSON.stringify({
        positionSizing: positionSizing
      })
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('❌ Proxy sizing update error:', proxyResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to update position sizing on proxy',
        details: errorText
      }, { status: 500 });
    }
    
    const proxyResult = await proxyResponse.json();
    console.log('✅ Position sizing updated successfully on proxy:', proxyResult);
    
    return NextResponse.json({
      success: true,
      message: 'Position sizing updated successfully',
      exchangeName,
      positionSizing: positionSizing,
      proxy_result: proxyResult
    });
    
  } catch (error) {
    console.error('❌ Error updating position sizing:', error);
    return NextResponse.json({ 
      error: 'Failed to update position sizing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 