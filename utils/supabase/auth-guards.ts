// Global state to prevent concurrent auth operations
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

// Queue to hold pending refresh requests
const refreshQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

/**
 * Prevents concurrent refresh token requests
 * @param refreshFn - The function that performs the token refresh
 * @returns Promise that resolves when refresh is complete
 */
export async function guardedRefresh<T>(refreshFn: () => Promise<T>): Promise<T> {
  // If already refreshing, wait for the current refresh to complete
  if (isRefreshing && refreshPromise) {
    console.log('Token refresh already in progress, waiting...');
    return refreshPromise;
  }

  // If not refreshing, start a new refresh
  isRefreshing = true;
  
  try {
    console.log('Starting token refresh...');
    refreshPromise = refreshFn();
    const result = await refreshPromise;
    
    console.log('Token refresh completed successfully');
    
    // Resolve all queued requests with the same result
    refreshQueue.forEach(({ resolve }) => resolve(result));
    refreshQueue.length = 0;
    
    return result;
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // Reject all queued requests with the same error
    refreshQueue.forEach(({ reject }) => reject(error));
    refreshQueue.length = 0;
    
    throw error;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Debounces auth requests to prevent request storms
 */
export function debounceAuth<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 1000
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCall = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    // If called too frequently, debounce
    if (now - lastCall < delay) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            lastCall = Date.now();
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    }
    
    // If enough time has passed, call immediately
    lastCall = now;
    return fn(...args);
  }) as T;
}

/**
 * Circuit breaker pattern for auth requests
 */
class AuthCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly maxFailures = 5;
  private readonly timeout = 30000; // 30 seconds
  private readonly resetTime = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTime) {
        this.state = 'HALF_OPEN';
        console.log('Auth circuit breaker: Moving to HALF_OPEN state');
      } else {
        throw new Error('Auth circuit breaker is OPEN - too many failures');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth request timeout')), this.timeout)
        )
      ]);

      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log('Auth circuit breaker: Reset to CLOSED state');
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.maxFailures) {
        this.state = 'OPEN';
        console.log('Auth circuit breaker: Moving to OPEN state');
      }

      throw error;
    }
  }
}

export const authCircuitBreaker = new AuthCircuitBreaker(); 