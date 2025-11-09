/**
 * Tradovate API Client
 * Handles OAuth authentication and API calls to Tradovate
 */

interface TradovateTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TradovateTrade {
  id: number;
  accountId: number;
  accountSpec: string;
  accountName: string;
  orderId: number;
  contractId: number;
  contract: {
    id: number;
    name: string;
    symbol: string;
  };
  orderType: string;
  orderStatus: string;
  fillQuantity: number;
  fillPrice: number;
  orderQuantity: number;
  orderPrice: number;
  fillType: string;
  fillTime: string;
  orderTime: string;
  side: 'Buy' | 'Sell';
  positionQuantity: number;
  realizedPnL: number;
  commission: number;
  clearingFee: number;
  exchangeFee: number;
  nfaFee: number;
  brokerFee: number;
  executionFee: number;
  totalFee: number;
}

interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: string;
  active: boolean;
}

export class TradovateClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private baseUrl: string;

  // Expose tokenExpiresAt for external access
  get tokenExpiry(): Date | null {
    return this.tokenExpiresAt;
  }

  constructor(
    accessToken?: string,
    refreshToken?: string,
    tokenExpiresAt?: Date
  ) {
    this.accessToken = accessToken || null;
    this.refreshToken = refreshToken || null;
    this.tokenExpiresAt = tokenExpiresAt || null;
    
    // Use production API by default, can be changed to sandbox
    this.baseUrl = process.env.TRADOVATE_API_URL || 'https://api.tradovate.com/v1';
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID;
    if (!clientId) {
      throw new Error('NEXT_PUBLIC_TRADOVATE_CLIENT_ID not configured. Please set this environment variable. See BROKER_SETUP.md for instructions.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read, trade',
      ...(state && { state }),
    });

    return `https://api.tradovate.com/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<TradovateTokens> {
    const clientId = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID;
    const clientSecret = process.env.TRADOVATE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Tradovate OAuth credentials not configured');
    }

    const response = await fetch('https://api.tradovate.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<TradovateTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID;
    const clientSecret = process.env.TRADOVATE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Tradovate OAuth credentials not configured');
    }

    const response = await fetch('https://api.tradovate.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    return tokens;
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Refresh if token expires in less than 5 minutes
    if (
      this.tokenExpiresAt &&
      this.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000
    ) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureValidToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tradovate API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Get user's Tradovate accounts
   */
  async getAccounts(): Promise<TradovateAccount[]> {
    return this.apiRequest<TradovateAccount[]>('/account/list');
  }

  /**
   * Get account info
   */
  async getAccount(accountId: number): Promise<TradovateAccount> {
    return this.apiRequest<TradovateAccount>(`/account/item/${accountId}`);
  }

  /**
   * Get fills (executed trades) for an account
   */
  async getFills(
    accountId: number,
    startTime?: Date,
    endTime?: Date
  ): Promise<TradovateTrade[]> {
    const params = new URLSearchParams({
      accountId: accountId.toString(),
    });

    if (startTime) {
      params.append('startTime', startTime.toISOString());
    }
    if (endTime) {
      params.append('endTime', endTime.toISOString());
    }

    return this.apiRequest<TradovateTrade[]>(`/fill/list?${params.toString()}`);
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    return this.apiRequest('/user/session');
  }
}

