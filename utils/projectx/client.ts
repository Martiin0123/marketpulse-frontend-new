/**
 * Project X API Client
 * Handles API key authentication and API calls to Project X
 */

interface ProjectXTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface ProjectXTrade {
  id: string;
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedPrice: number;
  executedQuantity: number;
  timestamp: string;
  pnl: number;
  commission: number;
  status: string;
}

interface ProjectXAccount {
  id: string;
  name: string;
  userId?: string;
  accountType?: string;
  balance: number;
  currency: string;
  canTrade?: boolean;
  isVisible?: boolean;
}

export class ProjectXClient {
  private apiKey: string | null = null;
  private apiUsername: string | null = null; // Project X uses username + API key (no secret)
  private apiSecret: string | null = null; // Kept for backward compatibility
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private sessionToken: string | null = null; // JWT session token from loginKey endpoint
  private baseUrl: string;
  private authMethod: 'oauth' | 'api_key' = 'api_key';
  private serviceType: 'topstepx' | 'alphaticks' | null = null;

  constructor(
    apiKey?: string,
    apiUsername?: string,
    apiSecret?: string, // Optional, for backward compatibility
    accessToken?: string,
    refreshToken?: string,
    tokenExpiresAt?: Date,
    serviceType?: 'topstepx' | 'alphaticks'
  ) {
    // Support both API key (username + key) and OAuth
    if (apiKey && apiUsername) {
      // Project X: username + API key (no secret needed)
      this.apiKey = apiKey;
      this.apiUsername = apiUsername;
      this.authMethod = 'api_key';
      this.serviceType = serviceType || 'topstepx';
    } else if (apiKey && apiSecret) {
      // Backward compatibility: API key + secret
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
      this.authMethod = 'api_key';
      this.serviceType = serviceType || 'topstepx';
    } else if (accessToken) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken || null;
      this.tokenExpiresAt = tokenExpiresAt || null;
      this.authMethod = 'oauth';
      this.serviceType = serviceType || 'topstepx';
    }
    
    // Set API URL based on service type
    // TopStepX API: https://api.topstepx.com (confirmed from docs)
    // Authentication endpoint: POST /api/Auth/loginKey
    if (this.serviceType === 'topstepx') {
      // TopStepX API base URL (confirmed: https://api.topstepx.com)
      this.baseUrl = process.env.PROJECTX_API_URL || 
                     process.env.PROJECTX_TOPSTEPX_API_URL || 
                     'https://api.topstepx.com';
    } else if (this.serviceType === 'alphaticks') {
      // AlphaTicks - uses same API infrastructure as TopStepX
      // Users can override with custom URL if needed
      this.baseUrl = process.env.PROJECTX_ALPHATICKS_API_URL || 
                     process.env.PROJECTX_API_URL || 
                     'https://api.topstepx.com';
    } else {
      // Fallback
      this.baseUrl = process.env.PROJECTX_API_URL || 'https://api.topstepx.com';
    }
  }

  /**
   * Set custom base URL (for testing or custom endpoints)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.NEXT_PUBLIC_PROJECTX_CLIENT_ID;
    if (!clientId) {
      throw new Error('NEXT_PUBLIC_PROJECTX_CLIENT_ID not configured. Please set this environment variable. See BROKER_SETUP.md for instructions.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read trades',
      ...(state && { state }),
    });

    // Use baseUrl for OAuth (should be set based on service type)
    const oauthBase = this.baseUrl || 'https://api.topstepx.com';
    return `${oauthBase}/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    baseUrl?: string
  ): Promise<ProjectXTokens> {
    const clientId = process.env.NEXT_PUBLIC_PROJECTX_CLIENT_ID;
    const clientSecret = process.env.PROJECTX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Project X OAuth credentials not configured');
    }

    // Use provided baseUrl or default to TopStepX
    const oauthBase = baseUrl || process.env.PROJECTX_API_URL || 'https://api.topstepx.com';
    const response = await fetch(`${oauthBase}/v1/oauth/token`, {
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
  async refreshAccessToken(): Promise<ProjectXTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.NEXT_PUBLIC_PROJECTX_CLIENT_ID;
    const clientSecret = process.env.PROJECTX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Project X OAuth credentials not configured');
    }

    const oauthBase = this.baseUrl || 'https://api.topstepx.com';
    const response = await fetch(`${oauthBase}/v1/oauth/token`, {
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
   * Authenticate with API key to get session token
   * TopStepX requires: POST /api/Auth/loginKey with userName and apiKey
   */
  private async authenticateWithApiKey(): Promise<void> {
    if (!this.apiKey || !this.apiUsername) {
      throw new Error('API key and username are required');
    }

    // If we already have a valid session token, skip
    if (this.sessionToken) {
      return;
    }

    try {
      const loginUrl = `${this.baseUrl}/api/Auth/loginKey`;
      console.log('🔐 Authenticating with TopStepX API...', { loginUrl, userName: this.apiUsername });
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: this.apiUsername,
          apiKey: this.apiKey
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Check if success (errorCode 0)
      if (data.errorCode !== 0 || !data.success || !data.token) {
        throw new Error(data.errorMessage || 'Authentication failed');
      }

      // Store session token
      this.sessionToken = data.token;
      console.log('✅ Successfully authenticated with TopStepX API');
    } catch (error: any) {
      console.error('❌ Authentication error:', error);
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  /**
   * Ensure we have valid authentication
   */
  private async ensureValidAuth(): Promise<void> {
    if (this.authMethod === 'api_key' && this.apiKey && this.apiUsername) {
      // Authenticate with API key to get session token
      await this.authenticateWithApiKey();
    } else if (this.authMethod === 'oauth') {
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
    } else {
      throw new Error('No valid authentication method available');
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureValidAuth();

    // Build URL
    let url = `${this.baseUrl}${endpoint}`;
    
    // Headers
    const headers: HeadersInit = {
      'accept': 'application/json',
      ...options.headers,
    };
    
    // Only add Content-Type for POST/PUT requests
    if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Use session token (from API key auth) or OAuth token
    if (this.sessionToken) {
      // TopStepX uses JWT session token from loginKey endpoint
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    } else if (this.accessToken) {
      // OAuth token
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Log the request for debugging
    console.log('🔍 ProjectX API Request:', {
      method: options.method || 'GET',
      url,
      baseUrl: this.baseUrl,
      endpoint,
      serviceType: this.serviceType,
      authMethod: this.authMethod,
      hasUsername: !!this.apiUsername,
      hasApiKey: !!this.apiKey,
      headers: Object.keys(headers)
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Project X API error: ${response.status} ${errorText || 'Unknown error'}`;
      
      // Log detailed error info
      const responseHeaders = Object.fromEntries(response.headers.entries());
      console.error(`❌ API Request failed:`, {
        method: options.method || 'GET',
        url,
        baseUrl: this.baseUrl,
        endpoint,
        status: response.status,
        statusText: response.statusText,
        responseHeaders,
        requestHeaders: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, k.includes('Key') || k.includes('Username') ? '***' : v])),
        error: errorText,
        // Check for helpful headers that might indicate correct endpoint
        allowHeader: responseHeaders['allow'] || responseHeaders['Allow'],
        locationHeader: responseHeaders['location'] || responseHeaders['Location']
      });
      
      // If 404, check if server gives hints about correct endpoint
      if (response.status === 404) {
        // 404 means server exists, just wrong endpoint - this is progress!
        console.log('✅ Server is responding (404 = wrong endpoint, not wrong server)');
        console.log('💡 This means the base URL is likely correct, just need the right endpoint path');
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get user's Project X accounts
   * TopStepX API: POST /api/Account/search with { "onlyActiveAccounts": true }
   * Reference: https://gateway.docs.projectx.com/docs/getting-started/placing-your-first-order
   */
  async getAccounts(): Promise<ProjectXAccount[]> {
    // Ensure we're authenticated (will get session token if needed)
    await this.ensureValidAuth();
    
    // According to ProjectX Gateway API docs:
    // POST /api/Account/search with body { "onlyActiveAccounts": true }
    const endpoint = '/api/Account/search';
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        'accept': 'text/plain',
        'Content-Type': 'application/json',
      };
      
      // Add session token
      if (this.sessionToken) {
        headers['Authorization'] = `Bearer ${this.sessionToken}`;
      } else if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      
      console.log('🔍 Fetching accounts from ProjectX Gateway API...', { url });
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          onlyActiveAccounts: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Check response format: { accounts: [...], success: true, errorCode: 0, errorMessage: null }
      if (data.errorCode !== 0 || !data.success) {
        throw new Error(data.errorMessage || 'Failed to fetch accounts');
      }
      
      if (!data.accounts || !Array.isArray(data.accounts)) {
        throw new Error('Invalid response format: accounts array not found');
      }
      
      // Map ProjectX account format to our format
      const accounts: ProjectXAccount[] = data.accounts.map((acc: any) => ({
        id: acc.id?.toString() || acc.name || '',
        name: acc.name || `Account ${acc.id}`,
        balance: acc.balance || 0,
        currency: acc.currency || 'USD',
        canTrade: acc.canTrade || false,
        isVisible: acc.isVisible !== false
      }));
      
      console.log(`✅ Successfully fetched ${accounts.length} accounts`);
      return accounts;
      
    } catch (error: any) {
      console.error('❌ Error fetching accounts:', error);
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
  }

  /**
   * Get account info
   */
  async getAccount(accountId: string): Promise<ProjectXAccount> {
    // Try different endpoint paths
    const endpoints = [
      `/api/accounts/${accountId}`,  // Most likely
      `/accounts/${accountId}`,
      `/api/v1/accounts/${accountId}`
    ];

    for (const endpoint of endpoints) {
      try {
        return await this.apiRequest<ProjectXAccount>(endpoint);
      } catch (error: any) {
        if (!error.message?.includes('404')) {
          throw error;
        }
        console.warn(`Endpoint ${endpoint} returned 404, trying next...`);
      }
    }

    throw new Error(`Failed to fetch account. Tried endpoints: ${endpoints.join(', ')}`);
  }

  /**
   * Get trades (executions) for an account
   * ProjectX Gateway API: POST /api/Execution/search or similar
   * Need to check API docs for exact endpoint
   */
  async getTrades(
    accountId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<ProjectXTrade[]> {
    // Ensure we're authenticated
    await this.ensureValidAuth();
    
    // Try different endpoint patterns based on Gateway API structure
    // Common patterns: /api/Execution/search, /api/Trade/search, /api/Order/executions
    const endpoints = [
      '/api/Execution/search',  // Most likely for executions/trades
      '/api/Trade/search',
      '/api/Order/executions',
      '/api/execution/search',
      '/api/trade/search',
      '/api/trades',
      '/api/executions'
    ];

    // Build request body (Gateway API uses POST with body)
    const requestBody: any = {
      accountId: parseInt(accountId) || accountId, // Account ID might be numeric
    };
    
    if (startTime && startTime.getTime() > 0) { // Only add if not epoch (1970)
      requestBody.startTime = startTime.toISOString();
    }
    if (endTime) {
      // Add 1 day buffer to ensure we get all trades including today
      const endTimeWithBuffer = new Date(endTime);
      endTimeWithBuffer.setDate(endTimeWithBuffer.getDate() + 1);
      requestBody.endTime = endTimeWithBuffer.toISOString();
    }

    // Log the request details
    console.log(`🔍 Fetching trades from ProjectX API:`, {
      accountId,
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      baseUrl: this.baseUrl,
      endpoints: endpoints
    });

    for (const endpoint of endpoints) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🔍 Trying endpoint: ${url}`);
        const headers: HeadersInit = {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
        };
        
        // Add session token
        if (this.sessionToken) {
          headers['Authorization'] = `Bearer ${this.sessionToken}`;
        } else if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        console.log('🔍 Fetching trades from ProjectX Gateway API...', { 
          url, 
          accountId, 
          startTime: startTime?.toISOString(), 
          endTime: endTime?.toISOString() 
        });
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Try next endpoint
            console.warn(`Endpoint ${endpoint} returned 404, trying next...`);
            continue;
          }
          const errorText = await response.text();
          throw new Error(`Failed to fetch trades: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        // Check response format (might be { executions: [...], success: true } or { trades: [...], success: true })
        if (data.errorCode !== undefined && data.errorCode !== 0) {
          throw new Error(data.errorMessage || 'Failed to fetch trades');
        }
        
        // Handle different response formats
        let trades: any[] = [];
        if (Array.isArray(data)) {
          trades = data;
        } else if (data.executions && Array.isArray(data.executions)) {
          trades = data.executions;
        } else if (data.trades && Array.isArray(data.trades)) {
          trades = data.trades;
        } else if (data.data && Array.isArray(data.data)) {
          trades = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          trades = data.results;
        } else {
          console.error(`❌ Unexpected response format. Keys:`, Object.keys(data));
          throw new Error('Invalid response format: trades array not found');
        }
        
        if (trades.length === 0) {
          continue;
        }
        
        console.log(`✅ Fetched ${trades.length} items from ${endpoint}`);
        
        // Log EXACT raw API response for first 10 items
        console.log(`\n📋 ========== EXACT RAW API DATA (First 10 items) ==========`);
        trades.slice(0, 10).forEach((trade: any, idx: number) => {
          console.log(`\n--- Item ${idx + 1} (ALL FIELDS) ---`);
          console.log(JSON.stringify(trade, null, 2));
          console.log(`Keys: ${Object.keys(trade).join(', ')}`);
        });
        console.log(`\n📋 ========== END RAW API DATA ==========\n`);
        
        // Map to our format
        return trades.map((trade: any, index: number) => {
          // Parse timestamp - handle various formats from ProjectX API
          // ProjectX Gateway API uses: ExitedAt (exit timestamp) for completed trades
          // Or EnteredAt for entry timestamp, or creationTimestamp for executions
          let timestamp: string;
          const rawTimestamp = 
            trade.ExitedAt || // ProjectX Gateway API field for completed trades (first priority)
            trade.exitedAt || 
            trade.EnteredAt || // Entry timestamp as fallback
            trade.enteredAt ||
            trade.creationTimestamp || // For executions
            trade.tradeDay || trade.createdAt || 
            trade.timestamp || trade.time || trade.executionTime || trade.date || 
            trade.executionDate || trade.fillTime || trade.orderTime || trade.created_at ||
            trade.fillDate || trade.orderDate;
          
          if (rawTimestamp) {
            try {
              let date: Date;
              
              // Check if it's a Unix timestamp (number or string of numbers)
              if (typeof rawTimestamp === 'number' || (typeof rawTimestamp === 'string' && /^\d+$/.test(rawTimestamp))) {
                // Unix timestamp in milliseconds or seconds
                const num = typeof rawTimestamp === 'number' ? rawTimestamp : parseInt(rawTimestamp);
                // If it's less than 13 digits, it's probably in seconds, convert to milliseconds
                date = new Date(num < 10000000000 ? num * 1000 : num);
              } else {
                // Try parsing as ISO string or other date format
                date = new Date(rawTimestamp);
              }
              
              // Validate date - must be valid and reasonable (not epoch, not future)
              if (!isNaN(date.getTime()) && date.getTime() > 0 && date.getTime() < Date.now() + 86400000) {
                timestamp = date.toISOString();
                if (index === 0) {
                  console.log(`✅ Parsed timestamp from field: ${rawTimestamp} -> ${timestamp}`);
                }
              } else {
                console.warn(`Invalid date format for trade ${index}: ${rawTimestamp} (parsed as: ${date.toISOString()}), using current date`);
                timestamp = new Date().toISOString();
              }
            } catch (error) {
              console.warn(`Error parsing timestamp for trade ${index}: ${rawTimestamp}`, error);
              timestamp = new Date().toISOString();
            }
          } else {
            // Log the trade structure to help debug - ALWAYS log first trade
            if (index === 0) {
              console.error('❌ No timestamp found in trade. Available fields:', Object.keys(trade));
              console.error('❌ Full trade object:', JSON.stringify(trade, null, 2));
            }
            timestamp = new Date().toISOString();
          }
          
          // Extract PnL - try multiple field names
          // ProjectX Gateway API uses: PnL (exact case) or profitAndLoss
          const pnl = trade.PnL || trade.profitAndLoss || trade.pnl || trade.realizedPnl || trade.realizedPnL || trade.profit || trade.netPnL || trade.netPnl || trade.totalPnL || 0;
          
          // Extract prices - entry vs exit
          // ProjectX Gateway API returns completed trades with:
          // - EntryPrice: entry price
          // - ExitPrice: exit price
          // - EnteredAt: entry timestamp
          // - ExitedAt: exit timestamp
          // - Type: "Long" or "Short"
          // - PnL: profit and loss
          
          // Try exact field names first (case-insensitive check)
          let entryPrice = 0;
          let exitPrice = 0;
          
          // Check for EntryPrice/ExitPrice (exact case) - PRIORITY 1
          // These are the correct fields from TopStep API for completed trades
          if (trade.EntryPrice !== undefined && trade.EntryPrice !== null && trade.EntryPrice !== 0) {
            entryPrice = trade.EntryPrice;
          } else if (trade.entryPrice !== undefined && trade.entryPrice !== null && trade.entryPrice !== 0) {
            entryPrice = trade.entryPrice;
          } else if (trade.openPrice !== undefined && trade.openPrice !== null && trade.openPrice !== 0) {
            entryPrice = trade.openPrice;
          } else {
            // Fallback to price field (for individual executions)
            entryPrice = trade.price || trade.fillPrice || 0;
          }
          
          // Check for ExitPrice (exact case) - PRIORITY 1
          if (trade.ExitPrice !== undefined && trade.ExitPrice !== null && trade.ExitPrice !== 0) {
            exitPrice = trade.ExitPrice;
          } else if (trade.exitPrice !== undefined && trade.exitPrice !== null && trade.exitPrice !== 0) {
            exitPrice = trade.exitPrice;
          } else if (trade.closePrice !== undefined && trade.closePrice !== null && trade.closePrice !== 0) {
            exitPrice = trade.closePrice;
          } else if (trade.executedPrice !== undefined && trade.executedPrice !== null && trade.executedPrice !== 0) {
            exitPrice = trade.executedPrice;
          } else {
            // Fallback to price field (for individual executions)
            exitPrice = trade.price || trade.fillPrice || 0;
          }
          
          // Log price extraction issues only if critical
          if (index < 3 && entryPrice === exitPrice && entryPrice > 0 && pnl !== 0) {
            console.warn(`⚠️ Same entry/exit price (${entryPrice}) but PnL=${pnl} for trade ${index}`);
          }
          
          // Extract quantity
          // ProjectX Gateway API: Size (exact case) or size is the quantity
          const quantity = Math.abs(trade.Size || trade.size || trade.quantity || trade.qty || trade.executedQuantity || 0);
          
          // Minimal logging - only log first trade structure for debugging
          if (index === 0 && process.env.NODE_ENV === 'development') {
            console.log(`📋 First trade sample:`, {
              id: trade.id,
              contractId: trade.contractId,
              side: trade.side,
              price: trade.price,
              profitAndLoss: trade.profitAndLoss,
              size: trade.size,
              creationTimestamp: trade.creationTimestamp
            });
          }
          
          // Extract entry/exit timestamps if available
          const enteredAt = trade.EnteredAt || trade.enteredAt;
          const exitedAt = trade.ExitedAt || trade.exitedAt;
          
          // Determine side from Type field (for completed trades) or side field (for executions)
          const tradeType = trade.Type || trade.type;
          let side: 'BUY' | 'SELL';
          
          if (tradeType === 'Short' || tradeType === 'SHORT') {
            side = 'SELL';
          } else if (tradeType === 'Long' || tradeType === 'LONG') {
            side = 'BUY';
          } else {
            // Fallback to side field (for executions)
            if (trade.side === 1 || trade.side === 'SELL' || trade.side === 'Sell' || trade.side === 'sell') {
              side = 'SELL';
            } else {
              side = 'BUY';
            }
          }

          return {
            id: trade.id?.toString() || trade.executionId?.toString() || trade.orderId?.toString() || '',
            accountId: trade.accountId?.toString() || accountId,
            symbol: trade.symbol || trade.ContractName || trade.contractName || trade.contractId || trade.instrument || trade.contract || '',
            side: side,
            quantity: quantity,
            price: entryPrice, // Entry price (or execution price if no separate entry)
            executedPrice: exitPrice, // Exit price (or execution price if no separate exit)
            executedQuantity: quantity,
            timestamp: timestamp,
            pnl: pnl, // This should be profitAndLoss from ProjectX
            commission: trade.commission || trade.fees || trade.totalFee || 0,
            status: trade.status || 'FILLED',
            // Store entry/exit timestamps if available (for completed trades)
            enteredAt: enteredAt || undefined,
            exitedAt: exitedAt || undefined,
            // Preserve Type field for grouping logic
            tradeType: tradeType || undefined
          } as ProjectXTrade & { enteredAt?: string; exitedAt?: string; tradeType?: string };
        });
        
      } catch (error: any) {
        if (!error.message?.includes('404') && !error.message?.includes('Failed to fetch trades')) {
          throw error;
        }
        // Continue to next endpoint
      }
    }

    throw new Error(`Failed to fetch trades. Tried endpoints: ${endpoints.join(', ')}`);
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    return this.apiRequest('/user');
  }
}

