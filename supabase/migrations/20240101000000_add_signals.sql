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

-- Update realtime publication to include signals
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices, signals; 