// Amplitude analytics with fallback functions
// This file provides analytics functions that work even if Amplitude is not installed

const API_KEY = '71f423db06513a8400f0f4f51b115aea';

// No-op functions as fallbacks
const noop = () => {};

export const initAmplitude = noop;
export const trackEvent = noop;
export const identifyUser = noop;
export const setUserProperties = noop;
export const resetUser = noop;

export default {
  init: initAmplitude,
  track: trackEvent,
  identify: identifyUser,
  setUserProperties,
  reset: resetUser,
};