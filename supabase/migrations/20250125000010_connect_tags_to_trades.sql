-- Create junction table to connect tags to trades
CREATE TABLE IF NOT EXISTS trade_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_id UUID NOT NULL REFERENCES trade_entries(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tag per trade (one trade can't have the same tag twice)
    UNIQUE(trade_id, tag_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag_id ON trade_tags(tag_id);

-- Enable RLS
ALTER TABLE trade_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view trade_tags if they own the trade
CREATE POLICY "Users can view trade_tags for their trades" ON trade_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trade_entries te
            JOIN trading_accounts ta ON te.account_id = ta.id
            WHERE te.id = trade_tags.trade_id
            AND ta.user_id = auth.uid()
        )
    );

-- Users can insert trade_tags if they own the trade
CREATE POLICY "Users can insert trade_tags for their trades" ON trade_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trade_entries te
            JOIN trading_accounts ta ON te.account_id = ta.id
            WHERE te.id = trade_tags.trade_id
            AND ta.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags t
            WHERE t.id = trade_tags.tag_id
            AND t.user_id = auth.uid()
        )
    );

-- Users can delete trade_tags if they own the trade
CREATE POLICY "Users can delete trade_tags for their trades" ON trade_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM trade_entries te
            JOIN trading_accounts ta ON te.account_id = ta.id
            WHERE te.id = trade_tags.trade_id
            AND ta.user_id = auth.uid()
        )
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

