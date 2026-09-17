# Lads League

A fantasy football dashboard for the Lads league, backed by the
[Sleeper API](https://docs.sleeper.com). Weekly data is pulled from Sleeper
into a local SQLite database automatically, and the site serves:

- **Dashboard** — standings (with week-over-week movement), best players of the
  season by position, players of the week, a weekly-scores line chart, and a
  week-by-week standings chart. Click up to four teams to highlight them across
  both charts.
- **A tab for every manager** — season stats, weekly results, the exact lineup
  they set each week, and the **optimal lineup** for that week with every
  should-have-started player they left on the bench highlighted in red, plus a
  season-long "lineup efficiency" score.
- **A season dropdown** — switch between every season the league has played.
  List one Sleeper league id per season in `SLEEPER_LEAGUE_ID`; the app also
  follows each league's previous-season chain, so a new season appears
  automatically once it starts.
- **A hamburger menu** grouping navigation into **Players** (each manager's
  team), **Weekly Scores** (a per-week breakdown of every matchup), and
  **Playoffs** (bracket + per-round breakdowns).
- **Weekly / playoff matchup breakdowns** — each matchup shows, per team:
  *Win % vs League* (share of the other teams that score would beat),
  *Performance %* (score ÷ projected points), *Manager Score* (score ÷
  best-possible lineup, capped at 100%), and *Best Lineup Wins?* (whether the
  optimal lineup would have flipped a loss into a win). Playoff rounds use the
  same layout, scoped to the teams still alive.
- **Playoff bracket** built from Sleeper's `winners_bracket` / `losers_bracket`,
  with each round's scores and the champion highlighted.
- **Record book, lifetime standings, drafts, trades and weekly recaps** —
  everything reaching back past the current season.

This is a sibling of the BMCF League app: same layout, same features, its own
league, its own database and its own deployment. The two share no data.

## ⚠️ Three things to fill in

This repo was set up from the BMCF codebase, so a few things are deliberately
blank or placeheld rather than carrying the other league's values over:

| What | Where | How to fill it |
|---|---|---|
| **League name + logo** | `src/lib/branding.ts`, `public/hero/logo.svg` | Edit the constants; drop the real badge at that path (keep the filename). |
| **Manager names** | `src/lib/managers.ts` | Sleeper handle → the name you actually call each other. Empty means handles show through as-is. |
| **Season champions** | `SEASON_CHAMPIONS` in `src/lib/stats.ts` | One line per completed season, keyed by Sleeper handle. Empty means the trophy case shows no titles. |

Everything else — teams, scores, schedules, rosters, drafts, trades, brackets —
comes from Sleeper on the first sync and needs no editing.

## Quick start

```bash
npm install
cp .env.example .env   # league ids are already filled in
npm run sync           # pull league, rosters, matchups, players into SQLite
npm run dev            # http://localhost:3000
```

Your Sleeper league id is the long number in your league's URL:
`https://sleeper.com/leagues/<LEAGUE_ID>/...`. The Sleeper read API is public —
no API key needed. Node **22.13+** is required (the app uses the built-in
`node:sqlite` driver, so there are no database dependencies to install).

## How data collection works

`src/lib/sync.ts` pulls from Sleeper and upserts into `data/league.db`:

| Sleeper endpoint | What it fills |
|---|---|
| `/league/{id}` | league name, season, roster slots, playoff week |
| `/league/{id}/users` + `/rosters` | managers and their teams |
| `/league/{id}/matchups/{week}` | every week's scores, starters, and per-player points |
| `/players/nfl` | names/positions/teams for every player the league has rostered (cached to disk, refreshed at most daily) |

Sync is idempotent — run it as often as you like. Four ways to keep data fresh
during the season:

1. **The Sync button** — the dashboard's week rail carries a `↻ Sync <season>`
   control. It asks for the commissioner's PIN, then pulls just the season
   you're looking at and refreshes the page, so you never have to wait for the
   next automatic run.
2. **In-app auto-sync** — set `AUTO_SYNC=true` (and optionally
   `AUTO_SYNC_MINUTES`, default 60) and the running server re-syncs itself on an
   interval. There's no day-of-week schedule; it's a plain interval timer that
   also runs once on boot if the stored data is already older than one interval.
3. **Cron** — schedule `npm run sync`, or ping `POST /api/sync?pin=<pin>` on the
   running app.
4. **Manual** — `npm run sync` whenever you feel like it.

`/api/sync` **requires the PIN** — as an `x-lads-pin` header (what the in-app
button sends, keeping it out of URLs and server logs) or as `?pin=<pin>`. A
sync is a write and costs a burst of Sleeper API calls, so it isn't something
any visitor should be able to set off. `npm run sync` and `AUTO_SYNC` run
in-process and never touch the route, so neither needs the PIN.

It also takes two optional parameters: `?league=<id>` limits the sync to one
league/season (what the button uses), and `&full=1` forces a complete re-import
rather than skipping what's already stored.

## Project layout

```
src/lib/branding.ts  league name/logo constants (the one place to rebrand)
src/lib/db.ts        SQLite schema + connection (node:sqlite, WAL mode)
src/lib/sleeper.ts   Sleeper REST client
src/lib/sync.ts      ingestion (idempotent upserts, player-dump caching)
src/lib/autosync.ts  optional in-process sync scheduler
src/lib/optimal.ts   optimal-lineup solver (fills most-restrictive slots first)
src/lib/stats.ts     standings, rank history, player aggregates, team seasons
src/lib/managers.ts  Sleeper handle → real name
src/app/             Next.js pages: dashboard, /team/[slug], /api/sync
src/components/      tables, charts (Recharts), roster/optimal lineup views
scripts/             CLI sync
data/                SQLite database + player cache (gitignored)
```

## Deploy to Fly.io

This repo ships everything Fly needs: a `Dockerfile`, a `.dockerignore`, an
entrypoint (`scripts/docker-entrypoint.sh`), and a `fly.toml` with this
league's ids already filled in. Fly is a good fit because the SQLite database
lives on a persistent **volume** — data survives restarts and deploys.

The app name is `ladsfantasyfootball` and the volume is `lads_data`, both distinct from
the BMCF app's, so the two deployments never touch each other.

### Option A — deploy from the browser via GitHub Actions (no install needed)

Best when you can't (or don't want to) install anything locally — e.g. on a work
computer. `flyctl` runs inside GitHub's servers, so you only ever use two
websites: **fly.io** and **github.com**. This repo already includes the workflow
at `.github/workflows/fly-deploy.yml`, which creates the app + volume and deploys
for you.

1. **Make a Fly account** at [fly.io](https://fly.io) and add a payment method
   (Fly requires a card on file even though a scale-to-zero app like this costs
   pennies — often nothing).
2. **Create a Fly access token** in the dashboard: click your account (top-right)
   → **Tokens** (or **Access Tokens**) → create a token → copy it. A personal
   access token or an org deploy token both work.
3. **Add the token to GitHub**: in this repo, go to **Settings → Secrets and
   variables → Actions → New repository secret**. Name it exactly
   `FLY_API_TOKEN`, paste the token, save.
4. **Deploy**: go to the **Actions** tab → **Deploy to Fly.io** → **Run
   workflow** (pick this branch) → **Run**. The run creates the app, creates the
   1 GB database volume, builds the image on Fly's servers, and boots it. When
   it finishes, the job summary prints your URL (`https://ladsfantasyfootball.fly.dev`).

After that, every push to the deploy branch redeploys automatically, and you
can re-run it any time from the Actions tab. If the app name is
already taken on Fly, edit the `app = ` line in `fly.toml` (the workflow reads
the name from there), update `SITE_DOMAIN` in `src/lib/branding.ts` to match,
and re-run.

### Option B — deploy with the flyctl CLI (if you can install it)

```bash
# 1. Install flyctl and sign in (https://fly.io/docs/flyctl/install/)
curl -L https://fly.io/install.sh | sh
fly auth signup        # or: fly auth login

# 2. From the repo root, create the app (rename in fly.toml first if taken).
fly apps create ladsfantasyfootball

# 3. Create the 1 GB volume the database lives on (match the region in fly.toml).
fly volumes create lads_data --size 1 --region ord

# 4. Deploy.
fly deploy
```

`fly deploy` builds the image on Fly's remote builders (no local Docker needed)
and boots the app. Open it with `fly open`, and share that URL with the league.

### What happens on deploy

- The container starts the web server, which syncs from Sleeper into the volume
  on its first request — the dashboard fills in within a few seconds of the
  first boot.
- `AUTO_SYNC=true` (in `fly.toml`) makes the running app re-pull from Sleeper
  every `AUTO_SYNC_MINUTES` (set to 180 there) while it's awake, so scores
  update on their own during the season. It's an interval, not a weekly
  schedule. For an on-demand pull, use the dashboard's Sync button.
- The app **scales to zero when idle** (`min_machines_running = 0`) to stay
  free; the next visitor wakes it and triggers a fresh sync, waiting a few
  seconds for the boot. Want it always warm instead? Set
  `min_machines_running = 1` in `fly.toml` and redeploy.

### Config knobs (`fly.toml` → `[env]`)

| Var | Purpose |
|---|---|
| `SLEEPER_LEAGUE_ID` | Your league(s), comma-separated — one id per season (already set to the 2026 and 2025 leagues). |
| `AUTO_SYNC` | `true` to auto-refresh from Sleeper while running. |
| `AUTO_SYNC_MINUTES` | Minutes between auto-syncs. |
| `RECAP_PIN` | Commissioner's PIN, gating recap posts/edits and the Sync button. **Set this** — it defaults to `1252`, which is public in this repo's history. Set it as a Fly **secret**, not an env var: `fly secrets set RECAP_PIN=…` |
| `SITE_URL` | Public URL, for absolute link-preview image URLs. Defaults to `SITE_DOMAIN` in `src/lib/branding.ts`. |
| `DB_PATH` | DB location — points at the mounted volume (`/data/league.db`). |

Force a data refresh any time without redeploying:

```bash
fly ssh console -C "npm run sync"     # no PIN needed: runs inside the container
# through the API instead — the PIN is required there:
#   https://<your-app>.fly.dev/api/sync?pin=<pin>
# repair one season that stored incompletely:
#   https://<your-app>.fly.dev/api/sync?league=<leagueId>&full=1&pin=<pin>
```

### A note on access

This site is **public** — anyone with the URL can read every page, exactly like
the BMCF site. There is no login. The only thing the PIN protects is *writing*:
posting or editing a recap, and triggering a sync. If you later want the site
restricted to the league, the cheapest approach is a single shared password in
Next.js middleware plus a `noindex` robots rule.

### Option C — Render or Railway (fully click-through, no tokens)

If you'd rather avoid the token/secret setup entirely, [Render](https://render.com)
and [Railway](https://railway.app) both deploy straight from a GitHub repo in the
browser and reuse the same `Dockerfile`:

1. Sign in with GitHub and create a new **Web Service** (Render) / project
   (Railway) from this repo. It auto-detects the `Dockerfile`.
2. Add a **persistent disk / volume** mounted at `/data` (1 GB is plenty).
3. Set environment variables: `SLEEPER_LEAGUE_ID=1386530997679443968,1254525039957516288`,
   `AUTO_SYNC=true`, `DB_PATH=/data/league.db`.
4. Create the service — it builds and gives you a public URL.

Any Node 22.13+ host with a persistent disk works on the same principle. Avoid
serverless platforms without a persistent filesystem (e.g. Vercel's default
setup) — they won't keep the SQLite file between requests/deploys.
