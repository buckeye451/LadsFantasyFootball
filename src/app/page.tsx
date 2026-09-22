/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {
  defaultSeason,
  getSeasons,
  regularSeasonWeeks,
  resolveActiveLeague,
  seedBoard,
  seasonProgress,
  weekScoreBoard,
} from '@/lib/stats';
import { latestRecap } from '@/lib/recaps';
import { isRecapFresh } from '@/lib/recency';
import { RecapDot } from '@/components/RecapDot';
import { LEAGUE_NAME } from '@/lib/branding';

export const dynamic = 'force-dynamic';

// Left-to-right order, relative heights (vh), z-depth, and per-player overlap
// with the previous one (vw) — tuned to cluster/layer like the original art.
const PLAYERS = [
  { src: '/hero/player-1.png', h: 88, z: 2, overlap: 0 }, // Cardinals (left)
  { src: '/hero/player-4.png', h: 80, z: 4, overlap: 9 }, // Seahawks (front bust)
  { src: '/hero/player-2.png', h: 108, z: 1, overlap: 11 }, // Ravens (tall, behind)
  { src: '/hero/player-3.png', h: 96, z: 3, overlap: 12 }, // Colts (front)
];

/**
 * The league's front door.
 *
 * This used to be a full-screen splash with the badge, the player art and a
 * CLICK TO ENTER button — a gate that cost every visitor a tap and told them
 * nothing. The art stays; the gate doesn't. The same page now opens on the
 * thing people came for: this week's finals, the playoff cut, and the newest
 * recap, with the hero as a band over the top.
 */
export default function HomePage() {
  const season = defaultSeason();
  const league = season ? resolveActiveLeague(season) : null;

  // Fresh checkout, or a league that hasn't played yet: the hero still works,
  // it just has nothing to report underneath.
  if (!league) {
    return (
      <div className="home">
        <HeroBand kicker={LEAGUE_NAME} headline="Waiting on the first sync" blurb={null} />
        <div className="empty-state">
          <h1>No league data yet</h1>
          <p>
            Set <code>SLEEPER_LEAGUE_ID</code> and run <code>npm run sync</code>.
          </p>
        </div>
      </div>
    );
  }

  const { leagueId } = league;
  const weeks = regularSeasonWeeks(leagueId);
  const week = weeks[weeks.length - 1];
  const board = week != null ? seedBoard(leagueId, week) : null;
  const scores = week != null ? weekScoreBoard(leagueId, week) : null;
  const recap = latestRecap(league.season);
  const progress = seasonProgress(leagueId);
  const otherSeasons = getSeasons().filter((s) => s.season !== league.season);

  const leader = board?.rows[0];
  const lastIn = board ? board.rows[board.playoffSpots - 1] : undefined;
  const firstOut = board ? board.rows[board.playoffSpots] : undefined;

  const headline = leader
    ? `${leader.standing.team.displayName} ${
        leader.standing.losses === 0 ? 'is' : 'leads at'
      } ${leader.standing.wins}–${leader.standing.losses}`
    : `The ${league.season} season is under way`;

  const blurb =
    lastIn && firstOut
      ? `Top ${board!.playoffSpots} make the playoffs. ${lastIn.standing.team.displayName} holds the last spot; ${firstOut.standing.team.displayName} is first out.`
      : null;

  return (
    <div className="home">
      <HeroBand
        kicker={
          progress
            ? `${league.season} season · week ${progress.completed} of ${progress.total}`
            : `${league.season} season`
        }
        headline={headline}
        blurb={blurb}
        primary={{ href: `/dashboard?season=${league.season}`, label: week ? `Week ${week} dashboard` : 'Dashboard' }}
        recapHref={recap ? `/recaps?season=${league.season}#recap-${recap.id}` : undefined}
        live={week != null}
      />

      <div className="home-grid">
        {scores && scores.cards.length > 0 && (
          <section className="card home-card">
            <div className="section-head-row">
              <h2 className="card-title">Week {week} finals</h2>
              <Link className="section-head-link" href={`/week/${week}?season=${league.season}`}>
                All box scores<span aria-hidden="true"> →</span>
              </Link>
            </div>
            <ul className="home-scores">
              {scores.cards.map((c) => (
                <li className="home-score" key={c.matchupId}>
                  <span className="home-score-name win">{c.winner.team.displayName}</span>
                  <span className="home-score-pts">{c.winner.score.toFixed(1)}</span>
                  <span className="home-score-dash" aria-hidden="true">
                    –
                  </span>
                  <span className="home-score-pts lose">{c.loser.score.toFixed(1)}</span>
                  <span className="home-score-name lose">{c.loser.team.displayName}</span>
                </li>
              ))}
            </ul>
            {scores.closest && (
              <p className="card-note home-note">
                Closest game: {scores.closest.pair} by {scores.closest.margin.toFixed(1)}.
              </p>
            )}
          </section>
        )}

        {board && board.rows.length > 0 && (
          <section className="card home-card">
            <div className="section-head-row">
              <h2 className="card-title">Playoff picture</h2>
              <Link className="section-head-link" href={`/dashboard?season=${league.season}`}>
                Full table<span aria-hidden="true"> →</span>
              </Link>
            </div>
            <ul className="home-seeds">
              {board.rows.slice(0, board.playoffSpots + 1).map((r, i) => (
                <li key={r.standing.team.rosterId}>
                  {i === board.playoffSpots && (
                    <div className="home-cut">
                      <span className="kicker">Cut line</span>
                      <span className="home-cut-note">
                        {board.rows.length - board.playoffSpots} more out
                      </span>
                    </div>
                  )}
                  <Link
                    className="home-seed"
                    href={`/team/${r.standing.team.slug}?season=${league.season}`}
                  >
                    <span className={`home-seed-rank${i < board.playoffSpots ? ' in' : ''}`}>
                      {r.rank}
                    </span>
                    <span className="home-seed-name">{r.standing.team.displayName}</span>
                    <span className="home-seed-rec">
                      {r.standing.wins}–{r.standing.losses}
                    </span>
                    <span className="home-seed-pf">{r.standing.pointsFor.toFixed(1)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card home-card home-recap">
          <div className="home-recap-head">
            <span className="kicker">Latest recap</span>
            {recap && <RecapDot createdAt={recap.createdAt} initialFresh={isRecapFresh(recap.createdAt)} />}
          </div>
          {recap ? (
            <>
              <h2 className="home-recap-title">{recap.title}</h2>
              {recap.preheader && <p className="home-recap-sub">{recap.preheader}</p>}
              <Link
                className="home-recap-cta"
                href={`/recaps?season=${league.season}#recap-${recap.id}`}
              >
                Read it<span aria-hidden="true"> →</span>
              </Link>
            </>
          ) : (
            <>
              <h2 className="home-recap-title">No recap yet</h2>
              <p className="home-recap-sub">
                The commissioner&rsquo;s write-up for the week shows up here once it&rsquo;s posted.
              </p>
              <Link className="home-recap-cta" href={`/recaps?season=${league.season}`}>
                Recap archive<span aria-hidden="true"> →</span>
              </Link>
            </>
          )}
        </section>
      </div>

      {otherSeasons.length > 0 && (
        <p className="home-seasons">
          Earlier seasons:{' '}
          {otherSeasons.map((s, i) => (
            <span key={s.season}>
              {i > 0 && ' · '}
              <Link href={`/dashboard?season=${s.season}`}>{s.season}</Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function HeroBand({
  kicker,
  headline,
  blurb,
  primary,
  recapHref,
  live,
}: {
  kicker: string;
  headline: string;
  blurb: string | null;
  primary?: { href: string; label: string };
  recapHref?: string;
  live?: boolean;
}) {
  return (
    <section className="home-hero">
      <div className="home-hero-players" aria-hidden="true">
        {PLAYERS.map((p, i) => (
          <img
            key={p.src}
            src={p.src}
            alt=""
            className="home-hero-player"
            style={{
              ['--h' as string]: `${p.h}%`,
              ['--overlap' as string]: `${p.overlap}vw`,
              zIndex: p.z,
              animationDelay: `${0.1 + i * 0.12}s`,
            }}
          />
        ))}
      </div>

      <div className="home-hero-copy">
        <div className="home-hero-kicker">
          {live && <span className="home-hero-live">Live</span>}
          <span className="kicker">{kicker}</span>
        </div>
        <img src="/hero/logo.svg" alt={LEAGUE_NAME} className="home-hero-logo" />
        <h1 className="home-hero-headline">{headline}</h1>
        {blurb && <p className="home-hero-blurb">{blurb}</p>}
        {primary && (
          <div className="home-hero-actions">
            <Link className="home-cta" href={primary.href}>
              {primary.label}
              <span aria-hidden="true"> →</span>
            </Link>
            {recapHref && (
              <Link className="home-cta ghost" href={recapHref}>
                Read the recap
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
