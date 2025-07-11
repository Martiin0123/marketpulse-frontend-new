import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache as cache } from 'next/cache';
import { Tables } from '@/types_db';

export const getUser = async (supabase: SupabaseClient) => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.id) {
    return null;
  }

  // Using auth.users directly - no need for custom users table
  return user.user;
};

export const getSubscription = async (supabase: SupabaseClient) => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.id) {
    return null;
  }

  // Get the most recent active subscription (handle multiple active subscriptions)
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      price_id,
      cancel_at,
      cancel_at_period_end,
      canceled_at,
      created,
      current_period_start,
      current_period_end,
      ended_at,
      trial_end,
      trial_start,
      user_id,
      metadata,
      quantity,
      role,
      prices:price_id (
        id,
        unit_amount,
        currency,
        interval,
        interval_count,
        trial_period_days,
        type,
        products:product_id (
          id,
          name,
          description,
          image,
          metadata
        )
      )
    `)
    .eq('user_id', user.user.id)
    .eq('status', 'active')
    .order('created', { ascending: false });

  const subscription = subscriptions?.[0] || null;

  // Log warning if multiple active subscriptions exist
  if (subscriptions && subscriptions.length > 1) {
    console.warn(`Warning: User ${user.user.id} has ${subscriptions.length} active subscriptions. Using most recent.`);
  }

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  // Ensure currency is always a string
  if (subscription?.prices && 'currency' in subscription.prices && typeof subscription.prices.currency !== 'string') {
    subscription.prices.currency = String(subscription.prices.currency);
  }

  return subscription;
};

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      active,
      image,
      metadata,
      prices!prices_product_id_fkey (
        id,
        active,
        currency,
        description,
        interval,
        interval_count,
        metadata,
        product_id,
        trial_period_days,
        type,
        unit_amount
      )
    `)
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index');

  if (error) {
    return [];
  }

  return products;
});

// Custom type for user details from auth.users
export type UserDetails = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  billing_address: any;
  payment_method: any;
};

export const getUserDetails = async (supabase: SupabaseClient): Promise<UserDetails | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return null;
  }

  // Return user data from auth.users instead of public.users
  return {
    id: user.id,
    full_name: user.user_metadata?.full_name || '',
    avatar_url: user.user_metadata?.avatar_url || null,
    billing_address: user.user_metadata?.billing_address || null,
    payment_method: user.user_metadata?.payment_method || null
  };
};

export const getSignals = cache(async (supabase: SupabaseClient) => {
  const { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return signals;
});

export const getPositions = cache(async (supabase: SupabaseClient) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return positions;
});

export const getClosedPositionsCurrentMonth = cache(async (supabase: SupabaseClient) => {
  // Get the start and end of the current month in 2025
  const now = new Date();
  const startOfMonth = new Date(2025, now.getMonth(), 1);
  const endOfMonth = new Date(2025, now.getMonth() + 1, 0, 23, 59, 59);
  
  // Convert to ISO strings for proper comparison
  const startDate = startOfMonth.toISOString();
  const endDate = endOfMonth.toISOString();

  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('status', 'closed')
    .not('exit_timestamp', 'is', null)
    .gte('exit_timestamp', startDate)
    .lte('exit_timestamp', endDate)
    .order('exit_timestamp', { ascending: false });

  if (error) {
    return [];
  }

  return positions;
});

// Referral-related queries
export const getUserReferralCode = async (supabase: SupabaseClient) => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.id) {
    return null;
  }

  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return null;
  }

  return referralCode;
};

export const getReferrals = async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // First get the referrals with all available fields
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  if (!referrals || referrals.length === 0) {
    return [];
  }

  // Since we don't have a public.users table, just return the referrals
  // You can get user details from auth.users if needed later
  return referrals.map(referral => ({
    ...referral,
    referee: {
      id: referral.referee_id,
      // You can get user details from auth.users if needed
    }
  }));
};

// New function to get referral statistics
export const getReferralStats = async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      totalEarnings: 0,
      pendingAmount: 0,
      totalClicks: 0,
      pendingReferrals: 0,
      activeReferrals: 0
    };
  }

  const [rewards, referrals, referralCode] = await Promise.all([
    supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id),
    supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .single()
  ]);

  const totalEarnings = (rewards.data || [])
    .filter((r: Tables<'referral_rewards'>) => r.status === 'paid')
    .reduce((sum: number, r: Tables<'referral_rewards'>) => sum + Number(r.amount), 0);

  const pendingAmount = (rewards.data || [])
    .filter((r: Tables<'referral_rewards'>) => r.status === 'eligible' || r.status === 'pending')
    .reduce((sum: number, r: Tables<'referral_rewards'>) => sum + Number(r.amount), 0);

  const pendingReferrals = (referrals.data || []).filter((r: Tables<'referrals'>) => r.status === 'pending').length;
  const activeReferrals = (referrals.data || []).filter((r: Tables<'referrals'>) => r.status === 'active').length;
  const totalClicks = referralCode.data?.clicks || 0;

  return {
    totalEarnings,
    pendingAmount,
    totalClicks,
    pendingReferrals,
    activeReferrals
  };
};

export const getReferralRewards = async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // First get the rewards
  const { data: rewards, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !rewards) {
    return [];
  }

  if (rewards.length === 0) {
    return [];
  }

  // Get referral details separately
  const referralIds = rewards.map(r => r.referral_id);
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('id, referral_code, referee_id')
    .in('id', referralIds);

  if (referralsError) {
    return rewards.map((reward: Tables<'referral_rewards'>) => ({
      ...reward,
      referral: null
    }));
  }

  // Combine the data
  return rewards.map((reward: Tables<'referral_rewards'>) => {
    const referral = referrals?.find(r => r.id === reward.referral_id);
    
    return {
      ...reward,
      referral: referral ? {
        referral_code: referral.referral_code,
        referee: {
          id: referral.referee_id,
          // You can get user details from auth.users if needed
        }
      } : null
    };
  });
};

export const validateReferralCode = async (supabase: SupabaseClient, code: string) => {
  try {
    // Use the new database function
    const { data: result, error } = await supabase.rpc('validate_referral_code', {
      code_param: code
    });

    if (error) {
      return { valid: false, error: 'Invalid referral code' };
    }

    if (result && result.length > 0) {
      const validation = result[0];
      return { 
        valid: validation.valid, 
        referrerId: validation.referrer_id,
        error: validation.error_message
      };
    }

    return { valid: false, error: 'Invalid referral code' };
  } catch (error) {
    return { valid: false, error: 'Invalid referral code' };
  }
};

export const createReferral = async (
  supabase: SupabaseClient, 
  referrerId: string, 
  refereeId: string, 
  referralCode: string
) => {
  try {
    // Use the new database function
    const { data, error } = await supabase.rpc('create_referral', {
      referrer_id_param: referrerId,
      referee_id_param: refereeId,
      referral_code_param: referralCode
    });

    if (error) {
      return null;
    }

    return { id: data };
  } catch (error) {
    return null;
  }
};

export const updateReferralCodeClicks = async (supabase: SupabaseClient, code: string) => {
  try {
    // Use the new database function
    const { error } = await supabase.rpc('update_referral_code_clicks', {
      code_param: code
    });
  } catch (error) {
  }
};

// Function to ensure user has a referral code (server-side)
export const ensureUserReferralCode = async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Check if user already has a referral code
  const existingCode = await getUserReferralCode(supabase);
  if (existingCode) {
    return existingCode;
  }

  // Call the database function to create referral code
  // Since we don't have a public.users table, we'll pass null for user_name
  const { data, error } = await supabase.rpc('create_user_referral_code', {
    user_id_param: user.id,
    user_name: null
  });

  if (error) {
    return null;
  }

  // Fetch the newly created referral code
  return await getUserReferralCode(supabase);
};

// Client-side version without cache
export const ensureUserReferralCodeClient = async (supabase: SupabaseClient) => {
  console.log('🔍 Starting ensureUserReferralCodeClient');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('❌ Error getting user:', userError);
    return null;
  }
  
  if (!user) {
    console.error('❌ No user found');
    return null;
  }

  console.log('🔍 User found:', user.id);

  // Check if user already has a referral code
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('🔍 Existing referral code check:', { referralCode, error });

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error checking existing referral code:', error);
    return null;
  }

  if (referralCode) {
    console.log('✅ Existing referral code found:', referralCode);
    return referralCode;
  }

  console.log('🔍 No existing referral code, creating new one...');

  // Call the database function to create referral code
  // Since we don't have a public.users table, we'll pass null for user_name
  const { data, error: createError } = await supabase.rpc('create_user_referral_code', {
    user_id_param: user.id,
    user_name: null
  });

  console.log('🔍 RPC call result:', { data, createError });

  if (createError) {
    console.error('❌ Error creating referral code via RPC:', createError);
    return null;
  }

  // Fetch the newly created referral code
  const { data: newReferralCode, error: fetchError } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('🔍 Fetching new referral code:', { newReferralCode, fetchError });

  if (fetchError) {
    console.error('❌ Error fetching new referral code:', fetchError);
    return null;
  }

  console.log('✅ Successfully created referral code:', newReferralCode);
  return newReferralCode;
};

// New function to calculate pro-rated monthly performance for No Loss Guarantee
export const getProRatedMonthlyPerformance = async (supabase: SupabaseClient, targetMonth?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Get user's active subscription (handle multiple subscriptions)
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('current_period_start, current_period_end, created, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created', { ascending: false });

  const subscription = subscriptions?.[0] || null;

  if (subscriptions && subscriptions.length > 1) {
    console.warn(`Performance check: User ${user.id} has ${subscriptions.length} active subscriptions.`);
  }

  if (!subscription) {
    // Let's check what subscriptions exist for this user
    const { data: allSubscriptions, error: allSubsError } = await supabase
      .from('subscriptions')
      .select('id, status, created, current_period_start, current_period_end')
      .eq('user_id', user.id)
      .order('created', { ascending: false });

    console.log('User subscriptions:', allSubscriptions);
    console.log('Subscription error:', subscriptionError);
    return null;
  }

  // Initialize variables with default values
  let analysisDate: Date = new Date();
  let effectiveStartDate: Date = new Date();
  let effectiveEndDate: Date = new Date();
  let isPeriodEnded: boolean = false;
  
  if (targetMonth) {
    // Parse target month (YYYY-MM format)
    const [year, month] = targetMonth.split('-').map(Number);
    analysisDate = new Date(year, month - 1, 1); // month is 0-indexed
    
    const monthStart = new Date(analysisDate.getFullYear(), analysisDate.getMonth(), 1);
    const monthEnd = new Date(analysisDate.getFullYear(), analysisDate.getMonth() + 1, 0, 23, 59, 59);
    
    // If a specific month is requested, use calendar month boundaries
    if (new Date(subscription.created) >= monthStart) {
      // User subscribed this month - use subscription start date
      effectiveStartDate = new Date(subscription.created);
    } else {
      // User subscribed before this month - use month start
      effectiveStartDate = monthStart;
    }
    effectiveEndDate = monthEnd;
    isPeriodEnded = new Date() > monthEnd;
  } else {
    // For default (previous month), use the previous subscription period
    const subscriptionStart = new Date(subscription.created);
    const now = new Date(); // Use real current date
    
    // Calculate the previous subscription period
    // If subscription started July 4, previous period is June 4 - July 4
    effectiveStartDate = new Date(subscriptionStart);
    effectiveStartDate.setMonth(effectiveStartDate.getMonth() - 1);
    
    effectiveEndDate = new Date(subscriptionStart);
    
    // Check if the previous subscription period has ended
    isPeriodEnded = now > effectiveEndDate;
    
    // Adjust analysis date to match the subscription period
    // For month key calculation, use the month of the effective start date
    analysisDate = new Date(effectiveStartDate);

    console.log('📅 Subscription Period Debug:', {
      subscriptionCreated: subscription.created,
      subscriptionStart: subscriptionStart.toISOString(),
      analysisDate: analysisDate.toISOString(),
      effectiveStartDate: effectiveStartDate.toISOString(),
      effectiveEndDate: effectiveEndDate.toISOString(),
      isPeriodEnded,
      now: now.toISOString()
    });
  }
  
  // Debug: Log the final dates before querying positions
  console.log('🔍 Final date calculation:', {
    targetMonth,
    effectiveStartDate: effectiveStartDate.toISOString(),
    effectiveEndDate: effectiveEndDate.toISOString(),
    analysisDate: analysisDate.toISOString(),
    isPeriodEnded
  });

  // Get signals that both entered AND exited during the effective period
  const { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .eq('status', 'closed')
    .not('exit_timestamp', 'is', null)
    .gte('created_at', effectiveStartDate.toISOString())
    .lte('created_at', effectiveEndDate.toISOString())
    .gte('exit_timestamp', effectiveStartDate.toISOString())
    .lte('exit_timestamp', effectiveEndDate.toISOString())
    .order('exit_timestamp', { ascending: true });

  console.log('🔍 Performance Analysis Debug:', {
    effectiveStartDate: effectiveStartDate.toISOString(),
    effectiveEndDate: effectiveEndDate.toISOString(),
    signalsFound: signals?.length || 0,
    totalPnL: signals?.reduce((sum, s) => sum + (s.pnl_percentage || 0), 0) || 0,
    signals: signals?.map(s => ({
      id: s.id,
      pnl_percentage: s.pnl_percentage,
      entry_timestamp: s.entry_timestamp,
      exit_timestamp: s.exit_timestamp,
      symbol: s.symbol
    }))
  });

  if (error || !signals) {
    return {
      totalPnL: 0,
      totalPositions: 0,
      profitablePositions: 0,
      effectiveStartDate: effectiveStartDate.toISOString(),
      effectiveEndDate: effectiveEndDate.toISOString(),
      isProRated: !targetMonth, // Pro-rated when using subscription period, not calendar month
      subscriptionStartDate: subscription.created,
      monthKey: targetMonth || `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}`,
      isCurrentMonth: false,
      isPeriodEnded,
      signals: []
    };
  }

  // Calculate performance
  const totalPnL = signals.reduce((sum, signal) => sum + (signal.pnl_percentage || 0), 0);
  const profitablePositions = signals.filter(signal => (signal.pnl_percentage || 0) > 0).length;
  const totalPositions = signals.length;

  return {
    totalPnL,
    totalPositions,
    profitablePositions,
    effectiveStartDate: effectiveStartDate.toISOString(),
    effectiveEndDate: effectiveEndDate.toISOString(),
    isProRated: !targetMonth, // Pro-rated when using subscription period, not calendar month
    subscriptionStartDate: subscription.created,
    monthKey: targetMonth || `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}`,
    isCurrentMonth: false,
    isPeriodEnded,
    signals
  };
};

export const getClosedBybitSignalsCurrentMonth = cache(async (supabase: SupabaseClient) => {
  // Get the start and end of the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Convert to ISO strings for proper comparison
  const startDate = startOfMonth.toISOString();
  const endDate = endOfMonth.toISOString();

  const { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .eq('status', 'closed')
    .eq('exchange', 'bybit')
    .not('exit_timestamp', 'is', null)
    .gte('exit_timestamp', startDate)
    .lte('exit_timestamp', endDate)
    .order('exit_timestamp', { ascending: false });

  if (error) {
    return [];
  }

  return signals;
});
