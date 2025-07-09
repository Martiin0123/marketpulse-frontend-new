import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import PasswordSignIn from '@/components/ui/AuthForms/PasswordSignIn';
import OauthSignIn from '@/components/ui/AuthForms/OauthSignIn';
import Separator from '@/components/ui/AuthForms/Separator';

export default async function SignIn() {
  const supabase = createClient();
  const user = await getUser(supabase);

  if (user) {
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
        
        <div className="mt-8 space-y-6">
          <PasswordSignIn />
          <Separator />
          <OauthSignIn />
        </div>
      </div>
    </div>
  );
}
