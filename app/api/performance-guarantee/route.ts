import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getProRatedMonthlyPerformance, getSubscription } from '@/utils/supabase/queries';
import { stripe } from '@/utils/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription
    const subscription = await getSubscription(supabase);
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Get pro-rated monthly performance
    const performance = await getProRatedMonthlyPerformance(supabase);
    if (!performance) {
      return NextResponse.json({ error: 'Could not calculate performance' }, { status: 500 });
    }

    // Check if performance is negative
    const isNegative = performance.totalPnL < 0;
    
    if (!isNegative) {
      return NextResponse.json({
        eligible: false,
        reason: 'Performance is not negative',
        performance: performance.totalPnL,
        message: 'Your performance guarantee only applies when monthly performance is negative.'
      });
    }

    // Calculate refund amount (pro-rated if user subscribed mid-month)
    let refundAmount = 0;
    let refundReason = '';

    if (performance.isProRated) {
      // Calculate pro-rated refund based on subscription days in the month
      const subscriptionDate = new Date(performance.subscriptionStartDate);
      const monthStart = new Date(subscriptionDate.getFullYear(), subscriptionDate.getMonth(), 1);
      const monthEnd = new Date(subscriptionDate.getFullYear(), subscriptionDate.getMonth() + 1, 0);
      
      const daysInMonth = monthEnd.getDate();
      const subscriptionDay = subscriptionDate.getDate();
      const daysSubscribed = daysInMonth - subscriptionDay + 1;
      
      const subscriptionPrice = (subscription.prices as any)?.unit_amount || 0;
      const dailyRate = subscriptionPrice / daysInMonth;
      refundAmount = dailyRate * daysSubscribed;
      
      refundReason = `Pro-rated refund for ${daysSubscribed} days of subscription`;
    } else {
      // Full month refund
      refundAmount = (subscription.prices as any)?.unit_amount || 0;
      refundReason = 'Full month refund';
    }

    // Convert from cents to dollars
    refundAmount = refundAmount / 100;

    // For now, just return the calculation without processing the refund
    // TODO: Implement actual refund processing once database schema is updated
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    return NextResponse.json({
      eligible: true,
      refundAmount,
      refundReason,
      performance: performance!.totalPnL,
      isProRated: performance!.isProRated,
      effectivePeriod: {
        start: performance!.effectiveStartDate,
        end: performance!.effectiveEndDate
      },
      message: `You are eligible for a ${performance!.isProRated ? 'pro-rated' : 'full'} refund of $${refundAmount.toFixed(2)} for your negative performance month. Please contact support to process this refund.`,
      note: 'Automatic refund processing will be implemented soon. For now, please contact support with this information.'
    });

    return NextResponse.json({
      eligible: true,
      refundProcessed: true,
      refundAmount,
      refundReason,
      performance: performance.totalPnL,
      isProRated: performance.isProRated,
      effectivePeriod: {
        start: performance.effectiveStartDate,
        end: performance.effectiveEndDate
      },
      message: `Refund of $${refundAmount.toFixed(2)} has been processed for your negative performance month.`
    });

  } catch (error) {
    console.error('Performance guarantee error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: 'Please contact support for assistance.'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current month's performance
    const performance = await getProRatedMonthlyPerformance(supabase);
    if (!performance) {
      return NextResponse.json({ error: 'Could not calculate performance' }, { status: 500 });
    }

    // Check if refund is eligible
    const isNegative = performance.totalPnL < 0;

    return NextResponse.json({
      performance: performance.totalPnL,
      isNegative,
      isProRated: performance.isProRated,
      effectivePeriod: {
        start: performance.effectiveStartDate,
        end: performance.effectiveEndDate
      },
      stats: {
        totalPositions: performance.totalPositions,
        profitablePositions: performance.profitablePositions,
        winRate: performance.totalPositions > 0 ? 
          (performance.profitablePositions / performance.totalPositions * 100).toFixed(1) : 0
      },
      refundEligible: isNegative,
      message: isNegative ? 
        'You are eligible for a performance guarantee refund this month.' : 
        'Your performance is positive this month. No refund is needed.'
    });

  } catch (error) {
    console.error('Performance guarantee status error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 