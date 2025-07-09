-- Cleanup script for duplicate active subscriptions
-- This script identifies users with multiple active subscriptions and keeps only the most recent one

-- Step 1: Find users with multiple active subscriptions
SELECT 
  user_id,
  COUNT(*) as active_count,
  ARRAY_AGG(id ORDER BY created DESC) as subscription_ids,
  ARRAY_AGG(created ORDER BY created DESC) as created_dates
FROM subscriptions 
WHERE status = 'active'
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Step 2: Update old active subscriptions to canceled (keeps most recent)
-- This will be run in a transaction for safety
BEGIN;

-- Create a temporary table with users who have multiple active subscriptions
CREATE TEMP TABLE duplicate_subs AS
SELECT 
  user_id,
  id,
  created,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created DESC) as rn
FROM subscriptions 
WHERE status = 'active';

-- Update all but the most recent subscription to 'canceled'
UPDATE subscriptions 
SET 
  status = 'canceled',
  ended_at = NOW(),
  canceled_at = NOW()
WHERE id IN (
  SELECT id 
  FROM duplicate_subs 
  WHERE rn > 1
);

-- Show what was updated
SELECT 
  user_id,
  id,
  status,
  created,
  'Updated to canceled' as action
FROM subscriptions 
WHERE status = 'canceled' 
  AND canceled_at >= NOW() - INTERVAL '1 minute';

-- Verify: Show remaining active subscriptions per user
SELECT 
  user_id,
  COUNT(*) as active_count,
  ARRAY_AGG(id) as remaining_subscription_ids
FROM subscriptions 
WHERE status = 'active'
GROUP BY user_id 
ORDER BY user_id;

-- Commit the transaction
COMMIT; 