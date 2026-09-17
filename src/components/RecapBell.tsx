'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { daysOld, isRecapFresh } from '@/lib/recency';

export interface BellRecap {
  id: number;
  season: string;
  title: string;
  preheader: string | null;
  createdAt: string;
}

function postedLabel(iso: string): string {
  const d = daysOld(iso);
  if (d < 1) return 'Posted today';
  if (d < 2) return 'Posted yesterday';
  if (d < 7) return `Posted ${Math.floor(d)} days ago`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'Posted recently'
    : `Posted ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/**
 * Header bell that flags a recap posted in the last week and previews it.
 *
 * The "is it new" test runs on the client rather than the server so it can't
 * be frozen into a cached render — and because the answer depends on the
 * reader's own clock, not the server's.
 */
export function RecapBell({ recap }: { recap: BellRecap | null }) {
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFresh(recap != null && isRecapFresh(recap.createdAt));
  }, [recap]);

  // Dismiss on an outside click or Escape, the way a menu is expected to work.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const href = recap ? `/recaps?season=${recap.season}#recap-${recap.id}` : '/recaps';

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bell-button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={fresh ? 'Notifications — a new recap was posted' : 'Notifications'}
        title="Recap notifications"
      >
        <span aria-hidden="true">🔔</span>
        {fresh && <span className="bell-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div className="bell-popover" role="dialog" aria-label="Latest recap">
          <div className="bell-popover-head">Latest recap</div>
          {recap ? (
            <>
              <Link className="bell-post" href={href} onClick={() => setOpen(false)}>
                <span className="bell-post-body">
                  <span className="bell-post-title">{recap.title}</span>
                  {recap.preheader && (
                    <span className="bell-post-sub">{recap.preheader}</span>
                  )}
                  <span className="bell-post-meta">
                    {recap.season} · {postedLabel(recap.createdAt)}
                  </span>
                </span>
                <span className="bell-post-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </>
          ) : (
            <p className="bell-empty">No recaps posted yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
