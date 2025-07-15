// Optional Amplitude import - won't crash if package is missing
let amplitude: any = null;
let initAmplitude: any = null;
let trackEvent: any = null;
let identifyUser: any = null;
let setUserProperties: any = null;
let resetUser: any = null;

try {
  const amplitudeModule = require('@amplitude/analytics-browser');
  amplitude = amplitudeModule.default || amplitudeModule;
  
  const API_KEY = '71f423db06513a8400f0f4f51b115aea';

  initAmplitude = () => {
    if (amplitude && typeof amplitude.init === 'function') {
      amplitude.init(API_KEY, {
        fetchRemoteConfig: true,
        serverZone: 'EU',
        autocapture: true,
        defaultTracking: {
          sessions: true,
          pageViews: true,
          formInteractions: true,
          fileDownloads: true,
        },
      });
    }
  };

  trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
    if (amplitude && typeof amplitude.track === 'function') {
      amplitude.track(eventName, eventProperties);
    }
  };

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

  setUserProperties = (userProperties: Record<string, any>) => {
    if (amplitude && typeof amplitude.Identify === 'function') {
      const identify = new amplitude.Identify();
      Object.entries(userProperties).forEach(([key, value]) => {
        identify.set(key, value);
      });
      amplitude.identify(identify);
    }
  };

  resetUser = () => {
    if (amplitude && typeof amplitude.reset === 'function') {
      amplitude.reset();
    }
  };
} catch (error) {
  console.warn('Amplitude analytics not available:', error);
  // Provide no-op functions
  initAmplitude = () => {};
  trackEvent = () => {};
  identifyUser = () => {};
  setUserProperties = () => {};
  resetUser = () => {};
}

export {
  initAmplitude,
  trackEvent,
  identifyUser,
  setUserProperties,
  resetUser
};

export default {
  init: initAmplitude,
  track: trackEvent,
  identify: identifyUser,
  setUserProperties,
  reset: resetUser,
};