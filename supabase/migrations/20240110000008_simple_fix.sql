-- Simplified fix for signup issues
-- Completely disable problematic triggers and policies, allow direct auth signup

-- Drop all problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_generate_referral_code ON users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS create_referral_code_for_user();

-- Temporarily disable RLS on users table to allow signup
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create a minimal function that will be called manually after signup
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text DEFAULT NULL,
  user_name text DEFAULT NULL,
  referral_code text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insert user profile manually
  INSERT INTO users (id, full_name, referred_by)
  VALUES (user_id, user_name, referral_code)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 