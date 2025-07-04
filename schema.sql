-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.customers (
  id uuid NOT NULL,
  stripe_customer_id text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.portfolio (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  type USER-DEFINED NOT NULL,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()),
  entry_price numeric NOT NULL,
  exit_price numeric,
  pnl numeric,
  balance numeric,
  risk_used numeric,
  CONSTRAINT portfolio_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.positions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  signal_id uuid NOT NULL,
  symbol text NOT NULL,
  type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'open'::position_status,
  entry_price numeric NOT NULL,
  entry_timestamp timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  exit_price numeric,
  exit_timestamp timestamp with time zone,
  quantity numeric NOT NULL,
  pnl numeric,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT positions_pkey PRIMARY KEY (id),
  CONSTRAINT positions_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES public.signals(id)
);
CREATE TABLE public.prices (
  id text NOT NULL,
  product_id text,
  active boolean,
  description text,
  unit_amount bigint,
  currency text CHECK (char_length(currency) = 3),
  type USER-DEFINED,
  interval USER-DEFINED,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb,
  CONSTRAINT prices_pkey PRIMARY KEY (id),
  CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id text NOT NULL,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb,
  default_price text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_default_price_fkey FOREIGN KEY (default_price) REFERENCES public.prices(id)
);
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  clicks integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referral_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text CHECK (char_length(currency) = 3),
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  paid_at timestamp with time zone,
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id),
  CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES auth.users(id),
  CONSTRAINT referrals_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.referral_codes(code)
);
CREATE TABLE public.signals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  symbol text NOT NULL,
  type USER-DEFINED NOT NULL,
  entry_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata jsonb,
  CONSTRAINT signals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid NOT NULL,
  status USER-DEFINED,
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
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.prices(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text CHECK (char_length(full_name) >= 3),
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb,
  metadata jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);