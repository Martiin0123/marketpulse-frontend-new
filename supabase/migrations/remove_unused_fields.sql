-- First drop the RLS policies
DROP POLICY IF EXISTS "Users can manage their own positions" ON positions;
DROP POLICY IF EXISTS "Users can view their own positions" ON positions;
DROP POLICY IF EXISTS "Users can manage their own signals" ON signals;
DROP POLICY IF EXISTS "Users can view their own signals" ON signals;

-- Disable RLS since we're making positions and signals global
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE signals DISABLE ROW LEVEL SECURITY;

-- Remove non-required fields from positions table
ALTER TABLE positions
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS stop_loss,
  DROP COLUMN IF EXISTS take_profit,
  DROP COLUMN IF EXISTS side,
  DROP COLUMN IF EXISTS risk,
  DROP COLUMN IF EXISTS reason;

-- Remove non-required fields from signals table
ALTER TABLE signals
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS rsi,
  DROP COLUMN IF EXISTS macd,
  DROP COLUMN IF EXISTS risk,
  DROP COLUMN IF EXISTS reason;

-- Ensure the remaining columns have the correct types and constraints
ALTER TABLE positions
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN signal_id SET NOT NULL,
  ALTER COLUMN entry_price SET NOT NULL,
  ALTER COLUMN entry_timestamp SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN type SET NOT NULL;

ALTER TABLE signals
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN entry_price SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL; 