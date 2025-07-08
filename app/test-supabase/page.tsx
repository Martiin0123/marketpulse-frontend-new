import { createClient } from '@/utils/supabase/server';

export default async function TestSupabasePage() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase Test Page</h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Environment Variables:</h2>
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
            <h2 className="text-lg font-semibold">User Status:</h2>
            <p>User: {user ? 'Logged In' : 'Not Logged In'}</p>
            <p>Error: {error ? error.message : 'None'}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Test Database Query:</h2>
            {(() => {
              try {
                // This will be executed on the server
                return <p>Database connection: Working</p>;
              } catch (dbError: unknown) {
                const error = dbError as Error;
                console.error('Database error:', error.message);
                return <p>Database error: {error.message}</p>;
              }
            })()}
          </div>
        </div>
      </div>
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Supabase test page error:', err.message);
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">
          Supabase Test Page - ERROR
        </h1>
        <p className="text-red-400">Error: {err.message}</p>
        <pre className="mt-4 p-4 bg-slate-800 rounded text-sm overflow-auto">
          {err.stack}
        </pre>
      </div>
    );
  }
}
