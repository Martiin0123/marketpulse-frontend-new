import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import PasswordSignIn from '@/components/ui/AuthForms/PasswordSignIn';

interface SignInProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SignIn({ searchParams }: SignInProps) {
  const supabase = createClient();
  const user = await getUser(supabase);

  // Get the next URL from search params
  const nextUrl = searchParams.next as string;

  if (user) {
    // If user is already logged in, redirect to the next URL or dashboard
    if (nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//')) {
      return redirect(nextUrl);
    }
    return redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
        </div>
        
        <div className="mt-8">
          <PasswordSignIn />
        </div>
      </div>
    </div>
  );
}
