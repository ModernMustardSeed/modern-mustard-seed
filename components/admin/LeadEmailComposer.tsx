'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WRITE THEM AN EMAIL. NOW. WITHOUT STARTING A SEQUENCE.
 *
 * Somebody gets off the phone with Mr. Mustard and says the one sentence that
 * decides the sale. The answer to that sentence is a specific email, and until
 * this panel existed the only way to mail them was to point a five-step drip at
 * them and hope step one happened to fit.
 *
 * Suggest reads the last thing that actually happened (the call transcript,
 * their reply, what we sent, what they opened) and writes to it. The
 * instruction box is where the offer goes: whatever price or term is typed in
 * there is used verbatim, so a one-off deal does not need a code change.
 *
 * It drops onto screens that do not share a palette (cream admin, the cockpit's
 * brass, Acquisition's pop), so every colour is written out rather than
 * inherited. Nothing is left to `body`, which is the trap that renders
 * un-classed admin text white on cream.
 */

type Recent = { at: string; what: string; preview: string };

type Context = {
  to: string | null;
  businessName: string;
  contactName: string | null;
  basis: string;
  blocked: string | null;
  links: { label: string; url: string }[];
  recent: Recent[];
};

export type ComposerSource = 'lead' | 'prospect' | 'inbound';

const INK = '#161616';
const CREAM = '#FFFDF8';
const GOLD = '#F5B700';
const RED = '#E0301E';
const GREEN = '#3f5d34';

const field =
  'w-full rounded-xl border-2 border-[#161616]/25 bg-white px-3 py-2 text-[14px] text-[#161616] placeholder:text-[#161616]/40 focus:border-[#161616] focus:outline-none';
const label = 'block text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[#161616]/60 mb-1';
const btn =
  'rounded-xl border-2 border-[#161616] px-3.5 py-2 font-oswald text-xs font-semibold uppercase tracking-[0.1em] transition-all disabled:opacity-45 disabled:cursor-not-allowed';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeadEmailComposer({
  source,
  id,
  triggerLabel = 'Write them an email',
  triggerClassName,
  onSent,
}: {
  source: ComposerSource;
  id: string;
  triggerLabel?: string;
  /** Let the host screen match its own buttons. Defaults to the gold primary. */
  triggerClassName?: string;
  /** Fired after a successful send, so the host can refresh its thread. */
  onSent?: (info: { to: string; subject: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? `${btn} shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5`}
        style={triggerClassName ? undefined : { background: GOLD, color: INK }}
      >
        {triggerLabel}
      </button>
      {open && <ComposerModal source={source} id={id} onClose={() => setOpen(false)} onSent={onSent} />}
    </>
  );
}

function ComposerModal({
  source,
  id,
  onClose,
  onSent,
}: {
  source: ComposerSource;
  id: string;
  onClose: () => void;
  onSent?: (info: { to: string; subject: string }) => void;
}) {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [instruction, setInstruction] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ to: string; subject: string } | null>(null);
  const [showContext, setShowContext] = useState(false);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/lead-email?source=${source}&id=${encodeURIComponent(id)}`);
        const json = (await res.json().catch(() => ({}))) as Context & { error?: string };
        if (!res.ok) throw new Error(json.error || `Could not read the lead (${res.status}).`);
        if (live) setCtx(json);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Could not read the lead.');
      }
    })();
    return () => {
      live = false;
    };
  }, [source, id]);

  useEffect(() => {
    if (ctx && !ctx.blocked) instructionRef.current?.focus();
  }, [ctx]);

  const suggest = useCallback(async () => {
    setDrafting(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/lead-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, id, action: 'suggest', instruction }),
      });
      const json = (await res.json().catch(() => ({}))) as { subject?: string; body?: string; basis?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `The draft failed (${res.status}).`);
      setSubject(json.subject ?? '');
      setBody(json.body ?? '');
      setNotice(`Written from ${json.basis ?? 'their record'}. Read it before you send it.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The draft failed.');
    } finally {
      setDrafting(false);
    }
  }, [source, id, instruction]);

  const send = useCallback(async () => {
    setSending(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/lead-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, id, action: 'send', subject, body }),
      });
      const json = (await res.json().catch(() => ({}))) as { to?: string; subject?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `The send failed (${res.status}).`);
      const info = { to: json.to ?? '', subject: json.subject ?? subject };
      setSent(info);
      onSent?.(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The send failed.');
    } finally {
      setSending(false);
    }
  }, [source, id, subject, body, onSent]);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Height-capped flex column, per the house rule: a card that can grow
          taller than the viewport pushes its own top off screen with no way to
          scroll back up to it. The header stays pinned, the rest scrolls. */}
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border-[3px] shadow-[8px_8px_0_0_#161616]"
        style={{ background: CREAM, borderColor: INK, color: INK }}
        role="dialog"
        aria-modal="true"
        aria-label="Write them an email"
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b-2 p-5 md:p-6" style={{ borderColor: `${INK}1A` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em]" style={{ color: `${INK}99` }}>
              One email, sent now
            </p>
            <h2 className="font-oswald text-xl font-bold uppercase tracking-tight" style={{ color: INK }}>
              {ctx?.businessName ?? 'Loading...'}
            </h2>
            <p className="mt-0.5 text-[13px]" style={{ color: `${INK}A6` }}>
              {ctx?.to ? `To ${ctx.contactName ? `${ctx.contactName}, ` : ''}${ctx.to}` : 'Reading their record...'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={btn}
            style={{ background: CREAM, color: INK }}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {error && (
          <p className="mb-4 rounded-xl border-2 px-3 py-2 text-[13px] font-semibold" style={{ borderColor: RED, color: RED, background: `${RED}0F` }}>
            {error}
          </p>
        )}

        {sent ? (
          <div>
            <p className="text-[15px] font-semibold" style={{ color: GREEN }}>
              Sent to {sent.to}.
            </p>
            <p className="mt-1 text-[13px]" style={{ color: `${INK}A6` }}>
              &quot;{sent.subject}&quot; is on its way, logged on their thread, and no sequence was started.
            </p>
          </div>
        ) : ctx?.blocked ? (
          <div>
            <p className="text-[14px] font-semibold" style={{ color: RED }}>
              {ctx.blocked}
            </p>
          </div>
        ) : (
          <>
            {/* What the suggestion will be written from, said before it is asked for. */}
            {ctx && (
              <div className="rounded-xl border-2 px-3.5 py-2.5" style={{ borderColor: `${INK}26`, background: `${INK}08` }}>
                <p className="text-[13px]" style={{ color: INK }}>
                  <span className="font-semibold">Writing from: </span>
                  {ctx.basis}
                </p>
                {ctx.recent.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowContext((v) => !v)}
                      className="mt-1 text-[11px] font-mono uppercase tracking-[0.12em] underline"
                      style={{ color: `${INK}A6` }}
                    >
                      {showContext ? 'Hide it' : 'Show me what it read'}
                    </button>
                    {showContext && ctx.links.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {ctx.links.map((l) => (
                          <li key={l.url} className="text-[12px] leading-snug" style={{ color: `${INK}BF` }}>
                            <span className="font-semibold" style={{ color: INK }}>
                              {l.label}:
                            </span>{' '}
                            <span className="break-all font-mono text-[11px]">{l.url}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {showContext && (
                      <ul className="mt-2 space-y-2">
                        {ctx.recent.map((r, i) => (
                          <li key={i} className="text-[12px] leading-snug" style={{ color: `${INK}BF` }}>
                            <span className="font-mono tabular-nums" style={{ color: `${INK}8C` }}>
                              {fmt(r.at)}
                            </span>{' '}
                            <span className="font-semibold" style={{ color: INK }}>
                              {r.what}
                            </span>
                            {r.preview ? <span> {r.preview}...</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className={label} htmlFor="composer-instruction">
                What do you want to say? (optional)
              </label>
              <textarea
                id="composer-instruction"
                ref={instructionRef}
                className={`${field} min-h-[72px]`}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="He only gets about 20 calls a month, so offer him the smaller build at $197 a month for 120 minutes."
              />
              <p className="mt-1 text-[11px] leading-snug" style={{ color: `${INK}8C` }}>
                Any price or term you type here is used exactly as you wrote it. Leave it blank and it answers the last
                thing that happened.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void suggest()}
                disabled={drafting || !ctx}
                className={btn}
                style={{ background: CREAM, color: INK }}
              >
                {drafting ? 'Writing it...' : body ? 'Suggest another' : 'Suggest an email'}
              </button>
              {notice && (
                <span className="text-[12px] font-semibold" style={{ color: GREEN }}>
                  {notice}
                </span>
              )}
            </div>

            <div className="mt-4">
              <label className={label} htmlFor="composer-subject">
                Subject
              </label>
              <input
                id="composer-subject"
                className={field}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="The subject line they will see"
              />
            </div>

            <div className="mt-3">
              <label className={label} htmlFor="composer-body">
                The email
              </label>
              <textarea
                id="composer-body"
                className={`${field} min-h-[240px] leading-relaxed`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write it yourself, or press Suggest an email and edit what comes back."
              />
              <p className="mt-1 text-[11px] leading-snug" style={{ color: `${INK}8C` }}>
                {words} word{words === 1 ? '' : 's'}. It ships in the usual template with your signature under it, so do
                not sign it here. Sends from sarah@modernmustardseed.com and lands on their thread.
              </p>
            </div>

          </>
        )}
        </div>

        {/* Pinned, so the send is never the thing you have to scroll to find. */}
        <div
          className="flex shrink-0 items-center justify-end gap-2 border-t-2 p-4 md:px-6"
          style={{ borderColor: `${INK}1A` }}
        >
          {sent ? (
            <button type="button" onClick={onClose} className={btn} style={{ background: GOLD, color: INK }}>
              Done
            </button>
          ) : ctx?.blocked ? (
            <button type="button" onClick={onClose} className={btn} style={{ background: CREAM, color: INK }}>
              Close
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className={btn} style={{ background: CREAM, color: INK }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !subject.trim() || !body.trim() || !ctx?.to}
                className={`${btn} shadow-[3px_3px_0_0_#161616]`}
                style={{ background: GOLD, color: INK }}
              >
                {sending ? 'Sending...' : `Send it${ctx?.to ? ` to ${ctx.to}` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
