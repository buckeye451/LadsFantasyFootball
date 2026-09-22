'use client';

import { useEffect, useState } from 'react';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control for switching a section between views — Compact/Full on
 * the wide tables, and the encoding tabs on the season heat matrix.
 *
 * The choice is remembered per `storageKey`, so someone who always wants every
 * column keeps getting every column. Reading localStorage during render would
 * desync the server and client markup, so the stored value is applied in an
 * effect after mount and the caller's default renders first.
 */
export function SegTabs<T extends string>({
  options,
  value,
  onChange,
  storageKey,
  ariaLabel,
}: {
  options: ReadonlyArray<SegOption<T>>;
  value: T;
  onChange: (v: T) => void;
  storageKey?: string;
  ariaLabel?: string;
}) {
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`lads-seg-${storageKey}`);
      if (saved && saved !== value && options.some((o) => o.value === saved)) {
        onChange(saved as T);
      }
    } catch {
      // private mode / storage disabled — the default stands
    }
    // Restore once on mount; later changes are the user's own clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (v: T) => {
    onChange(v);
    if (!storageKey) return;
    try {
      localStorage.setItem(`lads-seg-${storageKey}`, v);
    } catch {
      // not worth failing the interaction over
    }
  };

  return (
    <div className="seg-tabs" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-tab${o.value === value ? ' active' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => pick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The Compact/Full pair used by the wide tables, with the stored choice wired
 * in. Returns the current mode and the control to render.
 *
 * The first render is always Compact so the server and the client agree, then
 * a desktop-width reader is moved to Full on mount: there is room for every
 * column there, and a table that hides nine of thirteen by default is a table
 * most people never see the rest of. A phone stays Compact, and a stored
 * choice — restored by SegTabs itself — always wins over both.
 */
export function useCompactFull(storageKey: string, fullLabel: string) {
  const [mode, setMode] = useState<'compact' | 'full'>('compact');

  useEffect(() => {
    try {
      if (localStorage.getItem(`lads-seg-${storageKey}`)) return;
    } catch {
      // storage disabled — fall through to the width check
    }
    if (window.matchMedia('(min-width: 960px)').matches) setMode('full');
    // Mount only: after this the reader's own clicks own the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const control = (
    <SegTabs
      options={[
        { value: 'compact', label: 'Compact' },
        { value: 'full', label: fullLabel },
      ]}
      value={mode}
      onChange={setMode}
      storageKey={storageKey}
      ariaLabel="Table detail"
    />
  );
  return { mode, control };
}
