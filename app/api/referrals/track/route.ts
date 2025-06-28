import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS for referral operations
const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

const validateReferralCode = async (supabase: any, code: string) => {
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('user_id, is_active')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error) {
    return { valid: false, error: 'Invalid referral code' };
  }

  return { valid: true, referrerId: referralCode.user_id };
};

const updateReferralCodeClicks = async (supabase: any, code: string) => {
  // First get current clicks count
  const { data: currentData } = await supabase
    .from('referral_codes')
    .select('clicks')
    .eq('code', code)
    .single();

  const newClicks = (currentData?.clicks || 0) + 1;

  const { error } = await supabase
    .from('referral_codes')
    .update({ clicks: newClicks })
    .eq('code', code);

  if (error) {
    console.error('Error updating referral code clicks:', error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

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

    const supabase = createServiceClient();

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