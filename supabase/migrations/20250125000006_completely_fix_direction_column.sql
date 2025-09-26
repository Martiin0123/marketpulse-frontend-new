-- Completely fix the direction column issue

-- First, let's see what columns actually exist and drop the problematic direction column
DO $$ 
BEGIN
    -- Check if direction column exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trade_entries' 
        AND column_name = 'direction'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE trade_entries DROP COLUMN direction;
        RAISE NOTICE 'Dropped direction column';
    END IF;
END $$;

-- Ensure we have the correct side column with proper constraints
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS side TEXT;

-- Update any existing records
UPDATE trade_entries 
SET side = 'long' 
WHERE side IS NULL OR side = '';

-- Make side column NOT NULL
ALTER TABLE trade_entries 
ALTER COLUMN side SET NOT NULL;

-- Add check constraint
ALTER TABLE trade_entries 
ADD CONSTRAINT check_side_values CHECK (side IN ('long', 'short'));

-- Ensure all other required columns exist
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

-- Verify the final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trade_entries' 
AND table_schema = 'public'
ORDER BY ordinal_position;
