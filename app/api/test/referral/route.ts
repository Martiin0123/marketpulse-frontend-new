import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Test 1: Check if referral_codes table exists and has data
    const { data: referralCodes, error: codesError } = await supabase
      .from('referral_codes')
      .select('*')
      .limit(5);
    
    // Test 2: Check if referrals table exists and has data
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);
    
    // Test 3: Check if we can create a test referral code
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const { data: testCode, error: testError } = await supabase
      .from('referral_codes')
      .insert({
        user_id: testUserId,
        code: 'TEST123',
        is_active: true
      })
      .select()
      .single();
    
    // Clean up test data
    if (testCode) {
      await supabase
        .from('referral_codes')
        .delete()
        .eq('code', 'TEST123');
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        referralCodes: {
          exists: !codesError,
          count: referralCodes?.length || 0,
          error: codesError?.message
        },
        referrals: {
          exists: !referralsError,
          count: referrals?.length || 0,
          error: referralsError?.message
        },
        testInsert: {
          success: !testError,
          error: testError?.message
        }
      },
      sampleData: {
        referralCodes: referralCodes?.slice(0, 2),
        referrals: referrals?.slice(0, 2)
      }
    });
    
  } catch (error) {
    console.error('❌ Referral system test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 