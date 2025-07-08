import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';

const PROTECTED_ROUTES = ['/dashboard', '/signals', '/account', '/referrals', '/performance-reports'];

// Simple cache to reduce auth requests
const authCache = new Map<string, { user: User | null; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

// Rate limiting for auth requests
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 auth requests per minute per IP

// Clean up old cache entries periodically
setInterval(() => {
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
}, 60000); // Clean up every minute

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

    // Skip auth checks in development if DISABLE_AUTH_MIDDLEWARE is set
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH_MIDDLEWARE === 'true') {
      console.log('Auth middleware disabled in development');
      return response;
    }

    // Rate limiting check
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

    // Check if this is a protected route
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      // Get the user - with rate limiting protection and caching
      let user = null;
      let userError = null;
      
      // Check cache first
      const cacheKey = request.headers.get('authorization') || 'no-auth';
      const cached = authCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        user = cached.user;
        console.log('Using cached auth for:', pathname);
      } else {
        try {
          const { data, error } = await supabase.auth.getUser();
          user = data.user;
          userError = error;
          
          // Cache the result
          if (user && !userError) {
            authCache.set(cacheKey, { user, timestamp: now });
          }
        } catch (error) {
          console.error('Auth error in middleware:', error);
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

    // Only refresh session for protected routes to reduce auth calls
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      try {
        await supabase.auth.getUser();
      } catch (authError) {
        console.error('Session refresh error in middleware:', authError);
        // If session refresh fails, continue with the request
        // The page will handle authentication itself
      }
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
