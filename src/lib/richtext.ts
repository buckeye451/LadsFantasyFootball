/**
 * The recap post's inline markup.
 *
 * Posts are stored as the marked-up text the commissioner typed and parsed into
 * a node tree that the renderer turns into React elements — so nothing a post
 * contains is ever handed to the browser as HTML, and the editor's output stays
 * legible if you ever read the database directly.
 *
 *   **bold**   *italic*   __underline__   ~~strike~~
 *   ==highlighted==            (yellow by default)
 *   ==green|highlighted==      (or any HIGHLIGHTS name)
 *   @[Evan]                    a mention chip
 *
 * A bare @Evan also becomes a chip when it matches one of the season's
 * managers, so a mention typed by hand reads the same as one picked from the
 * menu. Markers that are never closed stay as the literal characters typed.
 */

export const HIGHLIGHTS = ['yellow', 'green', 'blue', 'pink', 'orange'] as const;
export type Highlight = (typeof HIGHLIGHTS)[number];

export type Mark = 'bold' | 'italic' | 'underline' | 'strike';

export type RichNode =
  | { kind: 'text'; text: string }
  | { kind: 'break' }
  | { kind: 'mark'; mark: Mark; children: RichNode[] }
  | { kind: 'highlight'; colour: Highlight; children: RichNode[] }
  | { kind: 'mention'; name: string };

/**
 * One hue per mention slot. globals.css builds the chip tokens from these same
 * numbers; the share-card generator can't read CSS variables, so it mirrors
 * them from here — keep the two in step.
 */
export const MENTION_HUES = [210, 145, 330, 35, 265, 175, 0, 90, 195, 300] as const;

/** How many distinct mention colours the palette provides. */
export const MENTION_SLOTS = MENTION_HUES.length;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A stable colour slot per manager: their place in the season's alphabetical
 * roster, so everyone in one post is a different colour. A name that isn't on
 * the roster (a manager who has since left) falls back to a hash of the name,
 * which is stable even though it may repeat a colour.
 */
export function mentionSlots(managers: string[]): Record<string, number> {
  const slots: Record<string, number> = {};
  [...managers]
    .sort((a, b) => a.localeCompare(b))
    .forEach((name, i) => {
      slots[name.toLowerCase()] = i % MENTION_SLOTS;
    });
  return slots;
}

export function mentionSlotOf(name: string, slots: Record<string, number>): number {
  const known = slots[name.toLowerCase()];
  if (known != null) return known;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 100003;
  return h % MENTION_SLOTS;
}

interface Pattern {
  re: RegExp;
  /** Build a node from the match; `inner` parses nested markup. */
  node: (m: RegExpMatchArray, inner: (s: string) => RichNode[]) => RichNode;
}

/** Bold before italic, so `**x**` isn't read as an empty italic pair. */
function patterns(managers: string[]): Pattern[] {
  // Mentions render with the roster's spelling, so "@evan" and "@[EVAN]" both
  // come out as the manager is actually named.
  const canonical = new Map(managers.filter(Boolean).map((m) => [m.toLowerCase(), m]));
  const asName = (raw: string) => canonical.get(raw.trim().toLowerCase()) ?? raw.trim();

  const list: Pattern[] = [
    { re: /\*\*([\s\S]+?)\*\*/, node: (m, inner) => ({ kind: 'mark', mark: 'bold', children: inner(m[1]) }) },
    { re: /__([\s\S]+?)__/, node: (m, inner) => ({ kind: 'mark', mark: 'underline', children: inner(m[1]) }) },
    { re: /~~([\s\S]+?)~~/, node: (m, inner) => ({ kind: 'mark', mark: 'strike', children: inner(m[1]) }) },
    {
      re: new RegExp(`==(?:(${HIGHLIGHTS.join('|')})\\|)?([\\s\\S]+?)==`),
      node: (m, inner) => ({
        kind: 'highlight',
        colour: (m[1] as Highlight) ?? 'yellow',
        children: inner(m[2]),
      }),
    },
    // The content may not start or end with a space, so arithmetic like
    // "2 * 3 * 4" keeps its asterisks instead of turning into italics.
    {
      re: /\*(\S(?:[\s\S]*?\S)?)\*/,
      node: (m, inner) => ({ kind: 'mark', mark: 'italic', children: inner(m[1]) }),
    },
    { re: /@\[([^\]\n]+)\]/, node: (m) => ({ kind: 'mention', name: asName(m[1]) }) },
  ];

  // Longest name first, so "@Jack Jr" doesn't match the shorter "@Jack".
  const names = [...managers].filter(Boolean).sort((a, b) => b.length - a.length);
  if (names.length > 0) {
    list.push({
      re: new RegExp(`@(${names.map(escapeRe).join('|')})(?![\\w'-])`, 'i'),
      node: (m) => ({ kind: 'mention', name: asName(m[1]) }),
    });
  }
  return list;
}

function parseInline(src: string, pats: Pattern[]): RichNode[] {
  const inner = (s: string) => parseInline(s, pats);
  const out: RichNode[] = [];
  let rest = src;

  const pushText = (text: string) => {
    if (!text) return;
    // Single newlines are line breaks; the paragraph split handles blank lines.
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) out.push({ kind: 'break' });
      if (line) out.push({ kind: 'text', text: line });
    });
  };

  while (rest.length > 0) {
    let best: { at: number; m: RegExpMatchArray; p: Pattern } | null = null;
    for (const p of pats) {
      const m = rest.match(p.re);
      if (m?.index == null) continue;
      if (best == null || m.index < best.at) best = { at: m.index, m, p };
    }
    if (best == null) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, best.at));
    out.push(best.p.node(best.m, inner));
    rest = rest.slice(best.at + best.m[0].length);
  }
  return out;
}

/** Parse a post body into paragraphs of inline nodes. */
export function parseRich(body: string, managers: string[] = []): RichNode[][] {
  const pats = patterns(managers);
  // A textarea hands back CRLF line breaks, so normalise before splitting —
  // otherwise a blank line between paragraphs is two breaks in one paragraph.
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => parseInline(para, pats));
}

/**
 * Every manager mentioned in a post, in the order they first appear — the
 * share card lists them as chips.
 */
export function mentionsIn(body: string, managers: string[] = []): string[] {
  const seen: string[] = [];
  const walk = (nodes: RichNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'mention') {
        if (!seen.some((s) => s.toLowerCase() === n.name.toLowerCase())) seen.push(n.name);
      } else if (n.kind === 'mark' || n.kind === 'highlight') {
        walk(n.children);
      }
    }
  };
  parseRich(body, managers).forEach(walk);
  return seen;
}

/** A post's text with all markup stripped — for meta descriptions. */
export function plainText(body: string, managers: string[] = []): string {
  const out: string[] = [];
  const walk = (nodes: RichNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'text') out.push(n.text);
      else if (n.kind === 'mention') out.push(n.name);
      else if (n.kind === 'break') out.push(' ');
      else walk(n.children);
    }
  };
  parseRich(body, managers).forEach((para) => {
    walk(para);
    out.push(' ');
  });
  return out.join('').replace(/\s+/g, ' ').trim();
}
