import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache as cache } from 'next/cache';

export const getUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  return subscription;
});

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

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
