import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getRecap } from '@/lib/recaps';
import { getTeams, resolveActiveLeague } from '@/lib/stats';
import {
  MENTION_HUES,
  mentionSlotOf,
  mentionSlots,
  mentionsIn,
  plainText,
} from '@/lib/richtext';
import { LEAGUE_NAME, LEAGUE_WORDMARK, SITE_DOMAIN } from '@/lib/branding';

// 1200x630 is the Open Graph standard, and what iMessage renders as its large
// rich link. The same file serves Slack, WhatsApp, Discord and X.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${LEAGUE_NAME} recap`;
export const runtime = 'nodejs';

/** The page palette, hard-coded: Satori resolves no CSS variables. */
const INK = '#ffffff';
const MUTED = '#a79bc4';
const PAGE = '#0c0912';
const PANEL = '#1b1230';
const EDGE = 'rgba(255, 255, 255, 0.12)';
const ACCENT = '#f6c945';

/** Chip colours, matching the hues globals.css uses for the same slots. */
function chipColours(slot: number): { bg: string; fg: string; line: string } {
  const h = MENTION_HUES[slot % MENTION_HUES.length];
  return {
    bg: `hsl(${h} 62% 26%)`,
    fg: `hsl(${h} 85% 80%)`,
    line: `hsl(${h} 55% 42%)`,
  };
}

/** Trim to a whole word, so a clipped headline doesn't end mid-syllable. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Public fonts, read from disk — the Dockerfile copies public/ into the image. */
async function font(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(process.cwd(), 'public', 'fonts', file));
  return new Uint8Array(buf).buffer;
}

export default async function Image({ params }: { params: { id: string } }) {
  const recap = getRecap(Number(params.id));
  const [display, body] = await Promise.all([
    font('BarlowCondensed-Bold.ttf'),
    font('Archivo-SemiBold.ttf'),
  ]);
  const fonts = [
    { name: 'Barlow', data: display, weight: 700 as const, style: 'normal' as const },
    { name: 'Archivo', data: body, weight: 600 as const, style: 'normal' as const },
  ];

  // A deleted post can still be linked from a message sent earlier.
  if (!recap) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: PAGE,
            color: INK,
            fontFamily: 'Barlow',
            fontSize: 72,
          }}
        >
          {LEAGUE_WORDMARK}
        </div>
      ),
      { ...size, fonts }
    );
  }

  const league = resolveActiveLeague(recap.season);
  const managers = league ? getTeams(league.leagueId).map((t) => t.displayName) : [];
  const slots = mentionSlots(managers);
  const named = mentionsIn(recap.body, managers).slice(0, 5);
  const summary = recap.preheader?.trim() || plainText(recap.body, managers);
  const posted = new Date(recap.createdAt);
  const dateLabel = Number.isNaN(posted.getTime())
    ? ''
    : posted.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Longer headlines step down a size rather than overflowing the card.
  const headline = clip(recap.title, 110);
  const titleSize = headline.length > 78 ? 68 : headline.length > 46 ? 82 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAGE,
          // A wash behind the headline, so the card isn't a flat rectangle.
          // Satori's gradient parser only takes the `circle at` form — an
          // explicit ellipse size fails to parse and the whole render 500s.
          backgroundImage: `radial-gradient(circle at 12% -20%, ${PANEL} 0%, ${PAGE} 62%)`,
          color: INK,
          fontFamily: 'Archivo',
          // Well inside the corners iMessage rounds off.
          padding: '54px 64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Barlow',
              fontSize: 34,
              letterSpacing: 2,
              color: ACCENT,
            }}
          >
            {LEAGUE_WORDMARK}
          </div>
          <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, background: MUTED }} />
          <div style={{ display: 'flex', fontSize: 24, color: MUTED, letterSpacing: 1 }}>
            {recap.season} RECAP{dateLabel ? ` · ${dateLabel.toUpperCase()}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Barlow',
              fontSize: titleSize,
              lineHeight: 1.04,
              letterSpacing: -0.5,
            }}
          >
            {headline}
          </div>
          {summary && (
            <div
              style={{
                display: 'flex',
                marginTop: 20,
                fontSize: 27,
                lineHeight: 1.35,
                color: MUTED,
              }}
            >
              {clip(summary, 130)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {named.map((name) => {
              const c = chipColours(mentionSlotOf(name, slots));
              return (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    padding: '7px 16px',
                    borderRadius: 999,
                    background: c.bg,
                    color: c.fg,
                    border: `1px solid ${c.line}`,
                    fontSize: 26,
                  }}
                >
                  @{name}
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: MUTED,
              borderTop: `1px solid ${EDGE}`,
              paddingTop: 10,
            }}
          >
            {SITE_DOMAIN}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
