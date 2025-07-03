/** 
* USERS
* Note: This table contains user data. Users should only be able to view and update their own data.
*/
create table users (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  -- The customer's billing address, stored in JSON format.
  billing_address jsonb,
  -- Stores your customer's payment instruments.
  payment_method jsonb,
  referral_code text,
  referred_by text
);
alter table users enable row level security;
create policy "Can view own user data." on users for select using (auth.uid() = id);
create policy "Can update own user data." on users for update using (auth.uid() = id);

/**
* This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
*/ 
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url, referred_by)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'referred_by');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/**
* CUSTOMERS
* Note: this is a private table that contains a mapping of user IDs to Stripe customer IDs.
*/
create table customers (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  -- The user's customer ID in Stripe. User must not be able to update this.
  stripe_customer_id text
);
alter table customers enable row level security;
-- No policies as this is a private table that the user must not have access to.

/** 
* PRODUCTS
* Note: products are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create table products (
  id text primary key,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb
);
alter table products enable row level security;
create policy "Allow public read-only access." on products for select using (true);

/**
* PRICES
* Note: prices are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create type pricing_type as enum ('one_time', 'recurring');
create type pricing_plan_interval as enum ('day', 'week', 'month', 'year');
create table prices (
  id text primary key,
  product_id text references products,
  active boolean,
  description text,
  unit_amount bigint,
  currency text check (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb
);
alter table prices enable row level security;
create policy "Allow public read-only access." on prices for select using (true);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_prices_active ON prices(active);

-- Sample data for testing (optional, remove in production)
INSERT INTO products (id, active, name, description, metadata) VALUES
('prod_example1', true, 'Basic Plan', 'Basic trading signals', '{"index": 1}'),
('prod_example2', true, 'Pro Plan', 'Advanced trading features', '{"index": 2}'),
('prod_example3', true, 'Premium Plan', 'Full access to all features', '{"index": 3}');

INSERT INTO prices (id, product_id, active, unit_amount, currency, type, interval, interval_count) VALUES
('price_example1_monthly', 'prod_example1', true, 1999, 'usd', 'recurring', 'month', 1),
('price_example2_monthly', 'prod_example2', true, 4999, 'usd', 'recurring', 'month', 1),
('price_example3_monthly', 'prod_example3', true, 9999, 'usd', 'recurring', 'month', 1);

/**
* SUBSCRIPTIONS
* Note: subscriptions are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create type subscription_status as enum ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');
create table subscriptions (
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
alter table subscriptions enable row level security;
create policy "Can only view own subs data." on subscriptions for select using (auth.uid() = user_id);

/**
* SIGNALS
* Note: This table contains trading signals from TradingView and other sources.
* Only subscribed users should be able to view signals.
*/
create table signals (
  id bigserial primary key,
  symbol text not null,
  typ text not null, -- 'buy' or 'sell'
  price decimal not null,
  timestamp bigint not null,
  reason text,
  rsi decimal default 0,
  macd decimal default 0,
  risk decimal default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table signals enable row level security;

-- Only allow users with active subscriptions to view signals
create policy "Only subscribed users can view signals" on signals for select using (
  exists (
    select 1 from subscriptions 
    where user_id = auth.uid() 
    and status in ('trialing', 'active')
  )
);

/**
* POSITIONS
* Note: This table contains trading positions from TradingView and other sources.
* Only subscribed users should be able to view positions.
*/
create table positions (
  id bigserial primary key,
  user_id uuid references auth.users, -- Optional, for tracking but not enforced
  symbol text not null,
  side text not null, -- 'buy' or 'sell' 
  entry_price decimal not null,
  quantity decimal default 1,
  stop_loss decimal,
  take_profit decimal,
  status text default 'open', -- 'open', 'closed', 'cancelled'
  entry_timestamp bigint not null,
  exit_timestamp bigint,
  exit_price decimal,
  pnl decimal default 0,
  reason text,
  rsi decimal default 0,
  macd decimal default 0,
  risk decimal default 1.0,
  source text default 'tradingview', -- 'tradingview', 'manual', 'api'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table positions enable row level security;

-- Subscribed users can view all positions (global access)
create policy "Subscribed users can view all positions" on positions for select using (
  exists (
    select 1 from subscriptions 
    where user_id = auth.uid() 
    and status in ('trialing', 'active')
  )
);

-- Allow API/system to insert positions (for TradingView webhook)
create policy "Allow API to insert positions" on positions for insert with check (true);

-- Allow API/system to update positions
create policy "Allow API to update positions" on positions for update using (true);

-- Create indexes for better performance
create index idx_positions_user_id on positions(user_id);
create index idx_positions_symbol on positions(symbol);
create index idx_positions_status on positions(status);
create index idx_positions_created_at on positions(created_at desc);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_positions_updated_at
  before update on positions
  for each row
  execute function update_updated_at_column();

/**
 * REALTIME SUBSCRIPTIONS
 * Only allow realtime listening on public tables.
 */
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices, signals, positions;