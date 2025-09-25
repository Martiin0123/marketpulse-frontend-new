import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Bypass authentication for API routes that need to be accessed externally
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api/bybit/tradingview') ||
      pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }
  
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match only the routes that need authentication:
     * - dashboard, account, referrals
     * - signin pages
     * - Exclude static assets and API routes
     */
    '/dashboard/:path*',
    '/account/:path*',
    '/referrals/:path*',
    '/signals/:path*',
    '/signin/:path*',
    '/journal/:path*'
    // Removed '/performance-reports' to allow all authenticated users
    // Removed '/pricing' and '/' to reduce middleware calls
  ]
};
