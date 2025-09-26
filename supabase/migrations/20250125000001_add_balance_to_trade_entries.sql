-- Add balance field to trade_entries table
ALTER TABLE trade_entries 
ADD COLUMN balance DECIMAL(15,2);

-- Add comment to explain the field
COMMENT ON COLUMN trade_entries.balance IS 'Account balance after this trade (for tracking balance progression)';

-- Create index for better query performance
CREATE INDEX idx_trade_entries_balance ON trade_entries(balance);

-- Update existing records to have balance = initial_balance + pnl_amount (if pnl_amount exists)
-- This is a one-time migration to populate existing records
UPDATE trade_entries 
SET balance = (
  SELECT ta.initial_balance + COALESCE(trade_entries.pnl_amount, 0)
  FROM trading_accounts ta
  WHERE ta.id = trade_entries.account_id
)
WHERE balance IS NULL;
