-- Add image field to trade_entries table

-- Add image_url column to store the uploaded chart image
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_data column to store base64 image data (as backup)
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS image_data TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
