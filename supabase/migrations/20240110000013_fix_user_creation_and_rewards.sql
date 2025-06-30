-- First, drop existing triggers and functions to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simple, reliable handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Insert the user with referral data if provided
  INSERT INTO public.users (
    id, 
    full_name, 
    avatar_url,
    referred_by
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'referred_by'
  );
  
  -- Create referral code for the new user
  PERFORM create_user_referral_code(new.id, new.raw_user_meta_data->>'full_name');
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies are correct
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Can view own user data." ON users;
DROP POLICY IF EXISTS "Can update own user data." ON users;
DROP POLICY IF EXISTS "System can insert users" ON users;

-- Recreate policies with proper permissions
CREATE POLICY "Can view own user data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Can update own user data." ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);

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