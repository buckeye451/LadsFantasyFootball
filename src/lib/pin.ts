import crypto from 'node:crypto';

/**
 * The commissioner's PIN, gating the writes anyone could otherwise trigger by
 * knowing a URL: posting or editing a recap, and pulling a fresh sync from
 * Sleeper. Override with RECAP_PIN in the environment.
 *
 * Server-only — never import this from a client component, or the PIN lands in
 * the browser bundle.
 */
const PIN = process.env.RECAP_PIN ?? '1252';

export function pinOk(pin: string | null | undefined): boolean {
  if (!pin) return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(PIN);
  // Constant-time compare, guarding the length mismatch timingSafeEqual throws on.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * The PIN on a request, whichever way it arrived: a header (what the in-app
 * buttons send, so it stays out of URLs and server logs) or a query parameter
 * (so a cron job or a browser visit can still trigger a sync).
 */
export function pinFrom(request: Request): string | null {
  const header = request.headers.get(PIN_HEADER);
  if (header) return header;
  return new URL(request.url).searchParams.get('pin');
}

export const PIN_HEADER = 'x-lads-pin';
