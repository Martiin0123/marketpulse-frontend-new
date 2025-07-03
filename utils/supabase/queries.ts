import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export const getUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  console.log("[SERVER] Starting subscription fetch");
  const { data: user } = await supabase.auth.getUser();
  console.log("[SERVER] Auth user data:", user);
  
  if (!user.user?.id) {
    console.log("[SERVER] No user found");
    return null;
  }

  // Check if user exists in users table
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.user.id)
    .single();

  console.log('[SERVER] Database user check:', {
    userId: user.user.id,
    dbUser,
    error: userError
  });

  // Check if user has a customer record
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.user.id)
    .single();

  console.log('[SERVER] Customer record check:', {
    userId: user.user.id,
    customer,
    error: customerError
  });

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

  console.log('[SERVER] All subscriptions check:', {
    userId: user.user.id,
    subscriptions: allSubscriptions,
    error: listError
  });

  if (listError) {
    console.error('[SERVER] Error checking subscriptions:', listError);
    return null;
  }

  // If no subscriptions found at all
  if (!allSubscriptions || allSubscriptions.length === 0) {
    console.log('[SERVER] No subscriptions found for user');
    return null;
  }

  // Now try to get the active subscription with all relations
  console.log('[SERVER] Found subscriptions, fetching active one with relations');
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

  if (error) {
    console.error('[SERVER] Error fetching subscription with relations:', error);
    return null;
  }

  console.log('[SERVER] Final subscription result:', {
    subscription,
    error
  });
  
  return subscription;
});

export const getProducts = cache(async (supabase: SupabaseClient) => {
  console.log('Fetching products...');
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
    console.error('Error fetching products:', error);
    return [];
  }

  console.log('Raw products data:', products);
  return products;
});

export const getUserDetails = cache(async (supabase: SupabaseClient) => {
  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();
  return userDetails;
});

export const getSignals = cache(async (supabase: SupabaseClient) => {
  const { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching signals:', error);
    return [];
  }

  return signals;
});

export const getPositions = cache(async (supabase: SupabaseClient) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }

  return positions;
});

export const getOpenPositions = cache(async (supabase: SupabaseClient) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching open positions:', error);
    return [];
  }

  return positions;
});

export const getClosedPositions = cache(async (supabase: SupabaseClient) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('status', 'closed')
    .order('exit_timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching closed positions:', error);
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
    console.error('Error fetching referral code:', error);
    return null;
  }

  return referralCode;
});

export const getReferrals = cache(async (supabase: SupabaseClient) => {
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referee:referee_id (
        id,
        full_name,
        email
      )
    `)
    .eq('referrer_id', (await supabase.auth.getUser()).data.user?.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referrals:', error);
    return [];
  }

  return referrals;
});

export const getReferralRewards = cache(async (supabase: SupabaseClient) => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.id) {
    return [];
  }

  const { data: rewards, error } = await supabase
    .from('referral_rewards')
    .select(`
      *,
      referral:referral_id (
        referral_code,
        referee:referee_id (
          full_name
        )
      )
    `)
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referral rewards:', error);
    return [];
  }

  return rewards;
});

export const validateReferralCode = async (supabase: SupabaseClient, code: string) => {
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

export const createReferral = async (
  supabase: SupabaseClient, 
  referrerId: string, 
  refereeId: string, 
  referralCode: string
) => {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referee_id: refereeId,
      referral_code: referralCode,
      status: 'pending'
    })
    .single();

  // Update click count
  await updateReferralCodeClicks(supabase, referralCode);

  if (error) {
    console.error('Error creating referral:', error);
    return null;
  }

  return data;
};

export const updateReferralCodeClicks = async (supabase: SupabaseClient, code: string) => {
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
