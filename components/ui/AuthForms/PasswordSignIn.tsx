'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';
import { signInWithPassword } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

// Define prop type with allowEmail boolean
interface PasswordSignInProps {
  allowEmail: boolean;
  redirectMethod: string;
}

export default function PasswordSignIn({
  allowEmail,
  redirectMethod
}: PasswordSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signInWithPassword, router);
    setIsSubmitting(false);
  };

  return (
    <div>
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

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <Button
          variant="slim"
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          loading={isSubmitting}
        >
          Sign In
        </Button>
      </form>

      {/* Links */}
      <div className="mt-8 space-y-4">
        <div className="text-center">
          <Link
            href="/signin/forgot_password"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Forgot your password?
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
