'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeskCall } from '@/lib/white-label/desk';
import { inkFor } from '@/components/white-label/brand';

type Agency = { name: string; color: string; logo: string | null; website: string | null };
type Client = { id: string; business: string; agent: string; line: string | null };
type Filter = 'attention' | 'all' | 'handled';

const DAY = 86_400_000;

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

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#1d2330]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {agency.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agency.logo} alt={agency.name} className="h-8 w-auto max-w-[160px] object-contain sm:h-9" />
          ) : (
            <span className="text-lg font-black" style={{ color: brand }}>{agency.name}</span>
          )}
          <span className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Front desk</span>
        </div>
      </header>

      <section style={{ background: brand, color: onBrand }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between md:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-70">{client.business}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              {client.agent} answers every call.
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed opacity-80">
              Day or night, every caller is answered, every message is written down, and the urgent ones are flagged before you open this page.
            </p>
            {client.line && (
              <p className="mt-3 text-sm font-semibold opacity-90">
                Her line: <a className="underline decoration-1 underline-offset-4" href={tel(client.line) ?? undefined}>{phone(client.line)}</a>
              </p>
            )}
          </div>
          {voice && <TalkButton voice={voice} agent={client.agent} brand={brand} onBrand={onBrand} onFiled={() => router.refresh()} />}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="-mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className={`text-3xl font-black tabular-nums ${s.alert ? 'text-[#b42318]' : ''}`}>{s.value}</p>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className="whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm"
                style={filter === t.key ? { background: brand, color: onBrand } : { color: '#4b5563' }}
              >
                {t.label} <span className="ml-1 tabular-nums opacity-70">{t.count}</span>
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a name, number or matter"
            className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 sm:w-72"
          />
        </div>

        <div className="mt-5 space-y-3">
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
            <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
              <p className="text-lg font-bold">
                {calls.length === 0
                  ? 'No calls yet.'
                  : filter === 'attention'
                    ? 'Everyone has been called back.'
                    : query
                      ? 'Nothing matches that search.'
                      : 'Nothing here yet.'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                {calls.length === 0
                  ? `The moment ${client.agent} takes a call, it lands here with the caller's details, the recording and the transcript.${voice ? ` Talk to ${client.agent} above to see one arrive.` : ''}`
                  : filter === 'attention'
                    ? 'New calls show up here until someone marks them handled.'
                    : 'Try a last name, a phone number or a kind of case.'}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          {fresh ? 'Up to date' : 'Showing saved calls'} as of {refreshedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Refreshes itself every minute.
        </p>
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:px-6">
          <span>{client.business} front desk</span>
          <span>
            Built and supported by{' '}
            {agency.website ? (
              <a href={agency.website} target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: brand }}>
                {agency.name}
              </a>
            ) : (
              <span className="font-semibold">{agency.name}</span>
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
  const callback = c.intake.callback_number || c.callerNumber;
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

  return (
    <article
      id={`call-${c.id}`}
      className={`scroll-mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm transition-opacity ${c.handledAt ? 'opacity-70' : ''}`}
      style={{ borderColor: urgent && !c.handledAt ? '#f2b8b5' : 'rgba(0,0,0,0.06)' }}
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: urgent ? '#b42318' : c.handledAt ? '#d1d5db' : brand }} />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-tight">{nameOf(c)}</h2>
            {urgent && (
              <span className="rounded-full bg-[#fdecea] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#b42318]">
                {c.intake.in_custody ? 'Urgent: in custody' : 'Urgent'}
              </span>
            )}
            {c.intake.matter_type && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12px] font-semibold text-neutral-700">{c.intake.matter_type}</span>
            )}
            {c.handledAt && <span className="rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#067647]">Handled</span>}
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">
            {when(c.startedAt)}
            {c.seconds ? ` · ${length(c.seconds)}` : ''}
            {c.web ? ' · web call' : c.callerNumber ? ` · from ${phone(c.callerNumber)}` : ''}
          </p>
          {urgent && c.intake.urgent_reason && <p className="mt-3 text-[15px] font-semibold text-[#912018]">{c.intake.urgent_reason}</p>}
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">{note}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {href && (
              <a href={href} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: brand, color: inkFor(brand) }}>
                Call {phone(callback)}
              </a>
            )}
            <button onClick={onHandled} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-black/30">
              {c.handledAt ? 'Move back to callbacks' : 'Mark handled'}
            </button>
            <button onClick={onToggle} className="rounded-full px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900" aria-expanded={open}>
              {open ? 'Hide details' : 'Details, recording and transcript'}
            </button>
          </div>

          {open && (
            <div className="mt-5 border-t border-black/5 pt-5">
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {fields
                  .filter(([, v]) => v && String(v).trim())
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">{k}</dt>
                      <dd className="mt-0.5 break-words text-[15px]">{v}</dd>
                    </div>
                  ))}
              </dl>
              {conflict && (
                <p className="mt-4 rounded-lg bg-[#f5f6f8] px-3 py-2 text-[13px] text-neutral-700">
                  <strong>Conflict check:</strong> run {conflict} before anyone calls back.
                </p>
              )}
              {audio && (
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">Recording</p>
                  <audio controls preload="none" src={audio} className="mt-2 w-full" />
                </div>
              )}
              {c.turns.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">Transcript</p>
                  <div className="mt-2 space-y-2">
                    {c.turns.map((t, i) => (
                      <div key={i} className={`flex ${t.who === 'caller' ? 'justify-end' : ''}`}>
                        <p
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${t.who === 'caller' ? 'bg-neutral-100 text-neutral-900' : 'text-white'}`}
                          style={t.who === 'agent' ? { background: brand, color: inkFor(brand) } : undefined}
                        >
                          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">{t.who === 'agent' ? agent : 'Caller'}</span>
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
        <button onClick={stop} className="flex items-center gap-3 rounded-full bg-[#b42318] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          On the line with {agent} · {mmss} · Hang up
        </button>
      ) : (
        <button
          onClick={() => void start()}
          disabled={state === 'connecting' || state === 'filing'}
          className="rounded-full px-6 py-3.5 text-[15px] font-bold shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-80"
          style={{ background: light ? '#ffffff' : '#111111', color: light ? brand : '#ffffff' }}
        >
          {state === 'connecting' ? 'Ringing…' : state === 'filing' ? `${agent} is writing up the call…` : `Talk to ${agent} now`}
        </button>
      )}
      <p className="text-[12px] opacity-75">
        {error || (state === 'filing' ? 'It lands below in about thirty seconds.' : 'Uses your microphone. Call like a client would.')}
      </p>
    </div>
  );
}
