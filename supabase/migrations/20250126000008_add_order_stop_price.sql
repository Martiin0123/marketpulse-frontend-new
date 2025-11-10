-- Add order_stop_price column to copy_trade_logs table
ALTER TABLE copy_trade_logs 
ADD COLUMN IF NOT EXISTS order_stop_price NUMERIC;

-- Add comment
COMMENT ON COLUMN copy_trade_logs.order_stop_price IS 'Stop price for stop orders';

