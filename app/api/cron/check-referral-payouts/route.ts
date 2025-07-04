import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const expectedToken = 'db80b804-4b56-4227-99ee-bdb33b2ddd59';
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Call the database function to check and update eligible rewards
    const { data, error } = await (supabase as any).rpc('check_eligible_rewards');

    if (error) {
      console.error('Error checking eligible rewards:', error);
      return NextResponse.json({ error: 'Failed to check eligible rewards' }, { status: 500 });
    }

    // Get statistics on what was updated
    const { data: stats } = await supabase
      .from('referral_rewards')
      .select('status, amount')
      .eq('status', 'eligible')
      .gte('eligible_at', new Date().toISOString().split('T')[0]); // Today's eligible rewards

    const totalEligible = stats?.reduce((sum, reward) => sum + Number(reward.amount), 0) || 0;

    return NextResponse.json({
      success: true,
      message: 'Eligible rewards checked successfully',
      totalEligible,
      eligibleCount: stats?.length || 0
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also allow GET for manual testing
export async function GET() {
  return POST(new NextRequest('http://localhost', { method: 'POST' }));
} 