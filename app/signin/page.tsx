import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import PasswordSignIn from '@/components/ui/AuthForms/PasswordSignIn';
import AuthRedirectHandler from '@/components/ui/AuthRedirectHandler/AuthRedirectHandler';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

interface SignInProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SignIn({ searchParams }: SignInProps) {
  let user = null;
  let authError = false;

  try {
    const supabase = createClient();
    user = await getUser(supabase);
  } catch (error) {
    console.error('Auth error on signin page:', error);
    authError = true;
  }

  // Get the next URL from search params
  const nextUrl = searchParams.next as string;
  const decodedNextUrl = nextUrl ? decodeURIComponent(nextUrl) : null;

  if (user && !authError) {
    // If user is already logged in, redirect to the next URL or dashboard
    if (
      decodedNextUrl &&
      decodedNextUrl.startsWith('/') &&
      !decodedNextUrl.startsWith('//')
    ) {
      return redirect(decodedNextUrl);
    }
    return redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Client-side auth redirect handler as fallback */}
      <AuthRedirectHandler nextUrl={decodedNextUrl || undefined} />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors duration-200 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to home</span>
          </Link>

          {decodedNextUrl && (
            <div className="text-xs text-slate-400 bg-slate-800/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/50">
              Redirecting to: {decodedNextUrl}
            </div>
          )}
        </div>

        {/* Main content card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mb-6 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <p className="text-red-200 text-sm text-center">
                Authentication service temporarily unavailable. Please try
                again.
              </p>
            </div>
          )}

          <PasswordSignIn />
        </div>

        {/* Additional navigation options */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors duration-200 hover:scale-105"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Return to homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
