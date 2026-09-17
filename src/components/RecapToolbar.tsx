'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { HIGHLIGHTS, mentionSlotOf, mentionSlots } from '@/lib/richtext';

/** What the toolbar needs from the textarea it decorates. */
export interface Editable {
  value: string;
  onChange: (next: string) => void;
  /** The ref itself, not its current value — a ref assignment doesn't
      re-render, so passing `.current` would pin the toolbar to the null it
      held on the first render. */
  area: RefObject<HTMLTextAreaElement>;
}

interface Wrap {
  label: string;
  title: string;
  before: string;
  after: string;
  /** Inserted when nothing is selected, so the marker isn't left empty. */
  sample: string;
  className?: string;
}

const WRAPS: Wrap[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', before: '**', after: '**', sample: 'bold', className: 'rtb-bold' },
  { label: 'I', title: 'Italic (Ctrl+I)', before: '*', after: '*', sample: 'italic', className: 'rtb-italic' },
  { label: 'U', title: 'Underline (Ctrl+U)', before: '__', after: '__', sample: 'underline', className: 'rtb-underline' },
  { label: 'S', title: 'Strikethrough', before: '~~', after: '~~', sample: 'struck', className: 'rtb-strike' },
];

/**
 * The formatting bar above the post box: the four text marks, a highlight
 * colour picker, and a colour-coded menu of the season's managers.
 *
 * Everything it does is a text edit on the textarea's value — the markup stays
 * visible while writing, and the Preview tab shows the finished post.
 */
export function RecapToolbar({
  editable,
  managers,
}: {
  editable: Editable;
  managers: string[];
}) {
  const [menu, setMenu] = useState<'none' | 'highlight' | 'mention'>('none');
  const wrapRef = useRef<HTMLDivElement>(null);
  const slots = useMemo(() => mentionSlots(managers), [managers]);

  useEffect(() => {
    if (menu === 'none') return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu('none');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu('none');
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  /** Replace [start,end) and leave the caret where the author can keep typing. */
  const splice = (start: number, end: number, text: string, selectFrom: number, selectTo: number) => {
    const { value, onChange } = editable;
    onChange(value.slice(0, start) + text + value.slice(end));
    // After React has written the new value, or the browser resets the caret.
    requestAnimationFrame(() => {
      const area = editable.area.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(selectFrom, selectTo);
    });
  };

  const applyWrap = (w: Wrap) => {
    const { value } = editable;
    const area = editable.area.current;
    const start = area?.selectionStart ?? value.length;
    const end = area?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const text = selected || w.sample;
    splice(
      start,
      end,
      w.before + text + w.after,
      start + w.before.length,
      start + w.before.length + text.length
    );
    setMenu('none');
  };

  const applyHighlight = (colour: string) => {
    const { value } = editable;
    const area = editable.area.current;
    const start = area?.selectionStart ?? value.length;
    const end = area?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const text = selected || 'highlighted';
    const before = `==${colour}|`;
    splice(start, end, `${before}${text}==`, start + before.length, start + before.length + text.length);
    setMenu('none');
  };

  const insertMention = (name: string) => {
    const { value } = editable;
    const area = editable.area.current;
    const start = area?.selectionStart ?? value.length;
    const end = area?.selectionEnd ?? value.length;
    // A space after the chip, so the next word doesn't run into it.
    const text = `@[${name}] `;
    splice(start, end, text, start + text.length, start + text.length);
    setMenu('none');
  };

  // Ctrl/Cmd shortcuts for the three that have conventional ones.
  useEffect(() => {
    const area = editable.area.current;
    if (!area) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      const w = key === 'b' ? WRAPS[0] : key === 'i' ? WRAPS[1] : key === 'u' ? WRAPS[2] : null;
      if (!w) return;
      e.preventDefault();
      applyWrap(w);
    };
    area.addEventListener('keydown', onKey);
    return () => area.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable.area, editable.value]);

  return (
    <div className="rt-toolbar" ref={wrapRef}>
      {WRAPS.map((w) => (
        <button
          key={w.label}
          type="button"
          className={`rt-btn ${w.className ?? ''}`}
          title={w.title}
          aria-label={w.title}
          onClick={() => applyWrap(w)}
        >
          {w.label}
        </button>
      ))}

      <span className="rt-sep" aria-hidden="true" />

      <div className="rt-pop-wrap">
        <button
          type="button"
          className="rt-btn"
          title="Highlight"
          aria-expanded={menu === 'highlight'}
          onClick={() => setMenu((m) => (m === 'highlight' ? 'none' : 'highlight'))}
        >
          <span className="rt-hl-chip" aria-hidden="true" />
          Highlight
        </button>
        {menu === 'highlight' && (
          <div className="rt-pop" role="menu" aria-label="Highlight colour">
            {HIGHLIGHTS.map((c) => (
              <button
                key={c}
                type="button"
                className="rt-swatch-row"
                role="menuitem"
                onClick={() => applyHighlight(c)}
              >
                <span className={`rt-swatch rt-hl-${c}`} aria-hidden="true" />
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rt-pop-wrap">
        <button
          type="button"
          className="rt-btn"
          title="Mention a manager"
          aria-expanded={menu === 'mention'}
          onClick={() => setMenu((m) => (m === 'mention' ? 'none' : 'mention'))}
          disabled={managers.length === 0}
        >
          @ Mention
        </button>
        {menu === 'mention' && (
          <div className="rt-pop rt-pop-mentions" role="menu" aria-label="Managers">
            {managers.map((name) => (
              <button
                key={name}
                type="button"
                className={`mention mention-${mentionSlotOf(name, slots)} rt-mention-option`}
                role="menuitem"
                onClick={() => insertMention(name)}
              >
                @{name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
