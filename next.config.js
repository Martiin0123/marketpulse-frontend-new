/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't use 'standalone' output for Vercel - it uses serverless functions by default
  // output: 'standalone', // Only for Docker/Railway deployments
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
  images: {
    domains: [],
    // Ensure Sharp is used for image optimization in production
    loader: 'default',
    formats: ['image/webp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure environment variables are available at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Add runtime configuration for better debugging
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Add webpack configuration to help with module resolution
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
};

// Log environment variables during build
console.log('Build-time environment check:', {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Available' : '✗ Missing',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Available' : '✗ Missing',
  NODE_ENV: process.env.NODE_ENV,
});

module.exports = nextConfig; 