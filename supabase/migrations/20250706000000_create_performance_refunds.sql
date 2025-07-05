-- Create performance_refunds table
CREATE TABLE IF NOT EXISTS performance_refunds (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key VARCHAR(7) NOT NULL, -- YYYY-MM format
  refund_amount DECIMAL(10,2) NOT NULL,
  stripe_refund_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, month_key)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_performance_refunds_user_month ON performance_refunds(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_performance_refunds_status ON performance_refunds(status); 