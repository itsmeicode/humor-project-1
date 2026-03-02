'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

type ImageRow = {
  id: string | number;
  url: string;
};

export default function GalleryPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          router.replace('/');
          return;
        }

        setAuthChecked(true);

        const { data, error: imagesError } = await supabase
          .from('images')
          .select('id, url');

        if (imagesError) {
          setError(imagesError.message);
        } else {
          setImages(data ?? []);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load gallery.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!authChecked || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-600">Loading your gallery…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Gallery</h1>
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm font-medium text-black underline"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (!images || images.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Gallery</h1>
        <p className="text-sm text-gray-600">No images found.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="flex w-full max-w-4xl items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="rounded-lg border border-gray-200 bg-white p-2"
          >
            <img
              src={img.url}
              alt=""
              className="h-40 w-full rounded-md object-cover"
            />
          </div>
        ))}
      </div>
    </main>
  );
}

