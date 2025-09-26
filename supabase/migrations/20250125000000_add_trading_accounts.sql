-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance DECIMAL(15,2) NOT NULL,
  risk_per_trade DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trade_entries table
CREATE TABLE IF NOT EXISTS trade_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL(15,8) NOT NULL,
  exit_price DECIMAL(15,8),
  quantity DECIMAL(15,8) NOT NULL,
  pnl_percentage DECIMAL(8,4),
  pnl_amount DECIMAL(15,2),
  rr DECIMAL(8,4),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_entries_account_id ON trade_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_trade_entries_entry_date ON trade_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_trade_entries_status ON trade_entries(status);

-- Enable Row Level Security
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trading accounts" ON trading_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading accounts" ON trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts" ON trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading accounts" ON trading_accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view trade entries for their accounts" ON trade_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trade entries for their accounts" ON trade_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trade entries for their accounts" ON trade_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trade entries for their accounts" ON trade_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_trading_accounts_updated_at 
  BEFORE UPDATE ON trading_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_entries_updated_at 
  BEFORE UPDATE ON trade_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
