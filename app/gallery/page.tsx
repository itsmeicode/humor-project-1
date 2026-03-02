'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import { CaptionVoteControls } from './CaptionVoteControls';

type ImageRow = {
  id: string | number;
  url: string;
};

type Caption = {
  id: string | number;
  content: string;
  image_id: string | number;
};

export default function GalleryPage() {
  const router = useRouter();
  const [image, setImage] = useState<ImageRow | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
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

        const {
          data: captionData,
          error: captionError,
        } = await supabase
          .from('captions')
          .select('id, content, image_id')
          .eq('is_public', true)
          .order('created_datetime_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (captionError) {
          setError(captionError.message);
          return;
        }

        if (!captionData) {
          setError('No captions found.');
          return;
        }

        setCaption({
          id: captionData.id,
          content: captionData.content,
          image_id: captionData.image_id,
        });

        const {
          data: imageData,
          error: imagesError,
        } = await supabase
          .from('images')
          .select('id, url')
          .eq('id', captionData.image_id)
          .maybeSingle();

        if (imagesError) {
          setError(imagesError.message);
        } else if (!imageData) {
          setError('No image found for this caption.');
        } else {
          setImage(imageData);
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

  if (!image || !caption) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Gallery</h1>
        <p className="text-sm text-gray-600">No image and caption to display.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="mb-6 flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <img
            src={image.url}
            alt=""
            className="mb-6 h-80 w-full rounded-xl object-cover"
          />
          <p className="mb-4 text-center text-lg font-semibold text-gray-900">
            {caption.content}
          </p>
          <CaptionVoteControls captionId={caption.id} />
        </div>
      </div>
    </main>
  );
}