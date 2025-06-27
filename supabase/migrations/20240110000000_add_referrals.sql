/**
* REFERRALS
* Note: This table tracks referral relationships and rewards.
*/
create table referrals (
  id bigserial primary key,
  referrer_id uuid references auth.users not null, -- User who made the referral
  referee_id uuid references auth.users not null, -- User who was referred
  referral_code text not null, -- Unique referral code used
  status text default 'pending' check (status in ('pending', 'active', 'rewarded', 'expired')),
  reward_amount decimal default 0, -- Commission/reward amount
  reward_currency text default 'USD',
  converted_at timestamp with time zone, -- When referee became a paying customer
  rewarded_at timestamp with time zone, -- When referrer was rewarded
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate referrals
  unique(referee_id)
);

-- Add RLS policies
alter table referrals enable row level security;

-- Users can view their own referrals (as referrer)
create policy "Users can view own referrals" on referrals for select using (
  auth.uid() = referrer_id
);

-- Users can view referrals they were part of (as referee)
create policy "Users can view referrals they joined" on referrals for select using (
  auth.uid() = referee_id
);

-- System can insert referrals
create policy "System can insert referrals" on referrals for insert with check (true);

-- System can update referrals
create policy "System can update referrals" on referrals for update using (true);

/**
* REFERRAL_CODES
* Note: This table stores unique referral codes for each user.
*/
create table referral_codes (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  code text not null unique, -- The actual referral code (e.g., "JOHN123")
  clicks integer default 0, -- Number of times code was clicked
  conversions integer default 0, -- Number of successful conversions
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- One active code per user
  unique(user_id)
);

-- Add RLS policies
alter table referral_codes enable row level security;

-- Users can view their own referral code
create policy "Users can view own referral code" on referral_codes for select using (
  auth.uid() = user_id
);

-- Users can update their own referral code
create policy "Users can update own referral code" on referral_codes for update using (
  auth.uid() = user_id
);

-- System can insert referral codes
create policy "System can insert referral codes" on referral_codes for insert with check (true);

/**
* REFERRAL_REWARDS
* Note: This table tracks reward history and payouts.
*/
create table referral_rewards (
  id bigserial primary key,
  user_id uuid references auth.users not null, -- User receiving the reward
  referral_id bigint references referrals not null,
  reward_type text not null check (reward_type in ('commission', 'credit', 'bonus')),
  amount decimal not null,
  currency text default 'USD',
  status text default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamp with time zone,
  stripe_transfer_id text, -- If paid via Stripe
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table referral_rewards enable row level security;

-- Users can view their own rewards
create policy "Users can view own rewards" on referral_rewards for select using (
  auth.uid() = user_id
);

-- System can insert and update rewards
create policy "System can insert rewards" on referral_rewards for insert with check (true);
create policy "System can update rewards" on referral_rewards for update using (true);

-- Add referral_code to users table for easier tracking
alter table users add column referral_code text;
alter table users add column referred_by text; -- The referral code they used to sign up

-- Create indexes for better performance
create index idx_referrals_referrer_id on referrals(referrer_id);
create index idx_referrals_referee_id on referrals(referee_id);
create index idx_referrals_code on referrals(referral_code);
create index idx_referral_codes_code on referral_codes(code);
create index idx_referral_codes_user_id on referral_codes(user_id);
create index idx_referral_rewards_user_id on referral_rewards(user_id);

-- Create updated_at triggers
create trigger update_referrals_updated_at
  before update on referrals
  for each row
  execute function update_updated_at_column();

create trigger update_referral_codes_updated_at
  before update on referral_codes
  for each row
  execute function update_updated_at_column();

-- Function to generate unique referral code
create or replace function generate_referral_code(user_name text)
returns text as $$
declare
  base_code text;
  final_code text;
  counter integer := 1;
begin
  -- Clean user name and create base code
  base_code := upper(regexp_replace(coalesce(user_name, 'USER'), '[^A-Za-z0-9]', '', 'g'));
  base_code := left(base_code, 6); -- Limit to 6 characters
  
  -- If base_code is empty, use 'USER'
  if base_code = '' then
    base_code := 'USER';
  end if;
  
  -- Add random numbers to make it unique
  loop
    final_code := base_code || lpad(counter::text, 3, '0');
    
    -- Check if code already exists
    if not exists (select 1 from referral_codes where code = final_code) then
      return final_code;
    end if;
    
    counter := counter + 1;
    
    -- Prevent infinite loop
    if counter > 999 then
      final_code := base_code || to_char(extract(epoch from now())::integer % 10000, 'FM0000');
      return final_code;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Function to automatically create referral code for new users
create or replace function create_referral_code_for_user()
returns trigger as $$
declare
  new_code text;
begin
  -- Generate referral code
  new_code := generate_referral_code(new.full_name);
  
  -- Insert referral code
  insert into referral_codes (user_id, code)
  values (new.id, new_code);
  
  -- Update user with referral code
  update users set referral_code = new_code where id = new.id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-generate referral codes
create trigger on_user_created_generate_referral_code
  after insert on users
  for each row
  execute function create_referral_code_for_user();

-- Function to handle referral when user subscribes
create or replace function handle_referral_conversion()
returns trigger as $$
begin
  -- Only process if subscription becomes active from another status
  if new.status = 'active' and (old.status is null or old.status != 'active') then
    -- Update referral status to active and set conversion date
    update referrals 
    set 
      status = 'active',
      converted_at = now()
    where 
      referee_id = new.user_id 
      and status = 'pending';
      
    -- Update conversion count for referral code
    update referral_codes 
    set conversions = conversions + 1
    where code = (
      select referral_code 
      from referrals 
      where referee_id = new.user_id and status = 'active'
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to handle conversions
create trigger on_subscription_active_handle_referral
  after insert or update on subscriptions
  for each row
  execute function handle_referral_conversion();

-- Update realtime publication to include referral tables
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices, signals, positions, referrals, referral_codes, referral_rewards; 