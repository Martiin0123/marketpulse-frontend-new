-- Create referral system for Supabase auth users
-- This migration creates a complete referral system with proper relationships

-- Create enum types for referral status
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'active', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reward_status AS ENUM ('pending', 'eligible', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending',
  reward_amount numeric DEFAULT 19.00,
  reward_currency text DEFAULT 'EUR' CHECK (char_length(reward_currency) = 3),
  subscribed_at timestamp with time zone,
  eligible_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT referrals_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.referral_codes(code) ON DELETE CASCADE
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referral_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text CHECK (char_length(currency) = 3),
  status text DEFAULT 'pending',
  reward_type text DEFAULT 'referral_bonus',
  stripe_transfer_id text,
  eligible_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE,
  CONSTRAINT referral_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create referral_clicks table for tracking clicks
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referral_code text NOT NULL,
  ip_address inet,
  user_agent text,
  clicked_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_clicks_pkey PRIMARY KEY (id),
  CONSTRAINT referral_clicks_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.referral_codes(code) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards(status);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code(user_name text DEFAULT null)
RETURNS text AS $$
DECLARE
  base_code text;
  final_code text;
  random_string text;
  counter integer := 0;
BEGIN
  -- Create base code from name (first 3 letters, uppercase)
  IF user_name IS NOT NULL AND length(user_name) > 0 THEN
    base_code := UPPER(SUBSTRING(REGEXP_REPLACE(user_name, '[^a-zA-Z]', '', 'g'), 1, 3));
    IF length(base_code) < 3 THEN
      base_code := 'USER';
    END IF;
  ELSE
    base_code := 'USER';
  END IF;
  
  -- Generate random string
  random_string := SUBSTRING(MD5(RANDOM()::text), 1, 4);
  
  -- Combine them
  final_code := base_code || random_string;
  
  -- Ensure uniqueness (retry up to 10 times)
  WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE code = final_code) AND counter < 10 LOOP
    random_string := SUBSTRING(MD5(RANDOM()::text), 1, 4);
    final_code := base_code || random_string;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to create user referral code
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
$$ LANGUAGE plpgsql;

-- Create function to get referral statistics
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
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_referrals,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_referrals
  FROM public.referral_codes rc
  LEFT JOIN public.referrals r ON r.referral_code = rc.code
  LEFT JOIN public.referral_rewards rr ON rr.referral_id = r.id
  WHERE rc.user_id = user_id_param
  GROUP BY rc.clicks;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate referral code
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

-- Create function to update referral code clicks
CREATE OR REPLACE FUNCTION update_referral_code_clicks(code_param text)
RETURNS void AS $$
BEGIN
  UPDATE public.referral_codes 
  SET clicks = clicks + 1, updated_at = now()
  WHERE code = code_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to create referral
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

-- Create function to update referral on subscription
CREATE OR REPLACE FUNCTION update_referral_on_subscription()
RETURNS trigger AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Only process if subscription becomes active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Find and update the referral
    UPDATE public.referrals 
    SET 
      status = 'active',
      subscribed_at = now(),
      eligible_at = now() + interval '30 days',
      subscription_id = NEW.id
    WHERE referee_id = NEW.user_id 
      AND status = 'pending'
    RETURNING * INTO referral_record;
    
    -- If we found and updated a referral, create the reward
    IF FOUND THEN
      -- Update conversion count for referral code
      UPDATE public.referral_codes 
      SET conversions = conversions + 1, updated_at = now()
      WHERE code = referral_record.referral_code;
      
      -- Create reward entry
      INSERT INTO public.referral_rewards (
        user_id,
        referral_id,
        reward_type,
        amount,
        currency,
        status
      ) VALUES (
        referral_record.referrer_id,
        referral_record.id,
        'referral_bonus',
        referral_record.reward_amount,
        referral_record.reward_currency,
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to check and update eligible rewards
CREATE OR REPLACE FUNCTION check_eligible_rewards()
RETURNS void AS $$
BEGIN
  -- Update rewards to eligible status for referrals that have been active for 30 days
  UPDATE public.referral_rewards 
  SET status = 'eligible', eligible_at = now()
  WHERE status = 'pending' 
    AND referral_id IN (
      SELECT r.id 
      FROM public.referrals r 
      WHERE r.status = 'active' 
        AND r.eligible_at IS NOT NULL 
        AND r.eligible_at <= now() - interval '30 days'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to cancel referral rewards when subscription is cancelled
CREATE OR REPLACE FUNCTION cancel_referral_rewards()
RETURNS trigger AS $$
BEGIN
  -- Cancel pending rewards when subscription is cancelled
  UPDATE public.referral_rewards 
  SET status = 'cancelled'
  WHERE referral_id IN (
    SELECT r.id 
    FROM public.referrals r 
    WHERE r.referee_id = OLD.user_id 
      AND r.status = 'active'
  )
  AND status IN ('pending', 'eligible');
  
  -- Update referral status
  UPDATE public.referrals 
  SET status = 'cancelled', 
      cancelled_at = now()
  WHERE referee_id = OLD.user_id 
    AND status = 'active';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription creation
DROP TRIGGER IF EXISTS trigger_update_referral_on_subscription ON public.subscriptions;
CREATE TRIGGER trigger_update_referral_on_subscription
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_on_subscription();

-- Create trigger for subscription cancellation
DROP TRIGGER IF EXISTS trigger_cancel_referral_rewards ON public.subscriptions;
CREATE TRIGGER trigger_cancel_referral_rewards
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  WHEN (OLD.status != NEW.status AND NEW.status = 'canceled')
  EXECUTE FUNCTION cancel_referral_rewards();

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_referral_codes_updated_at ON public.referral_codes;
CREATE TRIGGER trigger_update_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_referrals_updated_at ON public.referrals;
CREATE TRIGGER trigger_update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_referral_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_code_clicks(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_referral(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_referral_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_eligible_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_on_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_referral_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referral_rewards TO authenticated;
GRANT SELECT, INSERT ON public.referral_clicks TO authenticated;

-- Add comment for cron job
COMMENT ON FUNCTION check_eligible_rewards() IS 'Call this function daily via cron to check and update eligible rewards';
