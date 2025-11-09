-- Add exit_levels field to store exit levels for trades with multiple partial exits
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS exit_levels JSONB;

-- Add index for querying trades with exit levels
CREATE INDEX IF NOT EXISTS idx_trade_entries_exit_levels ON trade_entries USING GIN (exit_levels);

-- Add comment
COMMENT ON COLUMN trade_entries.exit_levels IS 'Array of exit levels for trades with multiple partial exits (can be profit or loss). Format: [{"tp": 1, "qty": 1, "price": 24954.75, "pnl": -24, "timestamp": "2025-11-07T14:47:14.955Z"}, ...]';

