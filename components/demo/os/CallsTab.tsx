'use client';

import { useMemo, useState } from 'react';
import { SectionTitle, StatCard, hash, useOs } from './os-kit';

/**
 * CALLS: the receptionist's back office. Every call your AI answered, written
 * down. This is the voice half of the command center made real: a searchable
 * log with a full transcript on every call, who called, what they needed, and
 * what the AI did about it, with the lead already filed in Customers.
 *
 * All content is deterministic (hash-seeded, hydration-safe) and honestly
 * labeled sample; the real build fills it with the business's own calls.
 */

type Turn = { who: 'ai' | 'caller'; text: string };
type CallRow = {
  id: string;
  caller: string;
  when: string;
  afterHours: boolean;
  need: string;
  outcome: string;
  durationSec: number;
  turns: Turn[];
};

/** Outcome -> chip tone. Booked money is a win, emergencies are hot, the rest wait. */
function outcomeTone(outcome: string): 'won' | 'hot' | 'wait' {
  if (/book|slot|dispatch|scheduled|on site|set,|routed|held/i.test(outcome)) return 'won';
  if (/emerg|urgent|texted|flag|priority|dispatch/i.test(outcome)) return 'hot';
  return 'wait';
}

function firstNameOf(caller: string): string {
  if (/^unknown/i.test(caller)) return 'there';
  const w = caller.replace(/^the\s+/i, '').split(/[\s(]/)[0];
  return w || 'there';
}

/** Turn a (need, outcome) pair into a short, believable transcript. Deterministic. */
function buildTurns(business: string, caller: string, need: string, outcome: string, jobWord: string): Turn[] {
  const first = firstNameOf(caller);
  const booked = /book|slot|scheduled|set,|held|routed|dispatch/i.test(outcome);
  const emergency = /emerg|urgent|flag|priority|leak|burst|no heat|no hot|backing up|smell/i.test(`${need} ${outcome}`);
  const aiClose = booked
    ? `Perfect, you are on the schedule and I have texted ${first === 'there' ? 'you' : first} the confirmation. Anything else before I let you go?`
    : `Got it, I have all of that down and passed it to the team. Someone will follow up first thing. Anything else?`;
  return [
    { who: 'ai', text: `Thanks for calling ${business}, this is the front desk. How can I help?` },
    { who: 'caller', text: /^hi|^hey/i.test(need) ? need : `Hi, ${need.charAt(0).toLowerCase() + need.slice(1)}.` },
    {
      who: 'ai',
      text: emergency
        ? `I hear you, that is a priority. Let me get your address and the best number, and I will get someone moving right away.`
        : `Happy to help with that. Can I grab your name and the best number to reach you, and I will get you set up?`,
    },
    {
      who: 'caller',
      text: /unknown/i.test(caller)
        ? `Sure, let me give you my name and number. ${emergency ? 'How soon can someone get here?' : 'When could you come out?'}`
        : `Sure, it's ${caller}. ${emergency ? 'How soon can someone get here?' : 'When could you come out?'}`,
    },
    { who: 'ai', text: `${outcome}. ${aiClose}` },
    { who: 'caller', text: 'That works, thank you.' },
    { who: 'ai', text: `You are all set. Thanks for calling ${business}, we will see you soon.` },
  ];
}

export default function CallsTab() {
  const { config, preset, theme, TONE } = useOs();
  const jobWord = preset.jobWord;
  const business = config.business;

  const seedRows = useMemo<CallRow[]>(() => {
    const daytime = [
      { caller: 'Marcus D.', need: `Quote on a ${jobWord}, comparing two shops`, outcome: 'Quoted a range, booked a visit' },
      { caller: 'Priya S.', need: 'Question about your hours and area', outcome: 'Answered, added to the schedule' },
      { caller: 'The Alvarez Family', need: `Repeat customer, needs another ${jobWord}`, outcome: 'Booked, priority slot held' },
    ];
    const rows: CallRow[] = [];
    preset.overnightCalls.forEach((c, i) => {
      const h = hash(c.caller + c.need + i);
      rows.push({
        id: `n-${i}`,
        caller: c.caller,
        when: c.time,
        afterHours: true,
        need: c.need,
        outcome: c.outcome,
        durationSec: 45 + (h % 190),
        turns: buildTurns(business, c.caller, c.need, c.outcome, jobWord),
      });
    });
    daytime.forEach((c, i) => {
      const h = hash(c.caller + c.need + i);
      rows.push({
        id: `d-${i}`,
        caller: c.caller,
        when: ['9:14 AM', '11:48 AM', '3:22 PM'][i] ?? 'Today',
        afterHours: false,
        need: c.need,
        outcome: c.outcome,
        durationSec: 40 + (h % 150),
        turns: buildTurns(business, c.caller, c.need, c.outcome, jobWord),
      });
    });
    return rows;
  }, [business, jobWord, preset.overnightCalls]);

  const [rows, setRows] = useState<CallRow[]>(seedRows);
  // First call opens by default, so a prospect SEES a transcript immediately.
  const [open, setOpen] = useState<string | null>(seedRows[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  const total = rows.length;
  const afterHours = rows.filter((r) => r.afterHours).length;
  const booked = rows.filter((r) => outcomeTone(r.outcome) === 'won').length;
  const h = hash(business + 'calls');
  const avgSec = Math.round(rows.reduce((s, r) => s + r.durationSec, 0) / (rows.length || 1));

  const fmtDur = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

  const answerLive = () => {
    if (busy) return;
    setBusy(true);
    const pool = [
      { caller: 'Tyler B.', need: `After-hours ${jobWord}, wants a quote`, outcome: 'Details captured, callback set for the morning' },
      { caller: 'Dev Patel', need: `Emergency ${jobWord}, asked how soon you can come`, outcome: 'Priority slot held, you were texted' },
      { caller: 'Karen L.', need: `Pricing on a ${jobWord}`, outcome: 'Quoted a range, booked a visit' },
    ];
    const pick = pool[(h + rows.length) % pool.length];
    const id = `live-${rows.length}`;
    window.setTimeout(() => {
      const row: CallRow = {
        id,
        caller: pick.caller,
        when: 'Just now',
        afterHours: true,
        need: pick.need,
        outcome: pick.outcome,
        durationSec: 60 + ((h + rows.length) % 120),
        turns: buildTurns(business, pick.caller, pick.need, pick.outcome, jobWord),
      };
      setRows((r) => [row, ...r]);
      setOpen(id);
      setBusy(false);
    }, 650);
  };

  return (
    <div className="max-w-3xl">
      <SectionTitle title="Calls" sub={`Every call your AI receptionist answered, written down. Open any one for the full transcript. The lead is already filed in Customers.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Calls this week" value={String(total + 11 + (h % 24))} sub="every one answered" i={0} pulse />
        <StatCard label="After hours" value={String(afterHours + 4 + (h % 9))} sub="caught while you slept" i={1} />
        <StatCard label="Booked from calls" value={String(booked + 3 + (h % 6))} sub="straight onto the schedule" i={2} />
        <StatCard label="Avg call" value={fmtDur(avgSec)} sub="handled start to finish" i={3} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.dim }}>Recent calls</p>
        <button
          onClick={answerLive}
          disabled={busy}
          className="rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 transition-transform hover:-translate-y-0.5"
          style={{ background: theme.accent, color: theme.accentInk }}
        >
          {busy ? 'Answering…' : '＋ Answer a live call'}
        </button>
      </div>

      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const [toneText, toneBg] = TONE[outcomeTone(r.outcome)];
          const isOpen = open === r.id;
          return (
            <div
              key={r.id}
              className="rounded-2xl border overflow-hidden animate-[osLand_.45s_ease-out_both]"
              style={{ background: theme.panel, borderColor: isOpen ? theme.accent : theme.line, animationDelay: `${i * 40}ms` }}
            >
              <button onClick={() => setOpen(isOpen ? null : r.id)} className="w-full text-left p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0" style={{ background: theme.accentSoft, color: theme.accent }}>
                  {r.caller.replace(/^the\s+/i, '').charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13.5px] font-semibold" style={{ color: theme.text }}>{r.caller}</p>
                    <span className="text-[11px]" style={{ color: theme.dim }}>· {r.when}</span>
                    {r.afterHours && (
                      <span className="text-[9px] uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 border" style={{ color: theme.dim, borderColor: theme.line }}>
                        After hours
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug mt-0.5" style={{ color: theme.dim }}>{r.need}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-0.5" style={{ color: toneText, background: toneBg }}>
                    {outcomeTone(r.outcome) === 'won' ? 'Booked' : outcomeTone(r.outcome) === 'hot' ? 'Flagged' : 'Handled'}
                  </span>
                  <p className="text-[10px] font-mono mt-1" style={{ color: theme.dim }}>{fmtDur(r.durationSec)}</p>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: theme.line }}>
                  <p className="text-[9px] uppercase tracking-[0.22em] font-bold mt-3 mb-2.5" style={{ color: theme.accent }}>Transcript</p>
                  <div className="space-y-2">
                    {r.turns.map((t, ti) => (
                      <div key={ti} className={`max-w-[86%] ${t.who === 'caller' ? 'ml-auto' : ''}`}>
                        <p className="text-[9px] uppercase tracking-[0.14em] font-bold mb-0.5" style={{ color: t.who === 'ai' ? theme.accent : theme.dim, textAlign: t.who === 'caller' ? 'right' : 'left' }}>
                          {t.who === 'ai' ? 'AI receptionist' : r.caller}
                        </p>
                        <div
                          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed border"
                          style={t.who === 'ai' ? { background: theme.accentSoft, borderColor: theme.accent, color: theme.text } : { background: theme.panelSoft, borderColor: theme.line, color: theme.text }}
                        >
                          {t.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px]" style={{ color: theme.dim }}>Outcome:</span>
                    <span className="text-[12px] font-semibold" style={{ color: theme.text }}>{r.outcome}</span>
                    <span className="text-[11px] ml-auto" style={{ color: theme.dim }}>Filed to Customers · lead created</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[12px] mt-3" style={{ color: theme.dim }}>
        Sample calls. The day your receptionist goes live, this fills with your real calls, each transcribed, searchable, and filed as a lead automatically.
      </p>
    </div>
  );
}
