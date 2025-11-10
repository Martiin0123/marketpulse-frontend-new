/**
 * SignalR client for ProjectX real-time order updates
 * Connects to the ProjectX Gateway API real-time hub to receive instant order updates
 */

// Dynamic import for SignalR - will be loaded when needed
let signalR: any = null;
let signalRLoadPromise: Promise<any> | null = null;

// Load SignalR dynamically (for Next.js client-side)
async function loadSignalR(): Promise<any> {
  if (signalR) {
    return signalR;
  }

  if (signalRLoadPromise) {
    return signalRLoadPromise;
  }

  signalRLoadPromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('SignalR can only be loaded on the client side');
    }

    try {
      console.log('📦 Loading SignalR library...');
      // Use dynamic import for Next.js
      const signalRModule = await import('@microsoft/signalr');
      signalR = signalRModule;
      console.log('✅ SignalR library loaded successfully');
      return signalR;
    } catch (error) {
      console.error('❌ Failed to load SignalR:', error);
      signalRLoadPromise = null;
      throw error;
    }
  })();

  return signalRLoadPromise;
}

export interface ProjectXOrderUpdate {
  id: number;
  accountId: number;
  contractId: string;
  symbolId?: string;
  creationTimestamp: string;
  updateTimestamp: string;
  status: number; // OrderStatus enum: 0=None, 1=Open, 2=Filled, 3=Cancelled, 4=Expired, 5=Rejected, 6=Pending
  type: number; // OrderType enum: 0=Unknown, 1=Limit, 2=Market, 3=StopLimit, 4=Stop, 5=TrailingStop, 6=JoinBid, 7=JoinAsk
  side: number; // OrderSide enum: 0=Bid (BUY), 1=Ask (SELL)
  size: number;
  limitPrice?: number;
  stopPrice?: number;
  fillVolume?: number;
  filledPrice?: number;
  customTag?: string;
}

export interface ProjectXPositionUpdate {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  type: number; // PositionType enum: 0=Undefined, 1=Long, 2=Short
  size: number;
  averagePrice: number;
}

export interface ProjectXTradeUpdate {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  price: number;
  profitAndLoss?: number;
  fees?: number;
  side: number; // OrderSide enum: 0=Bid (BUY), 1=Ask (SELL)
  size: number;
  voided: boolean;
  orderId?: number;
}

export type OrderUpdateCallback = (order: ProjectXOrderUpdate) => void;
export type PositionUpdateCallback = (position: ProjectXPositionUpdate) => void;
export type TradeUpdateCallback = (trade: ProjectXTradeUpdate) => void;

export class ProjectXSignalRClient {
  private connection: signalR.HubConnection | null = null;
  private userHubUrl: string;
  private jwtToken: string;
  private accountId: number;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // Callbacks
  private onOrderUpdateCallbacks: OrderUpdateCallback[] = [];
  private onPositionUpdateCallbacks: PositionUpdateCallback[] = [];
  private onTradeUpdateCallbacks: TradeUpdateCallback[] = [];

  constructor(
    jwtToken: string,
    accountId: number,
    hubUrl: string = 'https://rtc.alphaticks.projectx.com/hubs/user'
  ) {
    this.jwtToken = jwtToken;
    this.accountId = accountId;
    // Build URL with access token - SignalR expects it in the query string OR via accessTokenFactory
    // We'll use accessTokenFactory, so we don't need it in the URL
    this.userHubUrl = hubUrl;
    console.log('🔧 SignalR client initialized:', {
      accountId: accountId,
      accountIdType: typeof accountId,
      hubUrl: hubUrl,
      hasToken: !!jwtToken,
      tokenLength: jwtToken?.length
    });
  }

  /**
   * Add callback for order updates
   */
  onOrderUpdate(callback: OrderUpdateCallback): void {
    this.onOrderUpdateCallbacks.push(callback);
  }

  /**
   * Add callback for position updates
   */
  onPositionUpdate(callback: PositionUpdateCallback): void {
    this.onPositionUpdateCallbacks.push(callback);
  }

  /**
   * Add callback for trade updates
   */
  onTradeUpdate(callback: TradeUpdateCallback): void {
    this.onTradeUpdateCallbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: OrderUpdateCallback | PositionUpdateCallback | TradeUpdateCallback): void {
    this.onOrderUpdateCallbacks = this.onOrderUpdateCallbacks.filter(cb => cb !== callback);
    this.onPositionUpdateCallbacks = this.onPositionUpdateCallbacks.filter(cb => cb !== callback);
    this.onTradeUpdateCallbacks = this.onTradeUpdateCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): { connected: boolean; state?: string } {
    if (!this.connection) {
      return { connected: false, state: 'Disconnected' };
    }
    
    const state = this.connection.state;
    const connected = state === signalR?.HubConnectionState?.Connected && this.isConnected;
    
    return {
      connected,
      state: state === signalR?.HubConnectionState?.Connected ? 'Connected' :
             state === signalR?.HubConnectionState?.Connecting ? 'Connecting' :
             state === signalR?.HubConnectionState?.Reconnecting ? 'Reconnecting' :
             state === signalR?.HubConnectionState?.Disconnected ? 'Disconnected' :
             'Unknown'
    };
  }

  /**
   * Connect to the SignalR hub
   */
  async connect(): Promise<void> {
    // Load SignalR if not already loaded
    if (!signalR) {
      await loadSignalR();
    }

    if (this.connection && this.isConnected) {
      return;
    }

    let connectionUrl: string;
    try {
      // According to the docs example, we should include access_token in the URL
      // Format: https://rtc.alphaticks.projectx.com/hubs/user?access_token=YOUR_JWT_TOKEN
      connectionUrl = `${this.userHubUrl}?access_token=${encodeURIComponent(this.jwtToken)}`;
      
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(connectionUrl, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
          // Token is already in URL, don't duplicate via accessTokenFactory
          timeout: 10000
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            return delay;
          }
        })
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start connection
      await this.connection.start();
      
      // Verify connection is actually connected
      if (this.connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error(`Connection not in Connected state after start. State: ${this.connection.state}`);
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Wait a bit before subscribing to ensure connection is stable
      await new Promise(resolve => setTimeout(resolve, 200));

      // Double-check connection is still connected before subscribing
      if (this.connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error(`Connection disconnected before subscription. State: ${this.connection.state}`);
      }

      // Subscribe to updates
      await this.subscribe();
    } catch (error: any) {
      console.error('❌ Error connecting to SignalR:', error);
      console.error('  Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        url: connectionUrl,
        accountId: this.accountId
      });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Set up event handlers for SignalR events
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Handle order updates
    // Note: SignalR sends events with structure: { action: number, data: ProjectXOrderUpdate }
    this.connection.on('GatewayUserOrder', (event: any) => {
      // Extract the actual order data from the nested structure
      const orderData = event.data || event;
      
      
      this.onOrderUpdateCallbacks.forEach(callback => {
        try {
          callback(orderData as ProjectXOrderUpdate);
        } catch (error) {
          console.error('❌ Error in order update callback:', error);
        }
      });
    });

    // Handle position updates
    // Note: SignalR sends events with structure: { action: number, data: ProjectXPositionUpdate }
    this.connection.on('GatewayUserPosition', (event: any) => {
      const positionData = event.data || event;
      this.onPositionUpdateCallbacks.forEach(callback => {
        try {
          callback(positionData as ProjectXPositionUpdate);
        } catch (error) {
          console.error('❌ Error in position update callback:', error);
        }
      });
    });

    // Handle trade updates
    // Note: SignalR sends events with structure: { action: number, data: ProjectXTradeUpdate }
    this.connection.on('GatewayUserTrade', (event: any) => {
      const tradeData = event.data || event;
      this.onTradeUpdateCallbacks.forEach(callback => {
        try {
          callback(tradeData as ProjectXTradeUpdate);
        } catch (error) {
          console.error('❌ Error in trade update callback:', error);
        }
      });
    });

    // Handle connection close
    this.connection.onclose((error) => {
      console.warn('⚠️ [SignalR] Connection closed', error);
      this.isConnected = false;
      // Try to reconnect if it wasn't intentional
      if (error) {
        console.log('🔄 [SignalR] Connection closed with error, will attempt reconnect...');
      }
    });

    // Handle reconnection
    this.connection.onreconnected((connectionId) => {
      console.log(`🔄 [SignalR] Reconnected (connection ID: ${connectionId})`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Re-subscribe after reconnection
      this.subscribe().catch((err) => {
        console.error('❌ Error re-subscribing after reconnect:', err);
      });
    });

    // Handle reconnecting
    this.connection.onreconnecting((error) => {
      console.log('🔄 [SignalR] Reconnecting...', error);
      this.isConnected = false;
    });
  }

  /**
   * Subscribe to account, orders, positions, and trades
   */
  private async subscribe(): Promise<void> {
    if (!this.connection) {
      console.warn('⚠️ Cannot subscribe: no connection');
      return;
    }

    // Check connection state
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn(`⚠️ Cannot subscribe: connection not connected. State: ${this.connection.state}`);
      this.isConnected = false;
      return;
    }

    try {
      console.log(`📡 Subscribing to updates for account ${this.accountId} (type: ${typeof this.accountId})...`);
      
      // Ensure accountId is a number (SignalR expects integer)
      const accountIdNum = typeof this.accountId === 'number' ? this.accountId : parseInt(this.accountId.toString());
      
      if (isNaN(accountIdNum)) {
        throw new Error(`Invalid account ID: ${this.accountId} (must be a number)`);
      }

      console.log(`📡 Using account ID: ${accountIdNum} for subscriptions`);
      
      // Subscribe to accounts (general account updates)
      const accountsResult = await this.connection.invoke('SubscribeAccounts');
      console.log('  ✅ Subscribed to accounts', accountsResult);

      // Subscribe to orders for this account
      const ordersResult = await this.connection.invoke('SubscribeOrders', accountIdNum);
      console.log(`  ✅ Subscribed to orders for account ${accountIdNum}`, ordersResult);

      // Subscribe to positions for this account
      const positionsResult = await this.connection.invoke('SubscribePositions', accountIdNum);
      console.log(`  ✅ Subscribed to positions for account ${accountIdNum}`, positionsResult);

      // Subscribe to trades for this account
      const tradesResult = await this.connection.invoke('SubscribeTrades', accountIdNum);
      console.log(`  ✅ Subscribed to trades for account ${accountIdNum}`, tradesResult);
    } catch (error: any) {
      console.error('❌ Error subscribing to updates:', error);
      console.error('  Error details:', {
        message: error.message,
        stack: error.stack,
        connectionState: this.connection?.state,
        accountId: this.accountId,
        accountIdType: typeof this.accountId
      });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Unsubscribe from updates
   */
  async unsubscribe(): Promise<void> {
    if (!this.connection || !this.isConnected) {
      return;
    }

    try {
      await this.connection.invoke('UnsubscribeAccounts');
      await this.connection.invoke('UnsubscribeOrders', this.accountId);
      await this.connection.invoke('UnsubscribePositions', this.accountId);
      await this.connection.invoke('UnsubscribeTrades', this.accountId);
    } catch (error: any) {
      console.error('❌ Error unsubscribing:', error);
    }
  }

  /**
   * Disconnect from the SignalR hub
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await this.unsubscribe();
      await this.connection.stop();
      this.isConnected = false;
      console.log('✅ SignalR disconnected');
    } catch (error: any) {
      console.error('❌ Error disconnecting from SignalR:', error);
    } finally {
      this.connection = null;
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    if (!signalR || !this.connection) return false;
    return this.isConnected && this.connection.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Get connection state
   */
  get state(): any {
    if (!signalR || !this.connection) return null;
    return this.connection.state ?? null;
  }
}

