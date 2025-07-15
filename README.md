# Primescope Trade API

A Node.js Express server that handles TradingView alert messages and executes Bybit orders automatically.

## 🚀 Features

- **TradingView Alert Integration**: Parses TradingView alert messages and executes corresponding trades
- **Bybit API Integration**: Places orders on Bybit with dynamic position sizing
- **Position Management**: Handles entry and exit signals with proper position management
- **Dynamic Sizing**: Uses 95% of available margin with 10x leverage
- **Error Handling**: Comprehensive error handling with consistent response formats
- **Authentication**: Bearer token authentication for security

## 🔧 Recent Fixes

### Fixed Issues:

1. **Undefined Variables**: Fixed "actions is not defined" errors in catch blocks
2. **Response Format**: Standardized response format to match requirements
3. **Error Handling**: Ensured `actions` array is always defined in all code paths
4. **TradingView Alert Parsing**: Improved parsing for specific alert formats

### Response Format:

All responses now include:

- `success`: boolean indicating success/failure
- `actions`: array of actions taken (BUY/SELL/CLOSE/ERROR)
- `alert_message`: original TradingView alert message (when applicable)
- `symbol`: trading symbol
- `currentPrice`: current market price
- `timestamp`: ISO timestamp

## 📋 TradingView Alert Formats

The API accepts TradingView alerts in these formats:

### Entry Signals:

```
"Primescope LONG Entry! Symbol: BTCUSDT"
"Primescope SHORT Entry! Symbol: ETHUSDT"
```

### Exit Signals:

```
"Primescope LONG Exit (MA Cross)! Symbol: BTCUSDT"
"Primescope SHORT Exit (MA Cross)! Symbol: ETHUSDT"
```

### Alternative Direct Format:

```json
{
  "action": "BUY",
  "symbol": "BTCUSDT"
}
```

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd primescope-tradeapi
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env
```

4. Configure your `.env` file:

```env
# Bybit API Configuration
BYBIT_KEY=your_bybit_api_key_here
BYBIT_SECRET=your_bybit_secret_key_here
BYBIT_TESTNET=false

# Application Security
APP_SECRET=your_app_secret_for_bearer_auth

# Server Configuration
PORT=3000
NODE_ENV=production
```

## 🚀 Usage

### Start the server:

```bash
npm start
```

### Development mode:

```bash
npm run dev
```

## 📡 API Endpoints

### POST /place-order

Main endpoint for placing orders via TradingView alerts.

**Headers:**

```
Authorization: Bearer <APP_SECRET>
Content-Type: application/json
```

**Request Body (TradingView Format):**

```json
{
  "alert_message": "Primescope LONG Entry! Symbol: BTCUSDT",
  "symbol": "BTCUSDT"
}
```

**Request Body (Direct Format):**

```json
{
  "action": "BUY",
  "symbol": "BTCUSDT"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Bybit buy order submitted successfully",
  "order": {
    "orderId": "123456789",
    "symbol": "BTCUSDT",
    "side": "Buy",
    "qty": 0.001,
    "orderType": "Market",
    "status": "Submitted"
  },
  "actions": ["BUY"],
  "alert_message": "Primescope LONG Entry! Symbol: BTCUSDT",
  "symbol": "BTCUSDT",
  "currentPrice": 116573.2,
  "timestamp": "2025-07-15T20:49:44.491Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to execute order",
  "details": "Insufficient balance",
  "actions": ["ERROR"],
  "symbol": "BTCUSDT",
  "action": "BUY",
  "currentPrice": 116573.2,
  "timestamp": "2025-07-15T20:49:44.491Z"
}
```

### GET /health

Health check endpoint.

### GET /test

Test Bybit API credentials.

### GET /account

Get Bybit account information.

### GET /position/:symbol

Get position information for a specific symbol.

## 🧪 Testing

Test the API manually using curl:

```bash
# Test TradingView alert format
curl -X POST https://primescope-tradeapi-production.up.railway.app/place-order \
  -H "Authorization: Bearer YOUR_APP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_message": "Primescope LONG Entry! Symbol: BTCUSDT",
    "symbol": "BTCUSDT"
  }'

# Test direct format
curl -X POST https://primescope-tradeapi-production.up.railway.app/place-order \
  -H "Authorization: Bearer YOUR_APP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "BUY",
    "symbol": "BTCUSDT"
  }'
```

## 🔒 Security

- Bearer token authentication required for all trading endpoints
- Environment variables for sensitive data
- Input validation and sanitization
- Comprehensive error handling

## 📊 Trading Logic

### Entry Signals:

- **LONG Entry**: Places BUY order with dynamic sizing
- **SHORT Entry**: Places SELL order with dynamic sizing

### Exit Signals:

- **LONG Exit**: Closes existing LONG position
- **SHORT Exit**: Closes existing SHORT position

### Position Sizing:

- Uses 95% of available margin
- 10x leverage
- Dynamic quantity calculation based on current price
- Minimum quantity validation

## 🚨 Error Handling

The API handles various error scenarios:

- Invalid symbols
- Insufficient balance
- Network errors
- Authentication failures
- Missing required fields
- Unparseable TradingView alerts

All errors return consistent response format with `actions: ["ERROR"]`.

## 📈 Deployment

The API is configured for deployment on Railway:

- `Procfile` for Railway deployment
- Environment variable configuration
- Production-ready error handling

## 🔧 Configuration

### Environment Variables:

- `BYBIT_KEY`: Your Bybit API key
- `BYBIT_SECRET`: Your Bybit API secret
- `BYBIT_TESTNET`: Set to 'true' for testnet
- `APP_SECRET`: Secret for Bearer authentication
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## 📝 License

MIT License - see LICENSE file for details.
