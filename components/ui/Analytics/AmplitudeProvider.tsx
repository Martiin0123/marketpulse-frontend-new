'use client';

import { useEffect } from 'react';
import { useAuth } from '@/utils/auth-context';

// Optional Amplitude import
let amplitude: any = null;
let initAmplitude: any = null;
let identifyUser: any = null;

try {
  const amplitudeModule = require('@amplitude/analytics-browser');
  amplitude = amplitudeModule.default || amplitudeModule;

  // Initialize amplitude if available
  initAmplitude = () => {
    if (amplitude && typeof amplitude.init === 'function') {
      amplitude.init('71f423db06513a8400f0f4f51b115aea', {
        fetchRemoteConfig: true,
        serverZone: 'EU',
        autocapture: true,
        defaultTracking: {
          sessions: true,
          pageViews: true,
          formInteractions: true,
          fileDownloads: true
        }
      });
    }
  };

  // Identify user if available
  identifyUser = (userId: string, userProperties?: Record<string, any>) => {
    if (amplitude && typeof amplitude.setUserId === 'function') {
      amplitude.setUserId(userId);

      if (userProperties && typeof amplitude.Identify === 'function') {
        const identify = new amplitude.Identify();
        Object.entries(userProperties).forEach(([key, value]) => {
          identify.set(key, value);
        });
        amplitude.identify(identify);
      }
    }
  };
} catch (error) {
  console.warn('Amplitude analytics not available:', error);
  // Provide no-op functions
  initAmplitude = () => {};
  identifyUser = () => {};
}

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
