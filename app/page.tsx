'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalVotes: number;
    jokes: number;
    images: number;
    matches: number;
  } | null>(null);

  const resetLocalProgress = () => {
    if (typeof window === 'undefined') return;
    const keys = [
      'blindBoxVoteCount',
      'blindBoxUnlockedJokes',
      'blindBoxUnlockedImages',
      'blindBoxMatches',
      'blindBoxUploadHistory',
      'arrowVoteTipDismissed',
    ];
    for (const k of keys) window.localStorage.removeItem(k);
    setStats({ totalVotes: 0, jokes: 0, images: 0, matches: 0 });
  };

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const totalVotes = Number(
        window.localStorage.getItem('blindBoxVoteCount') ?? '0'
      );
      const jokesRaw = window.localStorage.getItem('blindBoxUnlockedJokes');
      const imagesRaw = window.localStorage.getItem('blindBoxUnlockedImages');
      const matchesRaw = window.localStorage.getItem('blindBoxMatches');

      const jokes = jokesRaw ? (JSON.parse(jokesRaw) as unknown[]) : [];
      const images = imagesRaw ? (JSON.parse(imagesRaw) as unknown[]) : [];
      const matches = matchesRaw ? (JSON.parse(matchesRaw) as unknown[]) : [];

      setStats({
        totalVotes: Number.isFinite(totalVotes) ? totalVotes : 0,
        jokes: Array.isArray(jokes) ? jokes.length : 0,
        images: Array.isArray(images) ? images.length : 0,
        matches: Array.isArray(matches) ? matches.length : 0,
      });
    } catch {
      setStats(null);
    }
  }, []);

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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <p className="mb-2 text-xs font-semibold tracking-widest text-gray-500">
              WELCOME TO THE ARCADE
            </p>
            <h1 className="text-4xl font-bold text-gray-900">
              Caption Blind Box
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-600">
              Open rewards by rating captions. Build your collection. Make cursed
              combos.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">1) Rate</p>
              <p className="mt-1 text-sm text-gray-600">
                Vote on captions to keep the streak going.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">2) Unlock</p>
              <p className="mt-1 text-sm text-gray-600">
                Every 5 votes opens a blind box reward.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">3) Match</p>
              <p className="mt-1 text-sm text-gray-600">
                Combine images + jokes into scored matches.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {stats ? (
              <>
                <p className="text-sm text-gray-700">
                  On this device, you’ve opened{' '}
                <span className="font-semibold text-gray-900">
                  {Math.floor(Math.max(0, stats.totalVotes) / 5)}
                </span>{' '}
                boxes •{' '}
                <span className="font-semibold text-gray-900">{stats.jokes}</span>{' '}
                jokes •{' '}
                <span className="font-semibold text-gray-900">{stats.images}</span>{' '}
                images •{' '}
                <span className="font-semibold text-gray-900">
                  {stats.matches}
                </span>{' '}
                matches
                </p>
                <button
                  type="button"
                  onClick={resetLocalProgress}
                  className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
                >
                  Reset local progress
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-700">
                Start your streak: <span className="font-semibold">5 votes</span>{' '}
                = <span className="font-semibold">1 blind box</span>.
              </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="lobby-cta rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? 'Entering…' : 'Enter the Blind Box Arcade'}
            </button>
            <p className="text-xs text-gray-500">
              Sign in with Google to save your session.
            </p>
          </div>
        </div>
    </main>
  );
}
