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
  try {
    // Use the database function to update clicks
    const { error } = await supabase.rpc('update_referral_code_clicks', {
      code_param: code
    });

    if (error) {
      console.error('❌ Error updating referral code clicks:', error);
    } else {
      console.log('✅ Click tracked successfully for code:', code);
    }
  } catch (error) {
    console.error('❌ Error calling update_referral_code_clicks:', error);
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

    console.log('🔍 Referral validation request:', { referralCode });

    if (!referralCode) {
      console.log('❌ No referral code provided');
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Validate the referral code
    const validation = await validateReferralCode(supabase, referralCode);
    
    console.log('🔍 Validation result:', validation);

    if (!validation.valid) {
      console.log('❌ Invalid referral code:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Track the click for valid referral codes
    console.log('📊 Tracking click for referral code:', referralCode);
    await updateReferralCodeClicks(supabase, referralCode);

    console.log('✅ Valid referral code found:', validation.referrerId);
    return NextResponse.json({
      valid: true,
      referrerId: validation.referrerId
    });

  } catch (error) {
    console.error('❌ Error validating referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 