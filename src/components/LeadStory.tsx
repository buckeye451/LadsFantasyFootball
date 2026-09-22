import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';

export interface LeadStoryStat {
  label: string;
  value: string;
  /** Threshold pill class (val-good / val-warn / val-bad), where the metric
      has the same bands the tables use. */
  tone?: string;
}

/**
 * The dashboard's opening card: one score told at size, with the four rates
 * that explain it underneath.
 *
 * The headline comes from the week's recap when there is one, so the card
 * reads as the league's own voice rather than a generated sentence.
 */
export function LeadStory({
  kicker,
  kickerIcon,
  figure,
  headline,
  blurb,
  stats,
  href,
}: {
  kicker: string;
  /** Sits before the kicker text, in the kicker's own colour. */
  kickerIcon?: IconName;
  figure: string;
  headline: string;
  blurb?: string;
  /** Optional inline rates. The dashboard moved its four out to the
      HowTheyGotThere panel beside the card, where they get real labels. */
  stats?: LeadStoryStat[];
  href?: string;
}) {
  const body = (
    <>
      <div className="kicker lead-story-kicker">
        {kickerIcon && <Icon name={kickerIcon} size={15} className="kicker-icon" />}
        {kicker}
      </div>
      <div className="figure lead-story-figure">{figure}</div>
      <div className="lead-story-headline">{headline}</div>
      {blurb && <p className="lead-story-blurb">{blurb}</p>}
      {stats && stats.length > 0 && (
      <div className="lead-story-stats">
        {stats.map((s) => (
          <div key={s.label} className="lead-story-stat">
            <div className="kicker">{s.label}</div>
            <div className="lead-story-stat-value">
              {s.tone ? <span className={s.tone}>{s.value}</span> : s.value}
            </div>
          </div>
        ))}
      </div>
      )}
    </>
  );

  return href ? (
    <Link className="lead-story" href={href}>
      {body}
    </Link>
  ) : (
    <div className="lead-story">{body}</div>
  );
}

/** The three supporting tiles beside the lead story. */
export function LeadTile({
  label,
  icon,
  sub,
  value,
  tone,
}: {
  label: string;
  icon?: IconName;
  sub?: string;
  value: string;
  tone: 'series' | 'good' | 'ink';
}) {
  return (
    <div className="lead-tile">
      {icon && (
        <span className={`lead-tile-icon tone-${tone}`} aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
      )}
      <div className="lead-tile-body">
        <div className="kicker">{label}</div>
        {sub && <div className="lead-tile-sub">{sub}</div>}
      </div>
      <div className={`figure lead-tile-figure tone-${tone}`}>{value}</div>
    </div>
  );
}
