import { RestClientV5 } from 'bybit-api';

// Bybit API configuration
let bybitClient: RestClientV5 | null = null;

// Create Bybit client function to ensure environment variables are loaded
function createBybitClient() {
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;
  const BYBIT_TESTNET = process.env.BYBIT_TESTNET === 'true'; // Use testnet by default

  console.log('🔧 Environment variables check:', {
    hasApiKey: !!BYBIT_API_KEY,
    hasSecretKey: !!BYBIT_SECRET_KEY,
    apiKeyLength: BYBIT_API_KEY?.length || 0,
    secretKeyLength: BYBIT_SECRET_KEY?.length || 0,
    testnet: BYBIT_TESTNET
  });

  if (!BYBIT_API_KEY || !BYBIT_SECRET_KEY) {
    throw new Error('Bybit API keys not configured. Please set BYBIT_API_KEY and BYBIT_SECRET_KEY in your environment variables.');
  }
  
  console.log('🔧 Initializing Bybit client with:', {
    key: `${BYBIT_API_KEY.substring(0, 4)}...${BYBIT_API_KEY.substring(BYBIT_API_KEY.length - 4)}`,
    secret: `${BYBIT_SECRET_KEY.substring(0, 4)}...${BYBIT_SECRET_KEY.substring(BYBIT_SECRET_KEY.length - 4)}`,
    testnet: BYBIT_TESTNET
  });
  
  return new RestClientV5({
    key: BYBIT_API_KEY,
    secret: BYBIT_SECRET_KEY,
    testnet: BYBIT_TESTNET
  });
}

// Lazy initialization of Bybit client
function getBybitClient() {
  if (!bybitClient) {
    bybitClient = createBybitClient();
  }
  return bybitClient;
}

// Types for Bybit responses
export interface BybitPosition {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  avgPrice: string;
  unrealisedPnl: string;
  markPrice: string;
  positionValue: string;
  positionIdx: number;
  riskId: number;
  stopLoss: string;
  takeProfit: string;
  trailingStop: string;
  positionStatus: string;
  autoAddMargin: string;
  leverage: string;
  positionBalance: string;
  updatedTime: string;
  seq: number;
}

export interface BybitAccount {
  accountType: string;
  coin: string[];
  accountLTV: string;
  accountIMRate: string;
  accountMMRate: string;
  totalEquity: string;
  totalWalletBalance: string;
  totalMarginBalance: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  totalPositionMargin: string;
  totalOrderMargin: string;
  totalAvailableBalance: string;
  totalUsedMargin: string;
  accountStatus: string;
}

export interface BybitOrder {
  orderId: string;
  orderLinkId: string;
  blockTradeId: string;
  symbol: string;
  price: string;
  qty: string;
  side: 'Buy' | 'Sell';
  isLeverage: string;
  positionIdx: number;
  orderStatus: string;
  cancelType: string;
  rejectReason: string;
  avgPrice: string;
  leavesQty: string;
  leavesValue: string;
  cumExecQty: string;
  cumExecValue: string;
  cumExecFee: string;
  timeInForce: string;
  orderType: string;
  stopOrderType: string;
  orderIv: string;
  triggerPrice: string;
  takeProfit: string;
  stopLoss: string;
  tpTriggerBy: string;
  slTriggerBy: string;
  triggerDirection: number;
  triggerBy: string;
  lastPriceOnCreated: string;
  closedPnl: string;
  reduceOnly: boolean;
  closeOnTrigger: boolean;
  smpType: string;
  smpGroup: string;
  smpOrderId: string;
  tpslMode: string;
  tpLimitPrice: string;
  slLimitPrice: string;
  placeType: string;
  createdTime: string;
  updatedTime: string;
}

// Account functions
export async function getBybitAccount(): Promise<any> {
  try {
    console.log('🔍 Calling getBybitAccount()...');
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    console.log('📊 Making getWalletBalance API call...');
    const response = await client.getWalletBalance({ accountType: 'UNIFIED' });
    console.log('📊 getWalletBalance response:', {
      retCode: response.retCode,
      retMsg: response.retMsg,
      hasResult: !!response.result,
      hasList: !!(response.result && response.result.list)
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    return response.result.list[0];
  } catch (error) {
    console.error('❌ Error fetching Bybit account:', error);
    throw error;
  }
}

// Position functions
export async function getBybitPositions(): Promise<any[]> {
  try {
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.getPositionInfo({ category: 'linear' });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    return response.result.list.filter((position: any) => parseFloat(position.size) > 0);
  } catch (error) {
    console.error('Error fetching Bybit positions:', error);
    throw error;
  }
}

export async function getBybitPosition(symbol: string): Promise<any | null> {
  try {
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.getPositionInfo({ 
      category: 'linear',
      symbol: symbol
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    const position = response.result.list.find((pos: any) => parseFloat(pos.size) > 0);
    return position || null;
  } catch (error) {
    console.error('Error fetching Bybit position:', error);
    return null;
  }
}

// Order functions
export async function submitBybitOrder(orderData: {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  orderLinkId?: string;
}): Promise<any> {
  try {
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    console.log('📤 Submitting Bybit order with data:', {
      category: 'linear',
      symbol: orderData.symbol,
      side: orderData.side,
      orderType: orderData.orderType,
      qty: orderData.qty,
      price: orderData.price,
      timeInForce: orderData.timeInForce || 'GTC',
      reduceOnly: orderData.reduceOnly,
      closeOnTrigger: orderData.closeOnTrigger,
      orderLinkId: orderData.orderLinkId
    });
    
    const response = await client.submitOrder({
      category: 'linear',
      symbol: orderData.symbol,
      side: orderData.side,
      orderType: orderData.orderType,
      qty: orderData.qty,
      price: orderData.price,
      timeInForce: orderData.timeInForce || 'GTC',
      reduceOnly: orderData.reduceOnly,
      closeOnTrigger: orderData.closeOnTrigger,
      orderLinkId: orderData.orderLinkId
    });
    
    console.log('📥 Bybit API response:', {
      retCode: response.retCode,
      retMsg: response.retMsg,
      result: response.result
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    return response.result;
  } catch (error) {
    console.error('Error submitting Bybit order:', error);
    throw error;
  }
}

export async function cancelBybitOrder(orderId: string, symbol: string): Promise<void> {
  try {
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.cancelOrder({
      category: 'linear',
      symbol: symbol,
      orderId: orderId
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
  } catch (error) {
    console.error('Error canceling Bybit order:', error);
    throw error;
  }
}

export async function getBybitOrder(orderId: string, symbol: string): Promise<any> {
  try {
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.getHistoricOrders({
      category: 'linear',
      symbol: symbol,
      orderId: orderId
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    return response.result.list[0];
  } catch (error) {
    console.error('Error fetching Bybit order:', error);
    throw error;
  }
}

// Copy Trading functions - Note: These functions are placeholders
// The actual Bybit copy trading API methods may have different names
// You'll need to implement these based on Bybit's official copy trading API

export interface CopyTradingInfo {
  copyTradingId: string;
  copyTradingName: string;
  leaderId: string;
  leaderName: string;
  status: 'active' | 'inactive';
  copyAmount: string;
  copyRatio: string;
  createdAt: string;
}

// TODO: Implement actual copy trading functions based on Bybit's API
// These are placeholder functions that need to be implemented
export async function getCopyTradingInfo(): Promise<CopyTradingInfo[]> {
  console.warn('Copy trading functions not yet implemented');
  return [];
}

export async function createCopyTrading(copyData: {
  leaderId: string;
  copyAmount: string;
  copyRatio: string;
}): Promise<any> {
  console.warn('Copy trading functions not yet implemented');
  return null;
}

// Utility functions
export function calculatePnLPercentage(entryPrice: number, currentPrice: number, side: 'Buy' | 'Sell'): number {
  if (side === 'Buy') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

export function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(parseFloat(amount));
}

export function formatPercentage(value: string): string {
  return `${parseFloat(value).toFixed(2)}%`;
}

// Convert symbol format between TradingView and Bybit
export function convertSymbolFormat(symbol: string, toBybit: boolean = true): string {
  if (toBybit) {
    // Convert TradingView format to Bybit format
    // Example: BTCUSD -> BTCUSDT
    if (symbol.endsWith('USD') && !symbol.endsWith('USDT')) {
      return symbol + 'T';
    }
    return symbol;
  } else {
    // Convert Bybit format to TradingView format
    // Example: BTCUSDT -> BTCUSD
    if (symbol.endsWith('USDT')) {
      return symbol.slice(0, -1);
    }
    return symbol;
  }
}

// Get symbol information including minimum quantity requirements
export async function getBybitSymbolInfo(symbol: string): Promise<any> {
  try {
    console.log(`🔍 Getting symbol info for ${symbol}...`);
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.getInstrumentsInfo({
      category: 'linear',
      symbol: symbol
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    if (!response.result.list || response.result.list.length === 0) {
      throw new Error(`No symbol info found for: ${symbol}`);
    }
    
    const symbolInfo = response.result.list[0];
    console.log(`📊 Symbol info for ${symbol}:`, {
      minOrderQty: symbolInfo.lotSizeFilter?.minOrderQty,
      qtyStep: symbolInfo.lotSizeFilter?.qtyStep,
      priceScale: symbolInfo.priceFilter?.tickSize
    });
    
    return symbolInfo;
  } catch (error) {
    console.error(`❌ Error fetching symbol info for ${symbol}:`, error);
    throw error;
  }
}

// Set leverage for a symbol
export async function setBybitLeverage(symbol: string, leverage: number): Promise<void> {
  try {
    console.log(`🔧 Setting leverage for ${symbol} to ${leverage}x...`);
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    const response = await client.setLeverage({
      category: 'linear',
      symbol: symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString()
    });
    
    console.log('📊 Set leverage response:', {
      retCode: response.retCode,
      retMsg: response.retMsg
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
  } catch (error) {
    console.error(`❌ Error setting leverage for ${symbol}:`, error);
    throw error;
  }
}

// Get current ticker price from Bybit
export async function getBybitTickerPrice(symbol: string): Promise<number> {
  try {
    console.log(`🔍 Calling getBybitTickerPrice(${symbol})...`);
    const client = getBybitClient();
    if (!client) throw new Error('Bybit client not initialized');
    
    console.log(`📊 Making getTickers API call for ${symbol}...`);
    const response = await client.getTickers({ 
      category: 'linear',
      symbol: symbol
    });
    console.log(`📊 getTickers response for ${symbol}:`, {
      retCode: response.retCode,
      retMsg: response.retMsg,
      hasResult: !!response.result,
      hasList: !!(response.result && response.result.list),
      listLength: response.result?.list?.length || 0
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.retMsg}`);
    }
    
    if (!response.result.list || response.result.list.length === 0) {
      throw new Error(`No ticker data found for symbol: ${symbol}`);
    }
    
    const ticker = response.result.list[0];
    const price = parseFloat(ticker.lastPrice);
    
    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price data for symbol: ${symbol}`);
    }
    
    console.log(`📊 Fetched ticker price for ${symbol}: $${price}`);
    return price;
  } catch (error) {
    console.error(`❌ Error fetching ticker price for ${symbol}:`, error);
    throw error;
  }
} 