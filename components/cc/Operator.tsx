'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Drawer, Label, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE OPERATOR. Ask it about the business and it answers from the rows; tell
 * it to do one of the four things it can do and it does them, then says what
 * happened.
 *
 * It can draft an email into their own drafts (never send), send a review
 * ask, mark a waiting lead called, and make a QR code. Everything else it
 * passes to Sarah. Receipts are printed under the answer and come from the
 * server after the work ran, so the Operator cannot claim something it did
 * not do.
 */

type Msg = { role: 'user' | 'assistant'; content: string; receipts?: string[]; noteSent?: boolean };

const STARTERS = [
  'Who is waiting on a call?',
  'What came in this week?',
  'Who have we already asked for a review?',
  'Draft a reply to the last email',
  'Make a QR code for a jobsite sign',
];

export default function Operator({ open, onClose, seed, session, go, onDidAct }: { open: boolean; onClose: () => void; seed: { text: string; send: boolean; n: number } | null; session: Session | null; go: (k: string) => void; onDidAct: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const seenSeed = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: question }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/portal/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const j = (await r.json()) as { reply?: string; actions?: string[]; noteSent?: boolean; error?: string };
      setMsgs((prev) => [...prev, { role: 'assistant', content: j.reply ?? j.error ?? 'I hit a snag. Try again in a moment.', receipts: j.actions ?? [], noteSent: j.noteSent }]);
      if ((j.actions ?? []).length) onDidAct();
    } catch {
      setMsgs((prev) => [...prev, { role: 'assistant', content: 'I could not reach the desk just now. Try again, or email sarah@modernmustardseed.com.' }]);
    } finally {
      setBusy(false);
    }
  };

  // A seed arrives from the rest of the app. Words a person typed into the
  // bar are sent as typed. A suggestion they tapped only fills the box, so
  // the press that sends it is still theirs.
  useEffect(() => {
    if (!seed || seed.n === seenSeed.current) return;
    seenSeed.current = seed.n;
    if (seed.send) void send(seed.text);
    else setInput(seed.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const guide = session?.brand.guideName ?? 'your guide';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Operator"
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <input className={cx(inputCls, 'flex-1 max-sm:text-[16px]')} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask, or tell it what to do" disabled={busy} />
          <Button kind="primary" type="submit" disabled={busy || !input.trim()}>
            {busy ? 'Working' : 'Send'}
          </Button>
        </form>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--cc-line)] bg-[#FAFBFC] p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="text-[var(--cc-accent)]"><Icon name="operator" size={16} /></span>
            {guide}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--cc-muted)]">
            It reads your leads, your mail, your calendar and your codes. It can draft an email into your drafts, ask a customer for a review, mark a lead called, and make a QR code. Anything else, it passes to Sarah.
          </p>
        </div>

        {msgs.length === 0 && (
          <div>
            <Label>Try</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border border-[var(--cc-line)] bg-white px-3 py-1.5 text-[13px] hover:border-[var(--cc-ink)]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={cx('rounded-xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap', m.role === 'user' ? 'ml-auto max-w-[88%] bg-[var(--cc-ink)] text-white' : 'max-w-[92%] border border-[var(--cc-line)] bg-white')}>
              {m.content}
              {m.role === 'assistant' && m.receipts?.length ? (
                // The receipt is the server's own sentence, written after the
                // work ran. It is printed whole so "done" always says what.
                <ul className="mt-2.5 space-y-1.5 border-t border-[var(--cc-line)] pt-2.5">
                  {m.receipts.map((r, k) => (
                    <li key={k} className="flex gap-2 text-[13px] leading-snug">
                      <span className="mt-0.5 flex-none text-[#067647]"><Icon name="check" size={14} /></span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {m.role === 'assistant' && m.noteSent ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {m.noteSent && <Badge tone="good">Passed to Sarah</Badge>}
                </div>
              ) : null}
            </div>
          ))}
          {busy && (
            <div className="max-w-[92%] rounded-xl border border-[var(--cc-line)] bg-white px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--cc-muted)]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--cc-muted)] [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--cc-muted)] [animation-delay:240ms]" />
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="pt-1">
          <Label>Jump to</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ['leads', 'Leads'],
              ['inbox', 'Inbox'],
              ['reviews', 'Reviews'],
              ['marketing', 'Marketing'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  go(k);
                  onClose();
                }}
                className="rounded-lg border border-[var(--cc-line)] bg-white px-3 py-1.5 text-[13px] hover:border-[var(--cc-ink)]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
