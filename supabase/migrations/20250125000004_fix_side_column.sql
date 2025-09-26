-- Ensure side column exists in trade_entries table
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'long' CHECK (side IN ('long', 'short'));

-- Update any existing records that might not have the side column
UPDATE trade_entries 
SET side = 'long' 
WHERE side IS NULL;

-- Make sure the column is NOT NULL
ALTER TABLE trade_entries 
ALTER COLUMN side SET NOT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
