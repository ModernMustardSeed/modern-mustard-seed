'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Niche } from '@/lib/outbound';
import { TRADE_PRESETS, TICKET_WORD } from '@/data/demo-os-trades';
import type { OsTradeKey } from '@/data/demo-os-trades';
import MakeItRealCTA from '@/components/demo/MakeItRealCTA';
import RecoveryMachine, { type RecoveryValues } from '@/components/RecoveryMachine';
import SuiteMoreForm from '@/components/demo/SuiteMoreForm';
import type { DemoProductKey } from '@/lib/demo-order';

/**
 * The Demo Suite hub, prospect-facing and unapologetically adorable: Mr.
 * Mustard bobbing with a typed speech bubble, his welcome video, three demo
 * doors, and the Recovery Calculator that turns missed calls into a monthly
 * dollar leak they can feel. Pop-art MMS system: cream, ink borders, gold.
 */

/** Legacy niche fallback for hubs rendered without a detected trade. */
const AVG_JOB: Record<Niche, { label: string; value: number }> = {
  restaurant: { label: 'average ticket', value: 65 },
  home_service: { label: 'average job', value: 450 },
  dental_medspa: { label: 'average visit', value: 320 },
  real_estate: { label: 'average commission', value: 7500 },
  other: { label: 'average sale', value: 250 },
};

/** Types the line out, and reports when it is finished so the caret can leave.
 *  A caret that keeps blinking after the sentence lands reads like a bug. */
function useTyped(text: string, speed = 28): { shown: string; typing: boolean } {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => window.clearInterval(t);
  }, [text, speed]);
  return { shown: text.slice(0, n), typing: n < text.length };
}

/**
 * The encore: their own agent calls THEM. Rides the existing public
 * /api/sidekick/forge phone path, which enforces one ring per run, one ring
 * per number, and the Vapi billing kill switch. User-initiated, consent on
 * the page, US numbers only.
 */
function EncoreRing({ runId, business }: { runId: string; business: string }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'calling' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const ring = async () => {
    if (state === 'calling' || state === 'done') return;
    setState('calling');
    try {
      const res = await fetch('/api/sidekick/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'phone', runId, phone }),
      });
      const j = (await res.json().catch(() => ({}))) as { from?: string; message?: string };
      if (res.ok) {
        setState('done');
        setMsg(`Ringing you right now${j.from ? ` from ${j.from}` : ''}. Answer it and say hello.`);
      } else {
        setState('error');
        setMsg(j.message || 'The call could not go out just now. The browser demo above still works.');
      }
    } catch {
      setState('error');
      setMsg('The call could not go out just now. The browser demo above still works.');
    }
  };
  return (
    <section className="animate-[hubIn_.5s_ease-out_both]">
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 sm:p-8 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">The encore</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">Have it call you. Right now.</h2>
        <p className="font-body text-[14px] text-[#161616]/65 mt-2 max-w-md mx-auto">
          Type your cell and the {business} front desk calls YOU. One demo call, US numbers, and it only dials because you asked it to.
        </p>
        {state === 'done' || state === 'error' ? (
          <p className={`font-body text-[15px] font-semibold mt-5 ${state === 'done' ? 'text-[#3f5d34]' : 'text-[#a03123]'}`}>{msg}</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mt-5 max-w-md mx-auto">
            <input
              type="tel"
              inputMode="tel"
              placeholder="(406) 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 font-body text-[16px] px-4 py-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] focus:outline-none focus:ring-2 focus:ring-[#F5B700] tabular-nums"
              aria-label="Your phone number"
            />
            <button
              onClick={() => void ring()}
              disabled={state === 'calling' || phone.replace(/\D/g, '').length < 10}
              className="font-sans font-bold uppercase tracking-[0.1em] text-[13px] rounded-xl border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-6 py-3 shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {state === 'calling' ? 'Dialing…' : '☎ Call me'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function DemoHub({
  hubId,
  business,
  ownerFirst,
  niche,
  trade,
  personalVideoUrl,
  suiteFilmUrl,
  suiteFilmPoster,
  suiteFilmStatus,
  voiceUrl,
  siteUrl,
  sitePending,
  integrationPlanUrl,
  planQuote,
  auditUrl,
  auditScore,
  auditHeadline,
  demoRunId,
  noticedLine,
  missedPreset,
  hasEmail,
  presenter,
}: {
  hubId: string;
  business: string;
  ownerFirst: string | null;
  niche: Niche;
  /** Specific detected trade; when present the calculator speaks it. */
  trade?: OsTradeKey;
  /** A face-to-camera video Sarah recorded for THIS lead. When present it
   *  stands in for the suite film (signed booth URL, .webm). It is a real,
   *  personal video about this business, never a stock/house reel. */
  personalVideoUrl?: string | null;
  /** THEIR film: a fresh recording of this lead's own website, a live call with
   *  their own voice agent, and their own command center. Outranks every other
   *  video here, because a tour of somebody else's business is what it replaced. */
  suiteFilmUrl?: string | null;
  suiteFilmPoster?: string | null;
  /** queued | filming | ready | failed | null. Never used to pick a stand-in
   *  video: no status maps to playing a house film. Only queued/filming earns
   *  the "within the hour" promise; failed/null get the same honest waiting
   *  card with no ETA (Sarah, 2026-08-11: a captioned wrong-business video is
   *  still a wrong-business video). */
  suiteFilmStatus?: 'queued' | 'filming' | 'ready' | 'failed' | null;
  voiceUrl: string | null;
  siteUrl: string | null;
  sitePending: string | null;
  /** Their finished AI Integration Plan (/demo/plan/<id>), when written. It
   *  joins the suite as a door: free value that fills a voice-only page. */
  integrationPlanUrl?: string | null;
  /** One sharp, factual sentence lifted from that plan, quoted on its door. */
  planQuote?: string | null;
  /** Their Presence Audit (/demo/audit/<id>): website, Google profile and
   *  reviews, each graded. It is the door that explains WHY the other four
   *  exist, so it sits first when it is present. */
  auditUrl?: string | null;
  auditScore?: number | null;
  /** The audit's own one-line verdict, quoted on the door. */
  auditHeadline?: string | null;
  /** The lead's forged voice run. Powers the encore: their agent calls THEM,
   *  through the existing /api/sidekick/forge phone path with all its caps. */
  demoRunId?: string | null;
  /** A factual line from the walk-in research ("closed both weekend days..."),
   *  already sanitized server-side. Shown above the calculator so the numbers
   *  start as theirs. */
  noticedLine?: string | null;
  /** Research-informed starting value for the missed-calls slider. */
  missedPreset?: number | null;
  /** Whether the lead row already carries an email (the ready announcement
   *  needs one; the request form only asks when we do not have it). */
  hasEmail?: boolean;
  /** Partner who minted this suite ("Presented by X with Modern Mustard Seed"). */
  presenter?: string | null;
}) {
  const suiteFilmPending = suiteFilmStatus === 'queued' || suiteFilmStatus === 'filming';
  const { shown: bubble, typing } = useTyped(`Hi${ownerFirst ? ` ${ownerFirst}` : ''}! We made ${business} some presents. Open them!`);

  // Presence beat: while the hub is open the dial floor sees "watching right
  // now". Bounded server-side (one stamp a minute), silent on any failure.
  useEffect(() => {
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const url = `/api/demo-hub/${hubId}/beat`;
      try {
        if (!navigator.sendBeacon(url)) void fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      } catch {
        void fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };
    beat();
    const t = window.setInterval(beat, 45_000);
    return () => window.clearInterval(t);
  }, [hubId]);

  /* ------------------------------ calculator ------------------------------ */
  // The machine itself is the shared pop-art RecoveryMachine; this component
  // only keeps its outputs to write the trade-specific reaction line.
  const tp = trade ? TRADE_PRESETS[trade] : null;
  const job = tp
    ? { label: `average ${TICKET_WORD[trade!] ?? tp.jobWord}`, value: tp.avgTicket }
    : (AVG_JOB[niche] ?? AVG_JOB.other);
  const [calc, setCalc] = useState<RecoveryValues>(() => {
    const missed = missedPreset ?? 7;
    return { missed, close: 45, ticket: job.value, leak: Math.round(missed * 4.33 * 0.45 * job.value) };
  });
  const leak = calc.leak;
  const caught = Math.round(leak * 0.75);
  // The trade line lands hardest: dollars restated as whole jobs lost.
  const lostJobs = tp && tp.avgTicket >= 400 ? Math.round(leak / tp.avgTicket) : 0;
  const jobNoun = tp ? (TICKET_WORD[trade!] ?? tp.jobWord) : '';
  const reaction =
    lostJobs >= 1
      ? `That is ${lostJobs} ${jobNoun}${lostJobs === 1 ? '' : 's'} a month handed to whoever picks up the phone.`
      : leak >= 8000
        ? "That's someone's salary walking out the door."
        : leak >= 3000
          ? "That's money you already earned, going to someone else."
          : leak >= 1000
            ? 'That would cover this whole suite many times over.'
            : 'Even this adds up to real money over a year.';

  /**
   * THE COMMAND CENTER HAS NO DOOR HERE AT ALL.
   *
   * There used to be a gate here, added earlier the same day, that drew the
   * door only when the voice agent and the website were both in the suite,
   * because that was the only case where it was free. Sarah then took it off
   * the suite and out of the offer entirely (2026-08-22): it is sold on its
   * own, built by hand, and never suggested next to anything.
   *
   * That supersedes the gate rather than tightening it, so the gate is gone
   * too. A lead forged before that decision can still carry an os_demo_url and
   * that page still resolves, so a link already emailed keeps working. It is
   * simply not part of a suite.
   */

  const doors = useMemo(
    () =>
      [
        // The audit leads. It is the only door that is about THEM rather than
        // about us, and a score with their own review count in it is what makes
        // the other four read as an answer instead of an offer.
        auditUrl && {
          href: auditUrl,
          icon: '📊',
          title: 'Your presence audit',
          desc:
            auditHeadline
              ? `${auditHeadline} Your website, your Google profile and your reviews, each scored, with every number showing where it came from.`
              : `Your website, your Google profile and your reviews, each scored out of 100, with every number showing where it came from.`,
          tone: 'gold' as const,
          cta: 'See the score',
          badge: typeof auditScore === 'number' ? `${auditScore}/100` : 'Free',
        },
        voiceUrl && {
          href: voiceUrl,
          icon: '🎙',
          title: 'Your voice agent',
          desc: `It already answers as ${business}. Call it, pretend you are a customer, try to stump it.`,
          tone: 'dark' as const,
          cta: 'Talk to it',
        },
        (siteUrl || sitePending) && {
          href: (siteUrl || sitePending)!,
          icon: '🌐',
          title: 'Your new website',
          desc: siteUrl
            ? 'A real, working draft designed for your business. The gold button is your voice agent riding along so you can try it, and it is its own add-on.'
            : 'Being forged right now. The page refreshes itself until it is ready.',
          tone: 'gold' as const,
          cta: siteUrl ? 'See it live' : 'Watch it forge',
        },
        integrationPlanUrl && {
          href: integrationPlanUrl,
          icon: '📋',
          title: 'Your AI Integration Plan',
          desc: planQuote
            ? `From your plan: "${planQuote}" The rest is a step-by-step path, yours to keep, free either way.`
            : `The step-by-step plan we wrote for ${business}: where the calls are leaking, what to do about it, and the order to do it in. Yours to keep, free either way.`,
          tone: 'ink' as const,
          cta: 'Read it',
          badge: 'Free',
        },
      ].filter(Boolean) as { href: string; icon: string; title: string; desc: string; tone: 'dark' | 'gold' | 'ink'; cta: string; badge?: string }[],
    [voiceUrl, siteUrl, sitePending, integrationPlanUrl, planQuote, auditUrl, auditScore, auditHeadline, business],
  );

  /**
   * ⚠️ ONE PIECE IS NOT A SUITE, AND CALLING IT ONE IS A BROKEN PROMISE.
   *
   * Sarah, 2026-08-18: "only give the demo for whatever they asked for... use
   * the normal demo suite for talking websites or both, but not for just one
   * thing forged."
   *
   * The forge stopped building unasked-for pieces on 2026-08-13, and the cards
   * and the order card below have been piece-aware ever since. This page never
   * caught up: it still greeted a caller who asked for one voice agent with
   * "The Acme Demo Suite" and "everything below", which reads as either a
   * mistake or a bait, and neither is what we sold on the phone.
   *
   * So the page names what was actually built. What they did NOT take moves to
   * one quiet line at the bottom, after the order card, where it is an offer
   * rather than clutter over the thing they asked for.
   */
  //
  // THE COMMAND CENTER IS NOT A SUITE PIECE ANY MORE (Sarah, 2026-08-22). It is
  // still sold and still built by hand, it is simply not forged, not shown here
  // and not suggested next to anything. A lead forged before that date can
  // still carry an os_demo_url and its page still resolves, so any link already
  // emailed keeps working; it just no longer appears as a door.
  //
  const forged = [
    voiceUrl ? 'voice' : null,
    siteUrl || sitePending ? 'site' : null,
  ].filter(Boolean) as ('voice' | 'site')[];
  const PIECE_NAME: Record<'voice' | 'site', string> = {
    voice: 'Voice Agent',
    site: 'Website',
  };
  const onlyOne = forged.length === 1;
  const missing = (['voice', 'site'] as const).filter((p) => !forged.includes(p));
  const forgeMissing = missing;

  /** The line about the one piece they did not take. */
  const restLine = (() => {
    if (!missing.length) return null;
    if (forged.includes('voice')) {
      return 'Want the website to match, built the same way, off the same brain? Taken together they become one thing, and it costs less than the two apart.';
    }
    if (forged.includes('site')) {
      return 'Want it to answer its own phone too? Taken together they become one thing, and it costs less than the two apart.';
    }
    return 'Want the voice agent that feeds this, or the website to match? We can forge either one.';
  })();

  const toneCls: Record<'dark' | 'gold' | 'ink', string> = {
    dark: 'bg-[#161616] text-[#FBF6EA]',
    gold: 'bg-[#F5B700] text-[#161616]',
    ink: 'bg-white text-[#161616]',
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <style>{`
        @keyframes hubBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes hubIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes hubRing{0%{box-shadow:0 0 0 0 rgba(245,183,0,.55)}70%{box-shadow:0 0 0 26px rgba(245,183,0,0)}100%{box-shadow:0 0 0 0 rgba(245,183,0,0)}}
        @keyframes hubEmber{0%,100%{text-shadow:0 0 0 rgba(245,183,0,0)}50%{text-shadow:0 0 26px rgba(245,183,0,.4)}}
        @media (prefers-reduced-motion: reduce){.hub-ring,.hub-ember{animation:none !important}}
      `}</style>

      {/* Hero */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">
            {presenter ? `Presented by ${presenter} with Modern Mustard Seed` : 'Modern Mustard Seed presents'}
          </span>
          <div className="flex items-end justify-center gap-4 mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mascot.png" alt="Mr. Mustard" width={110} height={110} className="animate-[hubBob_3.2s_ease-in-out_infinite]" />
            <div className="relative bg-white border-2 border-[#161616] rounded-2xl rounded-bl-none shadow-[4px_4px_0_0_#161616] px-4 py-3 mb-6 text-left max-w-[300px]">
              <p className="font-body text-[15px] leading-snug min-h-[42px]">
                {bubble}
                {typing && <span className="animate-pulse">▍</span>}
              </p>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-4 leading-tight">
            {onlyOne ? `The ${business} ${PIECE_NAME[forged[0]]}` : `The ${business} Demo Suite`}
          </h1>
          <p className="font-body text-[#161616]/70 mt-3 max-w-xl mx-auto">
            {presenter
              ? `${presenter} asked us to build this for you. `
              : 'Built from scratch around your business. '}
            {onlyOne
              ? 'You asked for one thing, so this is that one thing. Free, nothing to sign, nothing to cancel, and it is live and working rather than a mockup. Go play.'
              : 'Free, nothing to sign, nothing to cancel. Everything below is live and working, not a mockup. Go play.'}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* The video, in order of who it is actually about: THEIR suite film,
            then Sarah's personal hello if she recorded one for THIS lead.
            Nothing else ever plays here. No stock reel, no other client's
            footage, captioned or not (Sarah, 2026-08-01 and 2026-08-11: a
            captioned wrong-business video is still a wrong-business video).
            Sarah, 2026-08-20: and when no film exists or is being cut, the
            whole card disappears. A suite is not required to have a video, and
            an empty spinner promising one we never queued reads as a stall. */}
        {(suiteFilmUrl || personalVideoUrl || suiteFilmPending) && (
        <section className="animate-[hubIn_.5s_ease-out_both]">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] overflow-hidden">
            {suiteFilmUrl ? (
              <video
                controls
                preload="metadata"
                poster={suiteFilmPoster ?? undefined}
                className="w-full aspect-video bg-[#161616]"
                src={suiteFilmUrl}
              />
            ) : personalVideoUrl ? (
              <video
                controls
                preload="metadata"
                className="w-full aspect-video bg-[#161616]"
                src={personalVideoUrl}
              />
            ) : (
              <div className="w-full aspect-video bg-[#161616] flex items-center justify-center px-6 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#F5B700] border-t-transparent animate-spin" />
                  <p className="font-display text-2xl font-bold text-[#FBF6EA] mt-5">
                    We are recording your walkthrough
                  </p>
                  <p className="font-body text-[14px] text-[#FBF6EA]/65 mt-2 max-w-sm mx-auto">
                    {suiteFilmPending
                      ? 'A short film of your own site, a real call with your own agent, and your command center. We are working on it and will have it to you within the hour. Everything below is open now.'
                      : 'A short film of your own site, a real call with your own agent, and your command center. It is not cut yet, so nothing plays here until it is. Everything below is open now, and reaching out gets it made today.'}
                  </p>
                </div>
              </div>
            )}
            <p className="font-body text-[13px] text-[#161616]/60 px-4 py-3">
              {suiteFilmUrl
                ? `A walkthrough of what we built for ${business}, including a real call with your own agent.`
                : personalVideoUrl
                  ? `A personal hello from Sarah, recorded just for ${business}.`
                  : suiteFilmPending
                    ? `Being cut for ${business} right now.`
                    : `Your own walkthrough is not cut yet.`}
            </p>
          </div>
        </section>
        )}

        {/* The doors. One door is not a grid, it is the whole show: a lonely
            card in a three-column layout reads as "something is missing" when
            what it should read is "this is the thing" (Sarah, 2026-08-20). */}
        {doors.length === 1 ? (
          <section className="animate-[hubIn_.5s_ease-out_both]">
            <a
              href={doors[0].href}
              className={`${toneCls[doors[0].tone]} block border-2 border-[#161616] rounded-3xl shadow-[8px_8px_0_0_#F5B700] p-8 sm:p-10 text-center transition-transform hover:-translate-y-1.5`}
            >
              <span className="hub-ring inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#F5B700] text-5xl border-2 border-[#161616] animate-[hubRing_2.4s_ease-out_infinite]" aria-hidden>
                {doors[0].icon}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mt-6 leading-tight">{doors[0].title}</h2>
              <p className={`font-body text-[16px] leading-relaxed mt-3 max-w-md mx-auto ${doors[0].tone === 'dark' ? 'text-[#FBF6EA]/80' : 'text-[#161616]/70'}`}>
                {doors[0].desc}
              </p>
              <span className="mt-7 inline-flex items-center gap-2 font-sans font-bold uppercase tracking-[0.12em] text-[15px] rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-3.5 shadow-[4px_4px_0_0_#161616]">
                {doors[0].cta} →
              </span>
            </a>
          </section>
        ) : (
        <section>
          <h2 className="font-display text-2xl font-bold mb-1">Your {doors.length} demos</h2>
          <div className="mb-3" />
          <div className={`grid sm:grid-cols-2 ${doors.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
            {doors.map((d, i) => (
              <a
                key={d.title}
                href={d.href}
                className={`${toneCls[d.tone]} relative border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 flex flex-col transition-transform hover:-translate-y-1.5 hover:rotate-[-0.5deg] animate-[hubIn_.5s_ease-out_both]`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {d.badge && (
                  <span className="absolute -top-3 -right-2 z-10 rotate-3 bg-[#E0301E] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] shadow-[3px_3px_0_0_#161616]">
                    {d.badge}
                  </span>
                )}
                <span className="text-3xl">{d.icon}</span>
                <h3 className="font-display text-xl font-bold mt-3 leading-tight">{d.title}</h3>
                <p className={`font-body text-[13px] leading-relaxed mt-2 flex-1 ${d.tone === 'dark' ? 'text-[#FBF6EA]/75' : 'text-[#161616]/70'}`}>{d.desc}</p>
                <span className={`mt-4 inline-flex self-start items-center gap-1.5 font-sans font-bold uppercase tracking-[0.1em] text-[12px] rounded-full border-2 px-3.5 py-1.5 ${d.tone === 'gold' ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-[#F5B700] text-[#161616] border-[#161616]'}`}>
                  {d.cta} →
                </span>
              </a>
            ))}
          </div>
        </section>
        )}

        {/* The encore: strongest moment in the suite, one tap after the doors. */}
        {demoRunId && voiceUrl && <EncoreRing runId={demoRunId} business={business} />}

        {/* Recovery Calculator: the shared pop-art desk machine, hub sized
            (Sarah, 2026-08-20: same calc as the landing page, a little smaller,
            "it's so much cuter"). */}
        <section className="animate-[hubIn_.5s_ease-out_both]">
          <div className="text-center mb-5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold">The Recovery Calculator</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">What are missed calls costing {business}?</h2>
            <p className="font-body text-[14px] text-[#161616]/60 mt-1">Punch in your week. Estimates, but honest ones.</p>
          </div>
          <RecoveryMachine
            missedPreset={missedPreset}
            ticketPreset={job.value}
            ticketLabel={`Your ${job.label}`}
            noticedLine={noticedLine}
            onChange={setCalc}
          />
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border-2 border-[#161616] bg-[#161616] p-4 text-center">
            <p className="font-body text-[14px] text-[#FBF6EA]/80">
              If this suite caught even three quarters of those calls, that is about{' '}
              <strong className="text-[#F5B700]">${caught.toLocaleString()} a month</strong> back in the till, roughly{' '}
              <strong className="text-[#F5B700]">${(caught * 12).toLocaleString()} a year</strong>.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/mascot.png" alt="" width={40} height={40} />
              <p className="font-body text-[13px] italic text-[#FBF6EA]/80 bg-white/5 border border-[#FBF6EA]/15 rounded-xl px-3 py-2">{reaction}</p>
            </div>
          </div>
        </section>

        {/* What saying yes actually looks like: three beats, zero ambiguity. */}
        <section className="animate-[hubIn_.5s_ease-out_both]">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: 'Today', t: 'You say yes', d: 'One click below. No contract to print, nothing to install, nothing to learn.' },
              { n: 'Tomorrow', t: 'It answers your phone', d: 'Your agent goes live on your line and starts catching the calls you miss.' },
              { n: 'Friday', t: 'You read the receipts', d: 'Every call transcribed, every booking listed. You see exactly what it caught.' },
            ].map((s, i) => (
              <div key={s.n} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 animate-[hubIn_.5s_ease-out_both]" style={{ animationDelay: `${i * 110}ms` }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#E0301E]">{s.n}</span>
                <h3 className="font-display text-lg font-bold mt-1 leading-tight">{s.t}</h3>
                <p className="font-body text-[13px] text-[#161616]/65 mt-1.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Order it right here */}
        <MakeItRealCTA
          hubId={hubId}
          business={business}
          forged={[
            voiceUrl ? ('voice' as DemoProductKey) : null,
            siteUrl || sitePending ? ('site' as DemoProductKey) : null,
          ].filter(Boolean) as DemoProductKey[]}
        />

        {/*
          THE REST, AFTER THE ORDER CARD AND NOWHERE ELSE.

          One quiet offer for the pieces they did not ask for, placed below the
          thing they did ask for and below the button that takes the money.
          Above it, it would be clutter on top of the demo they came to see.
          Here it reads as "there is more if you want it", which is the truth.

          The ask WAS a phone call; Sarah 2026-08-20 flipped it: the missing
          pieces get forged from this page on the spot (SuiteMoreForm hits
          /api/demo-hub/<hubId>/request-build), the suite updates itself when
          the build lands, and the suite-ready announcement emails them. The
          phone survives as the small human fallback under the button.
        */}
        {restLine && (
          <section className="animate-[hubIn_.5s_ease-out_both]">
            <div className="rounded-2xl border-2 border-dashed border-[#161616]/30 bg-white/60 p-6 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">
                {onlyOne ? 'Want more than the one thing?' : 'One piece still missing'}
              </p>
              <p className="font-body mt-3 text-[15.5px] leading-relaxed text-[#161616]/80 max-w-xl mx-auto">{restLine}</p>
              {forgeMissing.length ? (
                <SuiteMoreForm hubId={hubId} missing={forgeMissing} hasEmail={hasEmail ?? false} />
              ) : (
                <a
                  href="tel:+14063121223"
                  className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-5 py-3 font-display text-[17px] font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616]"
                >
                  <span aria-hidden="true">📞</span>
                  Call Mr. Mustard and say the word
                </a>
              )}
            </div>
          </section>
        )}

        <section className="text-center pb-6">
          <p className="font-mono text-[11px] text-[#161616]/40">
            Demos built with care by Modern Mustard Seed · Kalispell, MT · Yes, an AI answers our phone too. Try it.
          </p>
        </section>
      </main>
    </div>
  );
}
