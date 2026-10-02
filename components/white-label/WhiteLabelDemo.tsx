'use client';

import { useEffect, useRef, useState } from 'react';
import WlCallButton, { type Line } from '@/components/white-label/WlCallButton';
import MarginPanel, { MarginSnapshot } from '@/components/white-label/MarginPanel';
import WlRing from '@/components/white-label/WlRing';
import WlPresenter, { type Slide } from '@/components/white-label/WlPresenter';
import { WlAdsDashboard, WlVisibilityReport, WlClientSite } from '@/components/white-label/WlTour';
import { inkFor, textOnWhite, initials, possessive, usd } from '@/components/white-label/brand';

/**
 * THE WHITE LABEL DEMO. What an agency's client would see, in the agency's
 * name, color and logo, with a live receptionist that answers as the client.
 *
 * The dark strip at the top is the agency's own control panel. The moment
 * that sells the meeting: paste one of YOUR real clients' websites, and the
 * receptionist reads it and answers as that business. Below the call, the
 * owner's text is built from what the call actually booked, and a tour shows
 * the rest of the shelf (the agent on the client's site, the ads dashboard,
 * the AI visibility report) in the same brand.
 *
 * Wholesale numbers only arrive as props, and only when the server verified
 * a key signed for this agency. They are never in this bundle. The logo is
 * read in the browser and never uploaded.
 */

export type WlDemoLine = {
  slug: string;
  name: string;
  pitch: string;
  includes: string[];
  wholesale?: { setup: number; monthly: number };
  retail: { setup: number; monthly: number };
};

type Sample = { id: string; label: string; client: string; services: string; hours: string };
type Site = { key: string; url: string; name: string | null; description: string | null; phone: string | null; themeColor: string | null; pages: string[] };
type Owner = { status: 'idle' | 'waiting' | 'done'; seconds: number; booked: { name: string | null; phone: string | null; service: string | null; when: string }[] };

const SWATCHES = ['#0b3b44', '#1d4ed8', '#7c3aed', '#be123c', '#047857', '#c2410c', '#111111', '#f5b700'];

const TRY: Record<string, string[]> = {
  dental: ['Do you take new patients?', 'I have a toothache, can I get in today?', 'Book me a cleaning next week.'],
  hvac: ['My furnace stopped working.', 'How much is a tune-up?', 'Can someone come out tomorrow?'],
  law: ['I need to update my will.', 'Is the first consultation free?', 'Book me a consultation.'],
  salon: ['I want balayage, what do you need?', 'Do you have anything Saturday?', 'What is your cancellation policy?'],
  restaurant: ['Table for six on Friday?', 'Do you have gluten free options?', 'Can I book the private room?'],
};

const TABS = [
  { id: 'site', label: 'On their website' },
  { id: 'ads', label: 'Ads dashboard' },
  { id: 'ai', label: 'AI visibility' },
  { id: 'all', label: 'Everything we switch on' },
] as const;

export default function WhiteLabelDemo({
  initial,
  samples,
  lines,
  signed,
  present,
  locked = false,
}: {
  initial: { agency: string; color: string; city: string; sample: string; client: string; logo: string | null; site: string | null };
  samples: Sample[];
  lines: WlDemoLine[];
  signed: boolean;
  present: boolean;
  /** A prospect's link from the agency portal: no panel, no way to open it. */
  locked?: boolean;
}) {
  const [agency, setAgency] = useState(initial.agency);
  const [color, setColor] = useState(initial.color);
  const [city, setCity] = useState(initial.city);
  const [sampleId, setSampleId] = useState(initial.sample);
  const [clientName, setClientName] = useState(initial.client);
  const [logo, setLogo] = useState<string | null>(initial.logo);
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [showStrip, setShowStrip] = useState(!present);
  const [siteUrl, setSiteUrl] = useState(initial.site ?? '');
  const [site, setSite] = useState<Site | null>(null);
  const [reading, setReading] = useState(false);
  const [readMsg, setReadMsg] = useState('');
  const [owner, setOwner] = useState<Owner>({ status: 'idle', seconds: 0, booked: [] });
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('site');
  const [mode, setMode] = useState<'browser' | 'phone'>('browser');
  const [live, setLive] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const runRef = useRef<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const client = clientName.trim() || site?.name || sample.client;
  const agencyName = agency.trim() || 'Your Agency';
  const ink = inkFor(color);
  const accentText = textOnWhite(color);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [transcript]);

  // Keep the URL shareable as the agency types. The logo stays in this browser.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      q.set('agency', agencyName);
      q.set('color', color.replace('#', ''));
      q.set('city', city);
      q.set('sample', sampleId);
      if (clientName.trim()) q.set('client', clientName.trim());
      else q.delete('client');
      if (site) q.set('site', site.url);
      else q.delete('site');
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    }, 400);
    return () => window.clearTimeout(t);
  }, [agencyName, color, city, sampleId, clientName, site]);

  const readSite = async (raw: string) => {
    if (!raw.trim()) return;
    setReading(true);
    setReadMsg('');
    try {
      const res = await fetch('/api/white-label/read-site', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'We could not read that site.');
      setSite(data as Site);
      setClientName('');
      setReadMsg(`Read ${data.pages.length} page${data.pages.length === 1 ? '' : 's'}. The receptionist now answers as ${data.name || 'this business'}.`);
    } catch (err) {
      setSite(null);
      setReadMsg(err instanceof Error ? err.message : 'We could not read that site.');
    } finally {
      setReading(false);
    }
  };

  // A link minted with ?site= reads that site on arrival, so the meeting opens ready.
  useEffect(() => {
    if (!initial.site) return;
    const t = window.setTimeout(() => void readSite(initial.site as string), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogo = (f: File | undefined) => {
    if (!f || !/^image\//.test(f.type) || f.size > 1_500_000) return;
    const r = new FileReader();
    r.onload = () => setLogo(typeof r.result === 'string' ? r.result : null);
    r.readAsDataURL(f);
  };

  const callEnded = async (seconds: number) => {
    const runId = runRef.current;
    if (!runId) return;
    setOwner({ status: 'waiting', seconds, booked: [] });
    // The booking lands from the voice webhook; give it a beat, then read it.
    for (const wait of [1500, 3000, 5000]) {
      await new Promise((r) => setTimeout(r, wait));
      try {
        const res = await fetch(`/api/white-label/demo-call?run=${runId}`);
        const data = await res.json();
        if (res.ok && data.booked?.length) {
          setOwner({ status: 'done', seconds, booked: data.booked });
          return;
        }
      } catch {
        /* try again */
      }
    }
    setOwner({ status: 'done', seconds, booked: [] });
  };

  const callProps = {
    agency: agencyName,
    client,
    sample: sampleId,
    city,
    siteKey: site?.key ?? null,
    onLine: (l: Line) => setTranscript((t) => [...t, l].slice(-60)),
    onStart: (runId: string) => {
      runRef.current = runId;
      setLive(true);
      setTranscript([]);
      setOwner({ status: 'idle', seconds: 0, booked: [] });
    },
    onEnd: (s: number) => {
      setLive(false);
      void callEnded(s);
    },
  };

  const brand = (size = 40) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={`${agencyName} logo`} style={{ height: size, maxWidth: size * 3.2 }} className="w-auto object-contain" />
    ) : (
      <span className="grid shrink-0 place-items-center rounded-xl text-sm font-black" style={{ width: size, height: size, background: color, color: ink }}>
        {initials(agencyName)}
      </span>
    );

  const inputCls = 'w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50';
  const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/55';
  // A real site can be any trade, so its prompts stay general.
  const tries = site ? ['What do you offer?', 'How much does it cost?', 'Can I book something this week?'] : (TRY[sampleId] ?? TRY.dental);

  // ─── Shared pieces: used on the page and again inside presenter mode. ───

  const callPanel = (onDark = false) => {
    const solidBg = onDark ? color : ink === '#ffffff' ? '#ffffff' : '#111111';
    const solidFg = onDark ? ink : ink === '#ffffff' ? '#111111' : '#ffffff';
    const soft = onDark ? 'rgba(255,255,255,0.1)' : ink === '#ffffff' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)';
    return (
      <div style={onDark ? { color: '#ffffff' } : undefined}>
        <div className="inline-flex rounded-full p-1" style={{ background: soft }} role="tablist" aria-label="How to call">
          {(['browser', 'phone'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className="rounded-full px-4 py-2 text-sm font-bold transition-colors"
              style={mode === m ? { background: solidBg, color: solidFg } : undefined}
            >
              {m === 'browser' ? 'Call in the browser' : 'Call my phone'}
            </button>
          ))}
        </div>
        <div className="mt-5">
          {mode === 'browser' ? (
            <WlCallButton {...callProps} bg={solidBg} fg={solidFg} />
          ) : (
            <WlRing
              agency={agencyName}
              client={client}
              sample={sampleId}
              city={city}
              siteKey={site?.key ?? null}
              bg={solidBg}
              fg={solidFg}
              onBooked={(b) => setOwner({ status: 'done', seconds: 0, booked: b })}
            />
          )}
        </div>
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">Try saying</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tries.map((t) => (
              <span key={t} className="rounded-full px-3 py-1.5 text-sm" style={{ background: soft }}>
                &ldquo;{t}&rdquo;
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const transcriptCard = () => (
    <div className="overflow-hidden rounded-3xl bg-white text-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black" style={{ background: color, color: ink }}>
            {initials(client)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{client}</p>
            <p className="text-xs text-neutral-500">AI receptionist</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${live ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
          {live ? (
            <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className="w-[3px] rounded-full bg-green-600" style={{ height: '100%', animation: `wlBar 0.9s ${n * 0.15}s ease-in-out infinite` }} />
              ))}
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
          )}
          {live ? 'Live' : 'Ready'}
        </span>
      </div>
      <div className="h-[22rem] space-y-2.5 overflow-y-auto px-5 py-4" aria-live="polite">
        {transcript.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-neutral-500">
            <div>
              <p className="font-semibold text-neutral-700">The conversation shows up here, word for word.</p>
              <p className="mt-1">Start a call, play a customer, and book something.</p>
            </div>
          </div>
        ) : (
          transcript.map((l, i) => (
            <div key={i} className={`flex ${l.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <p
                className={`max-w-[85%] px-3.5 py-2 text-[15px] leading-snug ${l.role === 'agent' ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-br-md'}`}
                style={l.role === 'agent' ? { background: '#f2f2f0' } : { background: color, color: ink }}
              >
                {l.text}
              </p>
            </div>
          ))
        )}
        <div ref={transcriptEnd} />
      </div>
      <style>{`@keyframes wlBar { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } } [style*="wlBar"] { transform-origin: bottom }`}</style>
    </div>
  );

  const ownerPhone = () => (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[2.8rem] bg-neutral-900 p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-[#f4f4f6]">
          <div className="flex items-center justify-between px-6 pt-3 text-[12px] font-semibold text-neutral-900">
            <span>9:41</span>
            <span className="h-6 w-24 rounded-full bg-neutral-900" aria-hidden="true" />
            <span>5G</span>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1 border-b border-black/5 pb-3">
            {brand(34)}
            <p className="text-xs font-semibold text-neutral-700">{agencyName}</p>
          </div>
          <div className="min-h-[220px] space-y-2 px-4 py-4">
            <p className="text-center text-[11px] text-neutral-400">Text Message · Today</p>
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-snug text-neutral-900 shadow-sm">
              <p className="font-semibold">{client}</p>
              {owner.status === 'done' && owner.booked.length > 0 ? (
                owner.booked.map((b, i) => (
                  <p key={i} className="mt-1">
                    New booking: {b.name || 'a caller'}, {b.when}.{b.service ? ` ${b.service}.` : ''}
                    {b.phone ? ` ${b.phone}.` : ''}
                  </p>
                ))
              ) : owner.status === 'done' ? (
                <p className="mt-1">Your AI receptionist took a {Math.max(1, Math.round(owner.seconds / 60))} minute call. No booking this time; the details are in the transcript.</p>
              ) : (
                <p className="mt-1 text-neutral-500">
                  {owner.status === 'waiting' ? 'Writing the summary…' : `New booking: Dana Ruiz, Thursday 10:00 AM.${site ? '' : ` ${exampleService(sampleId)}`}`}
                </p>
              )}
            </div>
            <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] text-neutral-500 shadow-sm">Full transcript in your email.</div>
          </div>
          <p className="pb-4 text-center text-[11px] text-neutral-400">{owner.status === 'done' ? 'From your call' : 'Example until you call'}</p>
        </div>
      </div>
    </div>
  );

  const slides: Slide[] = [
    {
      kicker: 'Your brand',
      title: `${agencyName}, meet your AI department.`,
      body: 'Everything in this walkthrough runs under your name. Your client never sees ours.',
      content: (
        <div className="overflow-hidden rounded-3xl" style={{ background: color, color: ink }}>
          <div className="p-10">
            <div className="flex items-center gap-4">
              <span className="rounded-2xl bg-white p-2">{brand(48)}</span>
              {!logo && <p className="text-3xl font-extrabold tracking-tight">{agencyName}</p>}
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {lines.slice(0, 6).map((l) => (
                <div key={l.slug} className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: ink === '#ffffff' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}>
                  {l.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      kicker: 'The receptionist',
      wide: true,
      title: `Call ${client}.`,
      body: site ? `It read ${new URL(site.url).hostname.replace(/^www\./, '')} and answers as them. Play a customer, then book something.` : 'Play a customer: ask a question, then book something.',
      content: (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white/[0.06] p-6 text-white ring-1 ring-white/10">{callPanel(true)}</div>
          {transcriptCard()}
        </div>
      ),
    },
    {
      kicker: 'After the call',
      title: 'The owner gets one text.',
      body: 'Who called, what they needed, whether they booked. It comes from you.',
      content: ownerPhone(),
    },
    {
      kicker: 'On their website',
      title: 'The site you built, answering out loud.',
      body: 'One line of code. Same brain as the phone.',
      content: (
        <div className="rounded-3xl bg-white p-5">
          <WlClientSite client={client} city={city} sample={sampleId} site={site} agencyColor={color} compact>
            <WlCallButton {...callProps} variant="bubble" bg={site?.themeColor ?? '#1f2937'} fg={inkFor(site?.themeColor ?? '#1f2937')} />
          </WlClientSite>
        </div>
      ),
    },
    signed
      ? {
          kicker: 'Your margin',
          title: 'Ten clients. Every month.',
          body: 'Wholesale is what you pay us. The rest is yours.',
          content: <MarginSnapshot lines={lines} color={color} ink={ink} />,
        }
      : {
          kicker: 'What happens next',
          title: `Live within a week.`,
          body: `${agencyName} sets it up, you approve a test call, and it starts answering ${possessive(client)} real phone.`,
          content: (
            <div className="rounded-3xl p-10" style={{ background: color, color: ink }}>
              <ol className="space-y-5 text-lg font-semibold">
                {['Say yes', 'We learn the business in a day', 'You call the test line and approve it', 'It answers every call, around the clock'].map((t, n) => (
                  <li key={t} className="flex items-center gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-black" style={{ background: ink, color }}>
                      {n + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          ),
        },
  ];

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-neutral-900 antialiased">
      {presenting && <WlPresenter slides={slides} color={color} ink={ink} brand={brand(32)} onClose={() => setPresenting(false)} />}
      {/* ─── THE AGENCY'S CONTROL PANEL (theirs, never their client's) ─── */}
      {showStrip ? (
        <div className="bg-[#111] text-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">Your demo panel · everything below wears your name</p>
              <div className="flex gap-2">
                <button onClick={() => setPresenting(true)} className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: color, color: ink }}>
                  Presenter mode
                </button>
                <button onClick={() => setShowStrip(false)} className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10">
                  Hide panel
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_auto_auto]">
              <label>
                <span className={labelCls}>Your agency</span>
                <input className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value.slice(0, 60))} placeholder="Your agency name" />
              </label>
              <label>
                <span className={labelCls}>Town</span>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value.slice(0, 60))} placeholder="Kalispell" />
              </label>
              <div>
                <span className={labelCls}>Your logo</span>
                <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/30 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">
                  {logo ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
              </div>
              <div>
                <span className={labelCls}>Brand color</span>
                <div className="flex h-[38px] items-center gap-1.5">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      aria-label={`Use ${c}`}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-white/25'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input type="color" aria-label="Pick any color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 lg:grid-cols-[1fr_auto_1.6fr]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={labelCls}>Client type</span>
                  <select className={inputCls} value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
                    {samples.map((s) => (
                      <option key={s.id} value={s.id} className="text-black">{s.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelCls}>Client name</span>
                  <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value.slice(0, 80))} placeholder={site?.name || sample.client} />
                </label>
              </div>
              <p className="self-end pb-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">or</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void readSite(siteUrl);
                }}
              >
                <span className={labelCls}>Paste one of your clients’ websites</span>
                <div className="flex gap-2">
                  <input className={inputCls} value={siteUrl} onChange={(e) => setSiteUrl(e.target.value.slice(0, 200))} placeholder="theirbusiness.com" inputMode="url" />
                  <button disabled={reading || !siteUrl.trim()} className="shrink-0 rounded-md px-4 text-sm font-bold disabled:opacity-50" style={{ background: color, color: ink }}>
                    {reading ? 'Reading…' : 'Read it'}
                  </button>
                  {site && (
                    <button
                      type="button"
                      onClick={() => {
                        setSite(null);
                        setSiteUrl('');
                        setReadMsg('');
                      }}
                      className="shrink-0 rounded-md border border-white/25 px-3 text-xs font-semibold text-white/80"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className={`mt-1.5 text-xs ${site ? 'text-green-300' : 'text-white/50'}`}>
                  {readMsg || 'The receptionist reads their real site and answers as them. Nothing is saved to their account.'}
                </p>
              </form>
            </div>
            <p className="mt-3 text-xs text-white/40">Built and run by Modern Mustard Seed. Your client never sees this panel or our name.</p>
          </div>
        </div>
      ) : locked ? null : (
        <button onClick={() => setShowStrip(true)} className="fixed bottom-4 left-4 z-40 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-40 hover:opacity-100">
          Panel
        </button>
      )}

      {/* ─── WHAT THE AGENCY'S CLIENT SEES ─── */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {brand()}
            <div className="min-w-0">
              {!logo && <p className="truncate text-base font-extrabold leading-tight tracking-tight">{agencyName}</p>}
              <p className="truncate text-xs text-neutral-500">Prepared for {client}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setPresenting(true)} className="hidden rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 sm:inline-block">
              Present
            </button>
            <a href="#call" className="rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: color, color: ink }}>
              Try it
            </a>
          </div>
        </div>
      </header>

      <section id="call" className="relative overflow-hidden" style={{ background: color, color: ink }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(1200px 500px at 85% -10%, ${ink === '#ffffff' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.45)'}, transparent 60%), radial-gradient(800px 400px at -10% 110%, rgba(0,0,0,0.18), transparent 60%)` }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ background: ink === '#ffffff' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {site ? `Trained on ${new URL(site.url).hostname.replace(/^www\./, '')}` : `For ${client} · ${city}`}
            </p>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-7xl">
              Every call to {client}, answered and booked.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed opacity-85">
              {possessive(client)} new AI receptionist, live. {site ? 'It read their website a moment ago, knows' : 'It knows'} the services, answers in under a second, and puts callers on the schedule while they are still on the line.
            </p>
            <div className="mt-9">{callPanel()}</div>
          </div>
          <div className="md:pt-4">{transcriptCard()}</div>
        </div>
      </section>

      {/* ─── WHAT THE OWNER GETS AFTER THE CALL (real, from this call) ─── */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accentText }}>After every call</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.025em] md:text-5xl">The owner gets the call in one text.</h2>
          <p className="mt-5 text-lg leading-relaxed text-neutral-600">
            Who called, what they needed, and whether they booked, with the full transcript by email. It comes from {agencyName}, so the owner always knows who keeps the phones answered.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-800 ring-1 ring-black/5">
            <span className={`h-2 w-2 rounded-full ${owner.status === 'done' ? 'bg-green-500' : owner.status === 'waiting' ? 'animate-pulse bg-amber-400' : 'bg-neutral-300'}`} />
            {owner.status === 'idle' ? 'Make a call above and book something. The phone fills in from your call.' : owner.status === 'waiting' ? 'Reading what the call booked…' : 'From the call you just made.'}
          </p>
        </div>
        {ownerPhone()}
      </section>

      {/* ─── THE TOUR ─── */}
      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">From {agencyName}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">The rest of what we switch on for {client}.</h2>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="rounded-full border px-4 py-2 text-sm font-bold transition-colors"
                style={tab === t.id ? { background: color, color: ink, borderColor: color } : { borderColor: 'rgba(0,0,0,0.15)' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {tab === 'site' && (
              <WlClientSite client={client} city={city} sample={sampleId} site={site} agencyColor={color}>
                <WlCallButton {...callProps} variant="bubble" bg={site?.themeColor ?? '#1f2937'} fg={inkFor(site?.themeColor ?? '#1f2937')} />
              </WlClientSite>
            )}
            {tab === 'ads' && <WlAdsDashboard agency={agencyName} client={client} color={color} brand={brand(28)} />}
            {tab === 'ai' && <WlVisibilityReport agency={agencyName} client={client} city={city} sample={sampleId} generic={!!site} color={color} brand={brand(28)} />}
            {tab === 'all' && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {lines.map((l) => (
                  <div key={l.slug} className="flex flex-col rounded-2xl border border-black/10 p-6">
                    <span className="mb-4 h-1.5 w-10 rounded-full" style={{ background: color }} />
                    <h3 className="text-lg font-extrabold">{l.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{l.pitch}</p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm text-neutral-700">
                      {l.includes.slice(0, 3).map((x) => (
                        <li key={x} className="flex gap-2">
                          <span aria-hidden="true" style={{ color: accentText }}>✓</span>
                          {x.replace(/your agency’s name/g, `${agencyName}'s name`)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-sm font-bold">
                      {signed
                        ? [l.retail.setup ? `${usd(l.retail.setup)} to set up` : '', l.retail.monthly ? `${usd(l.retail.monthly)} a month` : ''].filter(Boolean).join(' · ')
                        : `Ask ${agencyName} for pricing`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {signed ? <MarginPanel agency={agencyName} lines={lines} color={color} /> : null}

      <footer className="border-t border-black/5 bg-[#f6f5f2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} {agencyName}</p>
          <p>AI receptionist, website agent and marketing systems for {client}</p>
        </div>
      </footer>
    </div>
  );
}

function exampleService(id: string) {
  switch (id) {
    case 'hvac':
      return 'No heat at the house, furnace diagnostic.';
    case 'law':
      return 'Free consultation, updating a will.';
    case 'salon':
      return 'Color consultation, first visit.';
    case 'restaurant':
      return 'Dinner for six, anniversary.';
    default:
      return 'New patient cleaning and exam.';
  }
}
