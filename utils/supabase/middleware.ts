import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';

const PROTECTED_ROUTES = ['/dashboard', '/signals', '/account', '/referrals', '/performance-reports'];

// Aggressive cache to reduce auth requests
const authCache = new Map<string, { user: User | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration (increased)

// Very conservative rate limiting for auth requests
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 2; // Reduced to 2 auth requests per minute per IP

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
    // Clean up expired cache entries on each request
    cleanupExpiredEntries();
    
    const { supabase, response } = createClient(request);
    const pathname = request.nextUrl.pathname;

    // Skip auth checks for static assets and API routes
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/api') || 
        pathname.includes('.') ||
        pathname === '/favicon.ico') {
      return response;
    }

    // Skip auth checks in development if DISABLE_AUTH_MIDDLEWARE is set
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH_MIDDLEWARE === 'true') {
      console.log('🔧 Auth middleware disabled in development');
      return response;
    }

    // Skip auth checks for public routes in development
    if (process.env.NODE_ENV === 'development' && (
        pathname === '/' || 
        pathname.startsWith('/pricing') ||
        pathname.startsWith('/legal')
    )) {
      return response;
    }

    // Rate limiting check - only for production
    if (process.env.NODE_ENV === 'production') {
      const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const now = Date.now();
      const rateLimitKey = `${clientIP}:${pathname}`;
      const rateLimit = rateLimitMap.get(rateLimitKey);
      
      if (rateLimit && (now - rateLimit.timestamp) < RATE_LIMIT_WINDOW) {
        if (rateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          console.log('Rate limit exceeded for:', pathname);
          // Allow the request to continue but skip auth checks
          return response;
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(rateLimitKey, { count: 1, timestamp: now });
      }
    }

    // Check if this is a protected route
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      // Get the user - with rate limiting protection and caching
      let user = null;
      let userError = null;
      
      // Check cache first
      const cacheKey = request.headers.get('authorization') || 'no-auth';
      const cached = authCache.get(cacheKey);
      const now = Date.now();
      
      // Quick check: if we have no auth cookies, don't bother making auth requests
      const hasAuthCookies = request.cookies.has('sb-access-token') || 
                            request.cookies.has('sb-refresh-token');
      
      if (!hasAuthCookies && cacheKey === 'no-auth') {
        console.log('🚫 No auth cookies found, skipping auth check for:', pathname);
        // Cache this result to prevent repeated checks
        authCache.set(cacheKey, { user: null, timestamp: now });
        user = null;
      }
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        user = cached.user;
        console.log('📦 Using cached auth for:', pathname);
      } else if (hasAuthCookies || cacheKey !== 'no-auth') {
        // Only make auth requests if we have cookies or authorization header
        try {
          const { data, error } = await supabase.auth.getUser();
          user = data.user;
          userError = error;
          
          // Cache the result (even if there's an error, cache null to prevent repeated requests)
          authCache.set(cacheKey, { user: user || null, timestamp: now });
          
          if (userError) {
            // Handle specific auth errors differently
            if (userError.message?.includes('refresh_token_not_found') || 
                userError.message?.includes('Invalid Refresh Token') ||
                userError.code === 'refresh_token_not_found') {
              console.log('🔄 Invalid refresh token detected, will redirect to signin');
              // Clear any auth cookies to force clean signin
              response.cookies.delete('sb-access-token');
              response.cookies.delete('sb-refresh-token');
              // Cache this error for longer to prevent repeated attempts
              authCache.set(cacheKey, { user: null, timestamp: now + (CACHE_DURATION * 2) });
            } else {
              console.log('⚠️ Auth error in middleware (cached to prevent spam):', userError.message);
            }
          }
        } catch (error: any) {
          console.error('❌ Auth error in middleware:', error);
          // Handle specific error types
          if (error?.message?.includes('refresh_token_not_found') || 
              error?.message?.includes('Invalid Refresh Token') ||
              error?.code === 'refresh_token_not_found') {
            console.log('🔄 Invalid refresh token in catch block, clearing cookies');
            // Clear any auth cookies to force clean signin
            response.cookies.delete('sb-access-token');
            response.cookies.delete('sb-refresh-token');
            // Cache this error for longer to prevent repeated attempts
            authCache.set(cacheKey, { user: null, timestamp: now + (CACHE_DURATION * 2) });
          } else {
            // Cache null to prevent repeated failed requests
            authCache.set(cacheKey, { user: null, timestamp: now });
          }
          // If there's an auth error (like rate limiting), allow the request to continue
          // The page will handle authentication itself
          return response;
        }
      }
      
      if (userError) {
        console.error('Auth error in middleware:', userError);
        // If there's an auth error (like rate limiting), allow the request to continue
        // The page will handle authentication itself
        return response;
      }
      
      if (!user) {
        // If no user, redirect to sign in
        const redirectUrl = new URL('/signin', request.url);
        redirectUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Check subscription status - handle rate limiting gracefully
      // Only check subscription if we have a user
      if (user) {
        try {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .in('status', ['trialing', 'active'])
            .maybeSingle();

          if (!subscription) {
            // If no active subscription, redirect to pricing with message
            const redirectUrl = new URL('/pricing', request.url);
            redirectUrl.searchParams.set('message', 'subscription_required');
            return NextResponse.redirect(redirectUrl);
          }
        } catch (subscriptionError) {
          console.error('Subscription check error in middleware:', subscriptionError);
          // If subscription check fails due to rate limiting, allow the request to continue
          // The page will handle subscription checks itself
          return response;
        }
      }
    }

    // Skip session refresh in middleware - let the page handle it
    // This reduces the number of auth requests significantly

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
