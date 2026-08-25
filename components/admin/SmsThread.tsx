'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WHAT THEY TEXTED BACK.
 *
 * The SMS sibling of EmailThread, and the surface that closes the loop the
 * texting stack has been missing: until the inbound webhook existed, every reply
 * landed on a personal handset and nothing here could show it.
 *
 * Three things it refuses to fake, each one a lesson from the old stack:
 *
 *  1. A send is 'queued' until a carrier says otherwise. The bubble says queued,
 *     and only turns delivered when the status webhook upgrades it. A green
 *     check that means "Twilio accepted it" is the exact lie that hid weeks of
 *     carrier filtering.
 *  2. A number that replied STOP gets a locked composer, not a hidden one. The
 *     box is visibly closed and says why, because a composer that vanishes reads
 *     as a bug and gets worked around.
 *  3. When the app cannot legally send, the button opens the handset instead of
 *     pretending. It says which one it is doing before it is pressed.
 *
 * Every colour is written out. Nothing is left to `body`, which is the trap that
 * renders un-classed admin text white on cream.
 */

type Message = {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  snippet: string | null;
  status: string | null;
  error_code?: string | null;
  provider_sid: string | null;
  via_number: string | null;
  from_addr: string | null;
  read: boolean;
  occurred_at: string;
};

type Send = {
  mode: 'provider' | 'handset';
  from: string | null;
  fromLabel: string | null;
  configured: boolean;
  blockedReason: string | null;
};

type Thread = {
  phone: string;
  display: string;
  owner: { businessName: string | null; contactName: string | null; outboundLeadId: string | null; prospectId: string | null };
  optedOut: boolean;
  messages: Message[];
  send: Send;
};

/** Statuses that mean the text did not land, and must read as a failure. */
const BAD = /^(failed|undelivered)$/i;
const LANDED = /^(delivered|received)$/i;

/**
 * The carrier codes worth translating into English on the bubble. A number is
 * not a diagnosis, and 30032 in particular is the one that explains a whole
 * silent campaign.
 */
const CODE_MEANS: Record<string, string> = {
  '30032': 'the A2P campaign is not approved, so the carrier dropped it',
  '30007': 'the carrier flagged it as spam',
  '30003': 'that handset is unreachable',
  '30005': 'that number does not exist',
  '30006': 'that is a landline',
  '21610': 'they opted out at the carrier',
  '21614': 'that is not a mobile number',
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Tag({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'good' | 'bad' | 'warn' }) {
  const cls =
    tone === 'good'
      ? 'bg-[#3f5d34]/12 text-[#2c4225] border-[#3f5d34]/40'
      : tone === 'bad'
        ? 'bg-[#E0301E]/10 text-[#a32315] border-[#E0301E]/45'
        : tone === 'warn'
          ? 'bg-[#F5B700]/25 text-[#7a5c00] border-[#F5B700]'
          : 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/20';
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

function Bubble({ m }: { m: Message }) {
  const inbound = m.direction === 'inbound';
  const status = (m.status || '').toLowerCase();
  const code = m.error_code || '';
  const bad = BAD.test(status);

  return (
    <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${inbound ? '' : 'text-right'}`}>
        <div
          className={
            inbound
              ? 'rounded-2xl rounded-bl-sm border-2 border-[#161616]/15 bg-white px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-[#161616]'
              : bad
                ? 'rounded-2xl rounded-br-sm border-2 border-[#E0301E]/45 bg-[#E0301E]/[0.07] px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-[#161616]'
                : 'rounded-2xl rounded-br-sm border-2 border-[#161616] bg-[#161616] px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-[#FBF6EA]'
          }
        >
          <p className="whitespace-pre-wrap break-words">{m.body || m.snippet || '(no text)'}</p>
        </div>
        <div className={`mt-1 flex items-center gap-1.5 ${inbound ? 'justify-start' : 'justify-end'}`}>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#161616]/45">{fmtWhen(m.occurred_at)}</span>
          {!inbound && status && (
            <Tag tone={bad ? 'bad' : LANDED.test(status) ? 'good' : 'warn'}>{status}</Tag>
          )}
          {/* Sent by a human from their own phone, which is a different fact from
              a message this system sent, and the thread should not blur them. */}
          {!inbound && !m.provider_sid && m.from_addr?.includes('phone') && <Tag>from handset</Tag>}
        </div>
        {bad && code && (
          <p className={`mt-0.5 text-[11px] leading-snug text-[#a32315] ${inbound ? 'text-left' : 'text-right'}`}>
            Carrier said {code}
            {CODE_MEANS[code] ? `: ${CODE_MEANS[code]}` : ''}.
          </p>
        )}
      </div>
    </div>
  );
}

export default function SmsThread({ phone, title = 'Texts' }: { phone: string | null | undefined; title?: string }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sms?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load the thread.');
      setThread(json as Thread);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread?.messages.length]);

  const send = useCallback(async () => {
    if (!thread || !draft.trim()) return;
    setSending(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch('/api/admin/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: thread.phone, body: draft, mode: thread.send.mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'It did not send.');

      // Handset mode: the row is logged, now open Messages with the body already
      // written. The order matters. Opening first and logging after loses the
      // record on any handset that backgrounds this tab.
      if (json.mode === 'handset' && json.href) {
        window.location.href = json.href as string;
        setNote('Logged on the thread. Your Messages app should be open with it written out.');
      }
      setDraft('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }, [thread, draft, load]);

  if (!phone) {
    return (
      <section className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-4">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#161616]/60">{title}</h3>
        <p className="mt-2 text-[13px] text-[#161616]/60">No phone number on this record, so there is nothing to text.</p>
      </section>
    );
  }

  const handset = thread?.send.mode === 'handset';
  const locked = Boolean(thread?.optedOut);

  return (
    <section className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-4 text-[#161616]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#161616]/60">
          {title}
          {thread ? <span className="ml-2 normal-case tracking-normal text-[#161616]/45">{thread.display}</span> : null}
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#161616]/55 underline hover:text-[#161616]"
        >
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </header>

      {error && (
        <p className="mt-3 rounded-lg border-2 border-[#E0301E]/45 bg-[#E0301E]/[0.07] px-3 py-2 text-[12px] leading-snug text-[#a32315]">{error}</p>
      )}

      {locked && (
        <p className="mt-3 rounded-lg border-2 border-[#E0301E]/45 bg-[#E0301E]/[0.07] px-3 py-2 text-[12px] leading-snug text-[#a32315]">
          <span className="font-mono font-semibold uppercase tracking-[0.12em]">Opted out.</span> They replied STOP. Nothing
          may text this number again, from the app or from a handset, unless they reply START themselves.
        </p>
      )}

      <div className="mt-3 max-h-[26rem] space-y-3 overflow-y-auto rounded-lg border-2 border-[#161616]/12 bg-[#161616]/[0.03] p-3">
        {thread && thread.messages.length === 0 && (
          <p className="py-6 text-center text-[13px] text-[#161616]/55">
            Nothing yet. Their replies will appear here the moment one arrives.
          </p>
        )}
        {thread?.messages.map((m) => <Bubble key={m.id} m={m} />)}
        <div ref={endRef} />
      </div>

      {!locked && thread && (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={handset ? 'Write it, and it opens in Messages ready to send.' : 'Write a text.'}
            className="w-full resize-y rounded-lg border-2 border-[#161616]/20 bg-white px-3 py-2 text-[13px] leading-relaxed text-[#161616] placeholder:text-[#161616]/35 focus:border-[#161616] focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-[34rem] text-[11px] leading-snug text-[#161616]/55">
              {handset ? (
                <>
                  <span className="font-mono font-semibold uppercase tracking-[0.12em] text-[#7a5c00]">Handset.</span>{' '}
                  {thread.send.blockedReason} It will be logged here and opened in your Messages app to send yourself.
                </>
              ) : (
                <>
                  Sending from {thread.send.fromLabel || thread.send.from}. Delivery is confirmed by the carrier, not by us,
                  so it will read queued until it lands.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
              className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-[12px] font-mono font-semibold uppercase tracking-[0.12em] text-[#161616] transition hover:bg-[#161616] hover:text-[#FBF6EA] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? 'Working' : handset ? 'Log and open Messages' : 'Send text'}
            </button>
          </div>
          {note && <p className="mt-2 text-[11px] leading-snug text-[#2c4225]">{note}</p>}
        </div>
      )}
    </section>
  );
}
