-- Debug and fix referral_codes table RLS issues

-- First, check if RLS is enabled and enable it if not
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
BEGIN
    -- Drop all policies on referral_codes table
    DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Public can view active referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Service role can manage all referral codes" ON public.referral_codes;
    DROP POLICY IF EXISTS "Users can read their own referrals" ON public.referral_codes;
    
    -- Drop any other policies that might exist
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if policies don't exist
END $$;

-- Create simple, clear policies
CREATE POLICY "authenticated_users_own_referral_codes" 
ON public.referral_codes 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow public to view active codes for signup validation
CREATE POLICY "public_view_active_referral_codes" 
ON public.referral_codes 
FOR SELECT 
TO public 
USING (is_active = true);

-- Allow service role full access
CREATE POLICY "service_role_all_referral_codes" 
ON public.referral_codes 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);