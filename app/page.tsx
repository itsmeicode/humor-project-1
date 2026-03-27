'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/gallery');
      }
    };
    void check();
  }, [router]);

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
    } catch (err) {
      console.error(err);
      setError('Failed to start Google sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-3xl font-bold">Welcome to the Gallery</h1>
      <p className="mb-4 max-w-md text-center text-sm text-gray-600">
        Sign in with Google to view your Supabase-hosted images in the protected
        gallery.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
      >
        {isLoading ? 'Redirecting…' : 'Sign in with Google'}
      </button>
    </main>
  );
}
