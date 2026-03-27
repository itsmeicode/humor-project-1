import { useState } from 'react';

export type RewardType = 'joke' | 'image';

export type JokeReward = {
  type: 'joke';
  captionId: string;
  content: string;
};

export type ImageReward = {
  type: 'image';
  imageId: string;
  url: string;
};

export type RewardOption = JokeReward | ImageReward;

type BlindBoxRewardProps = {
  rewardType: RewardType;
  options: RewardOption[];
  onPick: (picked: RewardOption) => void;
  onContinue: () => void;
};

export function BlindBoxReward({
  rewardType,
  options,
  onPick,
  onContinue,
}: BlindBoxRewardProps) {
  const [picked, setPicked] = useState<number | null>(null);

  const reveal = picked === null ? null : options[picked] ?? null;

  return (
    <div className="flex w-full flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-1 text-xl font-semibold text-gray-900">
        Blind box unlocked
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Pick a mystery box to reveal your {rewardType === 'joke' ? 'joke' : 'image'}.
      </p>

      {picked === null ? (
        <div className="grid w-full grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => {
            const disabled = !options[i];
            return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setPicked(i)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mystery box
            </button>
          )})}
        </div>
      ) : (
        <div className="w-full">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-base font-semibold text-gray-900">Your reward</p>
            {reveal?.type === 'joke' ? (
              <p className="mt-2 text-sm text-gray-800">{reveal.content}</p>
            ) : reveal?.type === 'image' ? (
              <img
                src={reveal.url}
                alt="Reward"
                className="mt-3 max-h-[60vh] w-full rounded-xl bg-gray-50 object-contain"
              />
            ) : (
              <p className="mt-2 text-sm text-red-700">Missing reward option.</p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                const selected = reveal;
                if (selected) onPick(selected);
                onContinue();
              }}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save reward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

