'use client';

import { useState, type ReactNode } from 'react';
import { inkFor, textOnWhite, usd } from '@/components/white-label/brand';

/**
 * The tour under the white label demo's live call: what the rest of the shelf
 * looks like in the agency's brand. The client site wraps a REAL live call
 * (the same agent, as the widget). The dashboard and the visibility report run
 * on sample numbers and say so on their face; nothing here claims a real
 * client's results.
 */

const NOUN: Record<string, string> = {
  dental: 'dentist',
  hvac: 'heating and air company',
  law: 'estate planning lawyer',
  salon: 'hair salon',
  restaurant: 'restaurant for a date night',
};

const TAGLINE: Record<string, string> = {
  dental: 'Gentle care for the whole family.',
  hvac: 'Warm in winter. Cool in summer. On time, always.',
  law: 'Plans that protect the people you love.',
  salon: 'Color, cuts and the hour you needed.',
  restaurant: 'Seasonal plates, a long table, a good night.',
};

const NAV: Record<string, string[]> = {
  dental: ['Services', 'New patients', 'Insurance', 'Contact'],
  hvac: ['Repair', 'Install', 'Tune-ups', 'Contact'],
  law: ['Estate planning', 'Probate', 'Business', 'Contact'],
  salon: ['Services', 'Stylists', 'Bridal', 'Book'],
  restaurant: ['Menu', 'Private dining', 'Gift cards', 'Reserve'],
};

/** The first sentence of a meta description, short enough for a hero line. */
function firstSentence(d: string): string {
  const one = d.split(/(?<=[.!?])\s+/)[0] ?? d;
  if (one.length <= 80) return one;
  const cut = one.slice(0, 80);
  return `${cut.slice(0, cut.lastIndexOf(' '))}.`;
}

function SampleChip() {
  return <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">Sample data</span>;
}

/* ─── ON THEIR WEBSITE ─────────────────────────────────────────────────── */

export function WlClientSite({
  client,
  city,
  sample,
  site,
  agencyColor,
  children,
}: {
  client: string;
  city: string;
  sample: string;
  site: { url: string; description: string | null; themeColor: string | null } | null;
  agencyColor: string;
  children: ReactNode;
}) {
  const brand = site?.themeColor ?? '#1f2937';
  const ink = inkFor(brand);
  const host = site ? new URL(site.url).hostname.replace(/^www\./, '') : `${client.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
      <div className="overflow-hidden rounded-2xl border border-black/10 shadow-xl">
        <div className="flex items-center gap-2 border-b border-black/10 bg-neutral-100 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-neutral-500">{host}</span>
        </div>
        <div className="relative min-h-[420px] bg-white">
          <div className="flex items-center justify-between px-6 py-4">
            <p className="font-extrabold">{client}</p>
            <div className="hidden gap-5 text-sm text-neutral-600 sm:flex">
              {(site ? ['Services', 'About', 'Reviews', 'Contact'] : NAV[sample] ?? NAV.dental).map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
          <div className="mx-6 rounded-2xl px-8 py-14" style={{ background: brand, color: ink }}>
            <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">{city}</p>
            <p className="mt-3 max-w-md text-3xl font-black leading-tight">{site?.description ? firstSentence(site.description) : TAGLINE[sample] ?? TAGLINE.dental}</p>
            <span className="mt-6 inline-block rounded-full bg-white/90 px-5 py-2.5 text-sm font-bold text-neutral-900">Contact us</span>
          </div>
          <div className="grid grid-cols-3 gap-4 px-6 py-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-neutral-100" />
            ))}
          </div>
          <div className="absolute bottom-5 right-5">{children}</div>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: textOnWhite(agencyColor) }}>Website Voice and Chat Agent</p>
        <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">The site you built, answering out loud.</h3>
        <p className="mt-4 leading-relaxed text-neutral-600">
          One line of code on {site ? 'their real site' : 'the site'}, and every visitor can ask a question and book without picking up the phone. Same brain as the receptionist, so a change lands on both at once. Tap the button in the corner: it is live.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-neutral-700">
          {['Works on WordPress, Webflow, Squarespace, Shopify and custom builds', 'Wears the client’s colors, not ours', 'Every conversation lands with the owner'].map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden="true" style={{ color: textOnWhite(agencyColor) }}>✓</span>
              {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── ADS DASHBOARD ────────────────────────────────────────────────────── */

const WEEKS = [
  { w: 'Aug 10', leads: 14, booked: 5 },
  { w: 'Aug 17', leads: 17, booked: 6 },
  { w: 'Aug 24', leads: 15, booked: 6 },
  { w: 'Aug 31', leads: 21, booked: 8 },
  { w: 'Sep 7', leads: 19, booked: 8 },
  { w: 'Sep 14', leads: 24, booked: 10 },
  { w: 'Sep 21', leads: 26, booked: 11 },
  { w: 'Sep 28', leads: 29, booked: 13 },
];

const CHANNELS = [
  { name: 'Google Ads', spend: 1240, leads: 41, booked: 17 },
  { name: 'Meta Ads', spend: 900, leads: 33, booked: 11 },
  { name: 'Calls answered by AI', spend: 0, leads: 58, booked: 24 },
  { name: 'Website agent', spend: 0, leads: 33, booked: 15 },
];

export function WlAdsDashboard({ agency, client, color, brand }: { agency: string; client: string; color: string; brand: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null);
  const spend = CHANNELS.reduce((a, c) => a + c.spend, 0);
  const booked = WEEKS.reduce((a, w) => a + w.booked, 0);
  const leads = WEEKS.reduce((a, w) => a + w.leads, 0);
  const max = Math.max(...WEEKS.map((w) => w.leads));
  const H = 160;
  const barW = 30;
  const gap = 18;
  const W = WEEKS.length * (barW + gap);
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#fafaf9] shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          {brand}
          <div>
            <p className="text-sm font-extrabold">{client} · Marketing</p>
            <p className="text-xs text-neutral-500">Last 8 weeks · prepared by {agency}</p>
          </div>
        </div>
        <SampleChip />
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-4">
        {[
          ['Ad spend', usd(spend)],
          ['Leads', String(leads)],
          ['Booked jobs', String(booked)],
          ['Cost per booked job', usd(spend / booked)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-black/10 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">{k}</p>
            <p className="mt-1.5 text-2xl font-black tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm font-bold">Leads per week</p>
          <div className="relative mt-3 overflow-x-auto">
            <svg viewBox={`0 -18 ${W} ${H + 42}`} className="w-full min-w-[360px]" role="img" aria-label="Leads per week, rising from 14 to 29 over eight weeks">
              {[0.5, 1].map((f) => (
                <line key={f} x1={0} x2={W} y1={H - H * f} y2={H - H * f} stroke="#e5e5e5" strokeWidth={1} />
              ))}
              {WEEKS.map((w, i) => {
                const h = (w.leads / max) * (H - 12);
                const x = i * (barW + gap) + gap / 2;
                return (
                  <g key={w.w} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <rect x={x - gap / 2} y={0} width={barW + gap} height={H} fill="transparent" />
                    <path
                      d={`M${x},${H} V${H - h + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${H} Z`}
                      fill={color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                    <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={10} fill="#737373">{w.w}</text>
                    {(i === WEEKS.length - 1 || hover === i) && (
                      <text x={x + barW / 2} y={H - h - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#262626">{w.leads}</text>
                    )}
                  </g>
                );
              })}
            </svg>
            {hover !== null && (
              <p className="mt-1 text-xs text-neutral-600">
                Week of {WEEKS[hover].w}: {WEEKS[hover].leads} leads, {WEEKS[hover].booked} booked
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm font-bold">Where the booked jobs came from</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <th className="pb-2 font-bold">Channel</th>
                <th className="pb-2 text-right font-bold">Leads</th>
                <th className="pb-2 text-right font-bold">Booked</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((c) => (
                <tr key={c.name} className="border-t border-black/5">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-right tabular-nums">{c.leads}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{c.booked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mx-5 mb-5 rounded-xl p-4" style={{ background: color, color: inkFor(color) }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">This week’s read</p>
        <p className="mt-1.5 text-sm leading-relaxed">
          Leads are up 12% on last week and cost per booked job fell to {usd(spend / booked)}. Google is booking at a higher rate than Meta, so we moved $150 of next week’s Meta budget to the two Google campaigns that booked. The AI receptionist caught 9 after-hours calls that would have gone to voicemail.
        </p>
      </div>
    </div>
  );
}

/* ─── AI VISIBILITY ────────────────────────────────────────────────────── */

type Mark = 'first' | 'named' | 'not';
const MARK: Record<Mark, { icon: string; label: string; cls: string }> = {
  first: { icon: '✓', label: 'Named first', cls: 'bg-green-50 text-green-800 ring-green-200' },
  named: { icon: '•', label: 'Named', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  not: { icon: '✕', label: 'Not named', cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200' },
};

export function WlVisibilityReport({ agency, client, city, sample, generic, color, brand }: { agency: string; client: string; city: string; sample: string; generic: boolean; color: string; brand: ReactNode }) {
  const noun = NOUN[sample] ?? NOUN.dental;
  // A pasted real site can be any trade, so its questions name the business instead of guessing the trade.
  const qs = generic
    ? [`who is the best in ${city} for what ${client} does`, `is ${client} any good`, `${client} reviews`, `who should I call in ${city} this week`]
    : [`best ${noun} in ${city}`, `${noun} near me open Saturday`, `who is the most trusted ${noun} in ${city}`, `affordable ${noun} ${city}`];
  const marks: { before: Mark[]; after: Mark[] }[] = [
    { before: ['not', 'named', 'not'], after: ['first', 'first', 'named'] },
    { before: ['not', 'not', 'not'], after: ['named', 'first', 'named'] },
    { before: ['named', 'not', 'not'], after: ['first', 'named', 'first'] },
    { before: ['not', 'not', 'named'], after: ['named', 'named', 'first'] },
  ];
  const rows = qs.map((q, i) => ({ q, ...marks[i] }));
  const engines = ['ChatGPT', 'Google AI', 'Perplexity'];
  const score = (k: 'before' | 'after') => rows.reduce((a, r) => a + r[k].filter((m) => m !== 'not').length, 0);
  const total = rows.length * engines.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-3.5">
        <div className="flex items-center gap-3">
          {brand}
          <div>
            <p className="text-sm font-extrabold">{client} · AI Visibility</p>
            <p className="text-xs text-neutral-500">Monthly report from {agency}</p>
          </div>
        </div>
        <SampleChip />
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">Before setup</p>
          <p className="mt-1.5 text-2xl font-black tabular-nums">{score('before')} of {total}</p>
          <p className="text-xs text-neutral-500">answers that name {client}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: color, color: inkFor(color) }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-75">This month</p>
          <p className="mt-1.5 text-2xl font-black tabular-nums">{score('after')} of {total}</p>
          <p className="text-xs opacity-80">answers that name {client}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">Fixed this month</p>
          <p className="mt-1.5 text-sm leading-snug text-neutral-700">Hours and services marked up for AI, a Saturday answer page, and the business name made consistent across directories.</p>
        </div>
      </div>
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              <th className="pb-2 font-bold">What people ask</th>
              {engines.map((e) => (
                <th key={e} className="pb-2 font-bold">{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.q} className="border-t border-black/5">
                <td className="py-2.5 pr-3">&ldquo;{r.q}&rdquo;</td>
                {r.after.map((m, i) => (
                  <td key={i} className="py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${MARK[m].cls}`}>
                      <span aria-hidden="true">{MARK[m].icon}</span>
                      {MARK[m].label}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
