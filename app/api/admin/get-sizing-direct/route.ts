import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeName = searchParams.get('exchange') || 'bybit';
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('exchanges')
      .select('position_sizing_percentage')
      .eq('name', exchangeName)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ 
        error: 'Exchange not found',
        positionSizing: 5
      }, { status: 404 });
    }
    
    const response = NextResponse.json({
      success: true,
      exchangeName,
      positionSizing: data.position_sizing_percentage
    });
    
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get position sizing',
      positionSizing: 5
    }, { status: 500 });
  }
} 