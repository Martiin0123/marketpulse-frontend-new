import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  subscription?: {
    id: string;
    status: string;
    price_id: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
  referral_code?: {
    code: string;
    clicks: number;
    conversions: number;
  };
  referred_by?: {
    code: string;
    referrer_email: string;
  };
  whitelist_request?: {
    status: string;
    bybit_uid: string;
  };
  performance_refunds?: {
    month_key: string;
    refund_amount: number;
    status: string;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authCookie = request.cookies.get('admin_auth');
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
    }
    
    const supabase = createSupabaseClient();
    
    console.log('🔍 Fetching users data for admin panel...');
    
    // Get all users with their basic info
    const { data: users, error: usersError } = await supabase
      .auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
    
    console.log(`📊 Found ${users?.users?.length || 0} users`);
    
    // Get subscriptions data
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created', { ascending: false });
    
    if (subscriptionsError) {
      console.error('❌ Error fetching subscriptions:', subscriptionsError);
    }
    
    // Get referral codes data
    const { data: referralCodes, error: referralCodesError } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (referralCodesError) {
      console.error('❌ Error fetching referral codes:', referralCodesError);
    }
    
    // Get referrals data
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (referralsError) {
      console.error('❌ Error fetching referrals:', referralsError);
    }
    
    // Get whitelist requests data
    const { data: whitelistRequests, error: whitelistError } = await supabase
      .from('whitelist_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (whitelistError) {
      console.error('❌ Error fetching whitelist requests:', whitelistError);
    }
    
    // Get performance refunds data
    const { data: performanceRefunds, error: refundsError } = await supabase
      .from('performance_refunds')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (refundsError) {
      console.error('❌ Error fetching performance refunds:', refundsError);
    }
    
    // Combine all data
    const usersWithData: UserData[] = users?.users?.map((user: any) => {
      const userSubscription = subscriptions?.find((sub: any) => sub.user_id === user.id);
      const userReferralCode = referralCodes?.find((rc: any) => rc.user_id === user.id);
      const userReferredBy = referrals?.find((ref: any) => ref.referee_id === user.id);
      const userWhitelistRequest = whitelistRequests?.find((wr: any) => wr.user_id === user.id);
      const userPerformanceRefunds = performanceRefunds?.filter((pr: any) => pr.user_id === user.id);
      
      // Get referrer email if user was referred
      const referrerEmail = userReferredBy ? 
        users?.users?.find((u: any) => u.id === userReferredBy.referrer_id)?.email : undefined;
      
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        subscription: userSubscription ? {
          id: userSubscription.id,
          status: userSubscription.status,
          price_id: userSubscription.price_id,
          current_period_end: userSubscription.current_period_end,
          cancel_at_period_end: userSubscription.cancel_at_period_end
        } : undefined,
        referral_code: userReferralCode ? {
          code: userReferralCode.code,
          clicks: userReferralCode.clicks,
          conversions: userReferralCode.conversions
        } : undefined,
        referred_by: userReferredBy ? {
          code: userReferredBy.referral_code,
          referrer_email: referrerEmail || 'Unknown'
        } : undefined,
        whitelist_request: userWhitelistRequest ? {
          status: userWhitelistRequest.status,
          bybit_uid: userWhitelistRequest.bybit_uid
        } : undefined,
        performance_refunds: userPerformanceRefunds?.map((pr: any) => ({
          month_key: pr.month_key,
          refund_amount: pr.refund_amount,
          status: pr.status
        })) || []
      };
    }) || [];
    
    // Calculate statistics
    const stats = {
      total_users: usersWithData.length,
      active_subscriptions: usersWithData.filter((u: any) => u.subscription?.status === 'active').length,
      new_users_this_month: usersWithData.filter((u: any) => {
        const created = new Date(u.created_at);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      users_with_referral_codes: usersWithData.filter((u: any) => u.referral_code).length,
      users_referred_by_others: usersWithData.filter((u: any) => u.referred_by).length,
      whitelist_requests: usersWithData.filter((u: any) => u.whitelist_request).length,
      pending_whitelist_requests: usersWithData.filter((u: any) => u.whitelist_request?.status === 'pending').length
    };
    
    console.log('📊 Users data compiled successfully:', stats);
    
    return NextResponse.json({
      success: true,
      users: usersWithData,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error in users API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 