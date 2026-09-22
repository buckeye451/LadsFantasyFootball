'use client';

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { Recap } from '@/lib/recaps';
import { RecapToolbar } from '@/components/RecapToolbar';
import { RichText } from '@/components/RichText';
import { mentionSlotOf, mentionSlots } from '@/lib/richtext';
import { Icon } from '@/components/Icon';

type Stage = 'closed' | 'pin' | 'editing' | 'confirmDelete';
type Tab = 'write' | 'preview';

/**
 * The half-typed @mention immediately before the caret, if there is one.
 *
 * The @ has to start a word — otherwise an email address would open the
 * manager list halfway through typing it.
 */
const AT_QUERY = /(?:^|[\s([{.,;:!?"'—-])@([A-Za-z][\w'-]*)?$/;

function atQueryAt(value: string, caret: number): { query: string; from: number } | null {
  const m = value.slice(0, caret).match(AT_QUERY);
  if (!m) return null;
  const query = m[1] ?? '';
  return { query, from: caret - query.length - 1 };
}

/**
 * Create or edit a recap, behind a PIN gate. The PIN is never in this bundle —
 * it's checked server-side to unlock, and again on every write.
 *
 * Pass `recap` to edit that post; omit it to write a new one.
 */
export function RecapEditor({
  season,
  recap,
  managers = [],
}: {
  season: string;
  recap?: Recap;
  /** The season's managers, for the mention menu and @ autocomplete. */
  managers?: string[];
}) {
  const router = useRouter();
  const isEdit = !!recap;

  const [stage, setStage] = useState<Stage>('closed');
  const [tab, setTab] = useState<Tab>('write');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState(recap?.title ?? '');
  const [preheader, setPreheader] = useState(recap?.preheader ?? '');
  const [body, setBody] = useState(recap?.body ?? '');
  const [keep, setKeep] = useState<string[]>(recap?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [suggest, setSuggest] = useState<{ from: number; matches: string[]; active: number } | null>(
    null
  );
  // The one @query Escape dismissed. Typing on changes the query, which brings
  // the list back — without this, the keyup after Escape simply reopens it.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const slots = useMemo(() => mentionSlots(managers), [managers]);

  /** Reconsider the @mention list whenever the text or the caret moves. */
  function refreshSuggestions(value: string, caret: number) {
    const found = managers.length > 0 ? atQueryAt(value, caret) : null;
    if (!found) {
      setSuggest(null);
      setDismissed(null);
      return;
    }
    const key = `${found.from}:${found.query.toLowerCase()}`;
    if (key === dismissed) return;
    const q = found.query.toLowerCase();
    const matches = managers.filter((m) => m.toLowerCase().startsWith(q));
    if (matches.length === 0) {
      setSuggest(null);
      return;
    }
    // Keep the highlighted row while the same names are on offer, so the
    // keyup that follows an arrow press doesn't undo the move.
    setSuggest((s) => {
      const same =
        s != null &&
        s.from === found.from &&
        s.matches.length === matches.length &&
        s.matches.every((m, i) => m === matches[i]);
      return {
        from: found.from,
        matches,
        active: same ? Math.min(s.active, matches.length - 1) : 0,
      };
    });
  }

  /** Keys the open list owns — the textarea shouldn't re-derive it after them. */
  const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape']);

  /** Swap the half-typed @name for a real mention. */
  function acceptSuggestion(name: string) {
    if (!suggest) return;
    const area = areaRef.current;
    const caret = area?.selectionEnd ?? body.length;
    const text = `@[${name}] `;
    const next = body.slice(0, suggest.from) + text + body.slice(caret);
    setBody(next);
    setSuggest(null);
    setDismissed(null);
    const at = suggest.from + text.length;
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(at, at);
    });
  }

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggest) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setSuggest((s) =>
        s ? { ...s, active: (s.active + step + s.matches.length) % s.matches.length } : s
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      acceptSuggestion(suggest.matches[suggest.active]);
    } else if (e.key === 'Escape') {
      // Not stopPropagation: the dialog closes on its own backdrop/Escape
      // handling, and swallowing the key here would trap the writer.
      e.preventDefault();
      const q = atQueryAt(body, areaRef.current?.selectionEnd ?? body.length);
      setDismissed(q ? `${q.from}:${q.query.toLowerCase()}` : null);
      setSuggest(null);
    }
  }

  function close() {
    setStage('closed');
    setTab('write');
    setPin('');
    setError(null);
    setFiles([]);
    setSuggest(null);
    // Editing reverts to the saved post; creating clears the form.
    setTitle(recap?.title ?? '');
    setPreheader(recap?.preheader ?? '');
    setBody(recap?.body ?? '');
    setKeep(recap?.images ?? []);
  }

  async function checkPin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/recaps/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) setStage('editing');
      else setError('That PIN is not right.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('pin', pin);
      form.set('season', season);
      form.set('title', title);
      form.set('preheader', preheader);
      form.set('body', body);
      if (isEdit) form.set('keep', JSON.stringify(keep));
      for (const f of files) form.append('images', f);

      const res = await fetch(isEdit ? `/api/recaps/${recap!.id}` : '/api/recaps', {
        method: isEdit ? 'PATCH' : 'POST',
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save the post.');
        return;
      }
      setStage('closed');
      setPin('');
      setFiles([]);
      router.refresh();
    } catch {
      setError('Could not save the post.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recaps/${recap!.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not delete the post.');
        setStage('editing');
        return;
      }
      close();
      router.refresh();
    } catch {
      setError('Could not delete the post.');
      setStage('editing');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={isEdit ? 'post-action' : 'post-button'}
        onClick={() => setStage('pin')}
      >
        {isEdit ? (
        'Edit'
      ) : (
        <>
          <Icon name="pencil" size={16} />
          Make a post
        </>
      )}
      </button>

      {stage !== 'closed' && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className={`modal${stage === 'editing' ? ' wide' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {stage === 'pin' && (
              <form onSubmit={checkPin}>
                <h3 className="modal-title">Enter PIN</h3>
                <p className="card-note">
                  {isEdit ? 'Editing is limited to the commissioner.' : 'Posting is limited to the commissioner.'}
                </p>
                <input
                  className="modal-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                />
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={busy || !pin}>
                    {busy ? 'Checking…' : 'Unlock'}
                  </button>
                </div>
              </form>
            )}

            {stage === 'editing' && (
              <form onSubmit={submit}>
                <h3 className="modal-title">{isEdit ? 'Edit post' : `New ${season} recap`}</h3>
                <label className="field">
                  <span>Heading</span>
                  <input
                    className="modal-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Week 5: the wheels came off"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Preheader</span>
                  <input
                    className="modal-input"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="One line under the heading"
                  />
                </label>
                <div className="field">
                  <div className="post-field-head">
                    <span>Post</span>
                    <div className="rt-tabs" role="tablist" aria-label="Post view">
                      {(['write', 'preview'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="tab"
                          aria-selected={tab === t}
                          className={`rt-tab${tab === t ? ' on' : ''}`}
                          onClick={() => setTab(t)}
                        >
                          {t === 'write' ? 'Write' : 'Preview'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tab === 'write' ? (
                    <>
                      <RecapToolbar
                        editable={{ value: body, onChange: setBody, area: areaRef }}
                        managers={managers}
                      />
                      <div className="rt-area-wrap">
                        <textarea
                          ref={areaRef}
                          className="modal-input modal-textarea"
                          value={body}
                          onChange={(e) => {
                            setBody(e.target.value);
                            refreshSuggestions(e.target.value, e.target.selectionEnd);
                          }}
                          onKeyDown={onBodyKeyDown}
                          onKeyUp={(e) => {
                            // Arrow/Enter/Tab/Escape belong to the open list;
                            // re-deriving after them would undo what they did.
                            if (suggest && NAV_KEYS.has(e.key)) return;
                            refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionEnd);
                          }}
                          onClick={(e) =>
                            refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionEnd)
                          }
                          onBlur={() => setSuggest(null)}
                          rows={10}
                          placeholder="Write the recap… type @ to mention a manager"
                        />
                        {suggest && (
                          <ul className="rt-suggest" role="listbox" aria-label="Managers">
                            {suggest.matches.map((name, i) => (
                              <li key={name}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={i === suggest.active}
                                  className={`rt-suggest-item${i === suggest.active ? ' on' : ''}`}
                                  // The textarea blurs before a click lands, so
                                  // commit on mousedown instead.
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    acceptSuggestion(name);
                                  }}
                                >
                                  <span className={`mention mention-${mentionSlotOf(name, slots)}`}>
                                    @{name}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* A <p>, not a <span>: `.field > span` is the label
                          treatment, and it would uppercase a cheat sheet whose
                          colour names are case-sensitive. */}
                      <p className="card-note rt-hint">
                        <code>**bold**</code> <code>*italic*</code> <code>__underline__</code>{' '}
                        <code>~~strike~~</code> <code>==green|highlight==</code> <code>@Evan</code>
                      </p>
                    </>
                  ) : (
                    <div className="rt-preview recap-body">
                      {body.trim() ? (
                        <RichText body={body} managers={managers} />
                      ) : (
                        <p className="card-note">Nothing written yet.</p>
                      )}
                    </div>
                  )}
                </div>

                {isEdit && keep.length > 0 && (
                  <div className="field">
                    <span>Current images</span>
                    <div className="edit-images">
                      {keep.map((name) => (
                        <div className="edit-image" key={name}>
                          <img src={`/api/uploads/${name}`} alt="" />
                          <button
                            type="button"
                            className="edit-image-remove"
                            aria-label="Remove image"
                            onClick={() => setKeep((k) => k.filter((n) => n !== name))}
                          >
                            <Icon name="close" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="field">
                  <span>{isEdit ? 'Add images' : 'Images (optional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                  {files.length > 0 && (
                    <span className="card-note">
                      {files.length} image{files.length === 1 ? '' : 's'} attached
                    </span>
                  )}
                </label>

                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  {isEdit && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setStage('confirmDelete')}
                    >
                      Delete
                    </button>
                  )}
                  <span className="modal-spacer" />
                  <button type="button" className="btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy || !title.trim() || !body.trim()}
                  >
                    {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
                  </button>
                </div>
              </form>
            )}

            {stage === 'confirmDelete' && (
              <div>
                <h3 className="modal-title">Delete this post?</h3>
                <p className="card-note">
                  &ldquo;{recap?.title}&rdquo; and its images will be removed. This can&rsquo;t be
                  undone.
                </p>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setStage('editing')}>
                    Keep it
                  </button>
                  <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
                    {busy ? 'Deleting…' : 'Delete post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
