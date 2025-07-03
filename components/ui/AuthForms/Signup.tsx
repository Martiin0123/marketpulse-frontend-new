'use client';

import Button from '@/components/ui/Button';
import React from 'react';
import Link from 'next/link';
import { signUp } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, Gift } from 'lucide-react';
import debounce from 'lodash/debounce';

// Define prop type with allowEmail boolean
interface SignUpProps {
  allowEmail: boolean;
  redirectMethod: string;
}

export default function SignUp({ allowEmail, redirectMethod }: SignUpProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralMessage, setReferralMessage] = useState('');

  // Get referral code from URL params
  useEffect(() => {
    const refParam = searchParams?.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      validateReferralCode(refParam);
    }
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferralValid(null);
      setReferralMessage('');
      return;
    }

    try {
      const response = await fetch(
        `/api/referrals/track?code=${encodeURIComponent(code)}`
      );
      const data = await response.json();

      if (response.ok && data.valid) {
        setReferralValid(true);
        setReferralMessage('Valid referral code!');
      } else {
        setReferralValid(false);
        setReferralMessage(data.error || 'Invalid referral code');
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValid(false);
      setReferralMessage('Error validating referral code');
    }
  };

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((code: string) => validateReferralCode(code), 500),
    []
  );

  useEffect(() => {
    // Cleanup debounced function on unmount
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.trim();
    setReferralCode(code);

    if (code) {
      debouncedValidate(code);
    } else {
      setReferralValid(null);
      setReferralMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Only add referral code if it's valid
      if (referralValid && referralCode) {
        formData.append('referralCode', referralCode);
      }

      await handleRequest(e, signUp, router);
    } catch (error) {
      console.error('Error during signup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-400 text-sm">
          Create your account to start trading with AI-powered signals
        </p>
        {referralValid && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-xs">
              🎉 You're signing up with a referral! Get exclusive benefits.
            </p>
          </div>
        )}
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
              placeholder="Choose a strong password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
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

        {/* Referral Code Input */}
        <div>
          <label
            htmlFor="referralCode"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Referral Code (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Gift className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="referralCode"
              placeholder="Enter referral code"
              type="text"
              value={referralCode}
              onChange={handleReferralCodeChange}
              className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                referralValid === true
                  ? 'border-green-500 focus:ring-green-500'
                  : referralValid === false
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-purple-500'
              }`}
            />
          </div>
          {referralMessage && (
            <p
              className={`text-xs mt-1 ${
                referralValid ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {referralMessage}
            </p>
          )}
        </div>

        <Button
          variant="slim"
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          loading={isSubmitting}
        >
          Create Account
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
          <span className="text-sm text-gray-400">
            Already have an account?{' '}
          </span>
          <Link
            href="/signin/password_signin"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
