-- Fix RLS policies for referral_codes table
-- The policies were incorrectly applied to 'public' role instead of 'authenticated' role

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Service role can manage all referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can read their own referrals" ON public.referral_codes;

-- Create correct policies with proper roles

-- Allow authenticated users to view their own referral codes
CREATE POLICY "Users can view their own referral codes" 
ON public.referral_codes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow authenticated users to create their own referral codes
CREATE POLICY "Users can create their own referral codes" 
ON public.referral_codes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own referral codes
CREATE POLICY "Users can update their own referral codes" 
ON public.referral_codes 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow public (anonymous) users to view active referral codes for validation during signup
CREATE POLICY "Public can view active referral codes" 
ON public.referral_codes 
FOR SELECT 
TO public 
USING (is_active = true);

-- Allow service role to manage all referral codes
CREATE POLICY "Service role can manage all referral codes" 
ON public.referral_codes 
FOR ALL 
TO service_role 
USING (true);