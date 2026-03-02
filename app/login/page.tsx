'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      // The browser will be redirected away; no further action needed here.
    } catch (err) {
      console.error(err);
      setError('Failed to start Google sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">
          Sign in to view the gallery
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Use your Google account to sign in. You&apos;ll be redirected back to
          the app after authentication.
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        >
          {isLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-4 w-full text-center text-sm text-gray-600 underline"
        >
          Back to home
        </button>
      </div>
    </main>
  );
}

