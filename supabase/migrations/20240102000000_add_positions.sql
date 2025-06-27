/**
* POSITIONS
* Note: This table contains trading positions from TradingView and other sources.
* Only subscribed users should be able to view positions.
*/
create table positions (
  id bigserial primary key,
  user_id uuid references auth.users,
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

-- Users can view their own positions and admins can view all
create policy "Users can view own positions" on positions for select using (
  auth.uid() = user_id OR
  exists (
    select 1 from subscriptions 
    where user_id = auth.uid() 
    and status in ('trialing', 'active')
  )
);

-- Users can insert their own positions
create policy "Users can insert own positions" on positions for insert with check (
  auth.uid() = user_id
);

-- Users can update their own positions
create policy "Users can update own positions" on positions for update using (
  auth.uid() = user_id
);

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

-- Update realtime publication to include positions
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices, signals, positions; 