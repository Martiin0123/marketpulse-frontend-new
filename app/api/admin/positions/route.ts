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

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication via query parameter or header
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const password = url.searchParams.get('password') || authHeader?.replace('Bearer ', '');
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch current positions from Bybit via proxy
    const bybitApiKey = process.env.BYBIT_API_KEY;
    const bybitSecretKey = process.env.BYBIT_SECRET_KEY;
    
    if (!bybitApiKey || !bybitSecretKey) {
      return NextResponse.json({ error: 'Bybit configuration missing' }, { status: 500 });
    }
    
    // Call the proxy to get positions
    const proxyResponse = await fetch('https://primescope-tradeapi-production.up.railway.app/positions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('❌ Proxy API error:', proxyResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch positions from Bybit',
        details: errorText
      }, { status: 500 });
    }
    
    const positionsData = await proxyResponse.json();
    
    console.log('✅ Fetched positions from Bybit:', positionsData.positions?.length || 0);
    
    return NextResponse.json({
      success: true,
      positions: positionsData.positions || []
    });
    
  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 