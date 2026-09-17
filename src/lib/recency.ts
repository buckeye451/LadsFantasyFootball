/**
 * How recently a recap counts as "new" — shared by the header's notification
 * bell and the dashboard tile's alert dot, so the two can never disagree about
 * what's new.
 *
 * Plain date maths with no database or DOM behind it, so both the server
 * components and the client components can import it.
 */
export const RECAP_FRESH_DAYS = 7;

/** Age of an ISO timestamp in days, or Infinity if it can't be parsed. */
export function daysOld(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86_400_000;
}

export function isRecapFresh(iso: string): boolean {
  return daysOld(iso) < RECAP_FRESH_DAYS;
}
