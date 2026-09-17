/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getTeams, resolveActiveLeague } from '@/lib/stats';
import { listRecaps } from '@/lib/recaps';
import { RecapEditor } from '@/components/RecapEditor';
import { RichText } from '@/components/RichText';
import { ScrollToHash } from '@/components/ScrollToHash';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function RecapsPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  const season = league?.season ?? searchParams.season ?? '';
  const posts = season ? listRecaps(season) : [];
  // Mentions colour by the season's roster, so every manager in a post gets
  // their own chip colour and a bare @name resolves to the right person.
  const managers = league ? getTeams(league.leagueId).map((t) => t.displayName) : [];

  return (
    <>
      <ScrollToHash />
      <div className="dash-controls">
        <div>
          <h1 className="page-title">Recaps</h1>
          <p className="page-subtitle">
            {season ? `${season} weekly write-ups, newest first.` : 'Weekly write-ups.'}
          </p>
        </div>
        {season && <RecapEditor season={season} managers={managers} />}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <h1>No recaps yet</h1>
          <p>
            Nothing has been posted for {season || 'this season'}. Use <strong>Make a post</strong>{' '}
            to write the first one.
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <article className="card recap" id={`recap-${p.id}`} key={p.id}>
            <div className="recap-head">
              <h2 className="recap-title">{p.title}</h2>
              <RecapEditor season={season} recap={p} managers={managers} />
            </div>
            {p.preheader && <p className="recap-preheader">{p.preheader}</p>}
            <p className="recap-date">
              {formatDate(p.createdAt)}
              {' · '}
              {/* The shareable link: its own route, so a message previews
                  this post rather than the whole season. */}
              <Link className="recap-permalink" href={`/recaps/${p.id}`}>
                Share link →
              </Link>
            </p>
            <div className="recap-body">
              <RichText body={p.body} managers={managers} />
            </div>
            {p.images.length > 0 && (
              <div className="recap-images">
                {p.images.map((name) => (
                  <img key={name} src={`/api/uploads/${name}`} alt="" loading="lazy" />
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </>
  );
}
