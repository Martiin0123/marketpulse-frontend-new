'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';
import { signInWithEmail } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Zap } from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { trackEvent } from '@/utils/amplitude';

// Define prop type with allowPassword boolean
interface EmailSignInProps {
  allowPassword: boolean;
  redirectMethod: string;
  disableButton?: boolean;
}

export default function EmailSignIn({
  allowPassword,
  redirectMethod,
  disableButton
}: EmailSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    trackEvent('Sign In Attempted', { method: 'email' });
    await handleRequest(e, signInWithEmail, router);
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Magic Link Sign In
        </h2>
        <p className="text-slate-400 text-sm">
          We'll send you a magic link to sign in instantly
        </p>
      </div>

      <form
        noValidate={true}
        className="space-y-6"
        onSubmit={(e) => handleSubmit(e)}
      >
        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="email"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <Button
          variant="slim"
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          loading={isSubmitting}
          disabled={disableButton}
        >
          Send Magic Link
        </Button>
      </form>

      {/* Links */}
      {allowPassword && (
        <div className="mt-8 space-y-4">
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
      )}
    </div>
  );
}
