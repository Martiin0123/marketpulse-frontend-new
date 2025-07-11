import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';

const PROTECTED_ROUTES = ['/dashboard', '/signals', '/account', '/referrals', '/performance-reports'];

// Simple cache to reduce auth requests
const authCache = new Map<string, { user: User | null; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds only

// Simplified rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 3; // 3 requests per 10 seconds

// Helper function to clean up expired cache entries on-demand
const cleanupExpiredEntries = () => {
  const now = Date.now();
  authCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      authCache.delete(key);
    }
  });
  rateLimitMap.forEach((value, key) => {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  });
};

// Simple helper to check if we should skip auth checks
const shouldSkipAuth = () => {
  return process.env.DISABLE_AUTH_MIDDLEWARE === 'true';
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
      // Simple rate limiting
      const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const now = Date.now();
      const rateLimitKey = `${clientIP}:${pathname}`;
      const rateLimit = rateLimitMap.get(rateLimitKey);
      
      if (rateLimit && (now - rateLimit.timestamp) < RATE_LIMIT_WINDOW) {
        if (rateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          console.log('⚠️ Rate limit exceeded, allowing request through');
          return response;
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(rateLimitKey, { count: 1, timestamp: now });
      }

      // Simple auth check with minimal caching
      let user = null;
      
      // Check cache first (short duration)
      const cacheKey = 'auth-check';
      const cached = authCache.get(cacheKey);
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        user = cached.user;
      } else {
        try {
          const { data, error } = await supabase.auth.getUser();
          user = data.user;
          
          if (error) {
            console.log('📝 Auth check error:', error.message);
            // Don't cache auth errors, let the page handle them
            return response;
          }
          
          // Cache the result briefly
          authCache.set(cacheKey, { user: user || null, timestamp: now });
          
        } catch (error: any) {
          console.error('❌ Auth error in middleware:', error);
          // On auth errors, let the page handle authentication
          return response;
        }
      }
      
      if (!user) {
        // If no user, redirect to sign in
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
