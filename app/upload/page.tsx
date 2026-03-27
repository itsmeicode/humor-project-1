'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import {
  uploadAndGenerateCaptions,
  isSupportedImageType,
  SUPPORTED_IMAGE_TYPES,
  type PipelineResult,
} from '@/lib/almostcrackdApi';

type UploadHistoryItem = {
  id: string;
  createdAt: string;
  imageId: string;
  cdnUrl: string;
  captions: string[];
};

const LS_UPLOAD_HISTORY_KEY = 'blindBoxUploadHistory';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);

  const addUploadedImageToCollection = (pipeline: PipelineResult) => {
    if (typeof window === 'undefined') return;
    if (!pipeline.cdnUrl || !pipeline.imageId) return;

    const key = 'blindBoxUnlockedImages';
    type ImageUnlock = { imageId: string; url: string };
    const imageId = `upload:${pipeline.imageId}`;

    try {
      const existingRaw = window.localStorage.getItem(key);
      const existing = (existingRaw ? (JSON.parse(existingRaw) as ImageUnlock[]) : []) ?? [];
      if (existing.some((im) => im.imageId === imageId)) return;
      const updated: ImageUnlock[] = [
        { imageId, url: pipeline.cdnUrl },
        ...existing,
      ];
      window.localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore localStorage failures
    }
  };

  const extractCaptionStrings = (pipeline: PipelineResult): string[] => {
    const out: string[] = [];
    for (const item of pipeline.captions) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) out.push(trimmed);
        continue;
      }
      if (item && typeof item === 'object' && 'content' in item) {
        const content = (item as { content?: unknown }).content;
        if (typeof content === 'string' && content.trim()) out.push(content.trim());
      }
    }
    return out;
  };

  const loadUploadHistory = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LS_UPLOAD_HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as UploadHistoryItem[]) : [];
      setUploadHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setUploadHistory([]);
    }
  };

  const appendUploadHistory = (pipeline: PipelineResult) => {
    if (typeof window === 'undefined') return;
    if (!pipeline.cdnUrl || !pipeline.imageId) return;

    const captions = extractCaptionStrings(pipeline);
    const createdAt = new Date().toISOString();
    const entry: UploadHistoryItem = {
      id: `${pipeline.imageId}:${createdAt}`,
      createdAt,
      imageId: pipeline.imageId,
      cdnUrl: pipeline.cdnUrl,
      captions,
    };

    setUploadHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try {
        window.localStorage.setItem(LS_UPLOAD_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  };

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setAuthChecked(true);
      loadUploadHistory();
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
      addUploadedImageToCollection(pipelineResult);
      appendUploadHistory(pipelineResult);
      setFile(null);
      setFileError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <nav className="flex items-center gap-3">
            <a
              href="/collection"
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
            >
              My Collection
            </a>
            <a
              href="/gallery"
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
            >
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
              ref={fileInputRef}
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

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upload History</h2>
            <button
              type="button"
              onClick={loadUploadHistory}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          {uploadHistory.length === 0 ? (
            <p className="text-sm text-gray-600">
              No uploads yet. Upload an image to generate captions.
            </p>
          ) : (
            <div className="space-y-4">
              {uploadHistory.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <img
                    src={h.cdnUrl}
                    alt=""
                    className="mb-3 max-h-[45vh] w-full rounded-lg bg-gray-50 object-contain"
                  />
                  <p className="text-xs text-gray-600">
                    {new Date(h.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">Image ID: {h.imageId}</p>
                  <h3 className="mt-3 text-sm font-medium text-gray-800">
                    Captions
                  </h3>
                  {h.captions.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-600">
                      No captions found in the response.
                    </p>
                  ) : (
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-gray-800">
                      {h.captions.map((c, idx) => (
                        <li key={`${h.id}:${idx}`}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
