import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getProRatedMonthlyPerformance } from '@/utils/supabase/queries';
import { sendRefundRequestToDiscord } from '@/utils/discord';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetMonth } = body; // Optional: YYYY-MM format

    // Get performance for the specified month or previous month
    const performance = await getProRatedMonthlyPerformance(supabase, targetMonth);
    
    if (!performance) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Check if this is the current month (should not allow refunds for current month)
    const now = new Date(); // Use real current date
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    if (performance.monthKey === currentMonthKey) {
      return NextResponse.json({ 
        error: 'Cannot request refund for current month. Only completed months are eligible.',
        performance,
        isCurrentMonth: true
      }, { status: 400 });
    }

    // Check if the subscription period has ended
    if (!performance.isPeriodEnded) {
      return NextResponse.json({ 
        error: 'Cannot request refund yet. Your subscription period has not ended.',
        performance,
        isPeriodEnded: false
      }, { status: 400 });
    }

    // Check if performance was negative
    if (performance.totalPnL >= 0) {
      return NextResponse.json({ 
        error: 'No refund available. Performance was positive or neutral.',
        performance,
        isEligible: false
      }, { status: 400 });
    }

    // Check if refund was already processed for this month
    const { data: existingRefund } = await supabase
      .from('performance_refunds')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', performance.monthKey)
      .single();

    if (existingRefund) {
      return NextResponse.json({ 
        error: 'Refund already processed for this month.',
        performance,
        existingRefund
      }, { status: 400 });
    }

    // Calculate refund amount (negative PnL becomes positive refund)
    const refundAmount = Math.abs(performance.totalPnL);
    
    // Create a refund request record instead of processing immediately
    const { data: refundRequest, error: refundError } = await supabase
      .from('performance_refunds')
      .insert({
        user_id: user.id,
        month_key: performance.monthKey,
        refund_amount: refundAmount,
        status: 'pending',
        notes: `No Loss Guarantee refund request. P&L: ${performance.totalPnL}, Signals: ${performance.totalPositions}, Win Rate: ${performance.totalPositions > 0 ? ((performance.profitablePositions / performance.totalPositions) * 100).toFixed(1) : 0}%`
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error creating refund request:', refundError);
      return NextResponse.json({ 
        error: 'Failed to create refund request. Please try again.',
        details: refundError.message
      }, { status: 500 });
    }

    // TODO: Send notification to admin (email, Slack, etc.)
    console.log('🔔 NO LOSS GUARANTEE REFUND REQUEST:', {
      user_id: user.id,
      month: performance.monthKey,
      refund_amount: refundAmount,
      performance: performance.totalPnL,
      signals: performance.totalPositions,
      win_rate: performance.totalPositions > 0 ? ((performance.profitablePositions / performance.totalPositions) * 100).toFixed(1) : 0,
      request_id: refundRequest.id
    });

    // Send Discord notification
    const discordSent = await sendRefundRequestToDiscord({
      requestId: refundRequest.id.toString(),
      userId: user.id,
      month: performance.monthKey,
      refundAmount,
      performance: performance.totalPnL,
      signals: performance.totalPositions,
      winRate: performance.totalPositions > 0 ? ((performance.profitablePositions / performance.totalPositions) * 100).toFixed(1) : '0'
    }, process.env.DISCORD_WEBHOOK_URL_REFUNDS || '');

    if (!discordSent) {
      console.warn('⚠️ Failed to send Discord notification for refund request:', refundRequest.id);
    }

    // For now, just return the calculated refund amount
    // In production, this would trigger Stripe refund and create refund record
    return NextResponse.json({
      success: true,
      performance,
      refundAmount,
      isEligible: true,
      requestId: refundRequest.id,
      message: `Refund request submitted for $${refundAmount.toFixed(2)} for ${performance.monthKey}. You will be notified when the refund is processed.`
    });

  } catch (error) {
    console.error('No Loss Guarantee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug: Check what subscriptions exist
    const { data: allSubscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log('All user subscriptions:', allSubscriptions);
    console.log('Subscription error:', subsError);

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month'); // Optional: YYYY-MM format

    // Get performance for the specified month or previous month
    const performance = await getProRatedMonthlyPerformance(supabase, targetMonth || undefined);
    
    if (!performance) {
      return NextResponse.json({ 
        error: 'No active subscription found',
        debug: {
          user_id: user.id,
          subscriptions: allSubscriptions,
          subscription_error: subsError
        }
      }, { status: 400 });
    }

    // Check if this is the current month
    // TEMPORARY: For testing, pretend it's August 6th, 2025
    const now = new Date(); // Use real current date
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = performance.monthKey === currentMonthKey;

    // Check if refund was already processed for this month
    const { data: existingRefund } = await supabase
      .from('performance_refunds')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', performance.monthKey)
      .single();

    const isEligible = !isCurrentMonth && performance.totalPnL < 0 && !existingRefund && performance.isPeriodEnded;
    const refundAmount = isEligible ? Math.abs(performance.totalPnL) : 0;

    return NextResponse.json({
      performance,
      isCurrentMonth,
      isEligible,
      refundAmount,
      existingRefund,
      isPeriodEnded: performance.isPeriodEnded,
      message: !performance.isPeriodEnded
        ? 'Subscription period has not ended yet. Check back after your period ends.'
        : isCurrentMonth 
          ? 'Current month - refunds not available until month ends'
          : isEligible 
            ? `Eligible for refund of $${refundAmount.toFixed(2)}`
            : existingRefund
              ? 'Refund already processed for this month'
              : 'No negative performance for this month'
    });

  } catch (error) {
    console.error('No Loss Guarantee check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 