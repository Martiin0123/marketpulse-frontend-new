-- Add fixed_risk field to trading_accounts table

-- Add fixed_risk column to store the fixed risk amount for each account
ALTER TABLE trading_accounts 
ADD COLUMN IF NOT EXISTS fixed_risk DECIMAL(15,2) DEFAULT 0.00;

-- Update existing accounts to have a default fixed risk of 0
UPDATE trading_accounts 
SET fixed_risk = 0.00 
WHERE fixed_risk IS NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
