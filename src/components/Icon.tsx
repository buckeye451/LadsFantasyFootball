/**
 * The app's one icon set.
 *
 * These replace the emoji the UI used to lean on. Emoji render differently on
 * every platform, arrive at whatever weight and colour the font decides, and
 * none of them are the league's colours — three problems a 20px stroke set
 * doesn't have. Every glyph here is drawn on the same 24px grid with the same
 * 2px stroke and inherits `currentColor`, so an icon takes the colour of the
 * text beside it in both themes.
 *
 * Icons are decoration: they're `aria-hidden` and every one is paired with a
 * visible label or an `aria-label` on the control that holds them.
 */

export type IconName =
  | 'crown'
  | 'trend-up'
  | 'trend-down'
  | 'clipboard'
  | 'football'
  | 'chart'
  | 'user'
  | 'users'
  | 'newspaper'
  | 'trophy'
  | 'medal'
  | 'spoon'
  | 'book'
  | 'calendar'
  | 'bracket'
  | 'swap'
  | 'bell'
  | 'sun'
  | 'moon'
  | 'pencil'
  | 'close'
  | 'draft'
  | 'sync'
  | 'warning';

/** Path data only — the wrapper below supplies the shared svg attributes. */
const PATHS: Record<IconName, React.ReactNode> = {
  crown: <path d="M3 6l4.5 3.5L12 4l4.5 5.5L21 6l-1.8 12H4.8z" />,
  'trend-up': (
    <>
      <path d="M3 17l5-6 4 3.5L21 5" />
      <path d="M15 5h6v6" />
    </>
  ),
  'trend-down': (
    <>
      <path d="M3 7l5 6 4-3.5L21 19" />
      <path d="M15 19h6v-6" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4h6v3H9z" />
      <path d="M6 5.5h1.5M16.5 5.5H18v14.5H6V5.5" />
      <path d="M9.5 13l2 2 3.5-4" />
    </>
  ),
  football: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="5.6" transform="rotate(-38 12 12)" />
      <path d="M9.2 14.8l5.6-5.6" />
      <path d="M10.6 11.4l1.4 1.4" />
      <path d="M12.6 9.4l1.4 1.4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 5.6" />
      <path d="M17.5 14.4A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  newspaper: (
    <>
      <path d="M4 5h13v14H4z" />
      <path d="M17 9h3v8a2 2 0 0 1-3 1.7" />
      <path d="M7 9h7" />
      <path d="M7 13h7" />
      <path d="M7 16h4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M10 20h4" />
      <path d="M12 14v6" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M8.5 10.6L6 3h4l2 4.6L14 3h4l-2.5 7.6" />
    </>
  ),
  spoon: (
    <>
      <ellipse cx="12" cy="7" rx="4" ry="5" />
      <path d="M12 12v9" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M19 18v3H6.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  bracket: (
    <>
      <path d="M3 5h5v6H3" />
      <path d="M3 13h5v6H3" />
      <path d="M8 8h4v8H8" />
      <path d="M12 12h4" />
      <path d="M16 8h5v8h-5z" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13" />
      <path d="M13 4l4 4-4 4" />
      <path d="M20 16H7" />
      <path d="M11 12l-4 4 4 4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
      <path d="M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  pencil: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="M14.5 5.5l4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  draft: <path d="M8 4h8l-1 5 4 4-3 8h-8l-3-8 4-4z" />,
  sync: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5L22 20H2z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  /** Square px. The stroke stays 2 at 24px and scales with the box. */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
