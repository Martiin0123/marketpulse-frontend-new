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
    
    console.log('✅ Position sizing updated successfully in database');
    
    return NextResponse.json({
      success: true,
      message: 'Position sizing updated successfully in database',
      exchangeName,
      positionSizing: positionSizing
    });
    
  } catch (error) {
    console.error('❌ Error updating position sizing:', error);
    return NextResponse.json({ 
      error: 'Failed to update position sizing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 