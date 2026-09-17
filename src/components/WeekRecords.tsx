import Link from 'next/link';
import type { WeekRecordHit } from '@/lib/stats';

/**
 * What the selected week put in the record book: the same tiles the record
 * book uses, bordered gold for an all-time top ten and green for a top three
 * in this season, each opening the record book rather than a top-25 list.
 */
export function WeekRecords({
  hits,
  week,
  season,
}: {
  hits: WeekRecordHit[];
  week: number;
  season: string;
}) {
  return (
    <section>
      <h2 className="card-title">Records this week</h2>
      <p className="card-note">
        Week {week} entries that sit in an all-time top ten{' '}
        <span className="wr-key wr-key-alltime">gold</span> or in {season}&rsquo;s top three{' '}
        <span className="wr-key wr-key-season">green</span>.
      </p>

      {hits.length === 0 ? (
        <p className="wr-empty">No records broken this week.</p>
      ) : (
        <div className="record-grid">
          {hits.map((h) => (
            <div className={`record-card wr-card wr-${h.scope}`} key={h.key}>
              <div className="record-card-label">{h.label}</div>
              <div className="record-card-value">{h.display}</div>
              <div className="record-card-holder">{h.holder}</div>
              {h.lines.map((line, i) => (
                <div className="record-card-line" key={i}>
                  {line}
                </div>
              ))}
              <div className={`wr-rank wr-rank-${h.scope}`}>{h.rankLabel}</div>
              <Link className="record-more wr-more" href="/records">
                The Record Book
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
