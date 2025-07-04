-- Fix referral functions to resolve ambiguous column errors
-- Run this in your Supabase SQL editor

-- Fix 1: Update get_referral_stats function to avoid ambiguous columns
CREATE OR REPLACE FUNCTION get_referral_stats(user_id_param uuid)
RETURNS TABLE (
  total_earnings numeric,
  pending_amount numeric,
  total_clicks integer,
  pending_referrals integer,
  active_referrals integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN rr.status = 'paid' THEN rr.amount ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN rr.status = 'eligible' THEN rr.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(rc.clicks, 0) as total_clicks,
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END)::integer as pending_referrals,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END)::integer as active_referrals
  FROM public.referral_codes rc
  LEFT JOIN public.referrals r ON r.referral_code = rc.code
  LEFT JOIN public.referral_rewards rr ON rr.referral_id = r.id
  WHERE rc.user_id = user_id_param
  GROUP BY rc.clicks;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Update validate_referral_code function
CREATE OR REPLACE FUNCTION validate_referral_code(code_param text)
RETURNS TABLE (
  valid boolean,
  referrer_id uuid,
  error_message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN rc.id IS NOT NULL THEN true ELSE false END as valid,
    rc.user_id as referrer_id,
    CASE 
      WHEN rc.id IS NULL THEN 'Invalid referral code'
      WHEN rc.is_active = false THEN 'Referral code is inactive'
      ELSE null
    END as error_message
  FROM public.referral_codes rc
  WHERE rc.code = code_param;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Update update_referral_code_clicks function
CREATE OR REPLACE FUNCTION update_referral_code_clicks(code_param text)
RETURNS void AS $$
BEGIN
  UPDATE public.referral_codes 
  SET clicks = clicks + 1, updated_at = now()
  WHERE code = code_param;
END;
$$ LANGUAGE plpgsql;

-- Fix 4: Update create_referral function
CREATE OR REPLACE FUNCTION create_referral(
  referrer_id_param uuid,
  referee_id_param uuid,
  referral_code_param text
)
RETURNS uuid AS $$
DECLARE
  referral_id uuid;
BEGIN
  -- Insert the referral
  INSERT INTO public.referrals (
    referrer_id, 
    referee_id, 
    referral_code, 
    status
  ) VALUES (
    referrer_id_param,
    referee_id_param,
    referral_code_param,
    'pending'
  ) RETURNING id INTO referral_id;
  
  -- Update click count
  PERFORM update_referral_code_clicks(referral_code_param);
  
  RETURN referral_id;
END;
$$ LANGUAGE plpgsql;

-- Fix 5: Drop and recreate create_user_referral_code function
DROP FUNCTION IF EXISTS create_user_referral_code(uuid, text);

-- First, add unique constraint on user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'referral_codes_user_id_key' 
    AND conrelid = 'public.referral_codes'::regclass
  ) THEN
    ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION create_user_referral_code(user_id_param uuid, user_name text DEFAULT null)
RETURNS void AS $$
DECLARE
  referral_code text;
BEGIN
  -- Generate a unique referral code
  referral_code := generate_referral_code(user_name);

  -- Insert the referral code
  INSERT INTO public.referral_codes (user_id, code, is_active)
  VALUES (user_id_param, referral_code, true)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions again
GRANT EXECUTE ON FUNCTION get_referral_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_code_clicks(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_referral(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_referral_code(uuid, text) TO authenticated;

-- Test the functions
SELECT 'Functions updated successfully' as status; 