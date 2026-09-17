/**
 * Sleeper usernames → the names we actually call each other.
 *
 * Sleeper is the source of truth for who owns a roster, but its display names
 * are handles. This is the single place that maps them, applied where teams are
 * read out of the database so every page shows real names. Keys are compared
 * case-insensitively; an unmapped handle (a new manager) shows through as-is.
 *
 * ⚠️ EMPTY ON PURPOSE. Until this is filled in, every manager shows under their
 * raw Sleeper handle, which is harmless but ugly. To populate it: run a sync,
 * open the site, and note the handles it lists — then add one line per manager,
 * e.g. `sleeperhandle: 'Dave',`. Handles go in lowercase.
 */
const MANAGER_NAMES: Record<string, string> = {
  // sleeperhandle: 'Real Name',
};

export function managerName(username: string | null | undefined): string {
  if (!username) return '';
  return MANAGER_NAMES[username.trim().toLowerCase()] ?? username;
}
