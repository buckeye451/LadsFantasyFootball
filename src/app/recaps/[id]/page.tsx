/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecap } from '@/lib/recaps';
import { getTeams, resolveActiveLeague } from '@/lib/stats';
import { plainText } from '@/lib/richtext';
import { RecapEditor } from '@/components/RecapEditor';
import { RichText } from '@/components/RichText';
import { LEAGUE_NAME, LEAGUE_SHORT_NAME } from '@/lib/branding';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * One post's own page, so a link sent to the league previews that post rather
 * than the whole season. The list page's anchors are fragments, which never
 * reach the server — a share card can only be built from a real route.
 *
 * `opengraph-image.tsx` beside this file draws the card and Next adds its tags.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const recap = getRecap(Number(params.id));
  if (!recap) return { title: `Recap not found · ${LEAGUE_NAME}` };

  const league = resolveActiveLeague(recap.season);
  const managers = league ? getTeams(league.leagueId).map((t) => t.displayName) : [];
  // The preheader is written as the post's own summary; fall back to its
  // opening words when there isn't one.
  const summary = recap.preheader?.trim() || plainText(recap.body, managers).slice(0, 180);
  const title = `${recap.title} · ${recap.season} ${LEAGUE_SHORT_NAME} Recap`;

  return {
    title,
    description: summary,
    openGraph: {
      title: recap.title,
      description: summary,
      type: 'article',
      publishedTime: recap.createdAt,
      url: `/recaps/${recap.id}`,
    },
    twitter: { card: 'summary_large_image', title: recap.title, description: summary },
  };
}

export default function RecapPermalink({ params }: { params: { id: string } }) {
  const recap = getRecap(Number(params.id));
  if (!recap) notFound();

  const league = resolveActiveLeague(recap.season);
  const managers = league ? getTeams(league.leagueId).map((t) => t.displayName) : [];

  return (
    <>
      <Link className="back-link" href={`/recaps?season=${recap.season}`}>
        ← All {recap.season} recaps
      </Link>

      <article className="card recap">
        <div className="recap-head">
          <h1 className="recap-title">{recap.title}</h1>
          <RecapEditor season={recap.season} recap={recap} managers={managers} />
        </div>
        {recap.preheader && <p className="recap-preheader">{recap.preheader}</p>}
        <p className="recap-date">{formatDate(recap.createdAt)}</p>
        <div className="recap-body">
          <RichText body={recap.body} managers={managers} />
        </div>
        {recap.images.length > 0 && (
          <div className="recap-images">
            {recap.images.map((name) => (
              <img key={name} src={`/api/uploads/${name}`} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </article>
    </>
  );
}
