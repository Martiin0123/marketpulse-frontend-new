-- Create performance_refunds table
CREATE TABLE IF NOT EXISTS public.performance_refunds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id text REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM format
  performance_pnl numeric NOT NULL,
  refund_amount numeric NOT NULL,
  stripe_refund_id text,
  refund_reason text NOT NULL,
  is_pro_rated boolean DEFAULT false,
  effective_start_date timestamp with time zone,
  effective_end_date timestamp with time zone,
  total_positions integer DEFAULT 0,
  profitable_positions integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_performance_refunds_user_month ON public.performance_refunds(user_id, month);

-- Add trigger to update updated_at
CREATE TRIGGER trigger_update_performance_refunds_updated_at
  BEFORE UPDATE ON public.performance_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 