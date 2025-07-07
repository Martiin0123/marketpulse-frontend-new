# Database Schema Documentation

## 📊 Complete Database Schema Tree

```
marketpulse_db/
├── 📋 Core Tables
│   ├── users
│   │   ├── id (UUID, PK)
│   │   ├── email (VARCHAR)
│   │   ├── created_at (TIMESTAMPTZ)
│   │   └── updated_at (TIMESTAMPTZ)
│   │
│   ├── signals
│   │   ├── id (UUID, PK)
│   │   ├── symbol (VARCHAR)
│   │   ├── type (VARCHAR) - 'buy', 'sell', 'close'
│   │   ├── entry_price (DECIMAL)
│   │   ├── exit_price (DECIMAL)
│   │   ├── pnl_percentage (DECIMAL)
│   │   ├── status (VARCHAR) - 'active', 'closed', 'cancelled'
│   │   ├── created_at (TIMESTAMPTZ)
│   │   ├── exit_timestamp (TIMESTAMPTZ)
│   │   ├── exchange (VARCHAR) - 'bybit'
│   │   ├── signal_source (VARCHAR) - 'ai_algorithm', 'manual'
│   │   ├── strategy_name (VARCHAR) - 'Primescope Crypto'
│   │   ├── timeframe (VARCHAR) - '1m', '5m', '1h', etc.
│   │   ├── rsi_value (DECIMAL)
│   │   ├── smoothing_ma_value (DECIMAL)
│   │   ├── long_term_ma_value (DECIMAL)
│   │   ├── divergence_type (VARCHAR) - 'bull', 'bear', null
│   │   ├── exit_reason (VARCHAR) - 'ma_cross', 'trailing_stop', 'hard_stop'
│   │   ├── alert_message (TEXT)
│   │   └── technical_metadata (JSONB)
│   │
│   ├── positions
│   │   ├── id (UUID, PK)
│   │   ├── signal_id (UUID, FK -> signals.id)
│   │   ├── symbol (VARCHAR)
│   │   ├── type (VARCHAR) - 'buy', 'sell'
│   │   ├── entry_price (DECIMAL)
│   │   ├── exit_price (DECIMAL)
│   │   ├── entry_timestamp (TIMESTAMPTZ)
│   │   ├── exit_timestamp (TIMESTAMPTZ)
│   │   ├── quantity (DECIMAL)
│   │   ├── status (VARCHAR) - 'open', 'closed'
│   │   ├── pnl (DECIMAL)
│   │   ├── exchange (VARCHAR) - 'bybit'
│   │   ├── strategy_name (VARCHAR)
│   │   ├── timeframe (VARCHAR)
│   │   ├── entry_reason (VARCHAR) - 'rsi_ma_cross', 'divergence'
│   │   ├── exit_reason (VARCHAR) - 'ma_cross', 'trailing_stop', 'hard_stop'
│   │   ├── trailing_stop_activated (BOOLEAN)
│   │   ├── trailing_stop_price (DECIMAL)
│   │   ├── hard_stop_price (DECIMAL)
│   │   ├── take_profit_price (DECIMAL)
│   │   ├── atr_value (DECIMAL)
│   │   └── technical_metadata (JSONB)
│   │
│   └── trade_counter
│       ├── id (INTEGER, PK) - Always 1
│       ├── counter (BIGINT) - Current trade count
│       ├── created_at (TIMESTAMPTZ)
│       └── updated_at (TIMESTAMPTZ)
│
├── 💰 Referral System
│   ├── referrals
│   │   ├── id (UUID, PK)
│   │   ├── referrer_id (UUID, FK -> users.id)
│   │   ├── referred_id (UUID, FK -> users.id)
│   │   ├── referral_code (VARCHAR)
│   │   ├── status (VARCHAR) - 'pending', 'completed'
│   │   ├── created_at (TIMESTAMPTZ)
│   │   └── completed_at (TIMESTAMPTZ)
│   │
│   ├── referral_payouts
│   │   ├── id (UUID, PK)
│   │   ├── referral_id (UUID, FK -> referrals.id)
│   │   ├── amount (DECIMAL)
│   │   ├── status (VARCHAR) - 'pending', 'paid', 'failed'
│   │   ├── created_at (TIMESTAMPTZ)
│   │   └── paid_at (TIMESTAMPTZ)
│   │
│   └── referral_codes
│       ├── id (UUID, PK)
│       ├── user_id (UUID, FK -> users.id)
│       ├── code (VARCHAR)
│       ├── usage_count (INTEGER)
│       ├── max_usage (INTEGER)
│       ├── created_at (TIMESTAMPTZ)
│       └── expires_at (TIMESTAMPTZ)
│
├── 📈 No Loss Guarantee System
│   └── performance_refunds
│       ├── id (UUID, PK)
│       ├── user_id (UUID, FK -> users.id)
│       ├── month_key (VARCHAR) - YYYY-MM format
│       ├── refund_amount (DECIMAL)
│       ├── status (VARCHAR) - 'pending', 'processed', 'failed'
│       ├── notes (TEXT) - Performance details
│       ├── created_at (TIMESTAMPTZ)
│       └── processed_at (TIMESTAMPTZ)
│
│   📊 Calculated from signals table:
│   ├── Uses closed signals for performance calculation
│   ├── Calculates total P&L from pnl_percentage
│   ├── Counts profitable vs total signals
│   ├── Pro-rated based on subscription period
│   └── Supports monthly performance analysis
│
├── 🔄 Copy Trading System
│   └── (Using Bybit's built-in copy trading feature)
│       ├── Leaders can whitelist followers
│       ├── Automatic trade copying
│       ├── Position sizing management
│       └── Real-time execution
│
├── 📊 Views
│   ├── signal_performance
│   │   └── Combines signals and positions for performance analysis
│   │
│   ├── multi_exchange_signal_performance
│   │   └── Multi-exchange signal performance analysis
│   │
│   └── copy_trading_performance
│       └── Copy trading performance analysis
│
└── 🔧 Functions
    ├── calculate_signal_stats()
    │   └── Calculate signal statistics
    │
    ├── calculate_exchange_signal_stats()
    │   └── Calculate exchange-specific signal statistics
    │
    ├── get_active_positions_by_exchange()
    │   └── Get active positions by exchange
    │
    ├── get_and_increment_trade_counter()
    │   └── Get and increment trade counter
    │
    └── is_every_fifth_trade()
        └── Check if current trade is every 5th trade
```

## 🎯 Key Features by Table

### **Core Trading Tables**

- **`signals`**: Stores all trading signals from Pine Script strategies
- **`positions`**: Tracks actual trading positions linked to signals
- **`trade_counter`**: Manages Discord webhook distribution (every 5th trade)

### **Multi-Exchange Support**

- **`exchange`** field in both `signals` and `positions` tables
- Supports 'bybit' exchange
- Indexed for optimal performance

### **Pine Script Integration**

- **`signal_source`**: Tracks signal origin ('ai_algorithm', 'manual')
- **`strategy_name`**: Identifies Pine Script strategy
- **`technical_metadata`**: Stores RSI, MA values, divergence data
- **`alert_message`**: Original TradingView alert message

### **Discord Webhook Management**

- **`trade_counter`**: Tracks trade count for webhook distribution
- Every 5th trade sent to both main and free Discord webhooks
- Functions to manage counter and check 5th trade status

### **Performance Analysis**

- **Views**: Pre-built performance analysis views
- **Functions**: Statistical calculation functions
- **Multi-exchange**: Support for comparing performance across exchanges

## 🔄 Migration History

1. **20250704193545_create_referral_system.sql** - Referral system
2. **20250705143000_create_performance_refunds.sql** - Performance refunds
3. **20250706000000_create_performance_refunds.sql** - Enhanced refunds
4. **20250707000000_enhance_trading_schema.sql** - Pine Script integration
5. **20250708000000_add_bybit_integration.sql** - Bybit exchange support
6. **20250708000001_create_copy_trading_tables.sql** - ~~Copy trading system~~ (REMOVED - Using Bybit's built-in feature)
7. **20250709000000_add_trade_counter.sql** - Discord webhook management

## 🚀 Environment Variables Required

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Discord Webhooks
DISCORD_WEBHOOK_URL=your_main_discord_webhook
DISCORD_WEBHOOK_URL_FREE=your_free_tier_discord_webhook
DISCORD_WEBHOOK_URL_REFUNDS=your_refunds_discord_webhook

# Bybit API
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET_KEY=your_bybit_secret_key
BYBIT_TESTNET=true_or_false

# Alpaca API (if using)
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
ALPACA_PAPER=true_or_false
```

## 📈 Usage Examples

### Get Trade Counter

```sql
SELECT * FROM trade_counter WHERE id = 1;
```

### Check if Every 5th Trade

```sql
SELECT is_every_fifth_trade();
```

### Get Signal Performance

```sql
SELECT * FROM signal_performance ORDER BY signal_created DESC LIMIT 10;
```

### Get Active Positions by Exchange

```sql
SELECT * FROM get_active_positions_by_exchange('bybit');
```
