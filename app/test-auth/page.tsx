'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestAuthPage() {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState<string | null>(null);

  const testSupabaseConnection = async () => {
    try {
      setStatus('Testing Supabase connection...');
      const supabase = createClient();

      // Test basic connection
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setError(`Auth error: ${error.message}`);
        setStatus('Failed');
      } else {
        setStatus(
          `Connected successfully. User: ${data.user ? 'Logged in' : 'Not logged in'}`
        );
        setError(null);
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
      setStatus('Failed');
    }
  };

  const testURLHelper = () => {
    try {
      setStatus('Testing URL helper...');
      // Import dynamically to avoid issues
      import('@/utils/helpers')
        .then(({ getURL }) => {
          const url = getURL('/test');
          setStatus(`URL helper working: ${url}`);
          setError(null);
        })
        .catch((err: any) => {
          setError(`URL helper error: ${err.message}`);
          setStatus('Failed');
        });
    } catch (err: any) {
      setError(`Test error: ${err.message}`);
      setStatus('Failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Environment Variables:</h2>
          <p>
            NEXT_PUBLIC_SUPABASE_URL:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set'}
          </p>
          <p>
            NEXT_PUBLIC_SUPABASE_ANON_KEY:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set'}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Tests:</h2>
          <div className="space-y-4">
            <button
              onClick={testSupabaseConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Supabase Connection
            </button>

            <button
              onClick={testURLHelper}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-4"
            >
              Test URL Helper
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Status:</h2>
          <p className="text-blue-400">{status}</p>
          {error && <p className="text-red-400 mt-2">Error: {error}</p>}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Navigation:</h2>
          <div className="space-x-4">
            <a href="/signin" className="text-blue-400 hover:text-blue-300">
              Go to Sign In
            </a>
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300">
              Go to Dashboard
            </a>
            <a href="/" className="text-blue-400 hover:text-blue-300">
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
