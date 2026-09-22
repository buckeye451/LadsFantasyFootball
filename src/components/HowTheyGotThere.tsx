/**
 * The panel beside the dashboard's lead story.
 *
 * It carries the same three rates the lead used to stack inside the navy box
 * as `Perf`, `Manager` and `ROL %` — abbreviations the UI never defined
 * anywhere. Here each one gets a sentence for a label and the number that
 * earned it underneath, so the reader doesn't have to know the jargon to read
 * the card. Nothing is dropped: the fourth figure, points left on the bench,
 * rides along in the lineup row's detail line.
 */
export interface GotThereRow {
  /** Written as a claim, not an abbreviation: "Started his best lineup". */
  label: string;
  value: string;
  /** The working behind the number. */
  detail: string;
  /** val-good / val-warn / val-bad, matching the tables' thresholds. */
  tone?: string;
}

export function HowTheyGotThere({ title, rows }: { title: string; rows: GotThereRow[] }) {
  return (
    <section className="got-there">
      <h2 className="kicker got-there-title">{title}</h2>
      <div className="got-there-rows">
        {rows.map((r) => (
          <div className="got-there-row" key={r.label}>
            <div className="got-there-head">
              <span className="got-there-label">{r.label}</span>
              <span className={`got-there-value${r.tone ? ` ${r.tone}` : ''}`}>{r.value}</span>
            </div>
            <p className="got-there-detail">{r.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
