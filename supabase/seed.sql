-- Sample trading signals for testing
INSERT INTO signals (symbol, direction, entry_price, stop_loss, take_profit, status) VALUES 
('AAPL', 'buy', 150.25, 145.00, 160.00, 'open'),
('TSLA', 'sell', 245.80, 250.00, 235.00, 'open'),
('MSFT', 'buy', 380.15, 375.00, 390.00, 'open'),
('NVDA', 'buy', 890.50, 880.00, 910.00, 'open'),
('AMD', 'sell', 145.75, 150.00, 135.00, 'open'),
('GOOGL', 'buy', 125.30, 120.00, 135.00, 'open'),
('META', 'sell', 485.90, 490.00, 475.00, 'open'),
('AMZN', 'buy', 145.60, 140.00, 155.00, 'open');

-- Sample products for local development (these would normally come from Stripe)
INSERT INTO products (id, active, name, description, image, metadata) VALUES 
('prod_starter', true, 'Starter Plan', 'Perfect for beginners getting started with trading signals', null, '{"index": 0}'),
('prod_professional', true, 'Professional Plan', 'Advanced features for serious traders', null, '{"index": 1}'),
('prod_premium', true, 'Premium Plan', 'Complete trading suite with all features and priority support', null, '{"index": 2}');

-- Sample prices for local development (these would normally come from Stripe)
INSERT INTO prices (id, product_id, active, description, unit_amount, currency, type, interval, interval_count, trial_period_days, metadata) VALUES 
-- Starter Plan Prices
('price_starter_month', 'prod_starter', true, 'Starter Monthly', 999, 'usd', 'recurring', 'month', 1, 7, null),
('price_starter_year', 'prod_starter', true, 'Starter Yearly', 9999, 'usd', 'recurring', 'year', 1, 7, null),
-- Professional Plan Prices  
('price_professional_month', 'prod_professional', true, 'Professional Monthly', 2999, 'usd', 'recurring', 'month', 1, 7, null),
('price_professional_year', 'prod_professional', true, 'Professional Yearly', 29999, 'usd', 'recurring', 'year', 1, 7, null),
-- Premium Plan Prices
('price_premium_month', 'prod_premium', true, 'Premium Monthly', 4999, 'usd', 'recurring', 'month', 1, 7, null),
('price_premium_year', 'prod_premium', true, 'Premium Yearly', 49999, 'usd', 'recurring', 'year', 1, 7, null);
