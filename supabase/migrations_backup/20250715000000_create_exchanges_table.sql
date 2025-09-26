-- Create exchanges table for storing exchange configurations
CREATE TABLE IF NOT EXISTS exchanges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  position_sizing_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Bybit exchange configuration
INSERT INTO exchanges (name, position_sizing_percentage) 
VALUES ('bybit', 5.00)
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read exchange configs
CREATE POLICY "Allow authenticated users to read exchanges" ON exchanges
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow service role to insert/update/delete (admin operations)
CREATE POLICY "Allow service role to manage exchanges" ON exchanges
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exchanges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_exchanges_updated_at
  BEFORE UPDATE ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION update_exchanges_updated_at(); 