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

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return products;
});

export const getUserDetails = cache(async (supabase: SupabaseClient) => {
  const { data: userDetails, error } = await supabase
    .from('users')
    .select('*')
    .single();
    
  if (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
    
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // First get the referrals
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referrals:', error);
    return [];
  }

  if (!referrals || referrals.length === 0) {
    return [];
  }

  // Get referee user details separately
  const refereeIds = referrals.map(r => r.referee_id);
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', refereeIds);

  if (usersError) {
    console.error('Error fetching referee users:', usersError);
    // Return referrals without user details
    return referrals.map(referral => ({
      ...referral,
      referee: null
    }));
  }

  // Combine the data
  return referrals.map(referral => ({
    ...referral,
    referee: users?.find(u => u.id === referral.referee_id) || null
  }));
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
    console.error('Error fetching referral rewards:', error);
    return [];
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
    console.error('Error fetching referrals for rewards:', referralsError);
    return rewards.map(reward => ({
      ...reward,
      referral: null
    }));
  }

  // Get referee user details if we have referrals
  let users: any[] = [];
  if (referrals && referrals.length > 0) {
    const refereeIds = referrals.map(r => r.referee_id);
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', refereeIds);
    users = usersData || [];
  }

  // Combine the data
  return rewards.map(reward => {
    const referral = referrals?.find(r => r.id === reward.referral_id);
    const referee = referral ? users.find(u => u.id === referral.referee_id) : null;
    
    return {
      ...reward,
      referral: referral ? {
        referral_code: referral.referral_code,
        referee: referee ? {
          full_name: referee.full_name
        } : null
      } : null
    };
  });
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
