'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/utils/auth-context';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NavbarClient() {
  const { user, subscription, loading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-between items-center h-20">
        <div className="h-8 w-32 bg-slate-700 animate-pulse rounded"></div>
        <div className="flex space-x-4">
          <div className="h-10 w-20 bg-slate-700 animate-pulse rounded"></div>
          <div className="h-10 w-24 bg-slate-700 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center h-20">
      {/* Navigation Links */}
      <div className="hidden md:flex items-center space-x-8">
        <Link
          href="/"
          className="text-slate-300 hover:text-white transition-colors"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="text-slate-300 hover:text-white transition-colors"
        >
          Pricing
        </Link>
        {user && subscription && (
          <>
            <Link
              href="/dashboard"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/referrals"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Referrals
            </Link>
            <Link
              href="/performance-reports"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Reports
            </Link>
          </>
        )}
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <Link href="/account">
              <Button variant="slim">Account</Button>
            </Link>
            <Button
              variant="slim"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/signin">
              <Button variant="slim">Sign in</Button>
            </Link>
            <Link href="/signin">
              <Button>Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
