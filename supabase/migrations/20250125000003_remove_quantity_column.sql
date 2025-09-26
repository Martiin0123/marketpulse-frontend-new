-- Remove quantity column from trade_entries table as it's not needed for trading journal
ALTER TABLE trade_entries 
DROP COLUMN IF EXISTS quantity;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
