'use client';

import { useEffect } from 'react';
import { initAmplitude, identifyUser } from '@/utils/amplitude';
import { useAuth } from '@/utils/auth-context';

export default function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    initAmplitude();
  }, []);

  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        user_id: user.id,
      });
    }
  }, [user]);

  return <>{children}</>;
}