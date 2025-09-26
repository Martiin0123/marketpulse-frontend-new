-- Add size column to trade_entries table

-- Add size column with default value
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS size DECIMAL(15,4) DEFAULT 1.0;

-- Make size column NOT NULL
ALTER TABLE trade_entries 
ALTER COLUMN size SET NOT NULL;

-- Update any existing records to have size = 1.0
UPDATE trade_entries 
SET size = 1.0 
WHERE size IS NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
