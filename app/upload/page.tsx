'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import {
  uploadAndGenerateCaptions,
  isSupportedImageType,
  SUPPORTED_IMAGE_TYPES,
  type PipelineResult,
} from '@/lib/almostcrackdApi';

export default function UploadPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    const chosen = e.target.files?.[0];
    if (!chosen) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!isSupportedImageType(chosen.type)) {
      setFile(null);
      setFileError(
        `Unsupported type. Use: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
      );
      return;
    }
    setFile(chosen);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const supabase = getBrowserSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError('Not signed in.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const pipelineResult = await uploadAndGenerateCaptions(token, file);
      setResult(pipelineResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="mb-10 flex w-full max-w-4xl items-center justify-between">
        <a href="/gallery" className="text-3xl font-bold">
          Caption Blind Box
        </a>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm text-gray-700">
            <a
              href="/collection"
              className="hover:text-gray-900 hover:underline"
            >
              My collection
            </a>
            <a href="/gallery" className="hover:text-gray-900 hover:underline">
              Rate
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

      <div className="w-full max-w-2xl space-y-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="image"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Choose an image
            </label>
            <input
              id="image"
              type="file"
              accept={SUPPORTED_IMAGE_TYPES.join(',')}
              onChange={onFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-gray-800"
            />
            {fileError && (
              <p className="mt-1 text-sm text-red-600">{fileError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:bg-gray-400"
          >
            {isSubmitting ? 'Uploading & generating captions…' : 'Upload and caption'}
          </button>
        </form>

        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {result && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">Result</h2>
            {result.cdnUrl && (
              <img
                src={result.cdnUrl}
                alt="Uploaded"
                className="mb-4 max-h-[70vh] w-full rounded-xl bg-gray-50 object-contain"
              />
            )}
            <p className="mb-2 text-sm text-gray-600">
              Image ID: {result.imageId}
            </p>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Captions</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-800">
              {result.captions.map((item, i) => (
                <li key={i}>
                  {typeof item === 'string'
                    ? item
                    : item && typeof item === 'object' && 'content' in item
                      ? String((item as { content: unknown }).content)
                      : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
