-- Fix referral system - restore referral code generation for new users
-- This migration restores the functions that were accidentally removed

-- First, ensure the generate_referral_code function exists
CREATE OR REPLACE FUNCTION generate_referral_code(user_name text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 1;
BEGIN
  -- Clean user name and create base code
  base_code := upper(regexp_replace(coalesce(user_name, 'USER'), '[^A-Za-z0-9]', '', 'g'));
  base_code := left(base_code, 6); -- Limit to 6 characters
  
  -- If base_code is empty, use 'USER'
  IF base_code = '' THEN
    base_code := 'USER';
  END IF;
  
  -- Add random numbers to make it unique
  LOOP
    final_code := base_code || lpad(counter::text, 3, '0');
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) THEN
      RETURN final_code;
    END IF;
    
    counter := counter + 1;
    
    -- Prevent infinite loop
    IF counter > 999 THEN
      final_code := base_code || to_char(extract(epoch from now())::integer % 10000, 'FM0000');
      RETURN final_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for a user (can be called manually or via trigger)
CREATE OR REPLACE FUNCTION create_user_referral_code(user_id uuid, user_name text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  new_code text;
  existing_code text;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO existing_code FROM users WHERE id = user_id AND referral_code IS NOT NULL;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Check if there's already a code in referral_codes table
  SELECT code INTO existing_code FROM referral_codes WHERE user_id = user_id;
  
  IF existing_code IS NOT NULL THEN
    -- Update users table with existing code
    UPDATE users SET referral_code = existing_code WHERE id = user_id;
    RETURN existing_code;
  END IF;
  
  -- Generate a new referral code
  new_code := generate_referral_code(user_name);
  
  -- Insert into referral_codes table
  INSERT INTO referral_codes (user_id, code)
  VALUES (user_id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update user with referral code
  UPDATE users SET referral_code = new_code WHERE id = user_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Can view own user data." ON users;
DROP POLICY IF EXISTS "Can update own user data." ON users;
DROP POLICY IF EXISTS "System can insert users" ON users;

-- Recreate policies with proper permissions
CREATE POLICY "Can view own user data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Can update own user data." ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);

-- Update the handle_new_user function to be more resilient
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- First, insert the user profile
  INSERT INTO public.users (id, full_name, avatar_url, referred_by)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'referred_by'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    referred_by = COALESCE(EXCLUDED.referred_by, users.referred_by);
  
  -- Then, create a referral code for the new user
  BEGIN
    PERFORM create_user_referral_code(new.id, new.raw_user_meta_data->>'full_name');
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Error creating referral code for user %: %', new.id, SQLERRM;
  END;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing users
DO $$
DECLARE
    auth_user RECORD;
BEGIN
    -- Find auth users without corresponding public user profiles
    FOR auth_user IN 
        SELECT au.id, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.users (id, full_name, avatar_url)
            VALUES (
                auth_user.id,
                auth_user.raw_user_meta_data->>'full_name',
                auth_user.raw_user_meta_data->>'avatar_url'
            );
            
            -- Create referral code for the user
            PERFORM create_user_referral_code(auth_user.id, auth_user.raw_user_meta_data->>'full_name');
            
            RAISE NOTICE 'Created user profile for %', auth_user.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error creating user profile for %: %', auth_user.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Function to handle referral when user subscribes
CREATE OR REPLACE FUNCTION handle_referral_conversion()
RETURNS trigger AS $$
DECLARE
  ref_record RECORD;
BEGIN
  -- Only process if subscription becomes active from another status
  IF new.status = 'active' AND (old.status IS NULL OR old.status != 'active') THEN
    -- Update referral status to active and set conversion date
    UPDATE referrals 
    SET 
      status = 'active',
      converted_at = now(),
      reward_amount = 25.00, -- Set reward amount
      reward_currency = 'USD'
    WHERE 
      referee_id = new.user_id 
      AND status = 'pending'
    RETURNING * INTO ref_record;
      
    -- If we found and updated a referral, create the reward
    IF FOUND THEN
      -- Update conversion count for referral code
      UPDATE referral_codes 
      SET conversions = conversions + 1
      WHERE code = ref_record.referral_code;
      
      -- Create reward entry
      INSERT INTO referral_rewards (
        user_id,
        referral_id,
        reward_type,
        amount,
        currency,
        status
      ) VALUES (
        ref_record.referrer_id,
        ref_record.id,
        'commission',
        25.00,
        'USD',
        'pending'
      );
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle conversions
DROP TRIGGER IF EXISTS on_subscription_active_handle_referral ON subscriptions;
CREATE TRIGGER on_subscription_active_handle_referral
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_referral_conversion();

-- Backfill missing rewards for active referrals
DO $$
DECLARE
    ref_record RECORD;
BEGIN
    -- Find all active referrals that don't have rewards yet
    FOR ref_record IN 
        SELECT r.* 
        FROM referrals r
        LEFT JOIN referral_rewards rr ON r.id = rr.referral_id
        WHERE r.status = 'active'
        AND rr.id IS NULL
    LOOP
        -- Create reward entry
        INSERT INTO referral_rewards (
            user_id,
            referral_id,
            reward_type,
            amount,
            currency,
            status
        ) VALUES (
            ref_record.referrer_id,
            ref_record.id,
            'commission',
            25.00,
            'USD',
            'pending'
        );
        
        -- Update referral with reward amount if not set
        UPDATE referrals 
        SET 
            reward_amount = COALESCE(reward_amount, 25.00),
            reward_currency = COALESCE(reward_currency, 'USD')
        WHERE id = ref_record.id;
        
        RAISE NOTICE 'Created reward for referral %', ref_record.id;
    END LOOP;
END $$; 