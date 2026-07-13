'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import type { OsDemoConfig } from '@/lib/outbound-demo';
import { OS_AUTOMATIONS } from '@/data/demo-os';
import type { OsAd, OsCustomer } from '@/data/demo-os';
import { resolveTrade } from '@/data/demo-os-trades';
import { DEFAULT_OS_THEME } from '@/lib/site-palette';
import type { OsTheme } from '@/lib/site-palette';
import DemoVoiceWidget from '@/components/demo/DemoVoiceWidget';

/**
 * The forged BUSINESS OS demo: one template command center that renders as
 * THEIR software from the frozen per-lead config. Midnight operations deck:
 * dark slate, one trade accent, sample data labeled honestly. Modules: Today,
 * the trade-specific SIGNATURE BOARD (claims, dispatch, recalls... resolved
 * per detected trade), Customers (CRM), Reviews, Ads, Automations, plus the
 * live AI assistant (capped) and the voice receptionist widget. The pitch is
 * the product.
 */

/* Palette lives in lib/site-palette.ts now: the command center re-skins itself
   to the business's OWN forged website, so the two demos read as one product.
   The house midnight deck is the fallback while the site is still building. */

type Tab = 'today' | 'signature' | 'customers' | 'money' | 'reviews' | 'ads' | 'automations' | 'assistant';

const ASSISTANT_ICON = 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z';
const SIGNATURE_ICON =
  'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z';

/** `short` is the bottom-tab-bar label; 7 tabs at 375px cannot fit the long ones. */
const TABS: { id: Tab; label: string; icon: string; short?: string }[] = [
  { id: 'today', label: 'Today', icon: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z' },
  { id: 'customers', label: 'Customers', icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { id: 'money', label: 'Money', icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z' },
  { id: 'reviews', label: 'Reviews', icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
  { id: 'ads', label: 'Ads', icon: 'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z' },
  { id: 'automations', label: 'Automations', short: 'Auto', icon: 'M7 2v11h3v9l7-12h-4l4-8z' },
  { id: 'assistant', label: 'Assistant', short: 'AI', icon: ASSISTANT_ICON },
];

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

/** Stable string hash. The CRM derives phone numbers, sources and ages from the
 *  lead's name, and it must produce the SAME answer on the server and in the
 *  browser or React tears the tree down on hydration. Never Math.random() here. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SOURCES: LeadSource[] = ['Receptionist', 'Website', 'Google', 'Referral'];
const AGES = ['9 min ago', '42 min ago', '2 hours ago', 'yesterday', '2 days ago', 'last week'];

/** New calls the receptionist can catch on demand, so the owner can watch the
 *  product work instead of reading about it. `{job}` is filled per trade. */
const INBOUND_POOL = [
  { name: 'Tyler B.', need: 'Called after hours, wants a quote on a {job}' },
  { name: 'Marisol V.', need: 'Emergency {job}, asked how soon you can come' },
  { name: 'Dev Patel', need: 'Price check on a {job}, comparing two shops' },
  { name: 'Karen L.', need: 'Repeat customer, needs another {job} booked' },
];

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

function useCountUp(target: number, ms = 1600): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Icon({ d, size = 18, color }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? 'currentColor'} aria-hidden>
      <path d={d} />
    </svg>
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

  // The signature board slots in right after Today, labeled per trade.
  const tabs = useMemo<{ id: Tab; label: string; icon: string; short?: string }[]>(
    () => [TABS[0], { id: 'signature', label: preset.signature.tabLabel, icon: SIGNATURE_ICON }, ...TABS.slice(1)],
    [preset.signature.tabLabel],
  );
  // Mobile: four on the bar, the rest behind More.
  const primaryTabs = tabs.slice(0, 4);
  const moreTabs = tabs.slice(4);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const say = (t: string) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const place = [config.city, config.state].filter(Boolean).join(', ');
  const revenue = useCountUp(preset.weekRevenue);

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

  const move = (id: string, dir: 1 | -1) => {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    const next = Math.max(0, Math.min(3, l.stage + dir)) as OsCustomer['stage'];
    if (next === l.stage) return;
    patch(id, { stage: next, lost: false });
    say(`${l.name} moved to ${preset.stages[next]}.`);
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

  // The receptionist catching a call IS the product. Let them watch one land.
  const [callIn, setCallIn] = useState(false);
  const catchCall = () => {
    const inbound = INBOUND_POOL[leads.length % INBOUND_POOL.length];
    const fresh = enrich(
      { name: inbound.name, need: inbound.need.replace(/\{job\}/g, preset.jobWord), value: preset.avgTicket, stage: 0 },
      leads.length + 97,
    );
    fresh.source = 'Receptionist';
    fresh.age = 'just now';
    fresh.notes = [{ when: 'just now', text: `Answered by your AI receptionist. Caller asked about ${preset.jobWord} work and left a number.` }];
    setCallIn(true);
    window.setTimeout(() => {
      setLeads((ls) => [fresh, ...ls]);
      setCallIn(false);
      setOpenLead(fresh.id);
      say(`${fresh.name} called. Your receptionist took it and filed the lead.`);
    }, 1400);
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
    () =>
      live
        .filter((l) => l.stage === 3)
        .map((l, i) => ({
          id: l.id,
          name: l.name,
          need: l.need,
          amount: l.value,
          // Deterministic: every third one is still out.
          paid: hash(l.name) % 3 !== 0,
          age: 2 + (hash(l.name) % 26),
        })),
    [live],
  );
  const outstanding = invoices.filter((i) => !i.paid);
  const collected = invoices.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const owed = outstanding.reduce((s, i) => s + i.amount, 0);
  const [chased, setChased] = useState<string[]>([]);

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

  /* ------------------------------- ad maker ------------------------------- */
  const fill = (s: string) => s.replace(/\{biz\}/g, config.business).replace(/\{city\}/g, config.city || 'your town');
  const [ads, setAds] = useState<OsAd[]>(preset.ads.map((a) => ({ headline: fill(a.headline), body: fill(a.body) })));
  const [adBusy, setAdBusy] = useState(false);
  const newAd = async () => {
    setAdBusy(true);
    try {
      const res = await fetch(`/api/demo-os/${osId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ad' }),
      });
      const j = (await res.json()) as { reply?: string; error?: string };
      const lines = (j.reply ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        setAds((a) => [{ headline: lines[0], body: lines.slice(1).join(' ') }, ...a]);
        say('Fresh angle written.');
      } else {
        say(j.error ?? 'The ad desk is busy. Try again.');
      }
    } catch {
      say('The ad desk is busy. Try again.');
    } finally {
      setAdBusy(false);
    }
  };

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
  const stat = (label: string, value: string, sub: string, i: number, pulse = false) => (
    <div
      key={label}
      className="rounded-2xl p-4 border animate-[osIn_.5s_ease-out_both]"
      style={{ background: PANEL, borderColor: LINE, animationDelay: `${i * 90}ms` }}
    >
      <div className="flex items-center gap-2">
        {pulse && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />}
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: DIM }}>{label}</p>
      </div>
      <p className="font-mono text-3xl font-bold mt-1.5" style={{ color: TEXT }}>{value}</p>
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
    <div className="fixed inset-0 flex flex-col font-sans" style={{ background: INK }}>
      <style>{`@keyframes osIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-3 px-4 sm:px-6 h-14 border-b" style={{ borderColor: LINE }}>
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: accent, color: accentInk }}
        >
          {config.business.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight truncate" style={{ color: TEXT }}>{config.business}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] leading-tight" style={{ color: DIM }}>Command Center{place ? ` · ${place}` : ''}</p>
        </div>
        <span
          className="ml-auto hidden sm:inline-block shrink-0 text-[10px] uppercase tracking-[0.16em] font-bold rounded-full px-3 py-1 border"
          style={{ color: accent, borderColor: accent, background: accentSoft }}
        >
          Demo · sample data
        </span>
        {/* The order path must exist on a phone too: most prospects open this
            from a text message. Keep it visible at every width. */}
        <a
          href={orderUrl || 'https://modernmustardseed.com/book'}
          {...(orderUrl ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="ml-auto sm:ml-0 shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] rounded-full px-3.5 py-1.5 whitespace-nowrap"
          style={{ background: accent, color: accentInk }}
        >
          Make it real
        </a>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar (desktop) */}
        <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0 p-3 border-r" style={{ borderColor: LINE }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors"
              style={tab === t.id ? { background: PANEL_SOFT, color: TEXT } : { color: DIM }}
            >
              <Icon d={t.icon} color={tab === t.id ? accent : undefined} />
              {t.label}
            </button>
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stat('Rescued this week', `$${revenue.toLocaleString()}`, 'booked from calls + follow-ups', 0)}
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
                  onClick={catchCall}
                  disabled={callIn}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 transition-transform hover:-translate-y-0.5"
                  style={{ background: accent, color: accentInk }}
                >
                  {callIn ? 'Phone ringing...' : '＋ Catch a live call'}
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
                            style={{ background: PANEL_SOFT, borderColor: l.source === 'Receptionist' ? accent : LINE }}
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
                                onClick={() => move(l.id, 1)}
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
                          <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: TONE.hot[0] }}>{inv.age} days out</span>
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

          {tab === 'reviews' && (
            <div className="max-w-3xl">
              {sectionTitle('Reviews', 'Turn finished work into Google stars, automatically.')}
              {config.evidenceQuote && (
                <div className="rounded-2xl border-2 p-4 mb-3 animate-[osIn_.5s_ease-out_both]" style={{ borderColor: '#c25454', background: 'rgba(194,84,84,0.08)' }}>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: '#e08585' }}>What customers say today</p>
                  <p className="text-[14px] italic leading-relaxed mt-2" style={{ color: TEXT }}>&ldquo;{config.evidenceQuote}&rdquo;</p>
                  {config.evidenceSource && <p className="text-[10px] uppercase tracking-[0.14em] mt-1.5" style={{ color: DIM }}>{config.evidenceSource}</p>}
                  <p className="text-[13px] mt-3" style={{ color: DIM }}>This is the review the system below makes sure nobody ever writes again.</p>
                </div>
              )}
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
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={accent} aria-hidden>
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[12px]" style={{ color: DIM }}>3 requests queued from this week&apos;s finished {preset.jobWord}s (sample)</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'ads' && (
            <div className="max-w-3xl">
              {sectionTitle('Ad maker', 'Ready-to-run ads for Facebook and Instagram, written in your voice.')}
              <button
                onClick={() => void newAd()}
                disabled={adBusy}
                className="mb-3 rounded-xl px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: accent, color: accentInk }}
              >
                {adBusy ? 'Writing…' : '✦ Write me a new angle'}
              </button>
              <div className="grid sm:grid-cols-2 gap-3">
                {ads.map((ad, i) => (
                  <div key={`${ad.headline}-${i}`} className="rounded-2xl border overflow-hidden animate-[osIn_.4s_ease-out_both]" style={{ background: PANEL, borderColor: LINE }}>
                    <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: LINE }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: accent, color: accentInk }}>
                        {config.business.charAt(0)}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: TEXT }}>{config.business}</span>
                      <span className="text-[10px] ml-auto" style={{ color: DIM }}>Sponsored</span>
                    </div>
                    <div className="p-4" style={{ background: accentSoft }}>
                      <p className="text-lg font-bold leading-snug" style={{ color: TEXT }}>{ad.headline}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] leading-relaxed" style={{ color: DIM }}>{ad.body}</p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] mt-2" style={{ color: accent }}>Call now · {config.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] mt-3" style={{ color: DIM }}>In the real build these post straight to your pages and every lead lands in Customers, tagged by ad.</p>
            </div>
          )}

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
                    onClick={() => move(selected.id, 1)}
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

      {/* The receptionist, one floor down from the corner tabs on mobile. */}
      <div className="fixed bottom-16 md:bottom-4 right-4 z-40">
        <DemoVoiceWidget business={config.business} call={call} label="Your receptionist. Try it" />
      </div>
    </div>
  );
}
