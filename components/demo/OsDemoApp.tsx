'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import type { OsDemoConfig } from '@/lib/outbound-demo';
import { OS_PRESETS, OS_AUTOMATIONS } from '@/data/demo-os';
import type { OsAd, OsCustomer } from '@/data/demo-os';
import DemoVoiceWidget from '@/components/demo/DemoVoiceWidget';

/**
 * The forged BUSINESS OS demo: one template command center that renders as
 * THEIR software from the frozen per-lead config. Midnight operations deck:
 * dark slate, one trade accent, sample data labeled honestly. Modules: Today,
 * Customers (CRM), Reviews, Ads, Automations, plus the live AI assistant
 * (capped) and the voice receptionist widget. The pitch is the product.
 */

const INK = '#0e1220';
const PANEL = '#161c30';
const PANEL_SOFT = '#1c2338';
const LINE = 'rgba(232,236,248,0.09)';
const TEXT = '#e8ecf8';
const DIM = 'rgba(232,236,248,0.55)';

type Tab = 'today' | 'customers' | 'reviews' | 'ads' | 'automations' | 'assistant';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z' },
  { id: 'customers', label: 'Customers', icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { id: 'reviews', label: 'Reviews', icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
  { id: 'ads', label: 'Ads', icon: 'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z' },
  { id: 'automations', label: 'Automations', icon: 'M7 2v11h3v9l7-12h-4l4-8z' },
  { id: 'assistant', label: 'Assistant', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
];

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
}: {
  osId: string;
  config: OsDemoConfig;
  call: ForgedCall | null;
}) {
  const preset = OS_PRESETS[config.niche] ?? OS_PRESETS.other;
  const accent = preset.accent;
  const [tab, setTab] = useState<Tab>('today');
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
  const [customers, setCustomers] = useState<OsCustomer[]>(preset.customers);
  const advance = (i: number) => {
    setCustomers((cs) =>
      cs.map((c, idx) => (idx === i && c.stage < 3 ? { ...c, stage: (c.stage + 1) as OsCustomer['stage'] } : c)),
    );
    const c = customers[i];
    if (c && c.stage < 3) say(`${c.name} moved to ${preset.stages[Math.min(3, c.stage + 1)]}.`);
  };

  /* --------------------------- automations state -------------------------- */
  const automations = useMemo(
    () => OS_AUTOMATIONS.map((a) => ({ ...a, desc: a.desc.replace(/\{job\}/g, preset.jobWord) })),
    [preset.jobWord],
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
      content: `Morning${config.ownerFirst ? `, ${config.ownerFirst}` : ''}! I can see the whole board: today's ${preset.jobWord}s, the pipeline, and the three calls I caught overnight. Ask me anything, or tell me to draft a text, a reply, or a review response.`,
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
          style={{ background: accent, color: INK }}
        >
          {config.business.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight truncate" style={{ color: TEXT }}>{config.business}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] leading-tight" style={{ color: DIM }}>Command Center{place ? ` · ${place}` : ''}</p>
        </div>
        <span
          className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.16em] font-bold rounded-full px-3 py-1 border"
          style={{ color: accent, borderColor: accent, background: preset.accentSoft }}
        >
          Demo · sample data
        </span>
        <a
          href="https://modernmustardseed.com/book"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-block shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] rounded-full px-3.5 py-1.5"
          style={{ background: accent, color: INK }}
        >
          Make it real
        </a>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar (desktop) */}
        <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0 p-3 border-r" style={{ borderColor: LINE }}>
          {TABS.map((t) => (
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
                {stat('Waiting on you', String(customers.filter((c) => c.stage === 1).length), 'quotes to send, one tap each', 3)}
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
                onClick={() => setTab('assistant')}
                className="mt-3 w-full rounded-2xl border p-4 text-left flex items-center gap-3 animate-[osIn_.5s_ease-out_.55s_both] hover:brightness-110 transition-all"
                style={{ background: PANEL_SOFT, borderColor: LINE }}
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: preset.accentSoft }}>
                  <Icon d={TABS[5].icon} color={accent} />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: TEXT }}>Ask your assistant anything</span>
                  <span className="block text-[12px]" style={{ color: DIM }}>&ldquo;What does my day look like?&rdquo; &ldquo;Draft a reply to Greg.&rdquo; It knows the whole board.</span>
                </span>
              </button>
            </div>
          )}

          {tab === 'customers' && (
            <div>
              {sectionTitle('Customers', `Every call, lead, and ${preset.jobWord} in one pipeline. Tap a card to move it forward.`)}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                {preset.stages.map((stage, si) => (
                  <div key={stage} className="rounded-2xl border p-3 animate-[osIn_.5s_ease-out_both]" style={{ background: PANEL, borderColor: LINE, animationDelay: `${si * 80}ms` }}>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2.5 flex items-center gap-2" style={{ color: DIM }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent, opacity: 0.4 + si * 0.2 }} />
                      {stage} · {customers.filter((c) => c.stage === si).length}
                    </p>
                    <div className="space-y-2">
                      {customers.map((c, i) =>
                        c.stage === si ? (
                          <button
                            key={c.name}
                            onClick={() => advance(i)}
                            disabled={c.stage === 3}
                            className="w-full text-left rounded-xl border p-2.5 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                            style={{ background: PANEL_SOFT, borderColor: LINE }}
                            title={c.stage < 3 ? `Move to ${preset.stages[c.stage + 1]}` : 'Done'}
                          >
                            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{c.name}</p>
                            <p className="text-[11px] leading-snug mt-0.5" style={{ color: DIM }}>{c.need}</p>
                            <p className="font-mono text-[11px] font-bold mt-1" style={{ color: accent }}>${c.value.toLocaleString()}</p>
                          </button>
                        ) : null,
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                style={{ background: accent, color: INK }}
              >
                {adBusy ? 'Writing…' : '✦ Write me a new angle'}
              </button>
              <div className="grid sm:grid-cols-2 gap-3">
                {ads.map((ad, i) => (
                  <div key={`${ad.headline}-${i}`} className="rounded-2xl border overflow-hidden animate-[osIn_.4s_ease-out_both]" style={{ background: PANEL, borderColor: LINE }}>
                    <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: LINE }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: accent, color: INK }}>
                        {config.business.charAt(0)}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: TEXT }}>{config.business}</span>
                      <span className="text-[10px] ml-auto" style={{ color: DIM }}>Sponsored</span>
                    </div>
                    <div className="p-4" style={{ background: preset.accentSoft }}>
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
                          ? { background: preset.accentSoft, borderColor: accent, color: TEXT }
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
                  style={{ background: accent, color: INK }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="md:hidden shrink-0 flex border-t" style={{ borderColor: LINE, background: PANEL }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5" style={{ color: tab === t.id ? accent : DIM }}>
            <Icon d={t.icon} size={19} />
            <span className="text-[9px] font-semibold uppercase tracking-wide">{t.label}</span>
          </button>
        ))}
      </nav>

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
