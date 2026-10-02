'use client';

import { useEffect, useMemo, useState } from 'react';
import WlCallButton, { type Line } from '@/components/white-label/WlCallButton';

/**
 * THE WHITE LABEL DEMO. What an agency's client would see, in the agency's
 * name and color, with a live receptionist that answers as the client.
 *
 * The dark strip at the top is the agency's own control panel: type the
 * agency, pick a color and a client, and everything below re-skins. The
 * strip says who built the demo; nothing below it does. `?present=1` hides
 * the strip for screen-sharing in a pitch.
 *
 * Wholesale numbers only arrive as props, and only when the server verified
 * a key signed for this agency. They are never in this bundle.
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

const SWATCHES = ['#0b3b44', '#1d4ed8', '#7c3aed', '#be123c', '#047857', '#c2410c', '#111111', '#f5b700'];

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 &]/g, ' ').split(/\s+/).filter((x) => x && x !== '&');
  return ((w[0]?.[0] ?? 'A') + (w[1]?.[0] ?? '')).toUpperCase();
}

function inkFor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#111111' : '#ffffff';
}

export default function WhiteLabelDemo({
  initial,
  samples,
  lines,
  signed,
  present,
}: {
  initial: { agency: string; color: string; city: string; sample: string; client: string };
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
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [showStrip, setShowStrip] = useState(!present);

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const client = clientName.trim() || sample.client;
  const agencyName = agency.trim() || 'Your Agency';
  const ink = inkFor(color);

  // Keep the URL shareable as the agency types.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      q.set('agency', agencyName);
      q.set('color', color.replace('#', ''));
      q.set('city', city);
      q.set('sample', sampleId);
      if (clientName.trim()) q.set('client', clientName.trim());
      else q.delete('client');
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    }, 400);
    return () => window.clearTimeout(t);
  }, [agencyName, color, city, sampleId, clientName]);

  const inputCls = 'w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50';
  const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/55';

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-neutral-900" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif' }}>
      {/* ─── THE AGENCY'S CONTROL STRIP (theirs, not their client's) ─── */}
      {showStrip ? (
        <div className="bg-[#111] text-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
                White label demo · everything below wears your name
              </p>
              <button onClick={() => setShowStrip(false)} className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10">
                Hide panel to present
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]">
              <label>
                <span className={labelCls}>Your agency</span>
                <input className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value.slice(0, 60))} placeholder="Your agency name" />
              </label>
              <label>
                <span className={labelCls}>Client type</span>
                <select className={inputCls} value={sampleId} onChange={(e) => { setSampleId(e.target.value); setClientName(''); }}>
                  {samples.map((s) => (
                    <option key={s.id} value={s.id} className="text-black">{s.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelCls}>Town</span>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value.slice(0, 60))} placeholder="Kalispell" />
              </label>
              <label>
                <span className={labelCls}>Client name (optional)</span>
                <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value.slice(0, 80))} placeholder={sample.client} />
              </label>
              <div>
                <span className={labelCls}>Brand color</span>
                <div className="flex items-center gap-1.5">
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
            <p className="mt-3 text-xs text-white/45">Built and run by Modern Mustard Seed. Your client never sees this panel or our name.</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowStrip(true)}
          className="fixed bottom-4 left-4 z-40 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-40 hover:opacity-100"
        >
          Panel
        </button>
      )}

      {/* ─── WHAT THE AGENCY'S CLIENT SEES ─── */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black" style={{ background: color, color: ink }}>
              {initials(agencyName)}
            </span>
            <div>
              <p className="text-base font-extrabold leading-tight">{agencyName}</p>
              <p className="text-xs text-neutral-500">AI services for {client}</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">Prepared by {agencyName} for {client}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Every call to {client}, answered and booked.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-85">
              This is {possessive(client)} new AI receptionist, live. It knows the services and the hours, answers in under a second, and puts callers on the schedule while they are still on the phone. Call it the way a customer would.
            </p>
            <div className="mt-8">
              <WlCallButton
                agency={agencyName}
                client={client}
                sample={sampleId}
                city={city}
                color={ink === '#ffffff' ? '#ffffff' : '#111111'}
                ink={ink === '#ffffff' ? '#111111' : '#ffffff'}
                onLine={(l) => setTranscript((t) => [...t, l].slice(-40))}
                onReset={() => setTranscript([])}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <p className="text-sm font-bold">Live transcript</p>
              <p className="text-xs text-neutral-500">{client}</p>
            </div>
            <div className="mt-3 h-72 space-y-2.5 overflow-y-auto pr-1" aria-live="polite">
              {transcript.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-neutral-500">
                  <p>
                    Start the call and the conversation appears here.
                    <br />
                    Try: &ldquo;Can I get in this week?&rdquo;
                  </p>
                </div>
              ) : (
                transcript.map((l, i) => (
                  <div key={i} className={`flex ${l.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                    <p
                      className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug"
                      style={l.role === 'agent' ? { background: '#f1f1ef' } : { background: color, color: ink }}
                    >
                      {l.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT THE OWNER GETS AFTER EVERY CALL ─── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: color === '#f5b700' ? '#7a5b00' : color }}>After every call</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">The owner gets the call in one text.</h2>
          <p className="mt-4 leading-relaxed text-neutral-600">
            Who called, what they needed, and whether they booked. The full transcript follows by email. It comes from {agencyName}, so the owner knows exactly who keeps their phones answered.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm rounded-[2rem] border-8 border-neutral-900 bg-white p-4 shadow-xl">
          <p className="text-center text-[11px] font-semibold text-neutral-400">Text Message · now</p>
          <div className="mt-3 rounded-2xl bg-neutral-100 p-3.5 text-sm leading-snug">
            <p className="font-bold">{agencyName} · {client}</p>
            <p className="mt-1.5">New booking from your AI receptionist: Dana Ruiz, Thursday 10:00 AM. {bookingLine(sample.id)} Number: (406) 555-0142.</p>
            <p className="mt-1.5 text-neutral-500">Full transcript in your email.</p>
          </div>
          <p className="mt-3 text-center text-[11px] text-neutral-400">Example message</p>
        </div>
      </section>

      {/* ─── THE SERVICES, IN THE AGENCY'S NAME ─── */}
      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">From {agencyName}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">What we can switch on for {client}.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {lines.map((l) => (
              <div key={l.slug} className="flex flex-col rounded-2xl border border-black/10 p-6">
                <span className="mb-4 h-1.5 w-10 rounded-full" style={{ background: color }} />
                <h3 className="text-lg font-extrabold">{l.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{l.pitch}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-neutral-700">
                  {l.includes.slice(0, 3).map((x) => (
                    <li key={x} className="flex gap-2">
                      <span aria-hidden="true" style={{ color: color === '#f5b700' ? '#7a5b00' : color }}>✓</span>
                      {x.replace(/your agency’s name/g, `${agencyName}'s name`)}
                    </li>
                  ))}
                </ul>
                {signed ? (
                  <p className="mt-5 text-sm font-bold">
                    {l.retail.setup ? `${usd(l.retail.setup)} to set up` : ''}
                    {l.retail.setup && l.retail.monthly ? ' · ' : ''}
                    {l.retail.monthly ? `${usd(l.retail.monthly)} a month` : ''}
                  </p>
                ) : (
                  <p className="mt-5 text-sm font-bold">Ask {agencyName} for pricing</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {signed ? <MarginPanel agency={agencyName} lines={lines} color={color} /> : null}

      <footer className="border-t border-black/5 bg-[#f6f5f2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} {agencyName}</p>
          <p>AI receptionist and website agents for {client}</p>
        </div>
      </footer>
    </div>
  );
}

function possessive(name: string) {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

function bookingLine(id: string) {
  switch (id) {
    case 'hvac':
      return 'No heat at the house, furnace tune-up and diagnostic.';
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

/** The agency's own math. Only rendered behind a signed key. */
function MarginPanel({ agency, lines, color }: { agency: string; lines: WlDemoLine[]; color: string }) {
  const monthly = lines.filter((l) => l.wholesale && l.wholesale.monthly > 0);
  const [rows, setRows] = useState(() =>
    Object.fromEntries(monthly.map((l, i) => [l.slug, { clients: i === 0 ? 5 : i === 2 ? 3 : 0, price: l.retail.monthly, setup: l.retail.setup }])),
  );

  const totals = useMemo(() => {
    let cost = 0;
    let revenue = 0;
    let setupMargin = 0;
    for (const l of monthly) {
      const r = rows[l.slug];
      if (!r) continue;
      cost += r.clients * l.wholesale!.monthly;
      revenue += r.clients * r.price;
      setupMargin += r.clients * (r.setup - l.wholesale!.setup);
    }
    return { cost, revenue, margin: revenue - cost, setupMargin };
  }, [rows, monthly]);

  const set = (slug: string, k: 'clients' | 'price' | 'setup', v: number) =>
    setRows((r) => ({ ...r, [slug]: { ...r[slug], [k]: Math.max(0, Math.min(k === 'clients' ? 500 : 100000, Math.round(v) || 0)) } }));

  const cell = 'w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums';

  return (
    <section className="border-t-4 bg-neutral-950 text-white" style={{ borderColor: color }}>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">For {agency} only · not shown to clients</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Your margin, at your prices.</h2>
        <p className="mt-3 max-w-2xl text-white/70">Wholesale is what you pay us. Set your own price and client count; the math is yours.</p>
        <div className="mt-8 overflow-x-auto rounded-2xl bg-white text-neutral-900">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                <th className="p-3">Service</th>
                <th className="p-3 text-right">Wholesale / mo</th>
                <th className="p-3 text-right">Your price / mo</th>
                <th className="p-3 text-right">Your setup fee</th>
                <th className="p-3 text-right">Clients</th>
                <th className="p-3 text-right">Your margin / mo</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((l) => {
                const r = rows[l.slug];
                return (
                  <tr key={l.slug} className="border-b border-neutral-100">
                    <td className="p-3 font-semibold">{l.name}</td>
                    <td className="p-3 text-right tabular-nums">{usd(l.wholesale!.monthly)}</td>
                    <td className="p-3"><input aria-label={`${l.name} monthly price`} type="number" className={cell} value={r.price} onChange={(e) => set(l.slug, 'price', +e.target.value)} /></td>
                    <td className="p-3"><input aria-label={`${l.name} setup fee`} type="number" className={cell} value={r.setup} onChange={(e) => set(l.slug, 'setup', +e.target.value)} /></td>
                    <td className="p-3"><input aria-label={`${l.name} clients`} type="number" className={cell} value={r.clients} onChange={(e) => set(l.slug, 'clients', +e.target.value)} /></td>
                    <td className="p-3 text-right font-bold tabular-nums">{usd(r.clients * (r.price - l.wholesale!.monthly))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ['You bill clients', `${usd(totals.revenue)}/mo`],
            ['You pay us', `${usd(totals.cost)}/mo`],
            ['You keep', `${usd(totals.margin)}/mo`],
            ['First year, with setups', usd(totals.margin * 12 + totals.setupMargin)],
          ].map(([k, v], i) => (
            <div key={k} className="rounded-2xl p-5" style={i === 2 ? { background: color, color: inkFor(color) } : { background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">{k}</p>
              <p className="mt-2 text-2xl font-black tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
