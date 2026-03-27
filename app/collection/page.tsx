'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

type JokeUnlock = { captionId: string; content: string };
type ImageUnlock = { imageId: string; url: string };
type Match = {
  id: string;
  createdAt: string;
  joke: JokeUnlock;
  image: ImageUnlock;
  score: number;
};

const LS_KEYS = {
  unlockedJokes: 'blindBoxUnlockedJokes',
  unlockedImages: 'blindBoxUnlockedImages',
  matches: 'blindBoxMatches',
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function hashScore(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (h % 101) as number;
}

export default function CollectionPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jokes, setJokes] = useState<JokeUnlock[]>([]);
  const [images, setImages] = useState<ImageUnlock[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedJokeId, setSelectedJokeId] = useState<string>('');
  const [selectedImageId, setSelectedImageId] = useState<string>('');

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setAuthChecked(true);
    };
    void check();
  }, [router]);

  useEffect(() => {
    setJokes(readJson<JokeUnlock[]>(LS_KEYS.unlockedJokes, []));
    setImages(readJson<ImageUnlock[]>(LS_KEYS.unlockedImages, []));
    setMatches(readJson<Match[]>(LS_KEYS.matches, []));
  }, []);

  const selectedJoke = useMemo(
    () => jokes.find((j) => j.captionId === selectedJokeId) ?? null,
    [jokes, selectedJokeId]
  );
  const selectedImage = useMemo(
    () => images.find((im) => im.imageId === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const createMatch = () => {
    setError(null);
    if (!selectedJoke || !selectedImage) {
      setError('Pick one joke and one image to create a match.');
      return;
    }
    const createdAt = new Date().toISOString();
    const id = `${selectedJoke.captionId}:${selectedImage.imageId}:${createdAt}`;
    const score = hashScore(`${selectedJoke.captionId}|${selectedImage.imageId}`);
    const next: Match = {
      id,
      createdAt,
      joke: selectedJoke,
      image: selectedImage,
      score,
    };
    const updated = [next, ...matches];
    setMatches(updated);
    writeJson(LS_KEYS.matches, updated);
  };

  if (!authChecked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="mb-6 flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm text-gray-700">
            <a href="/gallery" className="hover:text-gray-900 hover:underline">
              Home
            </a>
            <a href="/upload" className="hover:text-gray-900 hover:underline">
              Upload image
            </a>
            <a href="/gallery" className="hover:text-gray-900 hover:underline">
              Rate captions
            </a>
          </nav>
          <button
            type="button"
            onClick={async () => {
              await getBrowserSupabaseClient().auth.signOut();
              router.replace('/');
            }}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <h2 className="mb-3 text-lg font-semibold">Unlocked jokes</h2>
            {jokes.length === 0 ? (
              <p className="text-sm text-gray-600">
                No jokes yet. Vote to unlock blind boxes.
              </p>
            ) : (
              <select
                value={selectedJokeId}
                onChange={(e) => setSelectedJokeId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
              >
                <option value="">Pick a joke…</option>
                {jokes.map((j) => (
                  <option key={j.captionId} value={j.captionId}>
                    {j.content.slice(0, 60)}
                    {j.content.length > 60 ? '…' : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedJoke && (
              <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                {selectedJoke.content}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <h2 className="mb-3 text-lg font-semibold">Unlocked images</h2>
            {images.length === 0 ? (
              <p className="text-sm text-gray-600">
                No images yet. Vote to unlock blind boxes.
              </p>
            ) : (
              <select
                value={selectedImageId}
                onChange={(e) => setSelectedImageId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
              >
                <option value="">Pick an image…</option>
                {images.map((im) => (
                  <option key={im.imageId} value={im.imageId}>
                    {im.imageId}
                  </option>
                ))}
              </select>
            )}
            {selectedImage && (
              <img
                src={selectedImage.url}
                alt="Selected"
                className="mt-3 h-64 w-full rounded-xl object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={createMatch}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create match
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-semibold">My matches</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-600">
              No matches yet—create your first combo.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <img
                    src={m.image.url}
                    alt=""
                    className="mb-3 h-48 w-full rounded-lg object-cover"
                  />
                  <p className="text-sm font-semibold text-gray-900">
                    Score: {m.score}/100
                  </p>
                  <p className="mt-2 text-sm text-gray-800">{m.joke.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

