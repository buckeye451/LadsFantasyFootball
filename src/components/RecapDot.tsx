'use client';

import { useEffect, useState } from 'react';
import { RECAP_FRESH_DAYS, isRecapFresh } from '@/lib/recency';

/**
 * The alert dot on the dashboard's "Latest recap" tile: a faint red pulse
 * while the newest post is less than a week old, and nothing at all once it
 * has gone stale.
 *
 * The server's verdict seeds the first render so the markup hydrates without a
 * flicker or a jump, then the reader's own clock has the final say — which
 * matters for a page anyone might leave open past midnight.
 */
export function RecapDot({
  createdAt,
  initialFresh,
}: {
  createdAt: string;
  /** Computed by the server with isRecapFresh, so SSR and hydration agree. */
  initialFresh: boolean;
}) {
  const [fresh, setFresh] = useState(initialFresh);

  useEffect(() => {
    setFresh(isRecapFresh(createdAt));
  }, [createdAt]);

  if (!fresh) return null;

  return (
    <span className="recap-alert">
      <span className="recap-alert-dot" aria-hidden="true" />
      <span className="sr-only">
        New — posted in the last {RECAP_FRESH_DAYS} days
      </span>
    </span>
  );
}
