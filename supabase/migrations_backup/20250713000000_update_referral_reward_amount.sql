-- Update referral reward amount to ensure it's 19.00 EUR
-- This migration ensures the default reward amount is correctly set to 19.00

-- Update the default value for reward_amount in the referrals table
ALTER TABLE public.referrals 
ALTER COLUMN reward_amount SET DEFAULT 19.00;

-- Update any existing referrals that might have incorrect amounts
UPDATE public.referrals 
SET reward_amount = 19.00 
WHERE reward_amount != 19.00;

-- Update any existing referral rewards that might have incorrect amounts
UPDATE public.referral_rewards 
SET amount = 19.00 
WHERE amount != 19.00 AND reward_type = 'referral_bonus'; 