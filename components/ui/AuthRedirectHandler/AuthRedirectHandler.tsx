'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/auth-context';

interface AuthRedirectHandlerProps {
  nextUrl?: string;
}

export default function AuthRedirectHandler({ nextUrl }: AuthRedirectHandlerProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading and user is authenticated
    if (!loading && user) {
      const redirectTo = nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//') 
        ? nextUrl 
        : '/dashboard';
      
      console.log('AuthRedirectHandler: Redirecting authenticated user to:', redirectTo);
      router.replace(redirectTo);
    }
  }, [user, loading, nextUrl, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-slate-400">Checking authentication...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-slate-400">Redirecting...</div>
      </div>
    );
  }

  return null;
}