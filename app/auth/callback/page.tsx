'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    // When this page loads after OAuth, Supabase JS will parse the URL and
    // persist the session. We then check for a session and route accordingly.
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          console.error(sessionError);
          setError('Authentication failed. Please try signing in again.');
          return;
        }

        if (!data.session) {
          setError('No active session found. Please sign in again.');
          return;
        }

        router.replace('/gallery');
      })
      .catch((err) => {
        console.error(err);
        setError('Something went wrong while completing sign-in.');
      });
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">
          Finishing sign-in…
        </h1>
        {error ? (
          <>
            <p className="mb-4 text-sm text-red-600">{error}</p>
            <a
              href="/login"
              className="text-sm font-medium text-black underline"
            >
              Go back to login
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Please wait while we complete your sign-in and redirect you to the
            gallery.
          </p>
        )}
      </div>
    </main>
  );
}

