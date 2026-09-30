'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from '@/components/AttributionLink';
import { TRADES, TRADE_ORDER, domainFor, guessTrade, type TradeKey } from './liveTrades';
import s from './LiveBuildHero.module.css';

/**
 * The homepage hero as the product itself: "Your business, built while you
 * watch." The headline has a blank in it and the blank is a field. Type a
 * business name, pick what you do, and a website for that business assembles
 * beside the words: the name becomes the logo, the photo arrives, the booking
 * button, the services, and then Mr. Mustard, as its AI receptionist, answers
 * a customer and books the job. It ends on "That took six seconds. The real
 * one is yours." and carries the name into /inquire.
 *
 * Nobody has to do anything to see it: after a beat it types a sample
 * business itself. The name in the preview follows every keystroke; the build
 * replays when someone stops typing or picks a trade. One screen, no scroll
 * pinning. Reduced motion shows the finished site at once.
 */

const SAMPLE = 'Flathead Roofing';
const BUILD_MS = 6600;

export default function LiveBuildHero() {
  const [name, setName] = useState('');
  const [trade, setTrade] = useState<TradeKey>('roofing');
  const [build, setBuild] = useState(0);
  const [done, setDone] = useState(false);
  const [demo, setDemo] = useState(true);
  const [said, setSaid] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const touched = useRef(false);
  const doneTimer = useRef(0);

  const shown = name.trim() || 'Your Business';
  const t = TRADES[trade];

  // Size the field to its text so the comma sits right after the name, like a
  // sentence, and shrink the type when a long name would not fit the line.
  const fit = useCallback(() => {
    const el = input.current;
    const m = mirror.current;
    const line = el?.parentElement;
    if (!el || !m || !line) return;
    m.textContent = name || el.placeholder;
    const natural = m.getBoundingClientRect().width + 3;
    const room = line.getBoundingClientRect().width - 34;
    const scale = Math.min(1, Math.max(0.42, room / natural));
    line.style.setProperty('--fit', scale.toFixed(3));
    el.style.width = `${Math.ceil(natural * scale)}px`;
  }, [name]);
  useLayoutEffect(fit, [fit]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const rebuild = useCallback(() => {
    window.clearTimeout(doneTimer.current);
    setDone(false);
    setBuild((b) => b + 1);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    doneTimer.current = window.setTimeout(() => setDone(true), still ? 0 : BUILD_MS);
  }, []);

  // The sample types itself unless the visitor gets there first.
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { setName(SAMPLE); rebuild(); return; }
    let i = 0;
    let typer = 0;
    const start = window.setTimeout(() => {
      typer = window.setInterval(() => {
        if (touched.current) { window.clearInterval(typer); return; }
        i += 1;
        setName(SAMPLE.slice(0, i));
        if (i >= SAMPLE.length) { window.clearInterval(typer); rebuild(); }
      }, 85);
    }, 1100);
    return () => { window.clearTimeout(start); window.clearInterval(typer); window.clearTimeout(doneTimer.current); };
  }, [rebuild]);

  // Rebuild when someone stops typing.
  useEffect(() => {
    if (demo || !name.trim()) return;
    const id = window.setTimeout(() => {
      rebuild();
      setSaid(`Preview built for ${name.trim()}: a ${TRADES[trade].label.toLowerCase()} website with online booking and an AI receptionist.`);
    }, 900);
    return () => window.clearTimeout(id);
  }, [name, trade, demo, rebuild]);

  const takeOver = () => {
    if (!touched.current) {
      touched.current = true;
      setDemo(false);
      setName('');
    }
  };

  const onType = (v: string) => {
    takeOver();
    const next = v.slice(0, 40);
    setName(next);
    const g = guessTrade(next);
    if (g) setTrade(g);
  };

  const pick = (k: TradeKey) => {
    if (!touched.current) { touched.current = true; setDemo(false); }
    setTrade(k);
    if (name.trim()) rebuild();
    else input.current?.focus();
  };

  const real = name.trim();
  const href = real && !demo ? `/inquire?company=${encodeURIComponent(real)}` : '/inquire';

  return (
    <section className={s.hero} data-story="" data-done={done ? '1' : '0'} aria-labelledby="studio-heading">
      <div className={s.glow} aria-hidden="true" />
      <div className={s.words}>
        <p className={s.eyebrow}>Modern Mustard Seed <i>·</i> Websites and agentic systems</p>

        <div className={s.line}>
          <label htmlFor="live-name" className={s.srOnly}>Your business name</label>
          <input
            ref={input}
            id="live-name"
            name="live-name"
            className={s.field}
            type="text"
            value={name}
            placeholder="Your business"
            autoComplete="organization"
            spellCheck={false}
            onFocus={takeOver}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim()) rebuild(); } }}
          />
          <span className={s.comma} aria-hidden="true">,</span>
          <span ref={mirror} className={s.mirror} aria-hidden="true" />
        </div>
        <h1 id="studio-heading" className={s.title}><span className={s.srOnly}>Your business, </span>built while you <em>watch.</em></h1>

        <p className={s.lede}>We build websites and agentic systems that run your business. Type your business name and watch one build itself.</p>

        <div className={s.trades} role="group" aria-label="What does your business do?">
          {TRADE_ORDER.map((k) => (
            <button key={k} type="button" className={s.chip} aria-pressed={trade === k} onClick={() => pick(k)}>{TRADES[k].label}</button>
          ))}
        </div>

        <div className={s.after}>
          <p className={s.took}>That took six seconds. <b>The real one is yours.</b></p>
          <div className={s.actions}>
            <Link href={href} className={s.cta}>{real && !demo ? <>Build the real <b>{real}</b></> : 'Build the real one'} <span aria-hidden="true">↗</span></Link>
            <a href="#selected-work" className={s.quiet}>See our work</a>
          </div>
        </div>
        <p className={s.srOnly} aria-live="polite">{said}</p>
      </div>

      {/* The site being built. Decorative: the live region above says what it is. */}
      <div className={s.stage} aria-hidden="true">
        <div className={s.browser} key={build} data-built={build > 0 ? '1' : '0'}>
          <div className={s.bar}><i /><i /><i /><span className={s.url}>{domainFor(shown === 'Your Business' ? '' : shown)}</span><span className={s.tag}>Preview</span></div>
          <div className={s.site}>
            <nav className={`${s.nav} ${s.p1}`}><span className={s.mark}>{shown.charAt(0).toUpperCase()}</span><b className={s.brand}>{shown}</b><span className={s.links}><i>Services</i><i>Reviews</i><i>Book</i></span></nav>
            <div className={`${s.photo} ${s.p2}`}>
              <picture>
                <source type="image/avif" srcSet={`/art/live/${trade}-960.avif`} />
                <img src={`/art/live/${trade}-960.webp`} alt="" width={960} height={640} decoding="async" loading={build > 0 ? 'eager' : 'lazy'} />
              </picture>
              <div className={`${s.pitch} ${s.p3}`}>
                <b>{t.tagline}</b>
                <span className={`${s.book} ${s.p4}`}>{t.cta}</span>
              </div>
            </div>
            <div className={`${s.services} ${s.p5}`}>{t.services.map((x) => <span key={x}>{x}</span>)}</div>
            <div className={`${s.review} ${s.p6}`}><span className={s.stars}>★★★★★</span><span>“Fast, friendly and it just works.” <i>Sample review</i></span></div>
          </div>

          <div className={`${s.chat} ${s.p7}`}>
            <div className={s.chatHead}>
              <picture><source type="image/avif" srcSet="/images/editorial/mascot-160.avif" /><img src="/images/editorial/mascot-160.webp" alt="" width={34} height={34} /></picture>
              <span><b>{shown} front desk</b><small>AI receptionist · answers 24/7</small></span>
            </div>
            <p className={`${s.msg} ${s.them} ${s.m1}`}>{t.chat[0]}</p>
            <p className={`${s.msg} ${s.ai} ${s.m2}`}>{t.chat[1]}</p>
            <p className={`${s.msg} ${s.them} ${s.m3}`}>{t.chat[2]}</p>
            <p className={`${s.msg} ${s.ai} ${s.m4}`}>{t.chat[3]}</p>
          </div>
          <div className={`${s.toast} ${s.p8}`}>✓ {t.booked}</div>
        </div>
      </div>
    </section>
  );
}
