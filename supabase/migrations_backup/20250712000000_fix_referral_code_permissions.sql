-- Fix referral code creation permissions
-- This migration fixes the issue where users can't create referral codes due to RLS policies

-- Grant the function to service_role so it can bypass RLS
GRANT EXECUTE ON FUNCTION create_user_referral_code(uuid, text) TO service_role;

-- Update the function to use SECURITY DEFINER so it runs with elevated privileges
CREATE OR REPLACE FUNCTION create_user_referral_code(user_id uuid, user_name text DEFAULT null)
RETURNS void AS $$
DECLARE
  referral_code text;
BEGIN
  -- Generate a unique referral code
  referral_code := generate_referral_code(user_name);

  -- Insert the referral code
  INSERT INTO public.referral_codes (user_id, code, is_active)
  VALUES (user_id, referral_code, true)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_referral_code(uuid, text) TO authenticated; 