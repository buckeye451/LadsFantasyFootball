'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

/** Sleeper's own numbers arrive in chunks; a sync can take a while. */
const TIMEOUT_MS = 180_000;

/** How long after a sync the button still says so. */
const FRESH_MS = 90_000;

const FLAG = 'lads-synced';

/** Matches the header the sync route reads; the PIN never rides in the URL. */
const PIN_HEADER = 'x-lads-pin';

/**
 * router.refresh() re-suspends the page into loading.tsx, which unmounts this
 * button — so the confirmation outlives the component in session storage and
 * is restored on mount, the way SegTabs restores its mode.
 */
function readFlag(leagueId: string): boolean {
  try {
    const raw = sessionStorage.getItem(FLAG);
    if (!raw) return false;
    const flag = JSON.parse(raw) as { leagueId?: string; at?: number };
    if (flag.leagueId !== leagueId || typeof flag.at !== 'number') return false;
    if (Date.now() - flag.at > FRESH_MS) {
      sessionStorage.removeItem(FLAG);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Pulls one season from Sleeper on demand, so the league doesn't have to wait
 * for the next automatic sync to see a score land.
 *
 * Scoped to a single league id — the season the reader is looking at — rather
 * than every configured season, which is what /api/sync does bare. Behind the
 * commissioner's PIN, checked on the server with every request: a sync is a
 * write, and it costs Sleeper a burst of API calls.
 */
export function SyncButton({ leagueId, season }: { leagueId: string; season: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [asking, setAsking] = useState(false);
  const [pin, setPin] = useState('');
  // router.refresh() re-renders the page's server components; without tracking
  // it the button would go idle while the numbers on screen were still stale.
  const [refreshing, startTransition] = useTransition();
  const busy = state.kind === 'running' || refreshing;

  // After mount, so the server's markup and the first client render match.
  useEffect(() => {
    if (readFlag(leagueId)) setState({ kind: 'done' });
  }, [leagueId]);

  const close = () => {
    setAsking(false);
    setPin('');
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !pin) return;
    setState({ kind: 'running' });
    setAsking(false);
    const timer = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    try {
      const res = await fetch(`/api/sync?league=${encodeURIComponent(leagueId)}`, {
        method: 'POST',
        headers: { [PIN_HEADER]: pin },
        signal: timer,
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; detail?: string; error?: string }
        | null;
      if (res.status === 401) throw new Error('That PIN is not right.');
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `sync failed (HTTP ${res.status})`);
      }
      try {
        sessionStorage.setItem(FLAG, JSON.stringify({ leagueId, at: Date.now() }));
      } catch {
        // private mode / blocked storage — the confirmation just won't persist
      }
      setState({ kind: 'done' });
      startTransition(() => router.refresh());
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const message =
        err instanceof DOMException && err.name === 'TimeoutError'
          ? 'Timed out. It may still be running — reload in a minute.'
          : // The route stringifies the thrown error, so drop the prefix.
            raw.replace(/^Error:\s*/, '');
      setState({ kind: 'error', message });
    } finally {
      setPin('');
    }
  };

  return (
    <div className="sync-control">
      <button
        type="button"
        className={`sync-button${busy ? ' busy' : ''}`}
        onClick={() => setAsking(true)}
        disabled={busy}
        aria-busy={busy}
        title={`Pull ${season} from Sleeper now`}
      >
        <span className="sync-glyph" aria-hidden="true">
          ↻
        </span>
        {busy ? 'Syncing…' : `Sync ${season}`}
      </button>
      <span className="sync-status" role="status" aria-live="polite">
        {state.kind === 'error' ? (
          <span className="sync-status-error">{state.message}</span>
        ) : busy ? (
          'pulling from Sleeper…'
        ) : state.kind === 'done' ? (
          'synced just now'
        ) : null}
      </span>

      {asking && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Sync ${season}`}
          >
            <form onSubmit={run}>
              <h3 className="modal-title">Enter PIN</h3>
              <p className="card-note">
                Syncing {season} from Sleeper is limited to the commissioner.
              </p>
              <input
                className="modal-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!pin}>
                  Sync now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
