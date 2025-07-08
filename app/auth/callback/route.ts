import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

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
  
  // Otherwise redirect to dashboard
  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}/dashboard`,
      'Success!',
      'You are now signed in.'
    )
  );
}
