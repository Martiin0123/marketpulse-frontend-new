-- Fix RLS policies for referral_rewards table
-- The policies were incorrectly applied to 'public' role instead of 'authenticated' role

-- Drop existing policies for referral_rewards table
DROP POLICY IF EXISTS "Users can read their own referral rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Users can view their own referral rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Service role can manage all referral rewards" ON public.referral_rewards;

-- Create correct policies with proper roles for referral_rewards table

-- Allow authenticated users to view their own referral rewards
CREATE POLICY "Users can view their own referral rewards" 
ON public.referral_rewards 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow service role to manage all referral rewards
CREATE POLICY "Service role can manage all referral rewards" 
ON public.referral_rewards 
FOR ALL 
TO service_role 
USING (true);