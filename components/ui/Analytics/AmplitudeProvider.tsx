'use client';

import { useEffect } from 'react';
import { useAuth } from '@/utils/auth-context';

// Amplitude analytics with fallback functions
const noop = (...args: any[]) => {};

const initAmplitude = noop;
const identifyUser = noop;

export default function AmplitudeProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  useEffect(() => {
    if (initAmplitude) {
      initAmplitude();
    }
  }, []);

  useEffect(() => {
    if (user && identifyUser) {
      identifyUser(user.id, {
        email: user.email,
        user_id: user.id
      });
    }
  }, [user]);

  return <>{children}</>;
}
