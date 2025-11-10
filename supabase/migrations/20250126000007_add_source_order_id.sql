-- Add source_order_id column to copy_trade_logs for tracking source broker order IDs
-- This allows us to match cancelled orders to their original opened orders

ALTER TABLE copy_trade_logs 
ADD COLUMN IF NOT EXISTS source_order_id TEXT;

-- Create index for faster lookups when matching cancelled orders
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_source_order_id ON copy_trade_logs(source_order_id);

COMMENT ON COLUMN copy_trade_logs.source_order_id IS 'Source broker order ID for tracking order cancellations';

