-- Fix user_id column in trade_entries table
-- Option 1: If user_id column exists and is NOT NULL, make it nullable or add a default
-- Option 2: If user_id column doesn't exist but is needed, add it

-- Check if user_id column exists
DO $$
BEGIN
    -- If user_id column exists and is NOT NULL, make it nullable
    -- (user_id can be derived from account_id via trading_accounts table)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trade_entries' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        -- Make user_id nullable (we can get it from account_id)
        ALTER TABLE trade_entries ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Made user_id column nullable';
    END IF;
    
    -- If user_id column doesn't exist, we don't need to add it
    -- (user_id can be derived from account_id via trading_accounts.user_id)
END $$;

-- Alternative: If you want to keep user_id as NOT NULL, populate it from trading_accounts
-- This updates existing records
UPDATE trade_entries te
SET user_id = ta.user_id
FROM trading_accounts ta
WHERE te.account_id = ta.id
  AND te.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trade_entries' 
    AND column_name = 'user_id'
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

