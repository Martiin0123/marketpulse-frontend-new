-- Fix ProjectX synced trades data
-- This script deletes incorrectly synced trades and resets sync status
-- so they can be re-imported with correct dates and data

-- Step 1: Show what will be deleted (trades with today's date that were synced today)
-- Also show trades with invalid dates (epoch 1970 or future dates)
SELECT 
  COUNT(*) as trades_to_delete,
  MIN(entry_date) as earliest_entry,
  MAX(entry_date) as latest_entry,
  SUM(pnl_amount) as total_pnl,
  COUNT(CASE WHEN entry_date < '2000-01-01' THEN 1 END) as trades_before_2000,
  COUNT(CASE WHEN entry_date > NOW() THEN 1 END) as trades_in_future
FROM trade_entries
WHERE 
  sync_source = 'projectx'
  AND broker_trade_id IS NOT NULL
  AND broker_trade_id LIKE 'projectx_%'
  AND (
    DATE(entry_date) = CURRENT_DATE
    OR entry_date < '2000-01-01'  -- Likely invalid (epoch or very old)
    OR entry_date > NOW()  -- Future dates are invalid
  )
  AND DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day';  -- Synced in last day

-- Step 2: Delete incorrectly synced trades (with today's date or invalid dates)
-- These will be re-imported with correct dates on next sync
DELETE FROM trade_entries
WHERE 
  sync_source = 'projectx'
  AND broker_trade_id IS NOT NULL
  AND broker_trade_id LIKE 'projectx_%'
  AND (
    DATE(entry_date) = CURRENT_DATE
    OR entry_date < '2000-01-01'  -- Likely invalid (epoch or very old)
    OR entry_date > NOW()  -- Future dates are invalid
  )
  AND DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day';  -- Synced in last day

-- Step 3: Reset last_sync_at for ProjectX connections
-- This forces a full re-sync on next sync (will fetch all historical trades again)
UPDATE broker_connections
SET 
  last_sync_at = NULL,
  last_sync_status = NULL,
  last_sync_error = NULL,
  updated_at = NOW()
WHERE 
  broker_type = 'projectx';

-- Step 4: Recalculate PnL percentage for remaining ProjectX trades (if any)
UPDATE trade_entries te
SET 
  pnl_percentage = CASE
    WHEN te.entry_price > 0 AND te.size > 0 AND (te.entry_price * te.size) > 0
    THEN (te.pnl_amount / (te.entry_price * te.size)) * 100
    ELSE NULL
  END,
  updated_at = NOW()
WHERE 
  te.sync_source = 'projectx'
  AND (te.pnl_percentage IS NULL OR te.pnl_percentage = 0)
  AND te.pnl_amount IS NOT NULL
  AND te.entry_price > 0
  AND te.size > 0;

-- Step 5: Recalculate RR for remaining ProjectX trades based on account's fixed_risk
UPDATE trade_entries te
SET 
  rr = CASE
    WHEN ta.fixed_risk > 0 
      AND te.entry_price > 0 
      AND te.size > 0 
      AND (te.entry_price * te.size * ta.fixed_risk / 100) > 0
    THEN te.pnl_amount / (te.entry_price * te.size * ta.fixed_risk / 100)
    ELSE NULL
  END,
  updated_at = NOW()
FROM trading_accounts ta
WHERE 
  te.account_id = ta.id
  AND te.sync_source = 'projectx'
  AND (te.rr IS NULL OR te.rr = 0)
  AND te.pnl_amount IS NOT NULL
  AND te.entry_price > 0
  AND te.size > 0;

-- Step 6: Ensure exit_date is set for closed trades
UPDATE trade_entries te
SET 
  exit_date = COALESCE(te.exit_date, te.entry_date),
  updated_at = NOW()
WHERE 
  te.sync_source = 'projectx'
  AND te.status = 'closed'
  AND te.exit_date IS NULL;

-- Step 7: Show summary after cleanup
SELECT 
  COUNT(*) as remaining_projectx_trades,
  MIN(entry_date) as earliest_entry,
  MAX(entry_date) as latest_entry,
  SUM(pnl_amount) as total_pnl
FROM trade_entries
WHERE 
  sync_source = 'projectx';

-- Note: After running this script, trigger a manual sync from the journal settings
-- The trades will be re-imported with correct dates from the ProjectX API

