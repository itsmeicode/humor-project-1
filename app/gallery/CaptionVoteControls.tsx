'use client';

import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

type CaptionVoteControlsProps = {
  captionId: string | number;
};

export function CaptionVoteControls({ captionId }: CaptionVoteControlsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async (voteValue: number) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getBrowserSupabaseClient();

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        setError('Could not check your session. Please try again.');
        return;
      }

      if (!sessionData.session) {
        setError('Please sign in to vote on captions.');
        return;
      }

      const { error: insertError } = await supabase.from('caption_votes').insert(
        {
          caption_id: captionId,
          vote_value: voteValue,
        }
      );

      if (insertError) {
        setError('Failed to record your vote. Please try again.');
        return;
      }

      setHasVoted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while voting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleVote(1)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
      >
        👍
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleVote(-1)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
      >
        👎
      </button>
      {hasVoted && !error && (
        <span className="text-xs text-gray-600">Thanks for voting!</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

