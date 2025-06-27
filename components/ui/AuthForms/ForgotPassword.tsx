'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';
import { requestPasswordUpdate } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, KeyRound } from 'lucide-react';

// Define prop type with allowEmail boolean
interface ForgotPasswordProps {
  allowEmail: boolean;
  redirectMethod: string;
  disableButton?: boolean;
}

export default function ForgotPassword({
  allowEmail,
  redirectMethod,
  disableButton
}: ForgotPasswordProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, requestPasswordUpdate, router);
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-400 text-sm">
          Enter your email address and we'll send you a link to reset your
          password
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
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <Button
          variant="slim"
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          loading={isSubmitting}
          disabled={disableButton}
        >
          Send Reset Link
        </Button>
      </form>

      {/* Links */}
      <div className="mt-8 space-y-4">
        <div className="text-center">
          <Link
            href="/signin/password_signin"
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Sign in with email and password
          </Link>
        </div>

        {allowEmail && (
          <div className="text-center">
            <Link
              href="/signin/email_signin"
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Sign in via magic link
            </Link>
          </div>
        )}

        <div className="text-center pt-4 border-t border-gray-700">
          <span className="text-sm text-gray-400">Don't have an account? </span>
          <Link
            href="/signin/signup"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
