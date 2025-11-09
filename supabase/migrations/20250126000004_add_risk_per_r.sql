-- Add risk_per_r column to trading_accounts table
-- This represents the dollar amount that equals 1R (1 Risk unit)
-- Example: If risk_per_r = 100, then $100 = 1R, $200 = 2R, $50 = 0.5R

ALTER TABLE trading_accounts
ADD COLUMN IF NOT EXISTS risk_per_r NUMERIC(10, 2);

-- Migrate existing fixed_risk percentage to risk_per_r dollars
-- For accounts with initial_balance > 0: risk_per_r = initial_balance * (fixed_risk / 100)
-- For accounts with initial_balance = 0: set default risk_per_r = 100 (can be edited by user)
UPDATE trading_accounts
SET risk_per_r = CASE
  WHEN initial_balance > 0 THEN initial_balance * (COALESCE(fixed_risk, 1) / 100.0)
  ELSE 100.0
END
WHERE risk_per_r IS NULL;

-- Set default for any remaining NULL values
UPDATE trading_accounts
SET risk_per_r = 100.0
WHERE risk_per_r IS NULL;

-- Add comment
COMMENT ON COLUMN trading_accounts.risk_per_r IS 'Dollar amount that equals 1R (1 Risk unit). Example: If risk_per_r = 100, then $100 profit = 1R, $200 profit = 2R, $50 loss = -0.5R';

