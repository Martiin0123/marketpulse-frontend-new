import { NextRequest, NextResponse } from 'next/server';
import { getExchangeConfig } from '@/utils/supabase/exchanges';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeName = searchParams.get('exchange') || 'bybit';
    
    console.log('🔍 Getting position sizing for exchange:', exchangeName);
    
    // Get exchange configuration from database
    const exchangeConfig = await getExchangeConfig(exchangeName);
    
    if (!exchangeConfig) {
      return NextResponse.json({ 
        error: `Exchange configuration not found for ${exchangeName}`,
        positionSizing: 5 // Default fallback
      }, { status: 404 });
    }
    
    console.log('✅ Retrieved position sizing:', {
      exchange: exchangeConfig.name,
      positionSizing: exchangeConfig.position_sizing_percentage
    });
    
    const response = {
      success: true,
      exchangeName: exchangeConfig.name,
      positionSizing: exchangeConfig.position_sizing_percentage,
      isActive: exchangeConfig.is_active,
      updatedAt: exchangeConfig.updated_at
    };
    
    console.log('📤 Sending response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error getting position sizing:', error);
    return NextResponse.json({ 
      error: 'Failed to get position sizing',
      details: error instanceof Error ? error.message : 'Unknown error',
      positionSizing: 5 // Default fallback
    }, { status: 500 });
  }
} 