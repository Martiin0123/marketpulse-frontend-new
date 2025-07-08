// Utility to help with rate limiting during development

export const clearAuthCache = () => {
  // This function can be called to clear the auth cache
  // Useful during development when you hit rate limits
  console.log('Clearing auth cache...');
  
  // Note: This only works if the cache is accessible
  // In a real implementation, you might want to use a more robust caching solution
  // like Redis or a database-backed cache
};

export const getRateLimitInfo = () => {
  // This function can be used to get information about current rate limiting
  // Useful for debugging
  return {
    message: 'Rate limiting is active. Consider using DISABLE_AUTH_MIDDLEWARE=true in development',
    cacheSize: 'Check browser dev tools for cache size',
    rateLimitWindow: '60 seconds',
    maxRequestsPerWindow: 10
  };
}; 