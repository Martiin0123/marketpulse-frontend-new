import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Bypass authentication for API routes that need to be accessed externally
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api/bybit/tradingview') ||
      pathname.startsWith('/api/webhook')) {
    return new Response(null, { status: 200 });
  }
  
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match only the routes that need authentication:
     * - dashboard, account, referrals, performance-reports
     * - signin pages
     * - Exclude static assets and API routes
     */
    '/dashboard/:path*',
    '/account/:path*',
    '/referrals/:path*',
    '/performance-reports/:path*',
    '/signals/:path*',
    '/signin/:path*'
    // Removed '/pricing' and '/' to reduce middleware calls
  ]
};
