-- Sample trading signals for testing
INSERT INTO signals (symbol, typ, price, timestamp, reason, rsi, macd, risk) VALUES 
('AAPL', 'buy', 150.25, extract(epoch from now()), 'RSI oversold, bullish divergence detected', 28.5, -0.0145, 0.25),
('TSLA', 'sell', 245.80, extract(epoch from now() - interval '30 minutes'), 'Breaking below support, volume spike', 72.3, 0.0298, 0.65),
('MSFT', 'buy', 380.15, extract(epoch from now() - interval '1 hour'), 'Golden cross formation, strong momentum', 45.2, 0.0089, 0.30),
('NVDA', 'buy', 890.50, extract(epoch from now() - interval '2 hours'), 'Breakout above resistance, high volume', 55.1, 0.0156, 0.40),
('AMD', 'sell', 145.75, extract(epoch from now() - interval '3 hours'), 'Bearish engulfing pattern formed', 78.9, -0.0234, 0.75),
('GOOGL', 'buy', 125.30, extract(epoch from now() - interval '4 hours'), 'Cup and handle pattern completion', 42.1, 0.0067, 0.35),
('META', 'sell', 485.90, extract(epoch from now() - interval '5 hours'), 'Double top formation confirmed', 68.7, -0.0189, 0.55),
('AMZN', 'buy', 145.60, extract(epoch from now() - interval '6 hours'), 'Ascending triangle breakout', 38.9, 0.0123, 0.28);

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
