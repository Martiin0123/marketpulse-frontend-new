-- Create schema
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS graphql_public;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

/** 
* USERS
* Note: This table contains user data. Users should only be able to view and update their own data.
*/
CREATE TABLE users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  email text UNIQUE,
  referred_by text,
  referral_code text UNIQUE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  direction text NOT NULL,
  entry_price decimal NOT NULL,
  stop_loss decimal NOT NULL,
  take_profit decimal NOT NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  direction text NOT NULL,
  entry_price decimal NOT NULL,
  stop_loss decimal NOT NULL,
  take_profit decimal NOT NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referral_code text REFERENCES referral_codes(code) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  reward_amount decimal,
  reward_currency text,
  converted_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE referral_rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  amount decimal NOT NULL,
  currency text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

/**
* CUSTOMERS
* Note: this is a private table that contains a mapping of user IDs to Stripe customer IDs.
*/
CREATE TABLE customers (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  -- The user's customer ID in Stripe. User must not be able to update this.
  stripe_customer_id text
);

/** 
* PRODUCTS
* Note: products are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
CREATE TABLE products (
  -- Product ID from Stripe, e.g. prod_1234.
  id text primary key,
  -- Whether the product is currently available for purchase.
  active boolean,
  -- The product's name, meant to be displayable to the customer. Whenever this product is sold via a subscription, name will show up on associated invoice line item descriptions.
  name text,
  -- The product's description, meant to be displayable to the customer. Use this field to optionally store a long form explanation of the product being sold for your own rendering purposes.
  description text,
  -- A URL of the product image in Stripe, meant to be displayable to the customer.
  image text,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb
);

/**
* PRICES
* Note: prices are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
CREATE TYPE pricing_type as enum ('one_time', 'recurring');
CREATE TYPE pricing_plan_interval as enum ('day', 'week', 'month', 'year');
CREATE TABLE prices (
  -- Price ID from Stripe, e.g. price_1234.
  id text primary key,
  -- The ID of the prduct that this price belongs to.
  product_id text references products, 
  -- Whether the price can be used for new purchases.
  active boolean,
  -- A brief description of the price.
  description text,
  -- The unit amount as a positive integer in the smallest currency unit (e.g., 100 cents for US$1.00 or 100 for ¥100, a zero-decimal currency).
  unit_amount bigint,
  -- Three-letter ISO currency code, in lowercase.
  currency text check (char_length(currency) = 3),
  -- One of `one_time` or `recurring` depending on whether the price is for a one-time purchase or a recurring (subscription) purchase.
  type pricing_type,
  -- The frequency at which a subscription is billed. One of `day`, `week`, `month` or `year`.
  interval pricing_plan_interval,
  -- The number of intervals (specified in the `interval` attribute) between subscription billings. For example, `interval=month` and `interval_count=3` bills every 3 months.
  interval_count integer,
  -- Default number of trial days when subscribing a customer to this price using [`trial_from_plan=true`](https://stripe.com/docs/api#create_subscription-trial_from_plan).
  trial_period_days integer,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb
);

/**
* SUBSCRIPTIONS
* Note: subscriptions are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
CREATE TYPE subscription_status as enum ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');
CREATE TABLE subscriptions (
  -- Subscription ID from Stripe, e.g. sub_1234.
  id text primary key,
  user_id uuid references auth.users not null,
  -- The status of the subscription object, one of subscription_status type above.
  status subscription_status,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb,
  -- ID of the price that created this subscription.
  price_id text references prices,
  -- Quantity multiplied by the unit amount of the price creates the amount of the subscription. Can be used to charge multiple seats.
  quantity integer,
  -- If true the subscription has been canceled by the user and will be deleted at the end of the billing period.
  cancel_at_period_end boolean,
  -- Time at which the subscription was created.
  created timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Start of the current period that the subscription has been invoiced for.
  current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
  -- End of the current period that the subscription has been invoiced for. At the end of this period, a new invoice will be created.
  current_period_end timestamp with time zone default timezone('utc'::text, now()) not null,
  -- If the subscription has ended, the timestamp of the date the subscription ended.
  ended_at timestamp with time zone default timezone('utc'::text, now()),
  -- A date in the future at which the subscription will automatically get canceled.
  cancel_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has been canceled, the date of that cancellation. If the subscription was canceled with `cancel_at_period_end`, `canceled_at` will still reflect the date of the initial cancellation request, not the end of the subscription period when the subscription is automatically moved to a canceled state.
  canceled_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the beginning of that trial.
  trial_start timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the end of that trial.
  trial_end timestamp with time zone default timezone('utc'::text, now())
);

/**
 * REALTIME SUBSCRIPTIONS
 * Only allow realtime listening on public tables.
 */
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE products, prices;

-- Create functions
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

-- Function to create referral code for a user
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

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_referred_by text;
  v_full_name text;
  v_avatar_url text;
BEGIN
  -- Extract and validate metadata
  BEGIN
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    v_avatar_url := new.raw_user_meta_data->>'avatar_url';
    v_referred_by := new.raw_user_meta_data->>'referred_by';
    
    -- Validate referral code if present
    IF v_referred_by IS NOT NULL THEN
      PERFORM 1 
      FROM referral_codes 
      WHERE code = v_referred_by 
      AND is_active = true;
      
      IF NOT FOUND THEN
        RAISE WARNING 'Invalid referral code % for user %', v_referred_by, new.id;
        v_referred_by := NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error extracting metadata for user %: %', new.id, SQLERRM;
    -- Set defaults if metadata extraction fails
    v_full_name := split_part(new.email, '@', 1);
    v_avatar_url := NULL;
    v_referred_by := NULL;
  END;

  -- Insert the user with validated data
  BEGIN
    INSERT INTO public.users (
      id, 
      full_name, 
      avatar_url,
      referred_by,
      email
    )
    VALUES (
      new.id, 
      v_full_name,
      v_avatar_url,
      v_referred_by,
      new.email
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, users.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      referred_by = COALESCE(EXCLUDED.referred_by, users.referred_by),
      email = COALESCE(EXCLUDED.email, users.email);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating user %: %', new.id, SQLERRM;
  END;
  
  -- Create referral code for the new user
  BEGIN
    PERFORM create_user_referral_code(new.id, v_full_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating referral code for user %: %', new.id, SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle referral conversion
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

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_subscription_active_handle_referral
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_referral_conversion();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Can view own user data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Can update own user data." ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Can view own signals." ON signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Can create own signals." ON signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Can update own signals." ON signals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Can delete own signals." ON signals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Can view own positions." ON positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Can create own positions." ON positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Can update own positions." ON positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Can delete own positions." ON positions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Can view own referral codes." ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage referral codes." ON referral_codes FOR ALL USING (true);

CREATE POLICY "Can view own referrals." ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "System can manage referrals." ON referrals FOR ALL USING (true);

CREATE POLICY "Can view own rewards." ON referral_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage rewards." ON referral_rewards FOR ALL USING (true);