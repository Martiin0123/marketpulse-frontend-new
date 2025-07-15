import * as amplitude from '@amplitude/analytics-browser';

const API_KEY = '71f423db06513a8400f0f4f51b115aea';

export const initAmplitude = () => {
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
};

export const trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
  amplitude.track(eventName, eventProperties);
};

export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  amplitude.setUserId(userId);
  
  if (userProperties) {
    const identify = new amplitude.Identify();
    Object.entries(userProperties).forEach(([key, value]) => {
      identify.set(key, value);
    });
    amplitude.identify(identify);
  }
};

export const setUserProperties = (userProperties: Record<string, any>) => {
  const identify = new amplitude.Identify();
  Object.entries(userProperties).forEach(([key, value]) => {
    identify.set(key, value);
  });
  amplitude.identify(identify);
};

export const resetUser = () => {
  amplitude.reset();
};

export default {
  init: initAmplitude,
  track: trackEvent,
  identify: identifyUser,
  setUserProperties,
  reset: resetUser,
};