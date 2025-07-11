'use client';

import Button from '@/components/ui/Button';
import { signInWithOAuth } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Github } from 'lucide-react';
import Logo from '@/components/icons/Logo';
import Link from 'next/link';

interface OauthSignInProps {
  allowEmail?: boolean;
  redirectMethod?: string;
  disableButton?: boolean;
  nextUrl?: string;
}

export default function OauthSignIn({
  allowEmail = false,
  redirectMethod = 'server',
  disableButton = false,
  nextUrl
}: OauthSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await signInWithOAuth(e, nextUrl);
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to PrimeScope
        </h2>
        <p className="text-slate-400 text-sm">
          Sign in with your GitHub account to continue
        </p>
      </div>

      <form
        noValidate={true}
        className="space-y-6"
        onSubmit={(e) => handleSubmit(e)}
      >
        <input type="hidden" name="provider" value="github" />
        <Button
          variant="slim"
          type="submit"
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          loading={isSubmitting}
          disabled={disableButton}
        >
          <Github className="w-5 h-5" />
          <span>Continue with GitHub</span>
        </Button>
      </form>

      {/* Links */}
      <div className="mt-8 space-y-4">
        {allowEmail && (
          <div className="text-center">
            <Link
              href="/signin/email_signin"
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Sign in via magic link
            </Link>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/signin/password_signin"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Sign in with email and password
          </Link>
        </div>

        <div className="text-center pt-4 border-t border-slate-700">
          <span className="text-sm text-slate-400">
            Don't have an account?{' '}
          </span>
          <Link
            href="/signin/signup"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
