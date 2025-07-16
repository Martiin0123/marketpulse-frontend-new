import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { getSubscription } from '@/utils/supabase/queries';

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }
  }

  // URL to redirect to after sign in process completes
  // Check if there's a 'next' parameter to redirect to
  const nextUrl = requestUrl.searchParams.get('next');
  
  // If there's a next URL and it's a valid internal path, redirect there
  if (nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//')) {
    return NextResponse.redirect(
      getStatusRedirect(
        `${requestUrl.origin}${nextUrl}`,
        'Success!',
        'You are now signed in.'
      )
    );
  }
  
  // Check if user has active subscription to determine redirect
  try {
    const supabase = createClient();
    const subscription = await getSubscription(supabase);
    
    // Check if user has active subscription
    const hasActiveSubscription = subscription && 
      ['active', 'trialing'].includes(subscription.status as string);
    
    // Check if user has premium or VIP access
    const productName = (subscription as any)?.prices?.products?.name?.toLowerCase() || '';
    const hasPremiumAccess = hasActiveSubscription && 
      (productName.includes('premium') || productName.includes('vip'));
    
    if (hasPremiumAccess) {
      // User has active subscription, redirect to dashboard
      return NextResponse.redirect(
        getStatusRedirect(
          `${requestUrl.origin}/dashboard`,
          'Success!',
          'You are now signed in.'
        )
      );
    } else {
      // User doesn't have active subscription, redirect to pricing
      return NextResponse.redirect(
        getStatusRedirect(
          `${requestUrl.origin}/pricing?message=dashboard_access_required`,
          'Success!',
          'You are now signed in. Please subscribe to access the dashboard.'
        )
      );
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
    // Fallback to pricing page if there's an error checking subscription
    return NextResponse.redirect(
      getStatusRedirect(
        `${requestUrl.origin}/pricing?message=dashboard_access_required`,
        'Success!',
        'You are now signed in. Please subscribe to access the dashboard.'
      )
    );
  }
}
