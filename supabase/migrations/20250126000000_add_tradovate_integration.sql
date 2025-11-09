-- Create tradovate_accounts table to store Tradovate OAuth connections
CREATE TABLE IF NOT EXISTS tradovate_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    
    -- Tradovate OAuth credentials (encrypted)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Tradovate account info
    tradovate_user_id TEXT,
    tradovate_username TEXT,
    tradovate_account_name TEXT,
    
    -- Sync settings
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status TEXT, -- 'success' | 'error' | 'pending'
    last_sync_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One Tradovate connection per trading account
    UNIQUE(trading_account_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tradovate_accounts_user_id ON tradovate_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tradovate_accounts_trading_account_id ON tradovate_accounts(trading_account_id);

-- Enable RLS
ALTER TABLE tradovate_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tradovate accounts" ON tradovate_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tradovate accounts" ON tradovate_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tradovate accounts" ON tradovate_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tradovate accounts" ON tradovate_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Add broker tracking to trade_entries
ALTER TABLE trade_entries
    ADD COLUMN IF NOT EXISTS broker_trade_id TEXT,
    ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual'; -- 'manual' | 'tradovate' | 'bybit'

-- Create index for broker trade ID lookups (for deduplication)
CREATE INDEX IF NOT EXISTS idx_trade_entries_broker_trade_id ON trade_entries(broker_trade_id) WHERE broker_trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_entries_sync_source ON trade_entries(sync_source);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tradovate_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tradovate_accounts_updated_at
    BEFORE UPDATE ON tradovate_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_tradovate_accounts_updated_at();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

