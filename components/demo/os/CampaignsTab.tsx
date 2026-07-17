'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CAMPAIGN_PLAYS } from '@/data/demo-os-campaigns';
import type { OsCampaignPlay, OsCampaignStep } from '@/data/demo-os-campaigns';
import type { OsAd } from '@/data/demo-os';
import { SectionTitle, StatCard, hash, interpolate, useCountUp, useOs } from './os-kit';

/**
 * CAMPAIGNS: the growth engine. A library of trade-flavored plays the owner
 * can launch; the build theater shows the OS doing the lifting (audience
 * pulled, messages drafted in their voice, schedule set), then the play runs
 * with live-ticking results. The Idea desk is a real AI call (capped, same
 * budget as the assistant). The Ad studio rides along at the bottom.
 */

type ActivePlay = {
  key: string;
  name: string;
  hook: string;
  steps: OsCampaignStep[];
  audience: number;
  days: number;
  sent: number;
  replies: number;
  booked: number;
  live: boolean;
};

const CHANNEL_ROTATION: OsCampaignStep['channel'][] = ['Text', 'Email', 'Ads'];

export default function CampaignsTab() {
  const { osId, config, preset, theme, say, fireBurst } = useOs();
  const h = hash(config.business);
  const fill = (s: string) => interpolate(s, config, preset.jobWord);

  /* One play is already mid-flight when they arrive, so the module opens alive. */
  const seeded = useMemo<ActivePlay>(() => {
    const play = CAMPAIGN_PLAYS[h % 2 === 0 ? 0 : 4];
    const audience = 160 + (h % 120);
    const sent = Math.round(audience * 0.62);
    const replies = Math.round(sent * 0.14);
    const booked = Math.max(2, Math.round(replies * 0.38));
    return { key: play.key, name: fill(play.name), hook: fill(play.hook), steps: play.steps, audience, days: play.days, sent, replies, booked, live: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h]);

  const [active, setActive] = useState<ActivePlay[]>([seeded]);

  /* Session-launched plays tick upward so the launch feels like ignition. */
  useEffect(() => {
    if (!active.some((a) => a.live)) return;
    const iv = window.setInterval(() => {
      setActive((as) =>
        as.map((a) => {
          if (!a.live || a.sent >= Math.round(a.audience * 0.4)) return a;
          const sent = Math.min(Math.round(a.audience * 0.4), a.sent + 3 + (a.sent % 4));
          const replies = Math.floor(sent * 0.13);
          const booked = Math.floor(replies * 0.4);
          return { ...a, sent, replies, booked };
        }),
      );
    }, 1500);
    return () => window.clearInterval(iv);
  }, [active]);

  const revenueOf = (a: ActivePlay) => a.booked * preset.avgTicket;
  const totals = active.reduce(
    (s, a) => ({ sent: s.sent + a.sent, booked: s.booked + a.booked, revenue: s.revenue + revenueOf(a) }),
    { sent: 0, booked: 0, revenue: 0 },
  );
  const revenueUp = useCountUp(totals.revenue);

  /* ----------------------------- build theater ----------------------------- */
  const [building, setBuilding] = useState<OsCampaignPlay | null>(null);
  const [armedSteps, setArmedSteps] = useState(0);
  const buildAudience = building ? 140 + ((h + hash(building.key)) % 160) : 0;
  const audienceUp = useCountUp(building ? buildAudience : 0, 1200);
  const buildTimers = useRef<number[]>([]);

  const openBuild = (play: OsCampaignPlay) => {
    buildTimers.current.forEach((t) => window.clearTimeout(t));
    setArmedSteps(0);
    setBuilding(play);
    buildTimers.current = play.steps.map((_, i) => window.setTimeout(() => setArmedSteps(i + 1), 700 + i * 850));
  };
  const closeBuild = () => {
    buildTimers.current.forEach((t) => window.clearTimeout(t));
    setBuilding(null);
  };
  const launch = (at: { x: number; y: number }) => {
    if (!building) return;
    const play = building;
    setActive((as) => [
      { key: `${play.key}-${as.length}`, name: fill(play.name), hook: fill(play.hook), steps: play.steps, audience: buildAudience, days: play.days, sent: 0, replies: 0, booked: 0, live: true },
      ...as,
    ]);
    closeBuild();
    fireBurst(at.x, at.y);
    say(`${fill(play.name)} is live. The OS takes it from here.`);
  };

  /* ------------------------------- idea desk ------------------------------- */
  const [goal, setGoal] = useState('');
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [idea, setIdea] = useState<OsCampaignPlay | null>(null);
  const askForIdea = async () => {
    if (ideaBusy) return;
    setIdeaBusy(true);
    try {
      const res = await fetch(`/api/demo-os/${osId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign', goal: goal.trim().slice(0, 200) }),
      });
      const j = (await res.json()) as { reply?: string; error?: string };
      const lines = (j.reply ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 5) {
        setIdea({
          key: `idea-${Date.now()}`,
          name: lines[0].slice(0, 60),
          hook: lines[1].slice(0, 140),
          audience: 'Picked by the OS from your customer list',
          steps: lines.slice(2, 5).map((title, i) => ({ title: title.replace(/^[-·\d.\s]+/, '').slice(0, 110), channel: CHANNEL_ROTATION[i] })),
          sampleMessage: '',
          projectedBookings: 5,
          days: 14,
        });
        say('Your OS pitched a play. Build it if you like it.');
      } else {
        say(j.error ?? 'The idea desk is busy. Try again.');
      }
    } catch {
      say('The idea desk is busy. Try again.');
    } finally {
      setIdeaBusy(false);
    }
  };

  /* -------------------------------- ad studio ------------------------------ */
  const [ads, setAds] = useState<OsAd[]>(() => preset.ads.map((a) => ({ headline: fill(a.headline), body: fill(a.body) })));
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

  const channelChip = (c: OsCampaignStep['channel']) => (
    <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 border" style={{ color: theme.accent, borderColor: theme.accent, background: theme.accentSoft }}>
      {c}
    </span>
  );

  const playCard = (play: OsCampaignPlay, i: number, pitched = false) => (
    <div
      key={play.key}
      className="rounded-2xl border p-4 flex flex-col animate-[osIn_.45s_ease-out_both]"
      style={{ background: theme.panel, borderColor: pitched ? theme.accent : theme.line, animationDelay: `${i * 70}ms` }}
    >
      {pitched && <p className="text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5" style={{ color: theme.accent }}>✦ Pitched by your OS</p>}
      <p className="text-[14.5px] font-bold" style={{ color: theme.text }}>{fill(play.name)}</p>
      <p className="text-[12px] leading-relaxed mt-1 flex-1" style={{ color: theme.dim }}>{fill(play.hook)}</p>
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {[...new Set(play.steps.map((s) => s.channel))].map((c) => (
          <span key={c}>{channelChip(c)}</span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t" style={{ borderColor: theme.line }}>
        <span className="text-[11px]" style={{ color: theme.dim }}>
          ~{play.projectedBookings} {preset.jobWord}s · ≈ ${(play.projectedBookings * preset.avgTicket).toLocaleString()}
        </span>
        <button
          onClick={() => openBuild(play)}
          className="rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5"
          style={{ background: theme.accent, color: theme.accentInk }}
        >
          Build it
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl">
      <SectionTitle
        title="Campaigns"
        sub="Pick a play, watch the OS build it, launch it. The lifting (lists, messages, timing, follow-through) is the software's job, not yours."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Plays running" value={String(active.length)} sub="working while you work" i={0} pulse />
        <StatCard label="Messages out" value={totals.sent.toLocaleString()} sub="texts + emails this month" i={1} />
        <StatCard label={`${preset.jobWord.charAt(0).toUpperCase() + preset.jobWord.slice(1)}s booked`} value={String(totals.booked)} sub="attributed to campaigns" i={2} />
        <StatCard label="Revenue attributed" value={`$${revenueUp.toLocaleString()}`} sub="booked by the plays below" i={3} />
      </div>

      {/* running */}
      <div className="space-y-3 mb-6">
        {active.map((a, i) => {
          const pct = Math.min(100, Math.round((a.sent / Math.max(1, a.audience)) * 100));
          return (
            <div key={a.key} className="rounded-2xl border-2 p-4 animate-[osIn_.45s_ease-out_both]" style={{ background: theme.panel, borderColor: a.live ? theme.accent : theme.line, animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: theme.accent }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: theme.accent }} />
                    </span>
                    <p className="text-[14.5px] font-bold" style={{ color: theme.text }}>{a.name}</p>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: theme.dim }}>{a.hook}</p>
                </div>
                <div className="flex gap-5 shrink-0 text-right">
                  {[
                    { l: 'Reached', v: a.sent.toLocaleString() },
                    { l: 'Replies', v: String(a.replies) },
                    { l: 'Booked', v: String(a.booked) },
                    { l: 'Revenue', v: `$${revenueOf(a).toLocaleString()}` },
                  ].map((c) => (
                    <div key={c.l}>
                      <p className="font-mono text-[15px] font-bold" style={{ color: theme.text }}>{c.v}</p>
                      <p className="text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: theme.dim }}>{c.l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: theme.panelSoft }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: theme.accent }} />
              </div>
              <p className="text-[10.5px] mt-1.5" style={{ color: theme.dim }}>
                {pct}% of {a.audience.toLocaleString()} reached · runs {a.days} days · every reply lands in Customers, tagged to this play
              </p>
            </div>
          );
        })}
      </div>

      {/* idea desk */}
      <div className="rounded-2xl border p-4 mb-6 animate-[osIn_.5s_ease-out_.2s_both]" style={{ background: theme.panelSoft, borderColor: theme.line }}>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>✦ Idea desk</p>
        <p className="text-[12.5px] mt-1" style={{ color: theme.dim }}>Tell the OS what you want more of. It pitches a play built for a {preset.label.toLowerCase()} business{config.city ? ` in ${config.city}` : ''}.</p>
        <div className="flex gap-2 mt-3">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void askForIdea()}
            placeholder={`More ${preset.jobWord}s in the slow weeks...`}
            className="flex-1 min-w-0 rounded-xl border px-3.5 py-2.5 text-[13px] outline-none"
            style={{ background: theme.panel, borderColor: theme.line, color: theme.text }}
          />
          <button
            onClick={() => void askForIdea()}
            disabled={ideaBusy}
            className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 shrink-0"
            style={{ background: theme.accent, color: theme.accentInk }}
          >
            {ideaBusy ? 'Thinking…' : 'Pitch me'}
          </button>
        </div>
        {idea && <div className="mt-3">{playCard(idea, 0, true)}</div>}
      </div>

      {/* library */}
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: theme.dim }}>The playbook</p>
      <div className="grid sm:grid-cols-2 gap-3">{CAMPAIGN_PLAYS.map((p, i) => playCard(p, i))}</div>

      {/* ad studio */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.dim }}>Ad studio</p>
          <button
            onClick={() => void newAd()}
            disabled={adBusy}
            className="ml-auto rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: theme.accent, color: theme.accentInk }}
          >
            {adBusy ? 'Writing…' : '✦ Write me a new angle'}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {ads.map((ad, i) => (
            <div key={`${ad.headline}-${i}`} className="rounded-2xl border overflow-hidden animate-[osIn_.4s_ease-out_both]" style={{ background: theme.panel, borderColor: theme.line }}>
              <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: theme.line }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: theme.accent, color: theme.accentInk }}>
                  {config.business.charAt(0)}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: theme.text }}>{config.business}</span>
                <span className="text-[10px] ml-auto" style={{ color: theme.dim }}>Sponsored</span>
              </div>
              <div className="p-4" style={{ background: theme.accentSoft }}>
                <p className="text-lg font-bold leading-snug" style={{ color: theme.text }}>{ad.headline}</p>
              </div>
              <div className="p-3">
                <p className="text-[13px] leading-relaxed" style={{ color: theme.dim }}>{ad.body}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] mt-2" style={{ color: theme.accent }}>Call now · {config.phone}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] mt-3" style={{ color: theme.dim }}>
          In the real build these post straight to your pages, and every lead lands in Customers tagged by the ad that brought it.
        </p>
      </div>

      {/* ───────────────────────── build theater ───────────────────────── */}
      {building && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" onClick={closeBuild}>
          <div className="absolute inset-0" style={{ background: 'rgba(4,6,12,0.72)' }} />
          <div
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border-2 overflow-hidden animate-[osPaper_.45s_cubic-bezier(.2,.85,.3,1.05)_both]"
            style={{ background: theme.ink, borderColor: theme.accent }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-5 border-b" style={{ borderColor: theme.line }}>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>Building your play</p>
              <p className="text-[17px] font-bold mt-1" style={{ color: theme.text }}>{fill(building.name)}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl border p-3.5 flex items-baseline gap-3" style={{ background: theme.panel, borderColor: theme.line }}>
                <span className="font-mono text-2xl font-bold" style={{ color: theme.accent }}>{audienceUp.toLocaleString()}</span>
                <span className="text-[12px]" style={{ color: theme.dim }}>{fill(building.audience)}, found and scrubbed against the do-not-text list</span>
              </div>
              <div className="space-y-2.5">
                {building.steps.map((s, i) => {
                  const armed = i < armedSteps;
                  return (
                    <div key={s.title} className="flex items-center gap-3 rounded-xl border p-3 transition-all duration-500" style={{ background: theme.panel, borderColor: armed ? theme.accent : theme.line, opacity: armed ? 1 : 0.45 }}>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors"
                        style={{ background: armed ? theme.accent : theme.panelSoft, color: armed ? theme.accentInk : theme.dim }}
                      >
                        {armed ? '✓' : i + 1}
                      </span>
                      <p className="text-[12.5px] leading-snug flex-1" style={{ color: theme.text }}>{fill(s.title)}</p>
                      {channelChip(s.channel)}
                    </div>
                  );
                })}
              </div>
              {building.sampleMessage && armedSteps >= building.steps.length && (
                <div className="animate-[osIn_.4s_ease-out_both]">
                  <p className="text-[9.5px] uppercase tracking-[0.2em] font-bold mb-1.5" style={{ color: theme.dim }}>First message, drafted in your voice</p>
                  <div className="max-w-sm rounded-2xl rounded-bl-md p-3.5 border" style={{ background: theme.panelSoft, borderColor: theme.line }}>
                    <p className="text-[13px] leading-relaxed" style={{ color: theme.text }}>{fill(building.sampleMessage)}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2.5 p-4 border-t" style={{ borderColor: theme.line }}>
              <button onClick={closeBuild} className="rounded-xl border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ borderColor: theme.line, color: theme.dim }}>
                Not now
              </button>
              <button
                onClick={(e) => launch({ x: e.clientX, y: e.clientY })}
                disabled={armedSteps < building.steps.length}
                className="ml-auto rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-50 transition-transform hover:-translate-y-0.5"
                style={{ background: theme.accent, color: theme.accentInk }}
              >
                {armedSteps < building.steps.length ? 'Assembling…' : '🚀 Launch it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
