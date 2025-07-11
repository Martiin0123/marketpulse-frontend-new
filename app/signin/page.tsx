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
    if (decodedNextUrl && decodedNextUrl.startsWith('/') && !decodedNextUrl.startsWith('//')) {
      return redirect(decodedNextUrl);
    }
    return redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Client-side auth redirect handler as fallback */}
      <AuthRedirectHandler nextUrl={decodedNextUrl} />
      
      <div className="max-w-md w-full space-y-8">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          
          {decodedNextUrl && (
            <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
              Redirecting to: {decodedNextUrl}
            </div>
          )}
        </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <a
              href="/signin/signup"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              create a new account
            </a>
          </p>
          
          {authError && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-200 text-sm text-center">
                Authentication service temporarily unavailable. Please try again.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <PasswordSignIn />
        </div>

        {/* Additional navigation options */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Return to homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
