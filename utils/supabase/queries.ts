import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache as cache } from 'next/cache';

export const getUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.id) {
    return null;
  }

  // Check if user exists in users table
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.user.id)
    .single();


  // Check if user has a customer record
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.user.id)
    .single();

  // Check all subscriptions regardless of status
  const { data: allSubscriptions, error: listError } = await supabase
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
      quantity
    `)
    .eq('user_id', user.user.id);

  if (listError) {
    return null;
  }

  // If no subscriptions found at all
  if (!allSubscriptions || allSubscriptions.length === 0) {
    return null;
  }

  // Now try to get the active subscription with all relations
  const { data: subscription, error } = await supabase
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
      prices:price_id (
        id,
        unit_amount,
        currency,
        interval,
        interval_count,
        trial_period_days,
        type,
        active,
        description,
        metadata,
        products:product_id (
          id,
          name,
          description,
          active,
          image,
          metadata
        )
      )
    `)
    .eq('user_id', user.user.id)
    .in('status', ['trialing', 'active', 'past_due', 'incomplete'])
    .order('created', { ascending: false })
    .limit(1)
    .single();



  return subscription;
});

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
  billing_address: any | null;
  payment_method: any | null;
  metadata: any | null;
};

export const getUserDetails = cache(async (supabase: SupabaseClient): Promise<UserDetails | null> => {
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
    payment_method: user.user_metadata?.payment_method || null,
    metadata: user.user_metadata || null
  };
});

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
export const getUserReferralCode = cache(async (supabase: SupabaseClient) => {
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
});

export const getReferrals = cache(async (supabase: SupabaseClient) => {
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
});

// New function to get referral statistics
export const getReferralStats = cache(async (supabase: SupabaseClient) => {
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

  try {
    // Use the fixed database function
    const { data: stats, error } = await supabase.rpc('get_referral_stats', {
      user_id_param: user.id
    });

    if (!error && stats && stats.length > 0) {
      return {
        totalEarnings: Number(stats[0].total_earnings) || 0,
        pendingAmount: Number(stats[0].pending_amount) || 0,
        totalClicks: Number(stats[0].total_clicks) || 0,
        pendingReferrals: Number(stats[0].pending_referrals) || 0,
        activeReferrals: Number(stats[0].active_referrals) || 0
      };
    }
  } catch (error) {
  }

  // Fallback: calculate manually
  const [referralCode, referrals, rewards] = await Promise.all([
    getUserReferralCode(supabase),
    getReferrals(supabase),
    getReferralRewards(supabase)
  ]);

  const totalEarnings = rewards
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const pendingAmount = rewards
    .filter(r => r.status === 'eligible' || r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const totalClicks = referralCode?.clicks || 0;

  return {
    totalEarnings,
    pendingAmount,
    totalClicks,
    pendingReferrals,
    activeReferrals
  };
});

export const getReferralRewards = cache(async (supabase: SupabaseClient) => {
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

  if (error) {
    return rewards.map(reward => ({
      ...reward,
      referral: null
    }));
  }

  if (!rewards || rewards.length === 0) {
    return [];
  }

  // Get referral details separately
  const referralIds = rewards.map(r => r.referral_id);
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('id, referral_code, referee_id')
    .in('id', referralIds);

  if (referralsError) {
    return rewards.map(reward => ({
      ...reward,
      referral: null
    }));
  }

  // Combine the data
  return rewards.map(reward => {
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
});

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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Check if user already has a referral code
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return null;
  }

  if (referralCode) {
    return referralCode;
  }

  // Call the database function to create referral code
  // Since we don't have a public.users table, we'll pass null for user_name
  const { data, error: createError } = await supabase.rpc('create_user_referral_code', {
    user_id_param: user.id,
    user_name: null
  });

  if (createError) {
    return null;
  }

  // Fetch the newly created referral code
  const { data: newReferralCode, error: fetchError } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    return null;
  }

  return newReferralCode;
};

// New function to calculate pro-rated monthly performance for No Loss Guarantee
export const getProRatedMonthlyPerformance = cache(async (supabase: SupabaseClient, targetMonth?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Get user's active subscription
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('current_period_start, current_period_end, created, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created', { ascending: false })
    .limit(1)
    .single();

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

  // Determine which month to analyze
  let analysisDate: Date;
  let effectiveStartDate: Date;
  let effectiveEndDate: Date;
  let isPeriodEnded: boolean;
  
  if (targetMonth) {
    // Parse target month (YYYY-MM format)
    const [year, month] = targetMonth.split('-').map(Number);
    analysisDate = new Date(year, month - 1, 1); // month is 0-indexed
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

  // Only recalculate dates if targetMonth is provided
  if (targetMonth) {
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
    .not('entry_timestamp', 'is', null)
    .gte('entry_timestamp', effectiveStartDate.toISOString())
    .lte('entry_timestamp', effectiveEndDate.toISOString())
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
      isPeriodEnded
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
    positions
  };
});

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
