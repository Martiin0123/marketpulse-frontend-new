import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';

const PROTECTED_ROUTES = ['/dashboard', '/signals', '/account', '/referrals', '/performance-reports'];

// Enhanced cache with better memory management
const authCache = new Map<string, { user: User | null; timestamp: number; error?: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for successful auth
const ERROR_CACHE_DURATION = 30 * 1000; // 30 seconds for auth errors

// Improved rate limiting with exponential backoff
const rateLimitMap = new Map<string, { count: number; timestamp: number; blocked: boolean }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes block for excessive requests

// Global rate limit state
let globalRateLimitCount = 0;
let globalRateLimitTimestamp = Date.now();
const GLOBAL_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const GLOBAL_MAX_REQUESTS = 50; // 50 requests per minute globally

// Rate limiting statistics
const rateLimitStats = {
  totalRequests: 0,
  rateLimited: 0,
  authErrors: 0,
  cacheHits: 0,
  cacheMisses: 0
};

// Redis client (optional - falls back to in-memory if not available)
let redisClient: any = null;
let redisAvailable = false;

try {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true
  });
  
  redisClient.on('connect', () => {
    console.log('✅ Redis connected for rate limiting');
    redisAvailable = true;
  });
  
  redisClient.on('error', (error: any) => {
    console.log('⚠️ Redis connection error:', error.message);
    redisAvailable = false;
  });
  
  redisClient.on('close', () => {
    console.log('⚠️ Redis connection closed');
    redisAvailable = false;
  });
  
} catch (error) {
  console.log('⚠️ Redis not available, using in-memory rate limiting');
}

// Helper function to clean up expired cache entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  
  // Clean auth cache
  Array.from(authCache.entries()).forEach(([key, value]) => {
    const duration = value.error ? ERROR_CACHE_DURATION : CACHE_DURATION;
    if (now - value.timestamp > duration) {
      authCache.delete(key);
    }
  });
  
  // Clean rate limit cache
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  });
  
  // Clean global rate limit
  if (now - globalRateLimitTimestamp > GLOBAL_RATE_LIMIT_WINDOW) {
    globalRateLimitCount = 0;
    globalRateLimitTimestamp = now;
  }
};

// Simple helper to check if we should skip auth checks
const shouldSkipAuth = () => {
  return process.env.DISABLE_AUTH_MIDDLEWARE === 'true';
};

// Check if we're globally rate limited
const isGloballyRateLimited = () => {
  const now = Date.now();
  if (now - globalRateLimitTimestamp > GLOBAL_RATE_LIMIT_WINDOW) {
    globalRateLimitCount = 0;
    globalRateLimitTimestamp = now;
  }
  
  if (globalRateLimitCount >= GLOBAL_MAX_REQUESTS) {
    console.log('🚨 Global rate limit exceeded, allowing requests through');
    return true;
  }
  
  globalRateLimitCount++;
  return false;
};

// Redis-based rate limiting with fallback
const checkRedisRateLimit = async (key: string, maxRequests: number, windowMs: number) => {
  if (!redisClient || !redisAvailable) {
    // Fallback to in-memory rate limiting
    return checkInMemoryRateLimit(key, maxRequests, windowMs);
  }
  
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, now.toString());
    
    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[1][1] as number;
    
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);
    
    return { allowed, remaining };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to in-memory rate limiting
    return checkInMemoryRateLimit(key, maxRequests, windowMs);
  }
};

// In-memory rate limiting fallback
const checkInMemoryRateLimit = (key: string, maxRequests: number, windowMs: number) => {
  const now = Date.now();
  const rateLimit = rateLimitMap.get(key);
  
  if (rateLimit) {
    if (rateLimit.blocked && (now - rateLimit.timestamp) < BLOCK_DURATION) {
      return { allowed: false, remaining: 0 };
    }
    
    if ((now - rateLimit.timestamp) < windowMs) {
      if (rateLimit.count >= maxRequests) {
        rateLimit.blocked = true;
        rateLimit.timestamp = now;
        return { allowed: false, remaining: 0 };
      }
      rateLimit.count++;
      return { allowed: true, remaining: maxRequests - rateLimit.count };
    } else {
      rateLimitMap.set(key, { count: 1, timestamp: now, blocked: false });
      return { allowed: true, remaining: maxRequests - 1 };
    }
  } else {
    rateLimitMap.set(key, { count: 1, timestamp: now, blocked: false });
    return { allowed: true, remaining: maxRequests - 1 };
  }
};

// Log rate limiting statistics
const logRateLimitStats = () => {
  if (rateLimitStats.totalRequests % 100 === 0) {
    console.log('📊 Rate Limit Stats:', {
      totalRequests: rateLimitStats.totalRequests,
      rateLimited: rateLimitStats.rateLimited,
      authErrors: rateLimitStats.authErrors,
      cacheHits: rateLimitStats.cacheHits,
      cacheMisses: rateLimitStats.cacheMisses,
      hitRate: rateLimitStats.totalRequests > 0 ? 
        ((rateLimitStats.cacheHits / (rateLimitStats.cacheHits + rateLimitStats.cacheMisses)) * 100).toFixed(1) + '%' : '0%'
    });
  }
};

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options
          });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({
            name,
            value,
            ...options
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options
          });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({
            name,
            value: '',
            ...options
          });
        }
      }
    }
  );

  return { supabase, response };
};

export const updateSession = async (request: NextRequest) => {
  try {
    const { supabase, response } = createClient(request);
    const pathname = request.nextUrl.pathname;

    // Update statistics
    rateLimitStats.totalRequests++;
    logRateLimitStats();

    // Clean up expired entries periodically
    cleanupExpiredEntries();

    // Skip auth checks for static assets and API routes
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/api') || 
        pathname.includes('.') ||
        pathname === '/favicon.ico') {
      return response;
    }

    // Skip auth checks if disabled
    if (shouldSkipAuth()) {
      console.log('🔧 Auth middleware disabled');
      return response;
    }

    // Skip auth checks for public routes
    if (pathname === '/' || 
        pathname.startsWith('/pricing') ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/signin') ||
        pathname.startsWith('/ref/')) {
      return response;
    }

    // Check if this is a protected route
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      // Check global rate limit first
      if (isGloballyRateLimited()) {
        console.log('⚠️ Global rate limit active, allowing request through');
        return response;
      }

      // Per-IP rate limiting with Redis
      const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const rateLimitKey = `rate_limit:${clientIP}:${pathname}`;
      
      const { allowed, remaining } = await checkRedisRateLimit(
        rateLimitKey,
        MAX_REQUESTS_PER_WINDOW,
        RATE_LIMIT_WINDOW
      );
      
      if (!allowed) {
        rateLimitStats.rateLimited++;
        console.log(`🚨 Rate limit exceeded for IP ${clientIP}, remaining: ${remaining}`);
        return response;
      }

      // Enhanced auth check with better caching
      let user = null;
      let authError = null;
      
      // Check cache first
      const cacheKey = 'auth-check';
      const cached = authCache.get(cacheKey);
      
      if (cached) {
        const duration = cached.error ? ERROR_CACHE_DURATION : CACHE_DURATION;
        if ((Date.now() - cached.timestamp) < duration) {
          user = cached.user;
          authError = cached.error;
          rateLimitStats.cacheHits++;
          
          if (authError) {
            console.log('📝 Using cached auth error:', authError);
            // Don't redirect on cached errors, let the page handle them
            return response;
          }
        }
      }
      
      // Only make auth request if not cached
      if (!user && !authError) {
        rateLimitStats.cacheMisses++;
        try {
          const { data, error } = await supabase.auth.getUser();
          user = data.user;
          
          if (error) {
            console.log('📝 Auth check error:', error.message);
            authError = error.message;
            rateLimitStats.authErrors++;
            
            // Cache auth errors briefly
            authCache.set(cacheKey, { 
              user: null, 
              timestamp: Date.now(), 
              error: error.message 
            });
            
            // Don't redirect on auth errors, let the page handle them
            return response;
          }
          
          // Cache successful auth for longer
          authCache.set(cacheKey, { 
            user: user || null, 
            timestamp: Date.now() 
          });
          
        } catch (error: any) {
          console.error('❌ Auth error in middleware:', error);
          authError = error.message;
          rateLimitStats.authErrors++;
          
          // Cache auth errors briefly
          authCache.set(cacheKey, { 
            user: null, 
            timestamp: Date.now(), 
            error: error.message 
          });
          
          // On auth errors, let the page handle authentication
          return response;
        }
      }
      
      if (!user && !authError) {
        // If no user and no error, redirect to sign in
        const redirectUrl = new URL('/signin', request.url);
        redirectUrl.searchParams.set('next', pathname);
        console.log('🔐 Redirecting to signin for:', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      console.log('✅ Auth check passed for:', pathname);
    }

    return response;
  } catch (e) {
    console.error('Middleware error:', e);
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    });
  }
};
