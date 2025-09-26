-- Fix column mapping issues in trade_entries table

-- First, check if there's a direction column that shouldn't be there
-- and remove it if it exists
ALTER TABLE trade_entries 
DROP COLUMN IF EXISTS direction;

-- Ensure we have the correct side column
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('long', 'short'));

-- Make sure side is NOT NULL
ALTER TABLE trade_entries 
ALTER COLUMN side SET NOT NULL;

-- Update any existing records to have proper side values
UPDATE trade_entries 
SET side = 'long' 
WHERE side IS NULL OR side = '';

-- Ensure all required columns exist
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS pnl_amount DECIMAL(15,2);

ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2);

ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS pnl_percentage DECIMAL(8,4);

ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS rr DECIMAL(8,4);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
