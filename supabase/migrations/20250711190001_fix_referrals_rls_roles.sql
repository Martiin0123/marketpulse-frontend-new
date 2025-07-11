-- Fix RLS policies for referrals table
-- The policies were incorrectly applied to 'public' role instead of 'authenticated' role

-- Drop existing policies for referrals table
DROP POLICY IF EXISTS "Users can read their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can manage all referrals" ON public.referrals;

-- Create correct policies with proper roles for referrals table

-- Allow authenticated users to view referrals where they are the referrer
CREATE POLICY "Users can view their own referrals as referrer" 
ON public.referrals 
FOR SELECT 
TO authenticated 
USING (auth.uid() = referrer_id);

-- Allow authenticated users to view referrals where they are the referee
CREATE POLICY "Users can view their own referrals as referee" 
ON public.referrals 
FOR SELECT 
TO authenticated 
USING (auth.uid() = referee_id);

-- Allow service role to manage all referrals
CREATE POLICY "Service role can manage all referrals" 
ON public.referrals 
FOR ALL 
TO service_role 
USING (true);