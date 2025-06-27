import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateReferralCodeClicks, validateReferralCode } from '@/utils/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Validate the referral code
    const validation = await validateReferralCode(supabase, referralCode);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Track the click
    await updateReferralCodeClicks(supabase, referralCode);

    return NextResponse.json({
      success: true,
      message: 'Referral click tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const referralCode = searchParams.get('code');

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Validate the referral code
    const validation = await validateReferralCode(supabase, referralCode);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      referrerId: validation.referrerId
    });

  } catch (error) {
    console.error('Error validating referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 