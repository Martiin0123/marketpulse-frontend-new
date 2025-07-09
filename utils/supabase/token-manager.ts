import { createClient } from './client';

// Manual token refresh with strict rate limiting
let lastRefreshTime = 0;
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between refreshes
const TOKEN_EXPIRY_BUFFER = 10 * 60 * 1000; // Refresh 10 minutes before expiry

export const manualTokenRefresh = async (force = false) => {
  const now = Date.now();
  
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    console.log('Token refresh already in progress');
    return refreshPromise;
  }
  
  // Check minimum interval unless forced
  if (!force && (now - lastRefreshTime) < MIN_REFRESH_INTERVAL) {
    console.log('Token refresh rate limited');
    return Promise.resolve();
  }
  
  const supabase = createClient();
  if (!supabase) return Promise.resolve();
  
  try {
    isRefreshing = true;
    console.log('Starting manual token refresh');
    
    refreshPromise = supabase.auth.refreshSession();
    const result = await refreshPromise;
    
    lastRefreshTime = now;
    console.log('Token refresh completed');
    
    return result;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
};

export const shouldRefreshToken = (session: any): boolean => {
  if (!session?.expires_at) return false;
  
  const expiryTime = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  
  // Refresh if token expires within the buffer time
  return (expiryTime - now) < TOKEN_EXPIRY_BUFFER;
};

export const getTokenStatus = () => {
  return {
    lastRefreshTime,
    isRefreshing,
    timeSinceLastRefresh: Date.now() - lastRefreshTime
  };
};