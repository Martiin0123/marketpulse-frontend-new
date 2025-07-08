// Performance optimization utilities

// Cache for expensive operations
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedData<T>(key: string, ttl: number = 5 * 60 * 1000): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setCachedData<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  Array.from(cache.keys()).forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Batch operations for better performance
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private processFn: (items: T[]) => Promise<void>;
  private delay: number;

  constructor(
    processFn: (items: T[]) => Promise<void>,
    batchSize: number = 10,
    delay: number = 100
  ) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(item: T): void {
    this.queue.push(item);
    this.scheduleProcessing();
  }

  private scheduleProcessing(): void {
    if (this.processing) return;
    
    this.processing = true;
    
    setTimeout(() => {
      this.process();
    }, this.delay);
  }

  private async process(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      await this.processFn(batch);
    } catch (error) {
      console.error('Batch processing error:', error);
    }

    if (this.queue.length > 0) {
      setTimeout(() => this.process(), this.delay);
    } else {
      this.processing = false;
    }
  }
}

// Memory usage optimization
export function optimizeMemoryUsage(): void {
  if (typeof window !== 'undefined') {
    // Clear unnecessary caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('supabase') || name.includes('auth')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Clear localStorage if it's getting too large
    try {
      const used = JSON.stringify(localStorage).length;
      if (used > 5 * 1024 * 1024) { // 5MB limit
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (!key.startsWith('supabase.auth')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to optimize localStorage:', error);
    }
  }
}

// Network optimization
export function optimizeNetworkRequests(): void {
  // Preload critical resources
  if (typeof window !== 'undefined') {
    const criticalPaths = [
      '/api/auth/user',
      '/api/subscription',
      '/api/signals'
    ];
    
    criticalPaths.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = path;
      document.head.appendChild(link);
    });
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);
      
      // Keep only last 100 measurements
      const measurements = this.metrics.get(name)!;
      if (measurements.length > 100) {
        measurements.splice(0, measurements.length - 100);
      }
    };
  }
  
  getAverageTime(name: string): number {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }
  
  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((measurements, name) => {
      result[name] = this.getAverageTime(name);
    });
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor(); 