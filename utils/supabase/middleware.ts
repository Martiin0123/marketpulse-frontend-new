import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/signals'];

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

    // Check if this is a protected route
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If no user, redirect to sign in
        const redirectUrl = new URL('/signin', request.url);
        redirectUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Check subscription status
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
    }

    // This will refresh session if expired - required for Server Components
    await supabase.auth.getUser();

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
