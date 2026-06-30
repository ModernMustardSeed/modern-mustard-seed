'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  PLAYBOOK_INTRO,
  LANES,
  JARGON_RULE,
  SAFETY_RULES,
  SEARCH_HOWTO,
  SEARCH_PHRASES,
  GROUP_TYPES,
  GROUP_FIND,
  GROUP_SPOT,
  THREE_PLACES,
  HELPFUL_COMMENTS,
  COMMENT_RHYTHM,
  CALL_OFFER_COMMENTS,
  FIRST_COMMENT,
  PROMO_POST,
  DM_SCRIPTS,
  COMMON_QUESTIONS,
  PHONE_SCRIPT,
  SOCIAL_STRATEGY,
  ROUTINE,
  ROUTINE_NOTE,
  JOB_ENDS,
  DO_LIST,
  DONT_LIST,
  personalize,
} from '@/data/outreach-playbook';

const NAV = [
  { id: 'build', label: 'What we build' },
  { id: 'safe', label: 'Stay safe' },
  { id: 'find', label: 'Find people' },
  { id: 'groups', label: 'Groups' },
  { id: 'comments', label: 'Comment scripts' },
  { id: 'dms', label: 'Posts & DMs' },
  { id: 'phone', label: 'Phone script' },
  { id: 'social', label: 'Social strategy' },
  { id: 'routine', label: 'Daily routine' },
];

export default function OutreachPlaybook({
  code,
  firstName,
  bookDisplay,
  bookHref,
}: {
  code: string;
  firstName: string;
  bookDisplay: string;
  bookHref: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const px = (t: string) => personalize(t, bookDisplay);

  return (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen">
      {/* ── Header + signature money-link bar ── */}
      <header className="border-b-2 border-[#161616] sticky top-0 z-40 bg-[#FBF6EA]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/partners/hq" className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] transition-colors">← Dashboard</Link>
            <span className="hidden sm:block h-4 w-px bg-[#161616]/20" />
            <h1 className="font-sans text-base sm:text-lg font-bold tracking-tight">The Outreach Playbook</h1>
          </div>
          <a
            href="/api/partners/playbook/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all"
          >
            Download PDF ↓
          </a>
        </div>
        {/* Signature: the money link, always one tap away */}
        <div className="bg-[#161616]">
          <div className="max-w-5xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold whitespace-nowrap">Your money link</span>
              <span className="font-mono text-[11px] sm:text-[12px] text-[#FBF6EA] truncate">{bookDisplay}</span>
            </div>
            <button
              onClick={() => copy('moneylink', bookDisplay)}
              className="px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-full hover:bg-[#FFD23F] hover:border-[#FFD23F] transition-all whitespace-nowrap"
            >
              {copied === 'moneylink' ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        {/* ── Hero ── */}
        <section className="halftone-bg -mx-6 px-6 pt-12 pb-10 border-b-2 border-[#161616]">
          <div className="max-w-3xl">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">{PLAYBOOK_INTRO.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">{PLAYBOOK_INTRO.title}</h2>
            <p className="mt-5 text-[#161616] font-body text-lg md:text-xl leading-relaxed font-medium">{PLAYBOOK_INTRO.lede}</p>
            <p className="mt-4 text-[#3A3733] font-body leading-relaxed">{PLAYBOOK_INTRO.body}</p>
            <p className="mt-5 inline-flex items-center gap-2 bg-[#F5B700] border-2 border-[#161616] rounded-full px-5 py-2 text-sm font-sans font-bold shadow-[3px_3px_0_0_#161616]">
              ↑ {PLAYBOOK_INTRO.moneyLine}
            </p>
          </div>
          {/* Jump nav */}
          <div className="mt-8 flex flex-wrap gap-2">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">{n.label}</a>
            ))}
          </div>
        </section>

        {/* ── What we build ── */}
        <Section id="build" eyebrow="Know the fit" title="What we build">
          <p className="text-[#3A3733] font-body mb-6 max-w-2xl">Four kinds of build, and builds are where you earn most. When someone describes one of these problems, that is your opening. Match your message to the lane.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {LANES.map((lane) => (
              <div key={lane.key} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-6">
                <h3 className="font-display text-2xl font-semibold mb-2">{lane.name}</h3>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-4">{lane.blurb}</p>
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-2">They sound like</span>
                <ul className="space-y-1">
                  {lane.soundLike.map((s) => (
                    <li key={s} className="text-[#161616]/75 font-body text-sm flex gap-2"><span className="text-[#F5B700]">●</span>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Callout>{JARGON_RULE}</Callout>
        </Section>

        {/* ── Stay safe ── */}
        <Section id="safe" eyebrow="First, stay safe" title="Five rules that protect your account">
          <p className="text-[#3A3733] font-body mb-6 max-w-2xl">Platforms ban accounts that look like spam. These five keep you out of trouble. They are not optional.</p>
          <div className="space-y-3">
            {SAFETY_RULES.map((r) => (
              <div key={r.n} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5 flex gap-4">
                <span className="font-display text-2xl font-bold text-[#F5B700] leading-none shrink-0 w-7">{r.n}</span>
                <div>
                  <h3 className="font-sans font-bold text-[#161616] mb-1">{r.title}</h3>
                  <p className="text-[#3A3733] font-body text-sm leading-relaxed">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Find people ── */}
        <Section id="find" eyebrow="How to find people" title="Search words to look for">
          <Callout>{SEARCH_HOWTO}</Callout>
          <div className="grid sm:grid-cols-2 gap-5 mt-5">
            {SEARCH_PHRASES.map((g) => (
              <div key={g.lane} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">{g.lane}</span>
                <div className="flex flex-wrap gap-2">
                  {g.phrases.map((p) => (
                    <span key={p} className="px-3 py-1 text-xs font-mono text-[#161616]/80 bg-[#FBF6EA] border border-[#161616]/20 rounded-md">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Groups ── */}
        <Section id="groups" eyebrow="Where to be" title="Best groups to join">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">Group types to target</span>
              <ul className="space-y-1.5">
                {GROUP_TYPES.map((t) => (
                  <li key={t} className="text-[#3A3733] font-body text-sm flex gap-2"><span className="text-[#F5B700] mt-0.5">●</span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-5">
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">How to find them</span>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{GROUP_FIND}</p>
              </div>
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">How to spot a good group</span>
                <ul className="space-y-1.5">
                  {GROUP_SPOT.map((t) => (
                    <li key={t} className="text-[#3A3733] font-body text-sm flex gap-2"><span className="text-[#F5B700] mt-0.5">●</span>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <h3 className="font-display text-2xl font-semibold mt-10 mb-4">The three places your words go</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {THREE_PLACES.map((p) => (
              <div key={p.tag} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                <span className="font-display text-2xl font-bold text-[#F5B700]">{p.tag}</span>
                <h4 className="font-sans font-bold mt-1 mb-1.5">{p.title}</h4>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Comment scripts ── */}
        <Section id="comments" eyebrow="Your default move" title="Scripts: helpful comments">
          <Callout>{COMMENT_RHYTHM}</Callout>
          <div className="mt-5 space-y-6">
            {HELPFUL_COMMENTS.map((group) => (
              <div key={group.lane}>
                <LaneTag>{group.lane}</LaneTag>
                <div className="space-y-3 mt-3">
                  {group.cards.map((card, i) => (
                    <ScriptRow
                      key={i}
                      ckey={`help-${group.lane}-${i}`}
                      label={card.context}
                      text={card.text}
                      copied={copied}
                      onCopy={copy}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-display text-2xl font-semibold mt-10 mb-2">Scripts: comments that offer a call</h3>
          <p className="text-[#3A3733] font-body text-sm mb-5 max-w-2xl">Answer the question first, then add one of these. Reword each time. Your booking link is already filled in.</p>
          <div className="space-y-6">
            {CALL_OFFER_COMMENTS.map((group) => (
              <div key={group.lane}>
                <LaneTag>{group.lane}</LaneTag>
                <div className="space-y-3 mt-3">
                  {group.cards.map((text, i) => (
                    <ScriptRow
                      key={i}
                      ckey={`offer-${group.lane}-${i}`}
                      text={px(text)}
                      copied={copied}
                      onCopy={copy}
                    />
                  ))}
                </div>
              </div>
            ))}
            <ScriptRow ckey="firstcomment" label="Your first comment (drop the link here)" text={px(FIRST_COMMENT)} copied={copied} onCopy={copy} highlight />
          </div>
        </Section>

        {/* ── Posts & DMs ── */}
        <Section id="dms" eyebrow="Cut, paste, reword" title="Posts & DMs">
          <ScriptRow ckey="promo" label="Promo post (only where allowed)" text={PROMO_POST} copied={copied} onCopy={copy} />
          <div className="space-y-3 mt-3">
            {DM_SCRIPTS.map((d, i) => (
              <ScriptRow key={i} ckey={`dm-${i}`} label={d.context} text={px(d.text)} copied={copied} onCopy={copy} />
            ))}
          </div>
          <h3 className="font-display text-2xl font-semibold mt-8 mb-4">When they ask the common questions</h3>
          <div className="space-y-3">
            {COMMON_QUESTIONS.map((c, i) => (
              <ScriptRow key={i} ckey={`q-${i}`} label={c.q} text={c.a} copied={copied} onCopy={copy} />
            ))}
          </div>
        </Section>

        {/* ── Phone script ── */}
        <Section id="phone" eyebrow="When it goes to a call" title="The phone script">
          <Callout>{PHONE_SCRIPT.intro}</Callout>
          <div className="mt-5 space-y-3">
            {PHONE_SCRIPT.steps.map((s, i) => (
              <div key={i} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold text-[#F5B700] leading-none">{i + 1}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold">{s.label}</span>
                  </div>
                  <button
                    onClick={() => copy(`phone-${i}`, px(s.script))}
                    className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all shrink-0"
                  >
                    {copied === `phone-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-body text-[15px] text-[#161616] leading-relaxed italic">"{px(s.script)}"</p>
                <p className="font-body text-xs text-[#161616]/55 mt-2.5">{px(s.note)}</p>
              </div>
            ))}
          </div>

          <h3 className="font-display text-2xl font-semibold mt-8 mb-4">Handling the four you'll hear most</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {PHONE_SCRIPT.objections.map((o, i) => (
              <div key={i} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <p className="font-sans font-bold text-[#161616] mb-1.5">{o.q}</p>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{o.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <ScriptRow ckey="voicemail" label="If you get their voicemail" text={PHONE_SCRIPT.voicemail} copied={copied} onCopy={copy} />
          </div>
        </Section>

        {/* ── Social strategy ── */}
        <Section id="social" eyebrow="Be everywhere, lightly" title="Your social strategy">
          <Callout>{SOCIAL_STRATEGY.intro}</Callout>
          <p className="mt-5 inline-flex items-start gap-2 bg-[#161616] text-[#FBF6EA] rounded-2xl px-5 py-3 text-sm font-body leading-relaxed shadow-[4px_4px_0_0_#F5B700]">
            <span className="text-[#F5B700] font-bold">★</span>{SOCIAL_STRATEGY.oneRule}
          </p>

          <div className="grid lg:grid-cols-2 gap-5 mt-7">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">Set up your profile</span>
              <ul className="space-y-2">
                {SOCIAL_STRATEGY.setup.map((s) => (
                  <li key={s} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">Where to show up</span>
              <div className="space-y-3">
                {SOCIAL_STRATEGY.channels.map((c) => (
                  <div key={c.name}>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.name}</p>
                    <p className="text-[#3A3733] font-body text-sm leading-relaxed">{c.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 className="font-display text-2xl font-semibold mt-8 mb-4">What to post: four pillars</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {SOCIAL_STRATEGY.pillars.map((p) => (
              <div key={p.name} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <p className="font-sans font-bold text-[#161616] mb-1">{p.name}</p>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mt-6">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">Posting cadence</span>
              <ul className="space-y-2">
                {SOCIAL_STRATEGY.cadence.map((c) => (
                  <li key={c} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{c}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-3">The DM funnel</span>
              <ol className="space-y-2">
                {SOCIAL_STRATEGY.dmFunnel.map((d, i) => (
                  <li key={d} className="text-[#3A3733] font-body text-sm flex gap-2.5 leading-relaxed"><span className="font-mono font-bold text-[#1E50C8]">{i + 1}</span>{d}</li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* ── Routine + do/don't + close ── */}
        <Section id="routine" eyebrow="Your day" title="The 45-minute routine">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROUTINE.map((r) => (
              <div key={r.title} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#FBF6EA] bg-[#2D6A4F] rounded-md px-2.5 py-1 mb-3">{r.time}</span>
                <h4 className="font-sans font-bold mb-1">{r.title}</h4>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{r.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-[#161616]/55 font-body text-sm mt-4">{ROUTINE_NOTE}</p>

          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
              <div className="bg-[#2D6A4F] px-5 py-2.5"><span className="text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-white">Do</span></div>
              <ul className="p-5 space-y-2">
                {DO_LIST.map((d) => (
                  <li key={d} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#2D6A4F] mt-0.5">✓</span>{d}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
              <div className="bg-[#9B3022] px-5 py-2.5"><span className="text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-white">Don't</span></div>
              <ul className="p-5 space-y-2">
                {DONT_LIST.map((d) => (
                  <li key={d} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#9B3022] mt-0.5">✕</span>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Close ── */}
        <section className="py-12">
          <div className="bg-[#161616] rounded-3xl p-8 md:p-12 text-center shadow-[8px_8px_0_0_#F5B700]">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold block mb-4">Your job ends at the booked call</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#FBF6EA] mb-4">{JOB_ENDS.title}</h2>
            <p className="text-[#FBF6EA]/70 font-body max-w-2xl mx-auto leading-relaxed mb-8">{JOB_ENDS.body}</p>
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-[#FBF6EA] border-2 border-[#F5B700] rounded-2xl p-3 pl-5">
              <span className="font-mono text-sm text-[#161616]">{bookDisplay}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => copy('close', bookDisplay)}
                  className="px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  {copied === 'close' ? 'Copied ✓' : 'Copy your link'}
                </button>
                <a
                  href={bookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all"
                >
                  Preview it
                </a>
              </div>
            </div>
            <p className="text-[#FBF6EA]/40 font-mono text-[11px] mt-6">Partner code {code} · earn on every build · open the door, Sarah closes</p>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── Small building blocks ── */

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-10 border-b-2 border-[#161616]/10 scroll-mt-28">
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">{eyebrow}</span>
      <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-6">{title}</h2>
      {children}
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FFF8E6] border-l-4 border-[#F5B700] rounded-r-xl px-5 py-4">
      <p className="text-[#3A3733] font-body text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function LaneTag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white bg-[#2D6A4F] rounded-md px-3 py-1">{children}</span>;
}

function ScriptRow({
  ckey,
  label,
  text,
  copied,
  onCopy,
  highlight,
}: {
  ckey: string;
  label?: string;
  text: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border-2 border-[#161616] p-5 ${highlight ? 'bg-[#FFF8E6] shadow-[4px_4px_0_0_#F5B700]' : 'bg-white shadow-[3px_3px_0_0_#161616]'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        {label ? <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold pt-0.5">{label}</span> : <span />}
        <button
          onClick={() => onCopy(ckey, text)}
          className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all shrink-0"
        >
          {copied === ckey ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="font-body text-[15px] text-[#161616] leading-relaxed">{text}</p>
    </div>
  );
}
