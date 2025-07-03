  -- First, drop all existing tables and types if they exist
  DROP PUBLICATION IF EXISTS supabase_realtime;
  DROP TABLE IF EXISTS referral_rewards CASCADE;
  DROP TABLE IF EXISTS referrals CASCADE;
  DROP TABLE IF EXISTS referral_codes CASCADE;
  DROP TABLE IF EXISTS positions CASCADE;
  DROP TABLE IF EXISTS signals CASCADE;
  DROP TABLE IF EXISTS subscriptions CASCADE;
  DROP TABLE IF EXISTS prices CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TYPE IF EXISTS subscription_status CASCADE;
  DROP TYPE IF EXISTS pricing_type CASCADE;
  DROP TYPE IF EXISTS pricing_plan_interval CASCADE;

  -- Create schemas
  CREATE SCHEMA IF NOT EXISTS public;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE SCHEMA IF NOT EXISTS graphql_public;

  -- Create extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

  -- Create types
  CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
  CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');

  -- Create tables
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
      updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(referee_id) -- Ensure each user can only be referred once
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

  CREATE TABLE customers (
      id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
      stripe_customer_id text
  );

  CREATE TABLE products (
      id text PRIMARY KEY,
      active boolean,
      name text,
      description text,
      image text,
      metadata jsonb
  );

  CREATE TABLE prices (
      id text PRIMARY KEY,
      product_id text REFERENCES products,
      active boolean,
      description text,
      unit_amount bigint,
      currency text CHECK (char_length(currency) = 3),
      type pricing_type,
      interval pricing_plan_interval,
      interval_count integer,
      trial_period_days integer,
      metadata jsonb
  );

  CREATE TABLE subscriptions (
      id text PRIMARY KEY,
      user_id uuid REFERENCES auth.users NOT NULL,
      status subscription_status,
      metadata jsonb,
      price_id text REFERENCES prices,
      quantity integer,
      cancel_at_period_end boolean,
      created timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      current_period_start timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      current_period_end timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
      cancel_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
      canceled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
      trial_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
      trial_end timestamp with time zone DEFAULT timezone('utc'::text, now())
  );

  -- Create functions for referral management
  CREATE OR REPLACE FUNCTION generate_referral_code(user_name text DEFAULT NULL)
  RETURNS text AS $$
  DECLARE
      base_code text;
      final_code text;
      counter integer := 1;
  BEGIN
      -- Generate base code from username or random string
      IF user_name IS NOT NULL AND length(user_name) >= 3 THEN
          base_code := substr(regexp_replace(lower(user_name), '[^a-z0-9]', '', 'g'), 1, 5);
      ELSE
          base_code := substr(md5(random()::text), 1, 5);
      END IF;
      
      -- Try the base code first
      final_code := base_code;
      
      -- If code exists, append numbers until we find a unique one
      WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) LOOP
          final_code := base_code || counter;
          counter := counter + 1;
      END LOOP;
      
      RETURN final_code;
  END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE FUNCTION create_user_referral_code()
  RETURNS TRIGGER AS $$
  BEGIN
      -- Generate and insert referral code for new user
      INSERT INTO referral_codes (user_id, code)
      VALUES (NEW.id, generate_referral_code(NEW.full_name));
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create trigger to automatically generate referral code for new users
  DROP TRIGGER IF EXISTS create_referral_code_on_user_create ON users;
  CREATE TRIGGER create_referral_code_on_user_create
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_referral_code();

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
  CREATE INDEX IF NOT EXISTS idx_signals_user ON signals(user_id);
  CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

  -- Set up realtime subscriptions
  CREATE PUBLICATION supabase_realtime FOR TABLE products, prices;

  -- Grant necessary permissions
  GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

  -- Set up Row Level Security (RLS)
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

  -- RLS Policies

  -- Users can read/write their own data
  CREATE POLICY "Users can view own data" ON users
      FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own data" ON users
      FOR UPDATE USING (auth.uid() = id);

  -- Products and prices are publicly readable
  CREATE POLICY "Products are publicly viewable" ON products
      FOR SELECT USING (true);
  CREATE POLICY "Prices are publicly viewable" ON prices
      FOR SELECT USING (true);

  -- Customers table policies
  CREATE POLICY "Users can view own customer data" ON customers
      FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Service role can manage customers" ON customers
      USING (auth.role() = 'service_role');

  -- Subscriptions table policies - critical for preventing subscription inheritance
  CREATE POLICY "Users can view own subscriptions" ON subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Service role can manage subscriptions" ON subscriptions
      USING (auth.role() = 'service_role');

  -- Signals and positions policies
  CREATE POLICY "Users can manage own signals" ON signals
      FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY "Users can manage own positions" ON positions
      FOR ALL USING (auth.uid() = user_id);

  -- Referral system policies
  CREATE POLICY "Users can view own referral codes" ON referral_codes
      FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can view referrals they're involved in" ON referrals
      FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
  CREATE POLICY "Users can view own rewards" ON referral_rewards
      FOR SELECT USING (auth.uid() = user_id);

  -- Create function to handle new user creation with proper subscription isolation
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
      -- Create user in public schema
      INSERT INTO public.users (id, full_name, email, avatar_url)
      VALUES (
          NEW.id,
          NEW.raw_user_meta_data->>'full_name',
          NEW.email,
          NEW.raw_user_meta_data->>'avatar_url'
      );

      -- Create customer record (but NOT subscription)
      INSERT INTO customers (id)
      VALUES (NEW.id);

      -- Generate and assign referral code
      INSERT INTO referral_codes (user_id, code)
      VALUES (
          NEW.id,
          generate_referral_code(NEW.raw_user_meta_data->>'full_name')
      )
      RETURNING code INTO NEW.raw_user_meta_data->>'referral_code';

      -- Update the user's referral code
      UPDATE public.users 
      SET referral_code = (
          SELECT code 
          FROM referral_codes 
          WHERE user_id = NEW.id
      )
      WHERE id = NEW.id;

      -- Handle referral if the user was referred
      IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
          INSERT INTO referrals (
              referrer_id,
              referee_id,
              referral_code,
              status
          )
          SELECT 
              u.id as referrer_id,
              NEW.id as referee_id,
              NEW.raw_user_meta_data->>'referred_by' as referral_code,
              'completed' as status
          FROM public.users u
          WHERE u.referral_code = NEW.raw_user_meta_data->>'referred_by'
          LIMIT 1;

          -- Update referral code stats
          UPDATE referral_codes
          SET conversions = conversions + 1
          WHERE code = NEW.raw_user_meta_data->>'referred_by';
      END IF;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Create trigger for new user handling
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 