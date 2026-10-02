'use client';

import { useEffect, useRef, useState } from 'react';
import WlCallButton, { type Line } from '@/components/white-label/WlCallButton';
import MarginPanel from '@/components/white-label/MarginPanel';
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
}: {
  initial: { agency: string; color: string; city: string; sample: string; client: string; logo: string | null; site: string | null };
  samples: Sample[];
  lines: WlDemoLine[];
  signed: boolean;
  present: boolean;
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
      setTranscript([]);
      setOwner({ status: 'idle', seconds: 0, booked: [] });
    },
    onEnd: (s: number) => void callEnded(s),
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

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-neutral-900" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif' }}>
      {/* ─── THE AGENCY'S CONTROL PANEL (theirs, never their client's) ─── */}
      {showStrip ? (
        <div className="bg-[#111] text-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">Your demo panel · everything below wears your name</p>
              <button onClick={() => setShowStrip(false)} className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10">
                Hide panel to present
              </button>
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
      ) : (
        <button onClick={() => setShowStrip(true)} className="fixed bottom-4 left-4 z-40 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-40 hover:opacity-100">
          Panel
        </button>
      )}

      {/* ─── WHAT THE AGENCY'S CLIENT SEES ─── */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {brand()}
            <div>
              {!logo && <p className="text-base font-extrabold leading-tight">{agencyName}</p>}
              <p className="text-xs text-neutral-500">Prepared for {client}</p>
            </div>
          </div>
          <a href="#call" className="hidden rounded-full px-5 py-2.5 text-sm font-bold sm:inline-block" style={{ background: color, color: ink }}>
            Try the receptionist
          </a>
        </div>
      </header>

      <section id="call" className="relative overflow-hidden" style={{ background: color, color: ink }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">{site ? `Trained on ${new URL(site.url).hostname.replace(/^www\./, '')}` : `For ${client} in ${city}`}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">Every call to {client}, answered and booked.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-85">
              This is {possessive(client)} new AI receptionist, live. {site ? 'It read their website a moment ago and' : 'It'} knows the services, answers in under a second, and puts callers on the schedule while they are still on the phone.
            </p>
            <div className="mt-8">
              <WlCallButton {...callProps} bg={ink === '#ffffff' ? '#ffffff' : '#111111'} fg={ink === '#ffffff' ? '#111111' : '#ffffff'} />
            </div>
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">Try saying</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tries.map((t) => (
                  <span key={t} className="rounded-full px-3 py-1.5 text-sm" style={{ background: ink === '#ffffff' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' }}>
                    &ldquo;{t}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <p className="text-sm font-bold">Live transcript</p>
              <p className="max-w-[60%] truncate text-xs text-neutral-500">{client}</p>
            </div>
            <div className="mt-3 h-80 space-y-2.5 overflow-y-auto pr-1" aria-live="polite">
              {transcript.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-neutral-500">
                  <p>
                    Start the call and the conversation appears here,
                    <br />
                    word for word, as it happens.
                  </p>
                </div>
              ) : (
                transcript.map((l, i) => (
                  <div key={i} className={`flex ${l.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                    <p className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug" style={l.role === 'agent' ? { background: '#f1f1ef' } : { background: color, color: ink }}>
                      {l.text}
                    </p>
                  </div>
                ))
              )}
              <div ref={transcriptEnd} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT THE OWNER GETS AFTER THE CALL (real, from this call) ─── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accentText }}>After every call</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">The owner gets the call in one text.</h2>
          <p className="mt-4 leading-relaxed text-neutral-600">
            Who called, what they needed, and whether they booked, with the full transcript by email. It comes from {agencyName}, so the owner always knows who keeps the phones answered.
          </p>
          <p className="mt-4 text-sm font-semibold text-neutral-800">
            {owner.status === 'idle' ? 'Make a call above and book something. This phone fills in from your real call.' : owner.status === 'waiting' ? 'Reading what the call booked…' : 'That is the text from the call you just made.'}
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm rounded-[2rem] border-8 border-neutral-900 bg-white p-4 shadow-xl">
          <p className="text-center text-[11px] font-semibold text-neutral-400">Text Message · now</p>
          <div className="mt-3 flex items-start gap-2.5">
            {brand(30)}
            <div className="flex-1 rounded-2xl bg-neutral-100 p-3.5 text-sm leading-snug">
              <p className="font-bold">{agencyName} · {client}</p>
              {owner.status === 'done' && owner.booked.length > 0 ? (
                owner.booked.map((b, i) => (
                  <p key={i} className="mt-1.5">
                    New booking from your AI receptionist: {b.name || 'A caller'}, {b.when}.{b.service ? ` ${b.service}.` : ''}
                    {b.phone ? ` Number: ${b.phone}.` : ''}
                  </p>
                ))
              ) : owner.status === 'done' ? (
                <p className="mt-1.5">
                  Your AI receptionist took a {Math.max(1, Math.round(owner.seconds / 60))} minute call. No booking this time; the caller’s details and what they asked are in the transcript.
                </p>
              ) : (
                <p className="mt-1.5 text-neutral-500">
                  {owner.status === 'waiting' ? 'Writing the summary…' : `New booking from your AI receptionist: Dana Ruiz, Thursday 10:00 AM.${site ? '' : ` ${exampleService(sampleId)}`}`}
                </p>
              )}
              <p className="mt-1.5 text-neutral-500">Full transcript in your email.</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-neutral-400">{owner.status === 'done' ? 'From your call' : 'Example until you call'}</p>
        </div>
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
