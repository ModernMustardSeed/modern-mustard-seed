import { preload } from 'react-dom';
import Link from '@/components/AttributionLink';
import { SAND_SCRIPT, type SandLine } from './sandScript';
import SandMotion from './SandMotion';
import s from './SandHero.module.css';

/**
 * The homepage hero, written in the sand (preview, 2026-09-29).
 *
 * Open the page: an empty Riviera shoreline, and an invisible finger writes
 * "Modern Mustard Seed" in the wet sand. Scroll: a wave rolls in and takes the
 * words, and as it slides back out the sea leaves the next line written behind
 * it. We build websites. And agentic systems. Then the light turns gold and the
 * last wave leaves "run your life."
 *
 * One message on the screen at a time. The writing is single-stroke script
 * laid flat on a perspective plane, so it sits in the sand, not on the glass.
 * This file renders everything on the server; SandMotion is the only client
 * code and it writes a handful of CSS variables. With reduced motion the
 * section is the first line, already written, and the copy.
 */

type Key = keyof typeof SAND_SCRIPT;

function Words({ k, line, className }: { k: Key; line: SandLine; className: string }) {
  return (
    <svg className={className} viewBox={line.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <g className={s.ink} filter="url(#sand-groove)">
        {line.strokes.map((st, i) => (
          <path key={i} d={st.d} pathLength={1} style={{ ['--a' as string]: st.a, ['--b' as string]: st.b }} />
        ))}
      </g>
      <circle className={s.tip} data-tip={k} r="5" cx="-50" cy="-50" />
    </svg>
  );
}

function Message({ k }: { k: Key }) {
  return (
    <div className={`${s.msg} ${s[k]}`} data-msg={k}>
      <Words k={k} line={SAND_SCRIPT[k].wide} className={s.wide} />
      <Words k={k} line={SAND_SCRIPT[k].narrow} className={s.narrow} />
    </div>
  );
}

export default function SandHero() {
  // The beach is the largest paint on the page; ask for it before the CSS is parsed.
  preload('/art/sand/day-1600.avif', { as: 'image', type: 'image/avif', fetchPriority: 'high', imageSrcSet: '/art/sand/day-960.avif 960w, /art/sand/day-1600.avif 1600w', imageSizes: '(max-width: 760px) 540px, max(100vw, 150svh)' });
  return (
    <section id="sand-story" className={s.story} data-story="" aria-labelledby="studio-heading">
      <h1 id="studio-heading" className={s.srOnly}>Modern Mustard Seed: we build websites and agentic systems that run your business, so you can run your life.</h1>
      <div className={s.stage}>
        <picture className={s.plate}>
          <source type="image/avif" srcSet="/art/sand/day-960.avif 960w, /art/sand/day-1600.avif 1600w" sizes="(max-width: 760px) 540px, max(100vw, 150svh)" />
          <img src="/art/sand/day-1600.webp" alt="Painting: an empty stretch of wet golden sand on the French Riviera, calm turquoise water, a white yacht on the horizon. Modern Mustard Seed is written in the sand by hand, and each wave leaves a new line." width={1600} height={1067} fetchPriority="high" decoding="async" />
        </picture>
        {/* The sunset is not seen until the end of the story; SandMotion fills in its source after the page has loaded. */}
        <picture className={s.dusk} aria-hidden="true">
          <source type="image/avif" data-srcset="/art/sand/dusk-960.avif 960w, /art/sand/dusk-1600.avif 1600w" sizes="(max-width: 760px) 540px, max(100vw, 150svh)" />
          <img data-src="/art/sand/dusk-1600.webp" alt="" width={1600} height={1067} decoding="async" />
        </picture>

        {/* The beach floor: writing and water share one perspective plane. */}
        <canvas className={s.touch} data-touch="" aria-hidden="true" />
        <div className={s.floor} aria-hidden="true">
          <div className={s.plane}>
            <div className={s.wet} />
            <Message k="mms" />
            <Message k="web" />
            <Message k="ai" />
            <Message k="life" />
            <div className={s.wave}>
              <div className={s.water} />
              <svg className={s.foam} viewBox="0 0 1200 60" preserveAspectRatio="none" focusable="false">
                <path d="M0 22 C60 34 110 10 170 24 S290 38 350 22 470 8 540 26 660 40 730 22 850 6 920 24 1040 38 1110 20 1180 12 1200 20 V0 H0Z" filter="url(#sand-lace)" />
              </svg>
            </div>
          </div>
        </div>


        <div className={s.copy}>
          <div className={`${s.cap} ${s.capIntro}`}>
            <p className={s.eyebrow}>Design &amp; agentic systems studio <i>·</i> Kalispell, Montana</p>
          </div>
          <div className={`${s.cap} ${s.capWeb}`}>
            <p className={s.eyebrow}>Chapter one</p>
            <p className={s.say}>Sites that load in a blink and get you found on Google and ChatGPT.</p>
          </div>
          <div className={`${s.cap} ${s.capAi}`}>
            <p className={s.eyebrow}>Chapter two</p>
            <p className={s.say}>Agents that answer the phone, book the job and follow up, day and night.</p>
          </div>
          <div className={`${s.cap} ${s.capLife}`}>
            <p className={s.eyebrow}>So you can</p>
          </div>
        </div>
        {/* The last buttons sit at the foot of the beach, below "run your life", never between the words. */}
        <div className={`${s.actions} ${s.lifeActions}`}>
          <Link href="/inquire" className={s.cta}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link>
          <Link href="/ai" className={s.quiet}>AI for your business</Link>
        </div>
        <p className={s.cue} aria-hidden="true"><span className={s.line} />Scroll<span className={s.hint}>or draw in the sand</span></p>
        <a href="#after-story" className={s.skip}>Skip the story <span aria-hidden="true">↓</span></a>

        <svg className={s.defs} aria-hidden="true" focusable="false">
          <defs>
            {/* Grain the edge of each stroke, then press it in: a shadow on the far wall of the groove and light on the near one. */}
            <filter id="sand-groove" x="-5%" y="-20%" width="110%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="3" result="rough" />
              <feOffset in="rough" dy="-1.6" result="up" />
              <feFlood floodColor="#fff4dc" floodOpacity=".75" />
              <feComposite in2="up" operator="in" result="lit" />
              <feOffset in="rough" dy="1.4" result="down" />
              <feFlood floodColor="#5b3d17" floodOpacity=".55" />
              <feComposite in2="down" operator="in" result="shade" />
              <feMerge><feMergeNode in="lit" /><feMergeNode in="shade" /><feMergeNode in="rough" /></feMerge>
            </filter>
            <filter id="sand-lace" x="0" y="-50%" width="100%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035 0.3" numOctaves="3" seed="3" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="22" />
            </filter>
          </defs>
        </svg>
      </div>
      <div id="after-story" className={s.after} tabIndex={-1} />
      <SandMotion />
    </section>
  );
}
