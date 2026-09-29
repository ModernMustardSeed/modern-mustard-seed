'use client';

import { useEffect, useState } from 'react';
import { Button, cx, inputCls, when } from '@/components/cc/ui';

/**
 * CLEAR THE DECK. Every email waiting on a reply, one at a time: who wrote,
 * what they want in a sentence, the reply already drafted, and four presses.
 * Thirty replies stop being an afternoon and become ten minutes of reading
 * and tapping.
 *
 * The queue is fixed when the deck opens, so a mail that lands mid-run does
 * not jump in front of the one being read. Nothing is sent without the Send
 * press, and the draft is the person's to change before it goes.
 */

export type DeckItem = {
  id: string;
  from_addr: string;
  from_name: string | null;
  subject: string | null;
  summary: string | null;
  body_text: string | null;
  received_at: string;
  draft: string | null;
};

export default function Deck({
  items,
  onClose,
  act,
  busy,
  note,
}: {
  items: DeckItem[];
  onClose: () => void;
  /** The Inbox's own action call; `after` runs only when the server said yes. */
  act: (body: Record<string, unknown>, after?: () => void) => Promise<void>;
  busy: boolean;
  note: string | null;
}) {
  const [queue] = useState(items);
  const [i, setI] = useState(0);
  const [sent, setSent] = useState(0);
  const [text, setText] = useState(queue[0]?.draft ?? '');
  const [showAll, setShowAll] = useState(false);
  const m = queue[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Moving on loads the next draft into the box in the same press.
  const next = () => {
    const n = i + 1;
    setI(n);
    setText(queue[n]?.draft ?? '');
    setShowAll(false);
  };
  const done = i >= queue.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0c111d]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="cc-deck-title">
      <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-2xl border border-[var(--cc-line)] bg-white text-[var(--cc-ink)] shadow-[0_24px_60px_-20px_rgba(15,18,24,.5)]">
        <header className="shrink-0 border-b border-[var(--cc-line)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cc-muted)]">Clear the deck</p>
              <h2 id="cc-deck-title" className="font-display text-[20px] leading-tight">
                {done ? 'That is the deck' : `${i + 1} of ${queue.length}`}
              </h2>
            </div>
            <button onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] hover:text-[var(--cc-ink)]">
              Close
            </button>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden>
            {queue.map((q, n) => (
              <span key={q.id} className={cx('h-1 flex-1 rounded-full', n < i ? 'bg-[var(--cc-accent)]' : n === i ? 'bg-[var(--cc-ink)]' : 'bg-[var(--cc-line)]')} />
            ))}
          </div>
        </header>

        {done ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 text-center">
            <p className="text-[15px]">
              {sent ? `${sent} ${sent === 1 ? 'reply' : 'replies'} sent.` : 'Nothing sent this time.'} Everything you set aside is still in the Inbox.
            </p>
            <div className="mt-5 flex justify-center">
              <Button kind="primary" onClick={onClose}>Back to the Inbox</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold">{m.from_name || m.from_addr}</p>
                <p className="text-[12px] text-[var(--cc-muted)]">{when(m.received_at)}</p>
              </div>
              <p className="text-[13.5px] text-[var(--cc-muted)]">{m.subject || '(no subject)'}</p>
              {m.summary && <p className="mt-3 rounded-lg bg-[#F6F7F9] px-4 py-3 text-[14px] leading-relaxed">{m.summary}</p>}
              {m.body_text && (
                <div className="mt-3">
                  <p className={cx('whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--cc-muted)]', !showAll && 'line-clamp-5')}>{m.body_text}</p>
                  <button onClick={() => setShowAll((v) => !v)} className="mt-1 text-[12.5px] font-semibold text-[var(--cc-accent)]">
                    {showAll ? 'Show less' : 'Read the whole email'}
                  </button>
                </div>
              )}
              <label className="mt-4 block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--cc-muted)]">Your reply</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  className={cx(inputCls, 'w-full leading-relaxed')}
                  placeholder="No draft for this one yet. Write it here, or set it aside and it stays in the Inbox."
                />
              </label>
              {note && <p className="mt-2 text-[13px] text-[#B42318]">{note}</p>}
            </div>
            <footer className="shrink-0 border-t border-[var(--cc-line)] px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button kind="ghost" disabled={busy} onClick={next}>Later</Button>
                <Button disabled={busy} onClick={() => void act({ action: 'done', id: m.id }, next)}>No reply needed</Button>
                <Button disabled={busy || !text.trim()} onClick={() => void act({ action: 'draft', id: m.id, text }, next)}>Save to drafts</Button>
                <Button
                  kind="primary"
                  disabled={busy || !text.trim()}
                  onClick={() =>
                    void act({ action: 'send', id: m.id, text }, () => {
                      setSent((v) => v + 1);
                      next();
                    })
                  }
                >
                  {busy ? 'Sending' : 'Send'}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
