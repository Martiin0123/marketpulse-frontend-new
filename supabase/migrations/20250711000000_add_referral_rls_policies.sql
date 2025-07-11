-- Add RLS policies for referral system tables
-- This migration adds the necessary Row Level Security policies to allow the referral system to work properly

-- Enable RLS on referral tables (if not already enabled)
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Service role can manage all referral codes" ON public.referral_codes;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can manage all referrals" ON public.referrals;

DROP POLICY IF EXISTS "Users can view their own referral rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Service role can manage all referral rewards" ON public.referral_rewards;

DROP POLICY IF EXISTS "Service role can manage referral clicks" ON public.referral_clicks;

-- Referral Codes Policies
-- Allow users to view their own referral codes
CREATE POLICY "Users can view their own referral codes" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create their own referral codes
CREATE POLICY "Users can create their own referral codes" ON public.referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own referral codes
CREATE POLICY "Users can update their own referral codes" ON public.referral_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow anyone to view active referral codes (for validation)
CREATE POLICY "Anyone can view active referral codes" ON public.referral_codes
  FOR SELECT USING (is_active = true);

-- Allow service role to manage all referral codes
CREATE POLICY "Service role can manage all referral codes" ON public.referral_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Referrals Policies
-- Allow users to view referrals where they are the referrer or referee
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Allow service role to create referrals (for signup process)
CREATE POLICY "Service role can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow users to update referrals where they are the referrer
CREATE POLICY "Users can update their own referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- Allow service role to manage all referrals
CREATE POLICY "Service role can manage all referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

-- Referral Rewards Policies
-- Allow users to view their own referral rewards
CREATE POLICY "Users can view their own referral rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage all referral rewards
CREATE POLICY "Service role can manage all referral rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- Referral Clicks Policies
-- Allow service role to manage referral clicks
CREATE POLICY "Service role can manage referral clicks" ON public.referral_clicks
  FOR ALL USING (auth.role() = 'service_role');

-- Grant additional permissions for service role
GRANT ALL ON public.referral_codes TO service_role;
GRANT ALL ON public.referrals TO service_role;
GRANT ALL ON public.referral_rewards TO service_role;
GRANT ALL ON public.referral_clicks TO service_role; 