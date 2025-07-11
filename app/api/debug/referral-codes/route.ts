import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get all referral codes
    const { data: referralCodes, error: codesError } = await serviceSupabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Get all referrals
    const { data: referrals, error: referralsError } = await serviceSupabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Check if we can insert a test referral code
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const { data: testInsert, error: insertError } = await serviceSupabase
      .from('referral_codes')
      .insert({
        user_id: testUserId,
        code: 'DEBUGTEST',
        is_active: true
      })
      .select()
      .single();
    
    // Clean up test data
    if (testInsert) {
      await serviceSupabase
        .from('referral_codes')
        .delete()
        .eq('code', 'DEBUGTEST');
    }
    
    return NextResponse.json({
      success: true,
      referralCodes: {
        count: referralCodes?.length || 0,
        error: codesError?.message,
        data: referralCodes?.slice(0, 5) // Show first 5
      },
      referrals: {
        count: referrals?.length || 0,
        error: referralsError?.message,
        data: referrals?.slice(0, 5) // Show first 5
      },
      testInsert: {
        success: !insertError,
        error: insertError?.message,
        data: testInsert
      }
    });
    
  } catch (error) {
    console.error('❌ Debug referral codes failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 