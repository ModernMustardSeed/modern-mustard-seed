'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import type { OsDemoConfig } from '@/lib/outbound-demo';
import { OS_AUTOMATIONS } from '@/data/demo-os';
import type { OsCustomer } from '@/data/demo-os';
import { resolveTrade } from '@/data/demo-os-trades';
import { DEFAULT_OS_THEME } from '@/lib/site-palette';
import type { OsTheme } from '@/lib/site-palette';
import DemoVoiceWidget from '@/components/demo/DemoVoiceWidget';
import { BizMark, Icon, OsProvider, hash, useCountUp } from '@/components/demo/os/os-kit';
import QuotesTab from '@/components/demo/os/QuotesTab';
import type { SignedQuote } from '@/components/demo/os/QuotesTab';
import JobsTab from '@/components/demo/os/JobsTab';
import type { OsJobItem } from '@/components/demo/os/JobsTab';
import CampaignsTab from '@/components/demo/os/CampaignsTab';
import CalendarTab from '@/components/demo/os/CalendarTab';
import LeadGenTab from '@/components/demo/os/LeadGenTab';
import OsTour from '@/components/demo/os/OsTour';

/**
 * The forged BUSINESS OS demo: one template command center that renders as
 * THEIR software from the frozen per-lead config, wearing THEIR brand (logo +
 * colors captured at forge time, palette borrowed from their forged website).
 * Modules: Today, the trade-specific SIGNATURE BOARD, Customers (CRM), Quotes
 * (branded proposal generator), Jobs (run sheet), Campaigns (growth plays +
 * ad studio), Money, Books, Reviews, Automations, and the live AI assistant
 * (capped), plus the voice receptionist widget. The pitch is the product, and
 * the modules feed each other: a signed quote books a job, a finished job
 * invoices itself and queues the review chase.
 */

type Tab =
  | 'today'
  | 'signature'
  | 'customers'
  | 'quotes'
  | 'jobs'
  | 'calendar'
  | 'campaigns'
  | 'leadgen'
  | 'money'
  | 'books'
  | 'reviews'
  | 'automations'
  | 'assistant';

const ASSISTANT_ICON = 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z';
const PHONE_ICON =
  'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z';
const SIGNATURE_ICON =
  'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z';

/** `short` is the bottom-tab-bar label; long ones cannot share a 375px row. */
const TABS: { id: Tab; label: string; icon: string; short?: string }[] = [
  { id: 'today', label: 'Today', icon: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z' },
  { id: 'quotes', label: 'Quotes', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { id: 'jobs', label: 'Jobs', icon: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' },
  { id: 'calendar', label: 'Calendar', short: 'Cal', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' },
  { id: 'customers', label: 'Customers', short: 'CRM', icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { id: 'campaigns', label: 'Campaigns', short: 'Grow', icon: 'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z' },
  { id: 'leadgen', label: 'Lead gen', short: 'Leads', icon: 'M3 4h18v2.6l-7 6.4v6l-4 2v-8L3 6.6V4z' },
  { id: 'money', label: 'Money', icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z' },
  { id: 'books', label: 'Books', icon: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z' },
  { id: 'reviews', label: 'Reviews', icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
  { id: 'automations', label: 'Automations', short: 'Auto', icon: 'M7 2v11h3v9l7-12h-4l4-8z' },
  { id: 'assistant', label: 'Assistant', short: 'AI', icon: ASSISTANT_ICON },
];

/** Sidebar groups (house rule: group any nav past ~6 items). The signature
 *  board is inserted into the first group at render, labeled per trade. */
const SECTIONS: { label: string; ids: Tab[] }[] = [
  { label: 'Run the day', ids: ['today', 'signature', 'jobs', 'calendar'] },
  { label: 'Win the work', ids: ['customers', 'quotes'] },
  { label: 'Grow', ids: ['leadgen', 'campaigns', 'reviews'] },
  { label: 'Back office', ids: ['money', 'books', 'automations', 'assistant'] },
];

/** The four tabs that ride the mobile bottom bar; the rest live behind More. */
const PRIMARY_TABS: Tab[] = ['today', 'signature', 'quotes', 'customers'];

/** Tag chip colors, tone -> [text, bg]. Two sets: the pale-on-dark versions
 *  vanish on a light site, and the deep-on-light versions vanish on a dark one,
 *  so the theme picks. */
const TONE_DARK: Record<'hot' | 'won' | 'wait', [string, string]> = {
  hot: ['#e08585', 'rgba(224,133,133,0.12)'],
  won: ['#7dc98f', 'rgba(125,201,143,0.12)'],
  wait: ['#d9b95c', 'rgba(217,185,92,0.12)'],
};
const TONE_LIGHT: Record<'hot' | 'won' | 'wait', [string, string]> = {
  hot: ['#b3261e', 'rgba(179,38,30,0.10)'],
  won: ['#1a6b39', 'rgba(26,107,57,0.10)'],
  wait: ['#8a6410', 'rgba(138,100,16,0.12)'],
};

/* ────────────────────────────── the CRM record ────────────────────────────── */

type CrmNote = { when: string; text: string };
type LeadSource = 'Receptionist' | 'Website' | 'Google' | 'Referral';

/** A pipeline card, enriched into something a business owner would recognize. */
type CrmLead = OsCustomer & {
  id: string;
  phone: string;
  source: LeadSource;
  age: string;
  notes: CrmNote[];
  lost?: boolean;
};

/* hash + useCountUp live in os-kit now (shared with the module tabs); the
   hydration law stands: everything derived must be deterministic. */

const SOURCES: LeadSource[] = ['Receptionist', 'Website', 'Google', 'Referral'];

function phoneFor(name: string): string {
  const h = hash(name);
  return `(${200 + (h % 700)}) ${100 + (h % 900)}-${1000 + (h % 9000)}`;
}
const AGES = ['9 min ago', '42 min ago', '2 hours ago', 'yesterday', '2 days ago', 'last week'];

/** New calls the receptionist can catch on demand, so the owner can watch the
 *  product work instead of reading about it. `{job}` is filled per trade. */
const INBOUND_POOL = [
  { name: 'Tyler B.', need: 'Called after hours, wants a quote on a {job}' },
  { name: 'Marisol V.', need: 'Emergency {job}, asked how soon you can come' },
  { name: 'Dev Patel', need: 'Price check on a {job}, comparing two shops' },
  { name: 'Karen L.', need: 'Repeat customer, needs another {job} booked' },
];

/** Sample 5-star reviews for the Reviews wall. Universal wording that reads true
 *  for any trade once {job}/{biz} interpolate. Names + dates are hash-derived so
 *  the server and client agree (hydration law). Honest sample; the real build
 *  pulls the business's actual Google reviews once they connect Google. */
const REVIEW_POOL = [
  { name: 'Jenna R.', when: '2 days ago', text: 'Called after hours and actually got a real answer. {biz} had someone out first thing the next morning. Fair price, no surprises. This is who we call now.' },
  { name: 'Marcus D.', when: '5 days ago', text: 'Best {job} experience we have had. On time, tidy, and they explained everything before doing it. You can tell {biz} takes pride in the work.' },
  { name: 'The Alvarez Family', when: '1 week ago', text: 'Second time using {biz} and the same great service both times. Honest, professional, and they stand behind what they do. Our whole street uses them now.' },
  { name: 'Priya S.', when: '2 weeks ago', text: 'I comparison shopped three places. {biz} was the only one that picked up, gave me a straight answer, and showed up when they said. Worth every penny.' },
];

const REVIEW_REPLY = (biz: string) =>
  `Thank you so much for the kind words! It was a pleasure working with you, and we are grateful you chose ${biz}. We are always here whenever you need us.`;

function enrich(c: OsCustomer, i: number): CrmLead {
  const h = hash(c.name);
  const area = 200 + (h % 700);
  return {
    ...c,
    id: `${i}-${c.name}`,
    phone: `(${area}) ${100 + (h % 900)}-${1000 + (h % 9000)}`,
    // Most leads in a business with an AI receptionist came THROUGH it. That is
    // the whole argument, so weight it rather than distributing evenly.
    source: h % 5 < 2 ? 'Receptionist' : SOURCES[h % SOURCES.length],
    age: AGES[h % AGES.length],
    notes: [],
  };
}

/** Deterministic 12-point revenue sparkline; seeded by name so the server and
 *  the browser draw the same line (hydration rule as everywhere in this file). */
function Spark({ seed, accent }: { seed: string; accent: string }) {
  const d = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 12; i++) pts.push(26 - i * 1.4 - (hash(seed + i) % 6));
    const step = 120 / 11;
    return pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y.toFixed(1)}`).join(' ');
  }, [seed]);
  return (
    <svg width="120" height="32" viewBox="0 0 120 32" fill="none" aria-hidden className="mt-1.5">
      <path d={`${d} L120,32 L0,32 Z`} fill={accent} opacity="0.12" stroke="none" />
      <path d={d} stroke={accent} strokeWidth="2" strokeLinecap="round" style={{ strokeDasharray: 220, strokeDashoffset: 220, animation: 'osDraw 1.6s ease-out .3s forwards' }} />
    </svg>
  );
}

/** A one-shot particle burst for the moment a job is WON. Pure CSS transforms,
 *  removed from the tree by its owner after ~1s. */
function WinBurst({ x, y, accent, text }: { x: number; y: number; accent: string; text: string }) {
  const bits = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.23;
    const dist = 46 + (i % 5) * 16;
    return {
      dx: Math.cos(a) * dist,
      dy: Math.sin(a) * dist - 24,
      color: i % 3 === 0 ? text : accent,
      size: 5 + (i % 3) * 2,
      round: i % 2 === 0,
    };
  });
  return (
    <div className="fixed z-[90] pointer-events-none" style={{ left: x, top: y }} aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            width: b.size,
            height: b.size,
            background: b.color,
            borderRadius: b.round ? '50%' : 1,
            ['--dx' as string]: `${b.dx}px`,
            ['--dy' as string]: `${b.dy}px`,
            animation: `osBurst .85s cubic-bezier(.15,.65,.35,1) ${i * 12}ms forwards`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

export default function OsDemoApp({
  osId,
  config,
  call,
  orderUrl,
  theme = DEFAULT_OS_THEME,
}: {
  osId: string;
  config: OsDemoConfig;
  call: ForgedCall | null;
  /** the hub's order section; buying happens there, one tap away */
  orderUrl?: string | null;
  /** Derived from THEIR forged website, so the suite matches. Falls back to the
   *  house midnight deck when the site has not landed yet. */
  theme?: OsTheme;
}) {
  const preset = resolveTrade(config);
  // Same names the whole file already renders against; only the source changed.
  const { ink: INK, panel: PANEL, panelSoft: PANEL_SOFT, line: LINE, text: TEXT, dim: DIM, accent, accentSoft, accentInk } = theme;
  const TONE = theme.isDark ? TONE_DARK : TONE_LIGHT;
  const [tab, setTab] = useState<Tab>('today');

  // First-run onboarding tour: shown once per demo so a prospect knows exactly
  // what they are looking at. Skips on reduced-motion. Replayable from the header.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (!localStorage.getItem(`demoos:toured:${osId}`)) {
        const t = window.setTimeout(() => setTourOpen(true), 900);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* localStorage blocked: skip the tour rather than loop it */
    }
  }, [osId]);
  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem(`demoos:toured:${osId}`, '1'); } catch { /* ignore */ }
  };

  // The signature board slots in right after Today, labeled per trade.
  const tabs = useMemo<{ id: Tab; label: string; icon: string; short?: string }[]>(
    () => [TABS[0], { id: 'signature', label: preset.signature.tabLabel, icon: SIGNATURE_ICON }, ...TABS.slice(1)],
    [preset.signature.tabLabel],
  );
  // Mobile: four ride the bar, the rest live behind More.
  const primaryTabs = tabs.filter((t) => PRIMARY_TABS.includes(t.id));
  const moreTabs = tabs.filter((t) => !PRIMARY_TABS.includes(t.id));
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const say = (t: string) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const place = [config.city, config.state].filter(Boolean).join(', ');
  /** Dollars added to the odometer by calls caught during THIS session. */
  const [bonus, setBonus] = useState(0);
  const revenue = useCountUp(preset.weekRevenue + bonus);

  /* ------------------------------ CRM state ------------------------------ */
  // Enrich the preset leads into real CRM records. Everything derived is derived
  // DETERMINISTICALLY from the name: Math.random() here would hand the server and
  // the client different phone numbers and blow up hydration.
  const [leads, setLeads] = useState<CrmLead[]>(() => preset.customers.map((c, i) => enrich(c, i)));
  const [q, setQ] = useState('');
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const selected = leads.find((l) => l.id === openLead) ?? null;

  const patch = (id: string, up: Partial<CrmLead>) =>
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...up } : l)));

  const move = (id: string, dir: 1 | -1, at?: { x: number; y: number }) => {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    const next = Math.max(0, Math.min(3, l.stage + dir)) as OsCustomer['stage'];
    if (next === l.stage) return;
    patch(id, { stage: next, lost: false });
    if (next === 3) {
      fireBurst(at?.x ?? window.innerWidth / 2, at?.y ?? 160);
      say(`${l.name} won. $${l.value.toLocaleString()} on the board.`);
    } else {
      say(`${l.name} moved to ${preset.stages[next]}.`);
    }
  };

  const markLost = (id: string) => {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    patch(id, { lost: !l.lost });
    say(l.lost ? `${l.name} is back in the pipeline.` : `${l.name} marked lost. The follow-up sequence stops.`);
  };

  const addNote = (id: string) => {
    const text = noteDraft.trim();
    if (!text) return;
    const l = leads.find((x) => x.id === id);
    patch(id, { notes: [{ when: 'just now', text }, ...(l?.notes ?? [])] });
    setNoteDraft('');
    say('Note saved to the record.');
  };

  /* ------------------------------ jobs board ------------------------------ */
  // The run sheet starts from the trade's day (first job already on site) plus
  // the scheduled work sitting in the pipeline. Values derive deterministically
  // from the title hash: the hydration law of this whole file.
  const [jobs, setJobs] = useState<OsJobItem[]>(() => [
    ...preset.todayJobs.map((j, i) => ({
      id: `tj-${i}`,
      title: j.title,
      who: j.who,
      when: j.time,
      day: 'Today' as const,
      value: Math.max(60, Math.round((preset.avgTicket * (40 + (hash(j.title) % 85))) / 100)),
      status: (i === 0 ? 2 : 0) as OsJobItem['status'],
    })),
    ...preset.customers
      .filter((c) => c.stage === 2)
      .slice(0, 2)
      .map((c, i) => ({
        id: `sj-${i}`,
        title: c.need,
        who: c.name,
        when: i === 0 ? 'Tomorrow' : 'Thursday',
        day: 'Scheduled' as const,
        value: c.value,
        status: 0 as OsJobItem['status'],
      })),
  ]);
  /** Invoices born from jobs finished THIS session; they join the derived set. */
  const [jobInvoices, setJobInvoices] = useState<{ id: string; name: string; need: string; amount: number; paid: boolean; age: number }[]>([]);
  const [reviewBonus, setReviewBonus] = useState(0);
  const [repliedReviews, setRepliedReviews] = useState<number[]>([]);

  const advanceJob = (id: string, at?: { x: number; y: number }) => {
    const j = jobs.find((x) => x.id === id);
    if (!j || j.status >= 3) return;
    const next = (j.status + 1) as OsJobItem['status'];
    setJobs((js) => js.map((x) => (x.id === id ? { ...x, status: next } : x)));
    if (next === 1) say(`${j.who} just got the text: "Your crew is on the way." ETA shared live.`);
    if (next === 2) say('On site. The clock, the job photos, and the paper trail start now.');
    if (next === 3) {
      setJobInvoices((inv) => [{ id: `job-${id}`, name: j.who, need: j.title, amount: j.value, paid: false, age: 0 }, ...inv]);
      setReviewBonus((b) => b + 1);
      fireBurst(at?.x ?? window.innerWidth / 2, at?.y ?? 200);
      say(`Done. The invoice reached ${j.who} before the truck left, and the review ask is queued.`);
    }
  };

  /* A signed quote is the closed loop: the client lands in the pipeline as
     booked work and the job appears on the schedule by itself. */
  const quoteSigned = (q: SignedQuote) => {
    setLeads((ls) => {
      const existing = ls.find((l) => l.name === q.client);
      if (existing) {
        return ls.map((l) =>
          l.name === q.client
            ? { ...l, stage: 2 as OsCustomer['stage'], value: q.total, need: q.title, lost: false, notes: [{ when: 'just now', text: `Signed the $${q.total.toLocaleString()} ${preset.jobWord} quote.` }, ...l.notes] }
            : l,
        );
      }
      const fresh = enrich({ name: q.client, need: q.title, value: q.total, stage: 2 }, ls.length + 41);
      fresh.age = 'just now';
      fresh.notes = [{ when: 'just now', text: `Signed the $${q.total.toLocaleString()} quote from the Quotes desk.` }];
      return [fresh, ...ls];
    });
    setJobs((js) => [
      ...js,
      { id: `qj-${js.length}`, title: q.title, who: q.client, when: 'Tomorrow', day: 'Scheduled', value: q.total, status: 0, fromQuote: true },
    ]);
    say(`${q.client} signed. Booked, scheduled, and on the Jobs board.`);
  };

  /* --------------------------- live-call theater --------------------------- */
  // The receptionist catching a call IS the product, so the demo performs it:
  // a call rings in on its own a few seconds after the owner arrives, the AI
  // answers it in front of them, and the lead lands in the pipeline while the
  // rescued-revenue odometer ticks up. Deterministic content only (pool order +
  // name hashes): Math.random would desync the replay and hydration.
  type TheaterPhase = 'ring' | 'answer' | 'filed';
  const [theater, setTheater] = useState<{ n: number; phase: TheaterPhase; openAfter: boolean } | null>(null);
  const theaterRef = useRef(theater);
  theaterRef.current = theater;
  const [typedCount, setTypedCount] = useState(0);
  const [callsCaught, setCallsCaught] = useState(0);
  const [justLanded, setJustLanded] = useState<string | null>(null);

  const inboundOf = (n: number) => INBOUND_POOL[n % INBOUND_POOL.length];
  const script = useMemo(() => {
    if (!theater) return '';
    const inbound = inboundOf(theater.n);
    return [
      `AI · Good evening, ${config.business}. How can I help?`,
      `${inbound.name.split(' ')[0]} · ${inbound.need.replace(/\{job\}/g, preset.jobWord)}.`,
    ].join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater?.n, config.business, preset.jobWord]);

  const runTheater = (openAfter = false) => {
    if (theaterRef.current) return;
    setTypedCount(0);
    setTheater({ n: callsCaught, phase: 'ring', openAfter });
  };
  const runTheaterRef = useRef(runTheater);
  runTheaterRef.current = runTheater;

  // A call arrives on its own shortly after they land, then occasionally after.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ts = [6500, 64000, 128000].map((ms) => window.setTimeout(() => runTheaterRef.current(false), ms));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, []);

  // Phase clock: ring 1.5s, then the transcript types, then filed lingers 2.4s.
  useEffect(() => {
    if (!theater) return;
    if (theater.phase === 'ring') {
      const t = window.setTimeout(() => setTheater((th) => (th ? { ...th, phase: 'answer' } : th)), 1500);
      return () => window.clearTimeout(t);
    }
    if (theater.phase === 'answer') {
      const iv = window.setInterval(() => setTypedCount((c) => Math.min(c + 1, script.length)), 22);
      return () => window.clearInterval(iv);
    }
    const t = window.setTimeout(() => setTheater(null), 2400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater?.phase, script.length]);

  // Transcript finished typing: file the lead, tick the odometer, celebrate.
  useEffect(() => {
    if (!theater || theater.phase !== 'answer' || script.length === 0 || typedCount < script.length) return;
    const t = window.setTimeout(() => {
      const inbound = inboundOf(theater.n);
      const fresh = enrich(
        { name: inbound.name, need: inbound.need.replace(/\{job\}/g, preset.jobWord), value: preset.avgTicket, stage: 0 },
        leads.length + 97,
      );
      fresh.source = 'Receptionist';
      fresh.age = 'just now';
      fresh.notes = [{ when: 'just now', text: `Answered by your AI receptionist. Caller asked about ${preset.jobWord} work and left a number.` }];
      setLeads((ls) => [fresh, ...ls]);
      setCallsCaught((n) => n + 1);
      setBonus((b) => b + fresh.value);
      setJustLanded(fresh.id);
      window.setTimeout(() => setJustLanded(null), 2600);
      setTheater((th) => (th ? { ...th, phase: 'filed' } : th));
      if (theater.openAfter) setOpenLead(fresh.id);
      say(`${fresh.name} called. Your receptionist took it and filed the lead.`);
    }, 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater, typedCount, script.length]);

  /* ------------------------------ win bursts ------------------------------ */
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const fireBurst = (x: number, y: number) => {
    const id = Date.now() + Math.floor(x);
    setBursts((b) => [...b, { id, x, y }]);
    window.setTimeout(() => setBursts((b) => b.filter((q) => q.id !== id)), 1100);
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((l) => `${l.name} ${l.need} ${l.source} ${l.phone}`.toLowerCase().includes(needle));
  }, [leads, q]);

  const live = leads.filter((l) => !l.lost);
  const pipelineValue = live.filter((l) => l.stage < 3).reduce((s, l) => s + l.value, 0);
  const wonValue = live.filter((l) => l.stage === 3).reduce((s, l) => s + l.value, 0);
  const wonCount = live.filter((l) => l.stage === 3).length;
  const closed = wonCount + leads.filter((l) => l.lost).length;
  const winRate = closed ? Math.round((wonCount / closed) * 100) : 0;
  const caught = leads.filter((l) => l.source === 'Receptionist').length;

  /* -------------------------------- money -------------------------------- */
  // Invoices are not separate sample data: they ARE the won work. Every dollar
  // here traces back to a card in the pipeline, so the story stays coherent.
  const invoices = useMemo(
    () => [
      // Jobs finished this session invoice themselves and land on top.
      ...jobInvoices,
      ...live
        .filter((l) => l.stage === 3)
        .map((l) => ({
          id: l.id,
          name: l.name,
          need: l.need,
          amount: l.value,
          // Deterministic: every third one is still out.
          paid: hash(l.name) % 3 !== 0,
          age: 2 + (hash(l.name) % 26),
        })),
    ],
    [live, jobInvoices],
  );
  const outstanding = invoices.filter((i) => !i.paid);
  const collected = invoices.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const owed = outstanding.reduce((s, i) => s + i.amount, 0);
  const [chased, setChased] = useState<string[]>([]);

  /* ------------------------------ bookkeeping ------------------------------ */
  // A monthly profit-and-loss the owner recognizes, derived deterministically
  // from the trade's weekly revenue (never Math.random -> server and client
  // agree, no hydration tear). Honestly labeled sample: their real books sync
  // the day we connect their invoicing and bank feed.
  const books = useMemo(() => {
    const income = Math.max(1, Math.round((preset.weekRevenue * 52) / 12));
    const CATS: { label: string; pct: number }[] = [
      { label: 'Materials & supplies', pct: 0.22 },
      { label: 'Crew & payroll', pct: 0.19 },
      { label: 'Vehicle & fuel', pct: 0.08 },
      { label: 'Insurance & licensing', pct: 0.05 },
      { label: 'Software & phone', pct: 0.03 },
      { label: 'Marketing & ads', pct: 0.06 },
    ];
    const expenses = CATS.map((c) => ({ label: c.label, amount: Math.round(income * c.pct) }));
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = income - spent;
    const taxSetAside = Math.max(0, Math.round(profit * 0.25));
    const take = profit - taxSetAside;
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0;
    // A recent ledger: real income lines from the won jobs, interleaved with the
    // trade's typical expense line items (a single transaction each, not the
    // whole monthly category total).
    const incomeLines = invoices.slice(0, 5).map((inv, i) => ({
      id: `in-${inv.id}`,
      dir: 'in' as const,
      label: inv.name,
      cat: `${preset.jobWord.charAt(0).toUpperCase() + preset.jobWord.slice(1)} paid`,
      amount: inv.amount,
      day: 1 + i * 4,
    }));
    const EXP_LINES = [
      { label: 'Supply house', cat: 'Materials & supplies', of: 3 },
      { label: 'Fuel + vehicle', cat: 'Vehicle & fuel', of: 2 },
      { label: 'Payroll run', cat: 'Crew & payroll', of: 2 },
      { label: 'Liability policy', cat: 'Insurance & licensing', of: 1 },
    ];
    const expLines = EXP_LINES.map((e, i) => ({
      id: `ex-${i}`,
      dir: 'out' as const,
      label: e.label,
      cat: e.cat,
      amount: Math.round((expenses.find((x) => x.label === e.cat)?.amount ?? 0) / e.of),
      day: 3 + i * 5,
    }));
    const ledger = [...incomeLines, ...expLines].sort((a, b) => a.day - b.day);
    return { income, expenses, spent, profit, taxSetAside, take, margin, ledger };
  }, [preset.weekRevenue, preset.jobWord, invoices]);

  /* --------------------------- automations state -------------------------- */
  const automations = useMemo(
    () =>
      [...preset.extraAutomations, ...OS_AUTOMATIONS].map((a) => ({
        ...a,
        desc: a.desc.replace(/\{job\}/g, preset.jobWord),
      })),
    [preset.extraAutomations, preset.jobWord],
  );
  const [armed, setArmed] = useState<boolean[]>(automations.map((a) => a.on));

  /* -------------------------------- chat --------------------------------- */
  type Msg = { role: 'user' | 'assistant'; content: string };
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `Morning${config.ownerFirst ? `, ${config.ownerFirst}` : ''}! I can see the whole board: today's ${preset.jobWord}s, the ${preset.signature.title.toLowerCase()}, the pipeline, and the three calls I caught overnight. Ask me anything, or tell me to draft a text, a reply, or a review response.`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [msgs, tab]);

  const send = async () => {
    const text = draft.trim();
    if (!text || chatBusy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setDraft('');
    setChatBusy(true);
    try {
      const res = await fetch(`/api/demo-os/${osId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', messages: next.slice(-8) }),
      });
      const j = (await res.json()) as { reply?: string; error?: string };
      setMsgs((m) => [...m, { role: 'assistant', content: j.reply ?? j.error ?? 'Try me again in a second.' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'I lost that one. Ask me again.' }]);
    } finally {
      setChatBusy(false);
    }
  };

  /* ------------------------------- rendering ------------------------------ */
  const stat = (label: string, value: string, sub: string, i: number, pulse = false, extra?: ReactNode) => (
    <div
      key={label}
      className="rounded-2xl p-4 border animate-[osIn_.5s_ease-out_both] transition-transform hover:-translate-y-0.5"
      style={{ background: PANEL, borderColor: LINE, animationDelay: `${i * 90}ms` }}
    >
      <div className="flex items-center gap-2">
        {pulse && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />}
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: DIM }}>{label}</p>
      </div>
      <p className="font-mono text-3xl font-bold mt-1.5" style={{ color: TEXT }}>{value}</p>
      {extra}
      <p className="text-[12px] mt-1" style={{ color: DIM }}>{sub}</p>
    </div>
  );

  const sectionTitle = (title: string, sub: string) => (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight" style={{ color: TEXT }}>{title}</h2>
      <p className="text-[13px] mt-0.5" style={{ color: DIM }}>{sub}</p>
    </div>
  );

  return (
    <OsProvider value={{ osId, config, preset, theme, TONE, say, fireBurst }}>
    <div className="fixed inset-0 flex flex-col font-sans" style={{ background: INK }}>
      <style>{`
@keyframes osIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes osSlide{from{opacity:0;transform:translateY(-16px) scale(.96)}to{opacity:1;transform:none}}
@keyframes osShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}
@keyframes osBurst{to{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
@keyframes osTicker{to{transform:translateX(-50%)}}
@keyframes osDraw{to{stroke-dashoffset:0}}
@keyframes osLand{from{opacity:0;transform:translateY(-10px) scale(.92)}60%{transform:translateY(2px) scale(1.02)}to{opacity:1;transform:none}}
@keyframes osPaper{from{opacity:0;transform:translateY(34px) scale(.96)}to{opacity:1;transform:none}}
@keyframes osStamp{from{opacity:0;transform:rotate(-7deg) scale(2.1)}to{opacity:1;transform:rotate(-7deg) scale(1)}}
@keyframes osSign{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`}</style>

      {/* A quiet aurora off their accent, so the deck reads branded even before
          the first module loads. Pure decoration, zero interaction cost. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{ background: `radial-gradient(58% 120% at 50% 0%, ${accentSoft}, transparent 70%)` }}
      />

      {/* Top bar */}
      <header className="relative shrink-0 flex items-center gap-3 px-4 sm:px-6 h-14 border-b" style={{ borderColor: LINE }}>
        <BizMark size={32} radius={10} />
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight truncate" style={{ color: TEXT }}>{config.business}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] leading-tight" style={{ color: DIM }}>Command Center{place ? ` · ${place}` : ''}</p>
        </div>
        <button
          onClick={() => setTourOpen(true)}
          className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] font-bold rounded-full px-3 py-1.5 border transition-transform hover:-translate-y-0.5"
          style={{ color: TEXT, borderColor: LINE }}
          title="A 30-second tour of your command center"
        >
          ⌕ Tour
        </button>
        <span
          className="hidden sm:inline-block shrink-0 text-[10px] uppercase tracking-[0.16em] font-bold rounded-full px-3 py-1 border"
          style={{ color: accent, borderColor: accent, background: accentSoft }}
        >
          Demo · sample data
        </span>
        {/* The order path must exist on a phone too: most prospects open this
            from a text message. Keep it visible at every width. */}
        <a
          href={orderUrl || 'https://modernmustardseed.com/book'}
          {...(orderUrl ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] rounded-full px-3.5 py-1.5 whitespace-nowrap"
          style={{ background: accent, color: accentInk }}
        >
          Make it real
        </a>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar (desktop), grouped so eleven modules read as four thoughts. */}
        <nav className="hidden md:flex flex-col w-52 shrink-0 p-3 border-r overflow-y-auto" style={{ borderColor: LINE }}>
          {SECTIONS.map((sec, si) => (
            <div key={sec.label} className={si === 0 ? '' : 'mt-4'}>
              <p className="px-3 pb-1.5 text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: DIM, opacity: 0.75 }}>
                {sec.label}
              </p>
              {sec.ids.map((id) => {
                const t = tabs.find((x) => x.id === id);
                if (!t) return null;
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors"
                    style={on ? { background: PANEL_SOFT, color: TEXT } : { color: DIM }}
                  >
                    {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: accent }} />}
                    <Icon d={t.icon} color={on ? accent : undefined} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-auto rounded-xl p-3 border" style={{ borderColor: LINE, background: PANEL }}>
            <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>
              Built for {config.business} by{' '}
              <a href="https://modernmustardseed.com" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: accent }}>
                Modern Mustard Seed
              </a>
            </p>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 md:pb-8">
          {tab === 'today' && (
            <div className="max-w-4xl">
              <div className="mb-5 animate-[osIn_.5s_ease-out_both]">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: TEXT }}>
                  Morning{config.ownerFirst ? `, ${config.ownerFirst}` : ''}.
                </h1>
                <p className="text-[14px] mt-1" style={{ color: DIM }}>
                  While you slept, your receptionist answered {preset.overnightCalls.length} calls. Here is your day, already sorted.
                </p>
              </div>
              {/* The live wire: the receptionist's night, streaming. One glance
                  says "this thing is awake even when I am not". */}
              <div
                className="rounded-xl border mb-3 flex items-center gap-2.5 px-3 py-2 overflow-hidden animate-[osIn_.5s_ease-out_.1s_both]"
                style={{ background: PANEL, borderColor: LINE }}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: accent }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: accent }} />
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold shrink-0" style={{ color: accent }}>Live wire</span>
                <div
                  className="relative flex-1 overflow-hidden"
                  style={{ maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' }}
                >
                  <div className="flex w-max" style={{ animation: 'osTicker 32s linear infinite' }}>
                    {[0, 1].map((k) => (
                      <div key={k} className="flex gap-8 pr-8" aria-hidden={k === 1}>
                        {preset.overnightCalls.map((c) => (
                          <span key={`${k}-${c.time}`} className="text-[11px] font-mono whitespace-nowrap" style={{ color: DIM }}>
                            <span style={{ color: TEXT }}>{c.time}</span> · {c.caller} · {c.need} → <span style={{ color: accent }}>{c.outcome}</span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stat('Rescued this week', `$${revenue.toLocaleString()}`, 'booked from calls + follow-ups', 0, false, <Spark seed={config.business} accent={accent} />)}
                {stat('Caught overnight', String(preset.overnightCalls.length), 'answered by your AI, zero missed', 1, true)}
                {stat(`${preset.jobWord.charAt(0).toUpperCase() + preset.jobWord.slice(1)}s today`, String(preset.todayJobs.length), 'confirmed and reminded', 2)}
                {stat('Waiting on you', String(live.filter((l) => l.stage === 1).length), 'quotes to send, one tap each', 3)}
              </div>

              <div className="grid lg:grid-cols-2 gap-3 mt-3">
                <div className="rounded-2xl border p-4 animate-[osIn_.5s_ease-out_.35s_both]" style={{ background: PANEL, borderColor: LINE }}>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: accent }}>Caught while you slept</p>
                  <div className="space-y-3">
                    {preset.overnightCalls.map((c) => (
                      <div key={c.time} className="flex items-start gap-3">
                        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                            {c.caller} <span className="font-normal" style={{ color: DIM }}>· {c.time}</span>
                          </p>
                          <p className="text-[12px]" style={{ color: DIM }}>{c.need} → <span style={{ color: TEXT }}>{c.outcome}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border p-4 animate-[osIn_.5s_ease-out_.45s_both]" style={{ background: PANEL, borderColor: LINE }}>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: accent }}>Today</p>
                  <div className="space-y-3">
                    {preset.todayJobs.map((j) => (
                      <div key={j.time} className="flex items-center gap-3">
                        <span className="font-mono text-[12px] font-bold w-12 shrink-0 text-right" style={{ color: TEXT }}>{j.time}</span>
                        <span className="w-px h-6" style={{ background: LINE }} />
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{j.title}</p>
                          <p className="text-[12px]" style={{ color: DIM }}>{j.who}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTab('signature')}
                className="mt-3 w-full rounded-2xl border-2 p-4 text-left flex items-center justify-between gap-3 animate-[osIn_.5s_ease-out_.5s_both] hover:brightness-110 transition-all"
                style={{ background: accentSoft, borderColor: accent }}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: accent }}>
                    {preset.signature.title}
                  </span>
                  <span className="block text-[13px] mt-1" style={{ color: DIM }}>
                    {preset.signature.metricLabel}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-2xl font-bold" style={{ color: TEXT }}>{preset.signature.metricValue}</span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: accent }}>Open the board →</span>
                </span>
              </button>

              {/* The two moves an owner makes between jobs: send paper, make noise. */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => setTab('quotes')}
                  className="rounded-2xl border p-4 text-left animate-[osIn_.5s_ease-out_.52s_both] hover:brightness-110 transition-all"
                  style={{ background: PANEL, borderColor: LINE }}
                >
                  <span className="block text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: accent }}>Quote desk</span>
                  <span className="block text-[12.5px] mt-1" style={{ color: DIM }}>
                    Build a quote from your price book and send it in your brand.
                  </span>
                </button>
                <button
                  onClick={() => setTab('campaigns')}
                  className="rounded-2xl border p-4 text-left animate-[osIn_.5s_ease-out_.56s_both] hover:brightness-110 transition-all"
                  style={{ background: PANEL, borderColor: LINE }}
                >
                  <span className="block text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: accent }}>Campaigns</span>
                  <span className="block text-[12.5px] mt-1" style={{ color: DIM }}>
                    A play is running right now. See what it booked.
                  </span>
                </button>
              </div>

              <button
                onClick={() => setTab('assistant')}
                className="mt-3 w-full rounded-2xl border p-4 text-left flex items-center gap-3 animate-[osIn_.5s_ease-out_.55s_both] hover:brightness-110 transition-all"
                style={{ background: PANEL_SOFT, borderColor: LINE }}
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: accentSoft }}>
                  <Icon d={ASSISTANT_ICON} color={accent} />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: TEXT }}>Ask your assistant anything</span>
                  <span className="block text-[12px]" style={{ color: DIM }}>&ldquo;What does my day look like?&rdquo; &ldquo;Draft a reply to Greg.&rdquo; It knows the whole board.</span>
                </span>
              </button>
            </div>
          )}

          {tab === 'signature' && (
            <div className="max-w-3xl">
              {sectionTitle(preset.signature.title, preset.signature.sub)}
              <div className="rounded-2xl border-2 p-4 mb-3 flex items-center justify-between gap-4 animate-[osIn_.5s_ease-out_both]" style={{ borderColor: accent, background: accentSoft }}>
                <p className="text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: accent }}>{preset.signature.metricLabel}</p>
                <p className="font-mono text-3xl font-bold" style={{ color: TEXT }}>{preset.signature.metricValue}</p>
              </div>
              <div className="space-y-2.5">
                {preset.signature.rows.map((r, i) => {
                  const [toneText, toneBg] = TONE[r.tone];
                  return (
                    <div
                      key={r.title}
                      className="rounded-2xl border p-4 flex items-center gap-4 animate-[osIn_.4s_ease-out_both]"
                      style={{ background: PANEL, borderColor: LINE, animationDelay: `${120 + i * 70}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{r.title}</p>
                        <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: DIM }}>{r.sub}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[15px] font-bold" style={{ color: TEXT }}>
                          {typeof r.amount === 'number' ? `$${r.amount.toLocaleString()}` : r.amount}
                        </p>
                        <span
                          className="inline-block mt-1 text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-0.5"
                          style={{ color: toneText, background: toneBg }}
                        >
                          {r.tag}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] mt-3 animate-[osIn_.4s_ease-out_.5s_both]" style={{ color: DIM }}>{preset.signature.footer}</p>
            </div>
          )}

          {tab === 'customers' && (
            <div>
              {sectionTitle('Customers', `Every call, lead, and ${preset.jobWord} in one place. Open anyone to see their whole history.`)}

              {/* The four numbers an owner actually checks. */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {stat('Open pipeline', `$${pipelineValue.toLocaleString()}`, `${live.filter((l) => l.stage < 3).length} still in play`, 0)}
                {stat('Won', `$${wonValue.toLocaleString()}`, `${wonCount} closed`, 1)}
                {stat('Win rate', `${winRate}%`, `${closed} decided so far`, 2)}
                {stat('Caught by AI', String(caught), 'calls your receptionist saved', 3, caught > 0)}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, job, phone..."
                  className="flex-1 min-w-[180px] rounded-xl border px-3.5 py-2.5 text-[13px] outline-none focus:ring-2"
                  style={{ background: PANEL, borderColor: LINE, color: TEXT }}
                />
                <button
                  onClick={() => runTheater(true)}
                  disabled={theater !== null}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 transition-transform hover:-translate-y-0.5"
                  style={{ background: accent, color: accentInk }}
                >
                  {theater ? 'Phone ringing...' : '＋ Catch a live call'}
                </button>
              </div>

              {/* Pipeline */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                {preset.stages.map((stage, si) => {
                  const col = visible.filter((l) => l.stage === si && !l.lost);
                  return (
                    <div key={stage} className="rounded-2xl border p-3 animate-[osIn_.5s_ease-out_both]" style={{ background: PANEL, borderColor: LINE, animationDelay: `${si * 80}ms` }}>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2.5 flex items-center gap-2" style={{ color: DIM }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent, opacity: 0.4 + si * 0.2 }} />
                        {stage} · {col.length}
                      </p>
                      <div className="space-y-2">
                        {col.map((l) => (
                          <div
                            key={l.id}
                            className="rounded-xl border p-2.5 transition-transform hover:-translate-y-0.5"
                            style={{
                              background: PANEL_SOFT,
                              borderColor: l.source === 'Receptionist' ? accent : LINE,
                              ...(justLanded === l.id
                                ? { animation: 'osLand .7s cubic-bezier(.2,.9,.3,1.2) both', boxShadow: `0 0 0 3px ${accentSoft}, 0 10px 30px -12px ${accent}` }
                                : {}),
                            }}
                          >
                            <button onClick={() => setOpenLead(l.id)} className="w-full text-left">
                              <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{l.name}</p>
                              <p className="text-[11px] leading-snug mt-0.5" style={{ color: DIM }}>{l.need}</p>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <span className="font-mono text-[11px] font-bold" style={{ color: accent }}>${l.value.toLocaleString()}</span>
                                <span className="text-[9px] uppercase tracking-[0.1em] font-bold rounded-full px-2 py-0.5" style={{ color: l.source === 'Receptionist' ? accentInk : DIM, background: l.source === 'Receptionist' ? accent : 'transparent', border: l.source === 'Receptionist' ? 'none' : `1px solid ${LINE}` }}>
                                  {l.source === 'Receptionist' ? '🎙 AI' : l.source}
                                </span>
                              </div>
                            </button>
                            {l.stage < 3 && (
                              <button
                                onClick={(e) => move(l.id, 1, { x: e.clientX, y: e.clientY })}
                                className="mt-2 w-full rounded-lg border text-[10px] uppercase tracking-[0.1em] font-bold py-1.5"
                                style={{ borderColor: LINE, color: DIM }}
                              >
                                Move to {preset.stages[l.stage + 1]} →
                              </button>
                            )}
                          </div>
                        ))}
                        {col.length === 0 && (
                          <p className="text-[11px] italic py-2" style={{ color: DIM }}>
                            {q ? 'Nobody matches that search.' : 'Empty. A good problem or a bad one.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {leads.some((l) => l.lost) && (
                <p className="text-[12px] mt-3" style={{ color: DIM }}>
                  {leads.filter((l) => l.lost).length} marked lost, kept on file. Open them to put them back.
                </p>
              )}
            </div>
          )}

          {tab === 'quotes' && <QuotesTab onSigned={quoteSigned} goToJobs={() => setTab('jobs')} />}

          {tab === 'jobs' && <JobsTab jobs={jobs} advance={advanceJob} />}

          {tab === 'calendar' && <CalendarTab />}

          {tab === 'leadgen' && <LeadGenTab />}

          {tab === 'campaigns' && <CampaignsTab />}

          {tab === 'money' && (
            <div className="max-w-3xl">
              {sectionTitle('Money', `Every finished ${preset.jobWord} becomes an invoice. Chase the late ones with one tap.`)}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {stat('Collected', `$${collected.toLocaleString()}`, `${invoices.filter((i) => i.paid).length} invoices paid`, 0)}
                {stat('Outstanding', `$${owed.toLocaleString()}`, `${outstanding.length} still owed to you`, 1, owed > 0)}
              </div>

              {invoices.length === 0 ? (
                <p className="text-[13px]" style={{ color: DIM }}>
                  Nothing invoiced yet. Close a {preset.jobWord} in Customers and it lands here.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv, i) => (
                    <div
                      key={inv.id}
                      className="rounded-2xl border p-4 flex items-center gap-4 animate-[osIn_.4s_ease-out_both]"
                      style={{ background: PANEL, borderColor: inv.paid ? LINE : accent, animationDelay: `${i * 60}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{inv.name}</p>
                        <p className="text-[12px] mt-0.5 truncate" style={{ color: DIM }}>{inv.need}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[15px] font-bold" style={{ color: TEXT }}>${inv.amount.toLocaleString()}</p>
                        {inv.paid ? (
                          <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: TONE.won[0] }}>Paid</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: TONE.hot[0] }}>
                            {inv.age === 0 ? 'just sent' : `${inv.age} days out`}
                          </span>
                        )}
                      </div>
                      {!inv.paid && (
                        <button
                          onClick={() => {
                            setChased((c) => [...c, inv.id]);
                            say(`Reminder texted to ${inv.name}. We will keep nudging until they pay.`);
                          }}
                          disabled={chased.includes(inv.id)}
                          className="shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-60"
                          style={{ background: chased.includes(inv.id) ? 'transparent' : accent, color: chased.includes(inv.id) ? DIM : accentInk, border: `1px solid ${chased.includes(inv.id) ? LINE : accent}` }}
                        >
                          {chased.includes(inv.id) ? 'Chasing' : 'Chase'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[12px] mt-3" style={{ color: DIM }}>
                Sample figures, drawn from the work you closed in Customers.
              </p>
            </div>
          )}

          {tab === 'books' && (
            <div className="max-w-4xl">
              {sectionTitle('Books', 'Your month at a glance: money in, money out, and what to set aside before the taxman knocks.')}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {stat('Money in', `$${books.income.toLocaleString()}`, 'this month', 0)}
                {stat('Money out', `$${books.spent.toLocaleString()}`, `${books.expenses.length} expense categories`, 1)}
                {stat('Profit', `$${books.profit.toLocaleString()}`, `${books.margin}% margin`, 2, books.profit > 0)}
                {stat('Set aside for taxes', `$${books.taxSetAside.toLocaleString()}`, '25% of profit, tucked away', 3)}
              </div>

              <div className="grid md:grid-cols-5 gap-4 mb-5">
                {/* Where the money went */}
                <div className="md:col-span-3 rounded-2xl border p-5" style={{ background: PANEL, borderColor: LINE }}>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4" style={{ color: DIM }}>Where it went</p>
                  <div className="space-y-3">
                    {books.expenses.map((e, i) => {
                      const pct = Math.round((e.amount / books.spent) * 100);
                      return (
                        <div key={e.label} className="animate-[osIn_.4s_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[13px]" style={{ color: TEXT }}>{e.label}</span>
                            <span className="font-mono text-[13px]" style={{ color: DIM }}>${e.amount.toLocaleString()} · {pct}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: PANEL_SOFT }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* The tax vault + take-home */}
                <div className="md:col-span-2 rounded-2xl border p-5 flex flex-col" style={{ background: accentSoft, borderColor: accent }}>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: accent }}>Tax vault</p>
                  <p className="font-mono text-3xl font-bold mt-2" style={{ color: TEXT }}>${books.taxSetAside.toLocaleString()}</p>
                  <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: DIM }}>
                    Every time a {preset.jobWord} is paid, we skim 25% into a separate tax bucket, so April is never a surprise.
                  </p>
                  <div className="mt-auto pt-4 flex items-baseline justify-between border-t" style={{ borderColor: LINE }}>
                    <span className="text-[12px]" style={{ color: DIM }}>Your take-home</span>
                    <span className="font-mono text-lg font-bold" style={{ color: TEXT }}>${books.take.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Recent ledger */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: PANEL, borderColor: LINE }}>
                <p className="text-[11px] uppercase tracking-[0.2em] font-semibold px-5 pt-4 pb-2" style={{ color: DIM }}>Recent activity</p>
                <div className="divide-y" style={{ borderColor: LINE }}>
                  {books.ledger.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 animate-[osIn_.4s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-[15px] font-bold"
                        style={{ background: PANEL_SOFT, color: t.dir === 'in' ? TONE.won[0] : TONE.hot[0] }}
                        aria-hidden="true"
                      >
                        {t.dir === 'in' ? '+' : '−'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold truncate" style={{ color: TEXT }}>{t.label}</p>
                        <p className="text-[11.5px]" style={{ color: DIM }}>{t.cat} · {t.day}d ago</p>
                      </div>
                      <span className="font-mono text-[14px] font-bold shrink-0" style={{ color: t.dir === 'in' ? TONE.won[0] : TEXT }}>
                        {t.dir === 'in' ? '+' : '−'}${t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                <button
                  onClick={() => say('This month exported to PDF. In the live version it lands in your email and your accountant folder.')}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em]"
                  style={{ background: accent, color: accentInk }}
                >
                  Export this month
                </button>
                <button
                  onClick={() => say('Sent to your accountant. Live, this shares a clean read-only P&L every month automatically.')}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] border"
                  style={{ borderColor: LINE, color: TEXT, background: PANEL }}
                >
                  Send to my accountant
                </button>
              </div>
              <p className="text-[12px] mt-3" style={{ color: DIM }}>
                Sample month for a {preset.jobWord} business. Your real books sync the day we connect your invoicing and bank feed.
              </p>
            </div>
          )}

          {tab === 'reviews' && (() => {
            // Deterministic rating summary, seeded by business name (hydration law).
            const rh = hash(config.business + 'reviews');
            const count = 84 + (rh % 140);
            const rating = (48 + (rh % 2)) / 10; // 4.8 or 4.9
            const thisMonth = 6 + (rh % 12) + reviewBonus;
            const stars = (n: number, size = 16) =>
              [0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(n) ? accent : LINE} aria-hidden>
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ));
            return (
            <div className="max-w-3xl">
              {sectionTitle('Reviews', 'Your reputation, working for you. New stars chased automatically, every review answered.')}

              {/* Rating summary: the number a customer sees on Google, front and center. */}
              <div className="rounded-2xl border-2 p-5 mb-3 flex flex-wrap items-center gap-x-8 gap-y-3 animate-[osIn_.5s_ease-out_both]" style={{ borderColor: accent, background: accentSoft }}>
                <div>
                  <p className="font-mono text-4xl font-bold leading-none" style={{ color: TEXT }}>{rating.toFixed(1)}</p>
                  <div className="flex items-center gap-1 mt-1.5">{stars(rating, 18)}</div>
                  <p className="text-[11px] mt-1.5" style={{ color: DIM }}>{count} Google reviews</p>
                </div>
                <div className="h-12 w-px hidden sm:block" style={{ background: LINE }} />
                <div>
                  <p className="font-mono text-2xl font-bold" style={{ color: accent }}>+{thisMonth}</p>
                  <p className="text-[12px]" style={{ color: DIM }}>new this month, on autopilot</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[11px]" style={{ color: DIM }}>Response rate</p>
                  <p className="font-mono text-2xl font-bold" style={{ color: TEXT }}>100%</p>
                </div>
              </div>

              {config.evidenceQuote && (
                <div className="rounded-2xl border-2 p-4 mb-3 animate-[osIn_.5s_ease-out_.08s_both]" style={{ borderColor: '#c25454', background: 'rgba(194,84,84,0.08)' }}>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: '#e08585' }}>What customers said before</p>
                  <p className="text-[14px] italic leading-relaxed mt-2" style={{ color: TEXT }}>&ldquo;{config.evidenceQuote}&rdquo;</p>
                  {config.evidenceSource && <p className="text-[10px] uppercase tracking-[0.14em] mt-1.5" style={{ color: DIM }}>{config.evidenceSource}</p>}
                  <p className="text-[13px] mt-3" style={{ color: DIM }}>The wall below is what replaces it once every finished {preset.jobWord} asks for a star.</p>
                </div>
              )}

              {/* The 5-star chase */}
              <div className="rounded-2xl border p-4 animate-[osIn_.5s_ease-out_.15s_both]" style={{ background: PANEL, borderColor: LINE }}>
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: accent }}>The 5-star chase</p>
                <p className="text-[13px] mt-2" style={{ color: DIM }}>
                  The moment a {preset.jobWord} is marked done, the customer gets this text. Happy ones tap through to Google; unhappy ones reach you first, privately.
                </p>
                <div className="mt-3 max-w-sm rounded-2xl rounded-bl-md p-3.5 border" style={{ background: PANEL_SOFT, borderColor: LINE }}>
                  <p className="text-[13px] leading-relaxed" style={{ color: TEXT }}>
                    {preset.reviewAsk}
                    <span className="underline" style={{ color: accent }}>g.page/r/{config.business.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18)}</span>
                  </p>
                </div>
                <p className="text-[12px] mt-3" style={{ color: DIM }}>
                  {3 + reviewBonus} requests queued from this week&apos;s finished {preset.jobWord}s (sample{reviewBonus > 0 ? ` + ${reviewBonus} you just finished` : ''})
                </p>
              </div>

              {/* The wall: recent 5-star reviews, each answered in one tap. */}
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold mt-5 mb-2.5" style={{ color: DIM }}>Recent reviews</p>
              <div className="space-y-2.5">
                {REVIEW_POOL.map((r, i) => {
                  const replied = repliedReviews.includes(i);
                  const text = r.text.replace(/\{biz\}/g, config.business).replace(/\{job\}/g, preset.jobWord);
                  return (
                    <div key={r.name} className="rounded-2xl border p-4 animate-[osIn_.4s_ease-out_both]" style={{ background: PANEL, borderColor: LINE, animationDelay: `${i * 60}ms` }}>
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0" style={{ background: accentSoft, color: accent }}>
                          {r.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13.5px] font-semibold" style={{ color: TEXT }}>{r.name}</p>
                            <div className="flex items-center gap-0.5">{stars(5, 13)}</div>
                            <span className="text-[11px]" style={{ color: DIM }}>· {r.when}</span>
                          </div>
                          <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: DIM }}>{text}</p>

                          {replied ? (
                            <div className="mt-2.5 ml-3 pl-3 border-l-2" style={{ borderColor: accent }}>
                              <p className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>{config.business} replied</p>
                              <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: TEXT }}>{REVIEW_REPLY(config.business)}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setRepliedReviews((s) => [...s, i]);
                                say('Reply drafted and posted to Google. Every review gets a warm, on-brand answer.');
                              }}
                              className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.08em] rounded-lg px-3 py-1.5 border"
                              style={{ borderColor: accent, color: accent }}
                            >
                              ✦ Draft a reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] mt-3" style={{ color: DIM }}>
                Sample reviews. Connect your Google in the portal and this wall fills with your real ones, each answered automatically.
              </p>
            </div>
            );
          })()}

          {tab === 'automations' && (
            <div className="max-w-3xl">
              {sectionTitle('Automations', 'The busywork, running itself. Flip anything on.')}
              <div className="space-y-2.5">
                {automations.map((a, i) => (
                  <div key={a.title} className="rounded-2xl border p-4 flex items-center gap-4 animate-[osIn_.4s_ease-out_both]" style={{ background: PANEL, borderColor: LINE, animationDelay: `${i * 70}ms` }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{a.title}</p>
                      <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: DIM }}>{a.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setArmed((s) => s.map((v, j) => (j === i ? !v : v)));
                        say(armed[i] ? `${a.title} paused.` : `${a.title} armed.`);
                      }}
                      className="shrink-0 w-12 h-7 rounded-full relative transition-colors"
                      style={{ background: armed[i] ? accent : 'rgba(232,236,248,0.15)' }}
                      aria-label={`Toggle ${a.title}`}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                        style={{ left: armed[i] ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'assistant' && (
            <div className="max-w-2xl flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
              {sectionTitle('Your assistant', 'It reads the whole board. Ask, or hand it the writing.')}
              <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                {msgs.map((m, i) => (
                  <div key={i} className={`max-w-[88%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                    <div
                      className="rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap border"
                      style={
                        m.role === 'user'
                          ? { background: accentSoft, borderColor: accent, color: TEXT }
                          : { background: PANEL, borderColor: LINE, color: TEXT }
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && <p className="text-[12px] animate-pulse" style={{ color: DIM }}>thinking…</p>}
                <div ref={chatEnd} />
              </div>
              <div className="shrink-0 flex gap-2 pt-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void send()}
                  placeholder={`Ask about the day, the pipeline, or say "draft a review reply"...`}
                  className="flex-1 rounded-xl border px-4 py-3 text-[14px] outline-none"
                  style={{ background: PANEL, borderColor: LINE, color: TEXT }}
                />
                <button
                  onClick={() => void send()}
                  disabled={chatBusy || !draft.trim()}
                  className="rounded-xl px-5 font-bold text-[13px] uppercase tracking-[0.08em] disabled:opacity-50"
                  style={{ background: accent, color: accentInk }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom tab bar (mobile). Eight tabs cannot share a 375px row without
          turning into unreadable slivers, so four ride the bar and the rest live
          behind More (house rule: group any nav past ~6 items). */}
      <nav className="md:hidden shrink-0 flex border-t" style={{ borderColor: LINE, background: PANEL }}>
        {primaryTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5" style={{ color: tab === t.id ? accent : DIM }}>
            <Icon d={t.icon} size={19} />
            <span className="text-[9px] font-semibold uppercase tracking-wide truncate max-w-full px-0.5">{t.short ?? t.label}</span>
          </button>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5"
          style={{ color: moreTabs.some((t) => t.id === tab) ? accent : DIM }}
        >
          <Icon d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" size={19} />
          <span className="text-[9px] font-semibold uppercase tracking-wide">More</span>
        </button>
      </nav>

      {/* More sheet (mobile) */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div
            className="relative w-full rounded-t-2xl border-t max-h-[70vh] overflow-y-auto p-3 animate-[osIn_.2s_ease-out]"
            style={{ background: PANEL, borderColor: LINE }}
            onClick={(e) => e.stopPropagation()}
          >
            {moreTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold"
                style={{ color: tab === t.id ? accent : TEXT, background: tab === t.id ? accentSoft : 'transparent' }}
              >
                <Icon d={t.icon} size={19} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lead record. Height-capped flex column with a pinned header, so it can
          never push its own top off a short screen (house modal rule). */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end" onClick={() => setOpenLead(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
          <div
            className="relative w-full sm:max-w-md h-full flex flex-col border-l animate-[osIn_.25s_ease-out]"
            style={{ background: INK, borderColor: LINE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* pinned */}
            <div className="shrink-0 p-5 border-b" style={{ borderColor: LINE }}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0" style={{ background: accent, color: accentInk }}>
                  {selected.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold leading-tight" style={{ color: TEXT }}>{selected.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DIM }}>
                    {selected.source === 'Receptionist' ? '🎙 Caught by your AI receptionist' : `Came in via ${selected.source}`} · {selected.age}
                  </p>
                </div>
                <button onClick={() => setOpenLead(null)} className="shrink-0 text-[20px] leading-none px-2" style={{ color: DIM }} aria-label="Close">
                  ×
                </button>
              </div>
            </div>

            {/* scrolls */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1.5" style={{ color: DIM }}>What they want</p>
                <p className="text-[14px]" style={{ color: TEXT }}>{selected.need}</p>
                <p className="font-mono text-2xl font-bold mt-2" style={{ color: accent }}>${selected.value.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Call', hint: `Dialing ${selected.phone}...` },
                  { label: 'Text', hint: `Text drafted to ${selected.name}. Ready to send.` },
                  { label: 'Email', hint: `Follow-up written for ${selected.name}.` },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => say(a.hint)}
                    className="rounded-xl border py-2.5 text-[12px] font-bold uppercase tracking-[0.08em]"
                    style={{ borderColor: LINE, color: TEXT, background: PANEL }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[13px]" style={{ color: DIM }}>{selected.phone}</p>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2" style={{ color: DIM }}>Stage</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => move(selected.id, -1)}
                    disabled={selected.stage === 0}
                    className="rounded-lg border px-3 py-2 text-[13px] font-bold disabled:opacity-40"
                    style={{ borderColor: LINE, color: TEXT }}
                  >
                    ←
                  </button>
                  <span className="flex-1 text-center text-[13px] font-semibold rounded-lg border py-2" style={{ borderColor: accent, background: accentSoft, color: TEXT }}>
                    {preset.stages[selected.stage]}
                  </span>
                  <button
                    onClick={(e) => move(selected.id, 1, { x: e.clientX, y: e.clientY })}
                    disabled={selected.stage === 3}
                    className="rounded-lg border px-3 py-2 text-[13px] font-bold disabled:opacity-40"
                    style={{ borderColor: LINE, color: TEXT }}
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={() => markLost(selected.id)}
                  className="mt-2 w-full rounded-lg border py-2 text-[11px] font-bold uppercase tracking-[0.1em]"
                  style={{ borderColor: selected.lost ? accent : LINE, color: selected.lost ? accent : TONE.hot[0] }}
                >
                  {selected.lost ? 'Put back in the pipeline' : 'Mark lost'}
                </button>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2" style={{ color: DIM }}>History</p>
                <div className="space-y-2">
                  {[...selected.notes, { when: selected.age, text: `Lead created from ${selected.source}.` }].map((n, i) => (
                    <div key={i} className="rounded-xl border p-3" style={{ background: PANEL, borderColor: LINE }}>
                      <p className="text-[13px] leading-relaxed" style={{ color: TEXT }}>{n.text}</p>
                      <p className="text-[11px] mt-1" style={{ color: DIM }}>{n.when}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2" style={{ color: DIM }}>Add a note</p>
                <textarea
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Quoted him Tuesday, wants to think it over..."
                  className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none resize-y"
                  style={{ background: PANEL, borderColor: LINE, color: TEXT }}
                />
                <button
                  onClick={() => addNote(selected.id)}
                  disabled={!noteDraft.trim()}
                  className="mt-2 w-full rounded-xl py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-50"
                  style={{ background: accent, color: accentInk }}
                >
                  Save note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-50 rounded-xl border px-4 py-2.5 text-[13px] font-semibold animate-[osIn_.25s_ease-out]" style={{ background: PANEL_SOFT, borderColor: accent, color: TEXT }}>
          {toast}
        </div>
      )}

      {/* Incoming-call theater. Top of the screen (the bottom-right corner
          belongs to the voice widget), honest about being simulated. */}
      {theater && (
        <div
          className="fixed top-3 right-3 left-3 sm:left-auto sm:w-[380px] z-[80] rounded-2xl border-2 shadow-2xl overflow-hidden animate-[osSlide_.4s_cubic-bezier(.2,.9,.3,1.15)_both]"
          style={{ background: PANEL, borderColor: accent }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 p-3.5">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: theater.phase === 'ring' ? accent : accentSoft,
                animation: theater.phase === 'ring' ? 'osShake .5s ease-in-out infinite' : undefined,
              }}
            >
              <Icon d={PHONE_ICON} color={theater.phase === 'ring' ? accentInk : accent} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-tight" style={{ color: TEXT }}>
                {theater.phase === 'ring' ? 'Incoming call' : theater.phase === 'answer' ? 'Your AI receptionist answered' : 'Booked and filed to Customers'}
              </p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: theater.phase === 'filed' ? accent : DIM }}>
                {theater.phase === 'filed'
                  ? `+$${preset.avgTicket.toLocaleString()} potential · zero rings missed`
                  : `${phoneFor(inboundOf(theater.n).name)} · after hours`}
              </p>
            </div>
            <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] font-bold rounded-full px-2 py-0.5 border" style={{ color: DIM, borderColor: LINE }}>
              Simulated
            </span>
          </div>
          {theater.phase !== 'ring' && (
            <div className="px-3.5 pb-3.5 space-y-1">
              {script
                .slice(0, theater.phase === 'filed' ? script.length : typedCount)
                .split('\n')
                .map((line, i) => (
                  <p key={i} className="text-[12px] leading-relaxed font-mono" style={{ color: i === 0 ? accent : TEXT }}>
                    {line}
                  </p>
                ))}
            </div>
          )}
          <div className="h-0.5 w-full" style={{ background: LINE }}>
            <div
              className="h-full transition-all duration-500"
              style={{ background: accent, width: theater.phase === 'ring' ? '18%' : theater.phase === 'answer' ? '64%' : '100%' }}
            />
          </div>
        </div>
      )}

      {/* Win celebration bursts */}
      {bursts.map((b) => (
        <WinBurst key={b.id} x={b.x} y={b.y} accent={accent} text={TEXT} />
      ))}

      {/* The receptionist, one floor down from the corner tabs on mobile. */}
      <div className="fixed bottom-16 md:bottom-4 right-4 z-40">
        <DemoVoiceWidget business={config.business} call={call} label="Your receptionist. Try it" />
      </div>

      {/* First-run onboarding tour (drives the tabs as it explains them). */}
      {tourOpen && <OsTour onGoTo={(t) => setTab(t as Tab)} onClose={closeTour} />}
    </div>
    </OsProvider>
  );
}
