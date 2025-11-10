/**
 * SignalR client for ProjectX real-time order updates
 * Connects to the ProjectX Gateway API real-time hub to receive instant order updates
 */

// @ts-ignore - SignalR types may not be available
import * as signalR from '@microsoft/signalr';

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
    this.userHubUrl = `${hubUrl}?access_token=${jwtToken}`;
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
   * Connect to the SignalR hub
   */
  async connect(): Promise<void> {
    if (this.connection && this.isConnected) {
      console.log('✅ SignalR already connected');
      return;
    }

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.userHubUrl, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
          accessTokenFactory: () => this.jwtToken,
          timeout: 10000
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            console.log(`🔄 SignalR reconnecting in ${delay}ms (attempt ${retryContext.previousRetryCount + 1})`);
            return delay;
          }
        })
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start connection
      console.log('🔌 Connecting to ProjectX SignalR hub...');
      await this.connection.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ SignalR connected successfully');

      // Subscribe to updates
      await this.subscribe();

      // Handle reconnection
      this.connection.onreconnected((connectionId) => {
        console.log(`🔄 SignalR reconnected (connection ID: ${connectionId})`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribe(); // Re-subscribe after reconnection
      });

      this.connection.onclose((error) => {
        console.warn('⚠️ SignalR connection closed', error);
        this.isConnected = false;
      });
    } catch (error: any) {
      console.error('❌ Error connecting to SignalR:', error);
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
    this.connection.on('GatewayUserOrder', (data: ProjectXOrderUpdate) => {
      console.log('📥 Received order update:', data);
      this.onOrderUpdateCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in order update callback:', error);
        }
      });
    });

    // Handle position updates
    this.connection.on('GatewayUserPosition', (data: ProjectXPositionUpdate) => {
      console.log('📥 Received position update:', data);
      this.onPositionUpdateCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in position update callback:', error);
        }
      });
    });

    // Handle trade updates
    this.connection.on('GatewayUserTrade', (data: ProjectXTradeUpdate) => {
      console.log('📥 Received trade update:', data);
      this.onTradeUpdateCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in trade update callback:', error);
        }
      });
    });
  }

  /**
   * Subscribe to account, orders, positions, and trades
   */
  private async subscribe(): Promise<void> {
    if (!this.connection || !this.isConnected) {
      console.warn('⚠️ Cannot subscribe: not connected');
      return;
    }

    try {
      console.log(`📡 Subscribing to updates for account ${this.accountId}...`);
      
      // Subscribe to accounts (general account updates)
      await this.connection.invoke('SubscribeAccounts');
      console.log('  ✅ Subscribed to accounts');

      // Subscribe to orders for this account
      await this.connection.invoke('SubscribeOrders', this.accountId);
      console.log(`  ✅ Subscribed to orders for account ${this.accountId}`);

      // Subscribe to positions for this account
      await this.connection.invoke('SubscribePositions', this.accountId);
      console.log(`  ✅ Subscribed to positions for account ${this.accountId}`);

      // Subscribe to trades for this account
      await this.connection.invoke('SubscribeTrades', this.accountId);
      console.log(`  ✅ Subscribed to trades for account ${this.accountId}`);
    } catch (error: any) {
      console.error('❌ Error subscribing to updates:', error);
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
      console.log(`📡 Unsubscribing from updates for account ${this.accountId}...`);
      
      await this.connection.invoke('UnsubscribeAccounts');
      await this.connection.invoke('UnsubscribeOrders', this.accountId);
      await this.connection.invoke('UnsubscribePositions', this.accountId);
      await this.connection.invoke('UnsubscribeTrades', this.accountId);
      
      console.log('  ✅ Unsubscribed from all updates');
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
    return this.isConnected && this.connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Get connection state
   */
  get state(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}

