'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import { CaptionVoteControls } from './CaptionVoteControls';
import {
  BlindBoxReward,
  type RewardOption,
  type RewardType,
} from './BlindBoxReward';

type ImageRow = {
  id: string | number;
  url: string;
};

type Caption = {
  id: string | number;
  content: string;
  image_id: string | number;
};

type JokeUnlock = { captionId: string; content: string };
type ImageUnlock = { imageId: string; url: string };

const LS_KEYS = {
  voteCount: 'blindBoxVoteCount',
  unlockedJokes: 'blindBoxUnlockedJokes',
  unlockedImages: 'blindBoxUnlockedImages',
} as const;

export default function GalleryPage() {
  const router = useRouter();
  const [image, setImage] = useState<ImageRow | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedCaptionIds, setVotedCaptionIds] = useState<(string | number)[]>(
    []
  );
  const [captionPool, setCaptionPool] = useState<Caption[]>([]);
  const [blindBoxVoteCount, setBlindBoxVoteCount] = useState(0);
  const [showBlindBox, setShowBlindBox] = useState(false);
  const [showArrowTip, setShowArrowTip] = useState(false);
  const [rewardType, setRewardType] = useState<RewardType>('joke');
  const [rewardOptions, setRewardOptions] = useState<RewardOption[]>([]);
  const [rewardError, setRewardError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = Number(window.localStorage.getItem(LS_KEYS.voteCount) ?? '0');
    setBlindBoxVoteCount(Number.isFinite(current) ? current : 0);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();

        const session = sessionData.session;

        if (!session) {
          router.replace('/');
          return;
        }

        setAuthChecked(true);

        if (typeof window !== 'undefined') {
          const tipKey = 'arrowVoteTipDismissed';
          const dismissed = window.localStorage.getItem(tipKey) === '1';
          if (!dismissed) setShowArrowTip(true);
        }

        const {
          data: existingVotes,
          error: votesError,
        } = await supabase
          .from('caption_votes')
          .select('caption_id')
          .eq('profile_id', session.user.id);

        if (votesError) {
          setError(votesError.message);
          return;
        }

        const alreadyVotedIds =
          existingVotes?.map((v) => v.caption_id as string | number) ?? [];
        setVotedCaptionIds(alreadyVotedIds);

        const {
          data: captionsData,
          error: captionsError,
        } = await supabase
          .from('captions')
          .select('id, content, image_id')
          .eq('is_public', true)
          .not('content', 'is', null)
          .neq('content', '')
          .order('created_datetime_utc', { ascending: false })
          .limit(50);

        if (captionsError) {
          setError(captionsError.message);
          return;
        }
        const pool =
          captionsData?.map((c) => ({
            id: c.id as string | number,
            content: c.content as string,
            image_id: c.image_id as string | number,
          })) ?? [];
        setCaptionPool(pool);

        const votedSet = new Set<string | number>(alreadyVotedIds);
        const storedId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('currentCaptionId')
            : null;

        const chosen =
          (storedId &&
            captionsData?.find(
              (c) =>
                String(c.id) === storedId &&
                !votedSet.has(c.id as string | number)
            )) ||
          captionsData?.find(
            (c) => !votedSet.has(c.id as string | number)
          ) ||
          null;

        if (!chosen) {
          setError('No new captions to rate.');
          return;
        }

        setCaption({
          id: chosen.id,
          content: chosen.content,
          image_id: chosen.image_id,
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'currentCaptionId',
            String(chosen.id)
          );
        }

        const {
          data: imageData,
          error: imagesError,
        } = await supabase
          .from('images')
          .select('id, url')
          .eq('id', chosen.image_id)
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

  const loadNextCaption = async () => {
    if (!caption) return;

    try {
      const supabase = getBrowserSupabaseClient();

      const allVotedIds = [...votedCaptionIds, caption.id];

      const {
        data: nextCaptions,
        error: nextCaptionsError,
      } = await supabase
        .from('captions')
        .select('id, content, image_id')
        .eq('is_public', true)
        .not('content', 'is', null)
        .neq('content', '')
        .lt('id', caption.id)
        .order('id', { ascending: false })
        .limit(50);

      if (nextCaptionsError) {
        setError(nextCaptionsError.message);
        return;
      }

      if (nextCaptions && nextCaptions.length > 0) {
        setCaptionPool((prev) => {
          const merged = [...prev];
          for (const c of nextCaptions) {
            if (!merged.some((m) => String(m.id) === String(c.id))) {
              merged.push({
                id: c.id as string | number,
                content: c.content as string,
                image_id: c.image_id as string | number,
              });
            }
          }
          return merged.slice(0, 120);
        });
      }

      const votedSet = new Set<string | number>(allVotedIds);
      const nextCaption =
        nextCaptions?.find(
          (c) => !votedSet.has(c.id as string | number)
        ) || null;

      if (!nextCaption) {
        setError('No more captions to rate.');
        return;
      }

      setCaption({
        id: nextCaption.id,
        content: nextCaption.content,
        image_id: nextCaption.image_id,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'currentCaptionId',
          String(nextCaption.id)
        );
      }

      const {
        data: nextImage,
        error: nextImageError,
      } = await supabase
        .from('images')
        .select('id, url')
        .eq('id', nextCaption.image_id)
        .maybeSingle();

      if (nextImageError) {
        setError(nextImageError.message);
      } else if (!nextImage) {
        setError('No image found for this caption.');
      } else {
        setImage(nextImage);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load the next caption.');
    }
  };

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

  const readJson = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  const pickUnique = <T,>(arr: T[], count: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    while (copy.length > 0 && out.length < count) {
      const idx = Math.floor(Math.random() * copy.length);
      const [item] = copy.splice(idx, 1);
      if (item !== undefined) out.push(item);
    }
    return out;
  };

  const savePickedReward = (picked: RewardOption) => {
    setRewardError(null);
    if (picked.type === 'joke') {
      const existing = readJson<JokeUnlock[]>(LS_KEYS.unlockedJokes, []);
      if (!existing.some((j) => j.captionId === picked.captionId)) {
        writeJson(LS_KEYS.unlockedJokes, [
          ...existing,
          { captionId: picked.captionId, content: picked.content },
        ]);
      }
      return;
    }
    const existing = readJson<ImageUnlock[]>(LS_KEYS.unlockedImages, []);
    if (!existing.some((im) => im.imageId === picked.imageId)) {
      writeJson(LS_KEYS.unlockedImages, [
        ...existing,
        { imageId: picked.imageId, url: picked.url },
      ]);
    }
  };

  const prepareRewardOptions = async (type: RewardType) => {
    setRewardError(null);
    const supabase = getBrowserSupabaseClient();

    if (type === 'joke') {
      const unlocked = readJson<JokeUnlock[]>(LS_KEYS.unlockedJokes, []);
      const unlockedIds = new Set(unlocked.map((j) => j.captionId));
      const candidates = captionPool.filter(
        (c) =>
          !!c.content &&
          !unlockedIds.has(String(c.id)) &&
          String(c.id) !== String(caption.id)
      );
      const chosen = pickUnique(candidates, 4);
      setRewardOptions(
        chosen.map((c) => ({
          type: 'joke',
          captionId: String(c.id),
          content: c.content,
        }))
      );
      return;
    }

    const unlocked = readJson<ImageUnlock[]>(LS_KEYS.unlockedImages, []);
    const unlockedIds = new Set(unlocked.map((im) => im.imageId));
    const imageIds = Array.from(
      new Set(
        captionPool
          .map((c) => String(c.image_id))
          .filter((id) => id && !unlockedIds.has(id))
      )
    );

    const chosenIds = pickUnique(imageIds, 4);
    if (chosenIds.length === 0) {
      setRewardOptions([]);
      return;
    }

    const { data, error: imgErr } = await supabase
      .from('images')
      .select('id, url')
      .in('id', chosenIds);

    if (imgErr) {
      setRewardError(imgErr.message);
      setRewardOptions([]);
      return;
    }

    const urlById = new Map<string, string>(
      (data ?? []).map((row) => [String(row.id), String(row.url)])
    );

    const opts = chosenIds.flatMap((id) => {
      const url = urlById.get(id);
      if (!url) return [];
      return [{ type: 'image', imageId: id, url } satisfies RewardOption];
    });

    setRewardOptions(opts);
  };

  const incrementVoteCountAndMaybeShowReward = () => {
    if (typeof window === 'undefined') return;
    const current = Number(window.localStorage.getItem(LS_KEYS.voteCount) ?? '0');
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(LS_KEYS.voteCount, String(next));
    setBlindBoxVoteCount(next);
    if (next % 5 === 0) {
      const rewardIndex = Math.floor(next / 5);
      const nextType: RewardType = rewardIndex % 2 === 1 ? 'joke' : 'image';
      setRewardType(nextType);
      setRewardOptions([]);
      setShowBlindBox(true);
      void prepareRewardOptions(nextType);
      setShowBlindBox(true);
    }
  };

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
              href="/upload"
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
            >
              Upload Image
            </a>
          </nav>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>
      <div className="w-full max-w-2xl">
        {showBlindBox ? (
          <div className="space-y-3">
            {rewardError && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {rewardError}
              </p>
            )}
            <BlindBoxReward
              rewardType={rewardType}
              options={rewardOptions}
              onPick={savePickedReward}
              onContinue={() => setShowBlindBox(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <div className="mb-6 flex h-[55vh] w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50">
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mb-4 text-center text-lg font-semibold text-gray-900">
              {caption.content}
            </p>
            {showArrowTip && (
              <div className="mb-4 flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Tip: Use your keyboard
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Press <span className="font-semibold">←</span> to downvote and{' '}
                    <span className="font-semibold">→</span> to upvote.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowArrowTip(false);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('arrowVoteTipDismissed', '1');
                    }
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-white"
                >
                  Got it
                </button>
              </div>
            )}
            <div className="mb-5 w-full">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>Total votes: {blindBoxVoteCount}</span>
                <span>Rewards every 5 votes</span>
              </div>
              {(() => {
                const current = Math.max(0, blindBoxVoteCount);
                const step = 5;
                const windowSize = 15;

                // Under 15 votes: show 5/10/15.
                // After that: keep the recently completed segment visible by sliding a 15-vote window
                // that starts 5 votes before the last reward (e.g. at 15 => 10..25).
                const lastReward = Math.floor(current / step) * step;
                const start = current < windowSize ? 0 : Math.max(0, lastReward - step);
                const end = start + windowSize;
                const pct = ((current - start) / (end - start)) * 100;

                const showLeftLabel = start !== 0;
                const l0 = start; // left edge
                const l1 = start + 5;
                const l2 = start + 10;
                const l3 = start + 15; // right edge
                return (
                  <div className="relative">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-gray-900"
                        style={{
                          width: `${Math.max(0, Math.min(100, pct))}%`,
                        }}
                      />
                      <div className="absolute inset-0">
                        <div className="absolute left-1/3 top-0 h-full w-px bg-gray-300" />
                        <div className="absolute left-2/3 top-0 h-full w-px bg-gray-300" />
                        <div className="absolute right-0 top-0 h-full w-px bg-gray-300" />
                      </div>
                    </div>
                    <div className="relative mt-1 h-4 text-[11px] text-gray-600">
                      {showLeftLabel ? (
                        <span className="absolute left-0">{l0}</span>
                      ) : null}
                      <span className="absolute left-1/3 -translate-x-1/2">
                        {l1}
                      </span>
                      <span className="absolute left-2/3 -translate-x-1/2">
                        {l2}
                      </span>
                      <span className="absolute right-0 translate-x-0">{l3}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <CaptionVoteControls
              captionId={caption.id}
              onVoted={() => {
                setVotedCaptionIds((prev) => [...prev, caption.id]);
                incrementVoteCountAndMaybeShowReward();
                void loadNextCaption();
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}