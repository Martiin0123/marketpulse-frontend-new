-- Database Setup Script
-- Run this in your Supabase SQL Editor to set up the complete database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL,
  stripe_customer_id text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id text NOT NULL,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb,
  default_price text,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- Create prices table
CREATE TABLE IF NOT EXISTS public.prices (
  id text NOT NULL,
  product_id text,
  active boolean,
  description text,
  unit_amount bigint,
  currency text CHECK (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb,
  CONSTRAINT prices_pkey PRIMARY KEY (id),
  CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Add foreign key constraint for products default_price
ALTER TABLE public.products 
ADD CONSTRAINT products_default_price_fkey 
FOREIGN KEY (default_price) REFERENCES public.prices(id) ON DELETE SET NULL;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id text NOT NULL,
  user_id uuid NOT NULL,
  status subscription_status,
  metadata jsonb,
  price_id text,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_start timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_end timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  cancel_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  canceled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_end timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.prices(id) ON DELETE SET NULL
);

-- Create signals table
CREATE TABLE IF NOT EXISTS public.signals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  symbol text NOT NULL,
  type text NOT NULL,
  entry_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata jsonb,
  CONSTRAINT signals_pkey PRIMARY KEY (id)
);

-- Create positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  signal_id uuid NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'open',
  entry_price numeric NOT NULL,
  entry_timestamp timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  exit_price numeric,
  exit_timestamp timestamp with time zone,
  quantity numeric,
  pnl numeric,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT positions_pkey PRIMARY KEY (id),
  CONSTRAINT positions_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES public.signals(id) ON DELETE CASCADE
);

-- Create portfolio table
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()),
  entry_price numeric NOT NULL,
  exit_price numeric,
  pnl numeric,
  balance numeric,
  risk_used numeric,
  CONSTRAINT portfolio_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

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
  reward_amount numeric DEFAULT 39.00,
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
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON public.customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON public.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_active ON public.prices(active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_price_id ON public.subscriptions(price_id);
CREATE INDEX IF NOT EXISTS idx_positions_signal_id ON public.positions(signal_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON public.positions(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON public.signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards(status);

-- Insert sample data
INSERT INTO public.products (id, active, name, description, image, metadata) VALUES 
('prod_starter', true, 'Starter Plan', 'Perfect for beginners getting started with trading signals', null, '{"index": 0}'),
('prod_professional', true, 'Professional Plan', 'Advanced features for serious traders', null, '{"index": 1}'),
('prod_premium', true, 'Premium Plan', 'Complete trading suite with all features and priority support', null, '{"index": 2}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prices (id, product_id, active, description, unit_amount, currency, type, interval, interval_count, trial_period_days, metadata) VALUES 
-- Starter Plan Prices
('price_starter_month', 'prod_starter', true, 'Starter Monthly', 999, 'usd', 'recurring', 'month', 1, 7, null),
('price_starter_year', 'prod_starter', true, 'Starter Yearly', 9999, 'usd', 'recurring', 'year', 1, 7, null),
-- Professional Plan Prices  
('price_professional_month', 'prod_professional', true, 'Professional Monthly', 2999, 'usd', 'recurring', 'month', 1, 7, null),
('price_professional_year', 'prod_professional', true, 'Professional Yearly', 29999, 'usd', 'recurring', 'year', 1, 7, null),
-- Premium Plan Prices
('price_premium_month', 'prod_premium', true, 'Premium Monthly', 4999, 'usd', 'recurring', 'month', 1, 7, null),
('price_premium_year', 'prod_premium', true, 'Premium Yearly', 49999, 'usd', 'recurring', 'year', 1, 7, null)
ON CONFLICT (id) DO NOTHING;

-- Sample trading signals for testing
INSERT INTO public.signals (symbol, type, entry_price, metadata) VALUES 
('AAPL', 'buy', 150.25, '{"stop_loss": 145.00, "take_profit": 160.00, "status": "open"}'),
('TSLA', 'sell', 245.80, '{"stop_loss": 250.00, "take_profit": 235.00, "status": "open"}'),
('MSFT', 'buy', 380.15, '{"stop_loss": 375.00, "take_profit": 390.00, "status": "open"}'),
('NVDA', 'buy', 890.50, '{"stop_loss": 880.00, "take_profit": 910.00, "status": "open"}'),
('AMD', 'sell', 145.75, '{"stop_loss": 150.00, "take_profit": 135.00, "status": "open"}'),
('GOOGL', 'buy', 125.30, '{"stop_loss": 120.00, "take_profit": 135.00, "status": "open"}'),
('META', 'sell', 485.90, '{"stop_loss": 490.00, "take_profit": 475.00, "status": "open"}'),
('AMZN', 'buy', 145.60, '{"stop_loss": 140.00, "take_profit": 155.00, "status": "open"}')
ON CONFLICT DO NOTHING;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.prices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.signals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.positions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.portfolio TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referral_rewards TO authenticated;
GRANT SELECT, INSERT ON public.referral_clicks TO authenticated;

SELECT 'Database setup completed successfully!' as status; 