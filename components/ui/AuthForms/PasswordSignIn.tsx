'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';
import { signInWithPassword } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/icons/Logo';

// Define prop type with allowEmail boolean
interface PasswordSignInProps {
  allowEmail?: boolean;
  redirectMethod?: string;
  disableButton?: boolean;
}

export default function PasswordSignIn({
  allowEmail = false,
  redirectMethod = 'server',
  disableButton = false
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-sm">
          Sign in to your account to continue
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

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect="off"
              className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-300" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400 hover:text-slate-300" />
              )}
            </button>
          </div>
        </div>

        <Button
          variant="slim"
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          loading={isSubmitting}
          disabled={disableButton}
        >
          Sign In
        </Button>
      </form>

      {/* Links */}
      <div className="mt-8 space-y-4">
        <div className="text-center">
          <Link
            href="/auth/reset_password"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

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
