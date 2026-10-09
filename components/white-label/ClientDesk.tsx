'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeskCall } from '@/lib/white-label/desk';
import { inkFor } from '@/components/white-label/brand';

type Agency = { name: string; color: string; logo: string | null; website: string | null };
type Client = { id: string; business: string; agent: string; line: string | null };
type Filter = 'attention' | 'all' | 'handled';

const DAY = 86_400_000;
/** Instrument Serif, set by the page wrapper (components/white-label/font.ts). */
const SERIF = '[font-family:var(--wl-serif),Georgia,serif] font-normal';

function phone(raw: string | null | undefined): string {
  const d = String(raw ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(raw ?? '');
}
function tel(raw: string | null | undefined): string | null {
  const d = String(raw ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `tel:+1${d}` : null;
}
function when(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const d = new Date(t);
  const sameDay = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' });
  if (sameDay) return `Today, ${time}`;
  if (Date.now() - t < 6 * DAY) return `${d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Denver' })}, ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' })}, ${time}`;
}
function length(s: number | null): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return m ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
}
const urgentOf = (c: DeskCall) => c.intake.urgent === true || c.intake.in_custody === true;
const nameOf = (c: DeskCall) => c.intake.caller_name?.trim() || 'Caller did not give a name';
const isNew = (c: DeskCall) => /prospective|new|family member/i.test(c.intake.caller_type ?? '') && c.intake.existing_client !== true;

export default function ClientDesk({
  agency,
  client,
  deskKey,
  calls: initial,
  fresh,
  openCall,
  voice,
}: {
  agency: Agency;
  client: Client;
  deskKey: string;
  calls: DeskCall[];
  fresh: boolean;
  openCall: string | null;
  voice: { publicKey: string; assistantId: string } | null;
}) {
  const router = useRouter();
  const [calls, setCalls] = useState(initial);
  const [filter, setFilter] = useState<Filter>('attention');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(openCall);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const brand = agency.color;
  const onBrand = inkFor(brand);

  // A refresh hands down a new list: adopt it during render, the React way to
  // reset state from a prop without an effect.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setCalls(initial);
    setRefreshedAt(new Date());
  }

  // A desk left open on a front-office screen keeps itself current.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    return () => window.clearInterval(t);
  }, [router]);

  useEffect(() => {
    if (!openCall) return;
    document.getElementById(`call-${openCall}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [openCall]);

  // Measured from the last refresh, not the render, so the count holds still between refreshes.
  const asOf = refreshedAt.getTime();
  const week = calls.filter((c) => c.startedAt && asOf - Date.parse(c.startedAt) < 7 * DAY);
  const waiting = calls.filter((c) => !c.handledAt);
  const urgentWaiting = waiting.filter(urgentOf);
  const stats = [
    { label: 'Calls this week', value: week.length },
    { label: 'Urgent, not handled', value: urgentWaiting.length, alert: urgentWaiting.length > 0 },
    { label: 'New matters this week', value: week.filter(isNew).length },
    { label: 'Waiting on a callback', value: waiting.length },
  ];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls
      .filter((c) => (filter === 'attention' ? !c.handledAt : filter === 'handled' ? Boolean(c.handledAt) : true))
      .filter((c) => {
        if (!q) return true;
        const hay = [nameOf(c), c.intake.matter_type, c.intake.opposing_party, c.intake.other_parties, c.summary, c.intake.callback_number, c.callerNumber]
          .join(' ')
          .toLowerCase();
        return hay.includes(q) || hay.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000');
      })
      .sort((a, b) => {
        if (filter === 'attention' && urgentOf(a) !== urgentOf(b)) return urgentOf(a) ? -1 : 1;
        return Date.parse(b.startedAt ?? '0') - Date.parse(a.startedAt ?? '0');
      });
  }, [calls, filter, query]);

  async function toggleHandled(c: DeskCall) {
    const next = !c.handledAt;
    setCalls((all) => all.map((x) => (x.id === c.id ? { ...x, handledAt: next ? new Date().toISOString() : null } : x)));
    const res = await fetch(`/api/white-label/desk/${client.id}/handled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k: deskKey, callId: c.id, handled: next }),
    }).catch(() => null);
    if (!res?.ok) setCalls((all) => all.map((x) => (x.id === c.id ? { ...x, handledAt: c.handledAt } : x)));
  }

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'attention', label: 'Needs a callback', count: waiting.length },
    { key: 'all', label: 'All calls', count: calls.length },
    { key: 'handled', label: 'Handled', count: calls.length - waiting.length },
  ];

  const rule = onBrand === '#ffffff' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#14161c] antialiased">
      <header className="relative overflow-hidden" style={{ background: brand, color: onBrand }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 -top-48 h-[560px] w-[560px] rounded-full opacity-[0.18] blur-3xl" style={{ background: onBrand }} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
          <div className="flex items-center justify-between gap-4 border-b py-4" style={{ borderColor: rule }}>
            {agency.logo ? (
              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agency.logo} alt={agency.name} className="h-6 w-auto max-w-[140px] object-contain sm:h-7" />
              </span>
            ) : (
              <span className="text-[15px] font-bold tracking-wide">{agency.name}</span>
            )}
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="opacity-80">Front desk · answering</span>
            </span>
          </div>

          <div className="flex flex-col gap-8 pb-28 pt-12 md:flex-row md:items-end md:justify-between md:pb-32 md:pt-16">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] opacity-70">{client.business}</p>
              <h1 className={`${SERIF} mt-4 text-[52px] leading-[0.95] tracking-[-0.015em] sm:text-[80px]`}>
                {client.agent} answers <em className="italic">every call.</em>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed opacity-75">
                Day or night, every caller is answered, every message is written down, and the urgent ones are flagged before you open this page.
              </p>
              {client.line && (
                <p className="mt-6 flex flex-wrap items-baseline gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-60">Her line</span>
                  <a className={`${SERIF} text-[28px] leading-none underline decoration-1 underline-offset-[6px]`} style={{ textDecorationColor: rule }} href={tel(client.line) ?? undefined}>
                    {phone(client.line)}
                  </a>
                </p>
              )}
            </div>
            {voice && <TalkButton voice={voice} agent={client.agent} brand={brand} onBrand={onBrand} onFiled={() => router.refresh()} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <section className="relative -mt-16 grid grid-cols-2 overflow-hidden rounded-[24px] bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`px-5 py-6 sm:px-8 sm:py-7 ${i % 2 ? 'border-l border-black/[0.07]' : ''} ${i > 1 ? 'border-t border-black/[0.07] md:border-l md:border-t-0' : ''}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{s.label}</p>
              <p className={`${SERIF} mt-3 text-[56px] leading-none tabular-nums sm:text-[68px] ${s.alert ? 'text-[#b42318]' : ''}`}>{s.value}</p>
            </div>
          ))}
        </section>

        <div className="mt-14 flex flex-col gap-4 border-b border-black/[0.08] sm:flex-row sm:items-end sm:justify-between">
          <div className="-mb-px flex gap-6 overflow-x-auto sm:gap-8" role="tablist">
            {tabs.map((t) => {
              const on = filter === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(t.key)}
                  className={`whitespace-nowrap border-b-2 pb-3.5 text-[14px] font-semibold transition-colors ${on ? 'text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}
                  style={on ? { borderColor: brand } : undefined}
                >
                  {t.label} <span className="ml-1 tabular-nums font-normal text-neutral-400">{t.count}</span>
                </button>
              );
            })}
          </div>
          <label className="relative mb-3 block sm:w-80">
            <span className="sr-only">Search calls</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a name, number or matter"
              className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-10 pr-4 text-[14px] outline-none transition placeholder:text-neutral-400 focus:border-black/30 focus:ring-4 focus:ring-black/[0.04]"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {shown.map((c) => (
            <CallCard
              key={c.id}
              c={c}
              brand={brand}
              agent={client.agent}
              open={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
              onHandled={() => toggleHandled(c)}
              audio={c.hasRecording ? `/api/white-label/desk/${client.id}/recording/${c.id}?k=${encodeURIComponent(deskKey)}` : null}
            />
          ))}
          {!shown.length && (
            <div className="rounded-[24px] border border-dashed border-black/15 bg-white/60 px-6 py-16 text-center">
              <p className={`${SERIF} text-[34px] leading-tight`}>
                {calls.length === 0
                  ? 'No calls yet.'
                  : filter === 'attention'
                    ? 'Everyone has been called back.'
                    : query
                      ? 'Nothing matches that search.'
                      : 'Nothing here yet.'}
              </p>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-neutral-500">
                {calls.length === 0
                  ? `The moment ${client.agent} takes a call, it lands here with the caller's details, the recording and the transcript.${voice ? ` Talk to ${client.agent} above to see one arrive.` : ''}`
                  : filter === 'attention'
                    ? 'New calls show up here until someone marks them handled.'
                    : 'Try a last name, a phone number or a kind of case.'}
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[12px] text-neutral-400" suppressHydrationWarning>
          {fresh ? 'Up to date' : 'Showing saved calls'} as of {refreshedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })}. Refreshes itself every minute.
        </p>
      </main>

      <footer className="border-t border-black/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[12px] text-neutral-500 sm:flex-row sm:px-8">
          <span>{client.business} · Front desk</span>
          <span>
            Built and supported by{' '}
            {agency.website ? (
              <a href={agency.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-neutral-900 underline decoration-black/20 underline-offset-4">
                {agency.name}
              </a>
            ) : (
              <span className="font-semibold text-neutral-900">{agency.name}</span>
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}

function CallCard({
  c,
  brand,
  agent,
  open,
  onToggle,
  onHandled,
  audio,
}: {
  c: DeskCall;
  brand: string;
  agent: string;
  open: boolean;
  onToggle: () => void;
  onHandled: () => void;
  audio: string | null;
}) {
  const urgent = urgentOf(c);
  // A number the caller gave that is not ten digits (a dropped digit on a bad
  // line) falls back to the caller ID, so there is always a number to dial.
  const callback = tel(c.intake.callback_number) ? c.intake.callback_number : c.callerNumber || c.intake.callback_number;
  const href = tel(callback);
  const note = c.intake.summary_for_attorney || c.summary || 'No summary for this call.';
  const fields: [string, string | undefined][] = [
    ['Call back', callback ? phone(callback) : undefined],
    ['Best time', c.intake.best_time_to_call],
    ['Email', c.intake.email],
    ['Who they are', c.intake.caller_type],
    ['Matter', c.intake.matter_type],
    ['County or town', c.intake.county],
    ['Other side', c.intake.opposing_party],
    ['Also involved', c.intake.other_parties],
    ['Court date or deadline', c.intake.deadline],
    ['Their question', c.intake.asked_for],
    ['Found you through', c.intake.referral_source],
  ];
  const conflict = [c.intake.opposing_party, c.intake.other_parties].filter(Boolean).join(', ');

  const handled = Boolean(c.handledAt);
  const stamp = c.startedAt ? new Date(c.startedAt) : null;
  const clock = stamp ? stamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }) : '';

  return (
    <article
      id={`call-${c.id}`}
      className={`scroll-mt-4 overflow-hidden rounded-[22px] bg-white ring-1 transition-all ${handled ? 'opacity-60 ring-black/[0.05]' : urgent ? 'shadow-[0_20px_40px_-28px_rgba(180,35,24,0.6)] ring-[#f2b8b5]' : 'ring-black/[0.06] hover:shadow-[0_20px_40px_-30px_rgba(0,0,0,0.35)]'}`}
    >
      <div className="flex">
        <div className="hidden w-[132px] shrink-0 flex-col justify-between border-r border-black/[0.06] p-5 sm:flex">
          <div>
            <p className={`${SERIF} text-[30px] leading-none`}>{clock.replace(/\s*(AM|PM)$/, '')}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{clock.slice(-2)}</p>
          </div>
          <span className="mt-6 h-1.5 w-8 rounded-full" style={{ background: urgent && !handled ? '#b42318' : handled ? '#d4d4d4' : brand }} />
        </div>
        <div className="min-w-0 flex-1 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className={`${SERIF} text-[28px] leading-none sm:text-[32px]`}>{nameOf(c)}</h2>
            {urgent && (
              <span className="rounded-full bg-[#b42318] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                {c.intake.in_custody ? 'Urgent: in custody' : 'Urgent'}
              </span>
            )}
            {c.intake.matter_type && (
              <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-[12px] font-medium text-neutral-700">{c.intake.matter_type}</span>
            )}
            {handled && <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#067647]">Handled</span>}
          </div>
          <p className="mt-2 text-[13px] text-neutral-500" suppressHydrationWarning>
            {when(c.startedAt)}
            {c.seconds ? ` · ${length(c.seconds)}` : ''}
            {c.web ? ' · web call' : c.callerNumber ? ` · from ${phone(c.callerNumber)}` : ''}
          </p>
          {urgent && c.intake.urgent_reason && (
            <p className="mt-4 border-l-2 border-[#b42318] pl-3 text-[15px] font-semibold leading-snug text-[#912018]">{c.intake.urgent_reason}</p>
          )}
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-700">{note}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {href && (
              <a href={href} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: brand, color: inkFor(brand) }}>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M4.6 2.5h2.6l1.3 3.6-1.7 1.2a9.7 9.7 0 0 0 5.9 5.9l1.2-1.7 3.6 1.3v2.6c0 .9-.7 1.6-1.6 1.6C8.6 17 3 11.4 3 4.1c0-.9.7-1.6 1.6-1.6Z" />
                </svg>
                Call {phone(callback)}
              </a>
            )}
            <button onClick={onHandled} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-black/30 hover:text-neutral-900">
              {handled ? 'Move back to callbacks' : 'Mark handled'}
            </button>
            <button onClick={onToggle} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-900" aria-expanded={open}>
              {open ? 'Hide details' : 'Details, recording and transcript'}
              <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>↓</span>
            </button>
          </div>

          {open && (
            <div className="mt-6 border-t border-black/[0.06] pt-6">
              <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {fields
                  .filter(([, v]) => v && String(v).trim())
                  .map(([k, v]) => (
                    <div key={k} className="border-b border-black/[0.05] pb-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{k}</dt>
                      <dd className="mt-1 break-words text-[15px] text-neutral-900">{v}</dd>
                    </div>
                  ))}
              </dl>
              {conflict && (
                <p className="mt-5 rounded-xl bg-[#f3f1ec] px-4 py-3 text-[13px] text-neutral-700">
                  <strong>Conflict check:</strong> run {conflict} before anyone calls back.
                </p>
              )}
              {audio && (
                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Recording</p>
                  <audio controls preload="none" src={audio} className="mt-2 w-full" />
                </div>
              )}
              {c.turns.length > 0 && (
                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Transcript</p>
                  <div className="mt-3 space-y-2">
                    {c.turns.map((t, i) => (
                      <div key={i} className={`flex ${t.who === 'caller' ? 'justify-end' : ''}`}>
                        <p
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${t.who === 'caller' ? 'rounded-br-md bg-[#f3f1ec] text-neutral-900' : 'rounded-bl-md'}`}
                          style={t.who === 'agent' ? { background: brand, color: inkFor(brand) } : undefined}
                        >
                          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">{t.who === 'agent' ? agent : 'Caller'}</span>
                          {t.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

type CallState = 'idle' | 'connecting' | 'live' | 'filing' | 'error';

/**
 * Talk to the receptionist from the desk itself, the same live agent callers
 * reach. Fresh SDK instance per call and Krisp off, the pattern every web call
 * on this site uses (lib/vapi-web.ts). When the call ends the desk refreshes
 * twice, because the call's notes arrive a few seconds after the hang-up.
 */
function TalkButton({
  voice,
  agent,
  brand,
  onBrand,
  onFiled,
}: {
  voice: { publicKey: string; assistantId: string };
  agent: string;
  brand: string;
  onBrand: string;
  onFiled: () => void;
}) {
  const [state, setState] = useState<CallState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    if (state !== 'live') return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(
    () => () => {
      try {
        vapiRef.current?.stop();
      } catch {
        /* leaving the page ends the call */
      }
    },
    [],
  );

  const ended = () => {
    setState('filing');
    window.setTimeout(onFiled, 15_000);
    window.setTimeout(() => {
      onFiled();
      setState('idle');
    }, 35_000);
  };

  const start = async () => {
    setError('');
    setSeconds(0);
    setState('connecting');
    try {
      const { default: Vapi } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new Vapi(voice.publicKey);
      vapi.on('call-start', () => {
        setState('live');
        hardenMicPath(vapi);
      });
      vapi.on('call-end', ended);
      vapi.on('error', () => {
        // Fires when the call cannot connect as well as when it drops, so the
        // words cover both and point at the one thing a person can do.
        setState('error');
        setError('The call could not connect. Try again in a moment, or call the line.');
      });
      vapiRef.current = vapi;
      await vapi.start(voice.assistantId);
    } catch (err) {
      setState('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Your microphone is blocked. Allow it in the browser and try again.'
          : 'The call did not start. Try again in a moment.',
      );
    }
  };

  const stop = () => {
    try {
      vapiRef.current?.stop();
    } catch {
      /* already stopped */
    }
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const light = onBrand === '#ffffff';

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      {state === 'live' ? (
        <button onClick={stop} className="flex items-center gap-3 rounded-full bg-[#b42318] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)]">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          On the line with {agent} · {mmss} · Hang up
        </button>
      ) : (
        <button
          onClick={() => void start()}
          disabled={state === 'connecting' || state === 'filing'}
          className="inline-flex items-center gap-3 rounded-full py-2 pl-2 pr-6 text-[15px] font-semibold shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 disabled:opacity-80"
          style={{ background: light ? '#ffffff' : '#111111', color: light ? brand : '#ffffff' }}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: light ? brand : '#ffffff', color: light ? onBrand : '#111111' }}>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M10 2.5a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0v-4a3 3 0 0 0-3-3Zm-5 7a.75.75 0 0 1 .75.75 4.25 4.25 0 0 0 8.5 0 .75.75 0 0 1 1.5 0 5.75 5.75 0 0 1-5 5.7v1.8a.75.75 0 0 1-1.5 0v-1.8a5.75 5.75 0 0 1-5-5.7A.75.75 0 0 1 5 9.5Z" />
            </svg>
          </span>
          {state === 'connecting' ? 'Ringing…' : state === 'filing' ? `${agent} is writing up the call…` : `Talk to ${agent} now`}
        </button>
      )}
      <p className="text-[12px] opacity-70">
        {error || (state === 'filing' ? 'It lands below in about thirty seconds.' : 'Uses your microphone. Call like a client would.')}
      </p>
    </div>
  );
}
