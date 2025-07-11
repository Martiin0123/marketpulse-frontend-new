import { NextResponse } from 'next/server';
import { calculateTradingStats } from '@/utils/stats';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await calculateTradingStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 