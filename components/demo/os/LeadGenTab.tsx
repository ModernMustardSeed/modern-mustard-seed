'use client';

import { useState } from 'react';
import { SectionTitle, StatCard, hash, useOs } from './os-kit';

/**
 * LEAD GEN: the inbound half of growth. Campaigns reaches out; this captures
 * everyone who raises a hand and answers them in seconds. The story is: leads
 * come from everywhere (website, missed calls, ads, your Google listing), all
 * funnel into one place, and the AI responds in under a minute while they are
 * still looking. Sample data is deterministic (hash-seeded, hydration-safe).
 */

type Channel = { key: string; icon: string; name: string; desc: string; on: boolean };
type Capture = { name: string; channel: string; icon: string; secs: number };

const NAMES = ['A new visitor', 'Jordan P.', 'Lena M.', 'The Okafors', 'Sam R.', 'Priya N.', 'Dev C.'];

export default function LeadGenTab({ onLead }: { onLead?: (name: string) => void }) {
  const { config, preset, theme, say } = useOs();
  const h = hash(config.business + 'leadgen');

  const CHANNELS: Channel[] = [
    { key: 'web', icon: '🌐', name: 'Website capture', desc: 'Every form and Book button on your site drops the lead here instantly.', on: true },
    { key: 'missed', icon: '📞', name: 'Missed-call text-back', desc: `A call you can't take gets an automatic text in seconds, so it never becomes a lost ${preset.jobWord}.`, on: true },
    { key: 'ads', icon: '📣', name: 'Facebook & Instagram lead ads', desc: 'Leads from your ads land here tagged with which ad brought them.', on: true },
    { key: 'gbp', icon: '⭐', name: 'Google Business Profile', desc: 'Calls and messages from your Maps listing route straight in.', on: false },
    { key: 'qr', icon: '🔳', name: 'Review & referral card', desc: 'A QR code on your truck or invoice turns happy customers into new ones.', on: false },
  ];
  const [armed, setArmed] = useState<boolean[]>(CHANNELS.map((c) => c.on));

  const [captures, setCaptures] = useState<Capture[]>(() => {
    const src = [
      { name: NAMES[1], channel: 'Website capture', icon: '🌐', secs: 12 },
      { name: NAMES[3], channel: 'Missed-call text-back', icon: '📞', secs: 40 },
      { name: NAMES[2], channel: 'Facebook lead ad', icon: '📣', secs: 22 },
    ];
    return src;
  });
  const [busy, setBusy] = useState(false);

  const weekTotal = 18 + (h % 22);
  const byAi = Math.round(weekTotal * 0.7);
  const bookedFromLeads = 6 + (h % 8);

  const captureOne = () => {
    if (busy) return;
    setBusy(true);
    const liveChannels = CHANNELS.filter((_, i) => armed[i]);
    const ch = liveChannels[(h + captures.length) % (liveChannels.length || 1)] ?? CHANNELS[0];
    const who = NAMES[(h + captures.length) % NAMES.length];
    const secs = 8 + ((h + captures.length) % 40);
    window.setTimeout(() => {
      setCaptures((c) => [{ name: who, channel: ch.name, icon: ch.icon, secs }, ...c].slice(0, 8));
      onLead?.(who);
      say(`${who} came in through ${ch.name}. Your AI texted them back in ${secs} seconds.`);
      setBusy(false);
    }, 650);
  };

  return (
    <div className="max-w-3xl">
      <SectionTitle title="Lead gen" sub="Capture everyone who raises a hand, from everywhere, and answer them in seconds. Strangers become booked jobs while they are still looking." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="New leads" value={String(weekTotal)} sub="this week, all channels" i={0} pulse />
        <StatCard label="Answered by AI" value={String(byAi)} sub="in under a minute each" i={1} />
        <StatCard label="Avg response" value="38s" sub="before they leave your page" i={2} />
        <StatCard label="Booked from leads" value={String(bookedFromLeads)} sub="captured, then closed" i={3} />
      </div>

      {/* The instant-response promise: the whole point. */}
      <div className="rounded-2xl border-2 p-4 mb-4 animate-[osIn_.5s_ease-out_.1s_both]" style={{ background: theme.accentSoft, borderColor: theme.accent }}>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>The 60-second rule</p>
        <p className="text-[13px] mt-1.5" style={{ color: theme.text }}>
          A lead that hears back in under a minute is <strong>21x</strong> more likely to book. Your OS answers every new lead in seconds, day or night, so you win the ones your competitors let go cold.
        </p>
      </div>

      {/* Capture channels: everywhere a lead can come from, one inbox. */}
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2.5" style={{ color: theme.dim }}>Where your leads come from</p>
      <div className="space-y-2.5 mb-5">
        {CHANNELS.map((c, i) => (
          <div key={c.key} className="rounded-2xl border p-4 flex items-center gap-4 animate-[osIn_.4s_ease-out_both]" style={{ background: theme.panel, borderColor: theme.line, animationDelay: `${i * 60}ms` }}>
            <span className="text-2xl shrink-0" aria-hidden>{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold" style={{ color: theme.text }}>{c.name}</p>
              <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: theme.dim }}>{c.desc}</p>
            </div>
            <button
              onClick={() => { setArmed((s) => s.map((v, j) => (j === i ? !v : v))); say(armed[i] ? `${c.name} paused.` : `${c.name} on. Leads flow into Customers.`); }}
              className="shrink-0 w-12 h-7 rounded-full relative transition-colors"
              style={{ background: armed[i] ? theme.accent : theme.panelSoft }}
              aria-label={`Toggle ${c.name}`}
            >
              <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{ left: armed[i] ? 'calc(100% - 1.5rem)' : '0.25rem' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Live capture feed. */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.dim }}>Coming in now</p>
        <button
          onClick={captureOne}
          disabled={busy}
          className="rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 transition-transform hover:-translate-y-0.5"
          style={{ background: theme.accent, color: theme.accentInk }}
        >
          {busy ? 'Capturing…' : '＋ Capture a lead'}
        </button>
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ background: theme.panel, borderColor: theme.line }}>
        <div className="divide-y" style={{ borderColor: theme.line }}>
          {captures.map((c, i) => (
            <div key={`${c.name}-${i}`} className="flex items-center gap-3 px-4 py-3 animate-[osLand_.5s_ease-out_both]">
              <span className="text-lg shrink-0" aria-hidden>{c.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold" style={{ color: theme.text }}>{c.name}</p>
                <p className="text-[11.5px]" style={{ color: theme.dim }}>{c.channel}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] rounded-full px-2.5 py-0.5" style={{ background: theme.accent, color: theme.accentInk }}>
                AI replied in {c.secs}s
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[12px] mt-3" style={{ color: theme.dim }}>
        Sample capture. In the real build every channel is wired to your number and pages, and each new lead lands in Customers with the AI already following up.
      </p>
    </div>
  );
}
