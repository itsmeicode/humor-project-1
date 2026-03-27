'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';

type CaptionVoteControlsProps = {
  captionId: string | number;
  onVoted?: () => void;
};

export function CaptionVoteControls({
  captionId,
  onVoted,
}: CaptionVoteControlsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [captionId]);

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

      const session = sessionData.session;

      if (!session) {
        setError('Please sign in to vote on captions.');
        return;
      }

      const userId = session.user.id;
      console.log('Voting on caption:', {
        captionId,
        voteValue,
        userId,
      });

      const { error: insertError } = await supabase
        .from('caption_votes')
        .insert({
          caption_id: captionId,
          vote_value: voteValue,
          profile_id: userId,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        });

      if (insertError) {
        console.error(insertError);

        if (insertError.code === '23505' && onVoted) {
          onVoted();
          return;
        }

        setError(insertError.message);
        return;
      }

      if (onVoted) {
        onVoted();
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong while voting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVote(-1)}
          className="rounded-full border border-gray-300 px-4 py-2 text-base hover:bg-gray-50 disabled:opacity-60"
        >
          👎
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVote(1)}
          className="rounded-full border border-gray-300 px-4 py-2 text-base hover:bg-gray-50 disabled:opacity-60"
        >
          👍
        </button>
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

