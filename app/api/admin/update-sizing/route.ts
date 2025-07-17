import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple direct update
    const { data, error } = await supabase
      .from('exchanges')
      .update({ 
        position_sizing_percentage: positionSizing,
        updated_at: new Date().toISOString()
      })
      .eq('name', exchangeName)
      .eq('is_active', true)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database update error:', error);
      return NextResponse.json({ 
        error: 'Database update failed',
        details: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Position sizing updated successfully:', {
      exchangeName,
      newValue: positionSizing,
      updatedRecord: data
    });
    
    return NextResponse.json({
      success: true,
      message: 'Position sizing updated successfully',
      exchangeName,
      positionSizing: positionSizing,
      updatedAt: data.updated_at
    });
    
  } catch (error) {
    console.error('❌ Error updating position sizing:', error);
    return NextResponse.json({ 
      error: 'Failed to update position sizing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 