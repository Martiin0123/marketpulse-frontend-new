// Environment variable validation utility
export const validateEnvironmentVariables = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    console.log('Available environment variables:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
    return false;
  }
  
  return true;
};

// Debug function to log environment status
export const debugEnvironment = () => {
  console.log('Environment Debug:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
    allNextPublicVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
  });
};