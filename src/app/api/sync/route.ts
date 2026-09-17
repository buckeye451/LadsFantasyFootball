import { NextResponse } from 'next/server';
import { requireLeagueIds, syncAll, syncLeague } from '@/lib/sync';
import { pinFrom, pinOk } from '@/lib/pin';

export const dynamic = 'force-dynamic';

// One sync at a time per server process. The in-app sync button, the auto-sync
// interval and a cron ping can all land at once; running two at once would
// double the calls to Sleeper for no benefit.
const globalForSync = globalThis as unknown as { __syncRunning?: boolean };

// Every call needs the commissioner's PIN — as the x-lads-pin header (what the
// dashboard's Sync button sends) or as ?pin=<pin> for a cron job or a browser.
//
// POST /api/sync                     → routine sync (skips completed seasons already stored)
// POST /api/sync?full=1              → force a complete re-import of every configured season
// POST /api/sync?league=<id>         → routine sync of just that league/season (the in-app button)
// POST /api/sync?league=<id>&full=1  → force a complete re-fetch of one season
//                                      (use this to repair a season that synced incompletely)
export async function POST(request: Request) {
  if (!pinOk(pinFrom(request))) {
    return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
  }
  if (globalForSync.__syncRunning) {
    return NextResponse.json(
      { ok: false, error: 'A sync is already running. Give it a minute and try again.' },
      { status: 409 }
    );
  }
  globalForSync.__syncRunning = true;
  const started = Date.now();
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get('league');
    const full = url.searchParams.get('full') === '1';
    const detail = league
      ? await syncLeague(league, full)
      : await syncAll(requireLeagueIds(), { full });
    return NextResponse.json({ ok: true, detail, seconds: Math.round((Date.now() - started) / 100) / 10 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    globalForSync.__syncRunning = false;
  }
}

// Convenience so a browser visit (or a simple cron ping) can trigger a sync too.
export async function GET(request: Request) {
  return POST(request);
}
