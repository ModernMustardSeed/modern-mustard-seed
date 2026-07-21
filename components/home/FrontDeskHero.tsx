'use client';

/**
 * THE FRONT DESK. The homepage signature moment: the pop-art logo lockup
 * (wordmark + waving mascot) front and center over a living halftone dot
 * field that breathes with the cursor, plus a front-desk terminal that
 * scopes the visitor's idea on the spot (cached intent pool, zero API)
 * and routes it: build it for me (book a call) or teach me (MUSTARD MODE).
 * An email gate on the personal follow-up keeps lead capture in the hero.
 *
 * Device tiers: full canvas on desktop, calmer field on small screens,
 * static halftone + instant terminal under prefers-reduced-motion.
 * The lockup is a plain responsive <Image>, so it renders identically on
 * every device (the old canvas face morph broke on touch screens).
 */

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { routeBuild, ideaPhrase } from '@/data/front-desk';

type Phase = 'attract' | 'terminal';
type PlayState = 'idle' | 'typing' | 'scoped' | 'routed' | 'sending' | 'sent';

type Dot = {
  hx: number; hy: number;   // home (grid)
  x: number; y: number;     // current
  vx: number; vy: number;
  r: number;
};

export default function FrontDeskHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('attract');
  const [reduced, setReduced] = useState(false);

  const [play, setPlay] = useState<PlayState>('idle');
  const [idea, setIdea] = useState('');
  const [headlineThing, setHeadlineThing] = useState<string | null>(null);
  const [intentCta, setIntentCta] = useState<{ label: string; href: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [sentText, setSentText] = useState('');

  // ── Motion preference + phase choreography ──────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) {
      setPhase('terminal');
      return;
    }
    // On phones the terminal starts below the fold, so the attract pause
    // just delays the page's main interaction. Cut it to a beat.
    const small = window.matchMedia('(max-width: 767px)').matches;
    const t = setTimeout(() => setPhase('terminal'), small ? 600 : 1600);
    return () => clearTimeout(t);
  }, []);

  // Bridge React phase into the canvas loop without re-subscribing RAF.
  const syncRef = useRef<(p: Phase) => void>(() => {});
  useEffect(() => {
    syncRef.current(phase);
  }, [phase]);

  // ── The dot field (same engine as /mustard-mode) ────────────────────
  useEffect(() => {
    if (reduced) return;
    // The field is a cursor instrument; on touch it is ambient-only and the
    // static halftone underneath carries the texture. Skip the RAF loop and
    // save the battery.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const mouse = { x: -9999, y: -9999 };
    let phaseLocal: Phase = 'attract';

    syncRef.current = (p: Phase) => {
      phaseLocal = p;
    };

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const small = w < 768;
      const spacing = small ? 26 : 18;
      dots = [];
      for (let gx = spacing / 2; gx < w; gx += spacing) {
        for (let gy = spacing / 2; gy < h; gy += spacing) {
          dots.push({
            hx: gx, hy: gy, x: gx, y: gy,
            vx: 0, vy: 0, r: small ? 1.5 : 1.8,
          });
        }
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const inTerminal = phaseLocal === 'terminal';

      for (const d of dots) {
        // breathe around home, react to cursor
        const wob = inTerminal ? 1.2 : 2.6;
        const t = now * 0.001;
        const bx = d.hx + Math.sin(t * 1.4 + d.hy * 0.05) * wob;
        const by = d.hy + Math.cos(t * 1.2 + d.hx * 0.05) * wob;
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const R = 90;
        if (dist2 < R * R && dist2 > 0.01) {
          const dist = Math.sqrt(dist2);
          const push = ((R - dist) / R) * 6;
          d.vx += (dx / dist) * push;
          d.vy += (dy / dist) * push;
        }
        d.vx *= 0.85;
        d.vy *= 0.85;
        d.x += (bx - d.x) * 0.06 + d.vx;
        d.y += (by - d.y) * 0.06 + d.vy;

        ctx.globalAlpha = inTerminal ? 0.3 : 0.55;
        ctx.fillStyle = '#F5B700';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    // Pause the loop entirely while the hero is scrolled out of view.
    let running = true;
    const vis = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      if (on && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!on && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    vis.observe(wrap);

    build();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', build);
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);
    return () => {
      running = false;
      vis.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // ── Type-on effect helper ───────────────────────────────────────────
  const typeOn = useCallback((full: string, setter: (s: string) => void, done?: () => void) => {
    let i = 0;
    const tick = () => {
      i += 1 + Math.floor(Math.random() * 2);
      setter(full.slice(0, i));
      if (i < full.length) {
        setTimeout(tick, 14);
      } else {
        setter(full);
        done?.();
      }
    };
    tick();
  }, []);

  // ── Front desk flow ─────────────────────────────────────────────────
  const submitIdea = useCallback(() => {
    const a = idea.trim();
    if (a.length < 3 || play !== 'idle') return;
    const intent = routeBuild(a);
    const thing = ideaPhrase(a);
    setPlay('typing');
    setHeadlineThing(intent.headline.replace('{thing}', thing));
    setIntentCta(intent.cta ?? null);
    track('front_desk_played', { intent: intent.key });
    setTimeout(() => {
      setPlay('scoped');
      typeOn(intent.reply, setReplyText, () => setPlay('routed'));
    }, 350);
  }, [idea, play, typeOn]);

  const submitEmail = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailErr('A real email unlocks the scope.');
      return;
    }
    setEmailErr(null);
    setPlay('sending');
    track('front_desk_email');
    try {
      const res = await fetch('/api/front-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), email: e }),
      });
      if (!res.ok) throw new Error('failed');
      typeOn(
        'Locked in. I read every idea myself and get back to you fast, usually the same day, with a personal scope. And the moment we are working together, Mr. Mustard is on call for you 24/7. Talk soon.',
        setSentText,
        () => setPlay('sent')
      );
    } catch {
      typeOn(
        'The desk hiccuped, but your idea is safe. Book a free call below and Sarah will pick it up from there.',
        setSentText,
        () => setPlay('sent')
      );
    }
  }, [email, idea, typeOn]);

  const buildHref = idea.trim()
    ? `/book?idea=${encodeURIComponent(idea.trim().slice(0, 300))}`
    : '/book';

  return (
    <section
      ref={wrapRef}
      className="relative overflow-hidden bg-[#FBF6EA] border-b-4 border-[#161616]"
      aria-label="Modern Mustard Seed. You bring the seed, we build the tree."
    >
      {/* Static halftone under everything (the only layer when reduced motion) */}
      <div className="absolute inset-0 halftone-bg opacity-60" aria-hidden />
      {!reduced && <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />}

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 min-h-[92vh] flex flex-col justify-center lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-12">
        <div>
        {/* Logo lockup with mascot: mobile, centered above the headline */}
        <div className="lg:hidden relative w-[170px] sm:w-[240px] mx-auto mb-7">
          <div
            aria-hidden="true"
            className="absolute -inset-10 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(245,183,0,0.38) 0%, rgba(245,183,0,0.14) 45%, transparent 68%)',
            }}
          />
          <Image
            src="/brand/logo-lockup.png"
            alt="Modern Mustard Seed"
            width={1000}
            height={1093}
            priority
            className="relative w-full h-auto drop-shadow-[5px_5px_0_rgba(22,22,22,0.14)]"
          />
        </div>

        {/* Now booking pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#161616] bg-white self-start">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E0301E] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E0301E]" />
          </span>
          <span className="text-[10px] tracking-[0.25em] uppercase font-mono font-bold text-[#161616]">
            Now booking new builds
          </span>
        </div>

        {/* One size for both states: the old font-size swap reflowed the whole
            column the moment a visitor pressed Enter. */}
        <h1
          className="font-display italic font-extrabold text-[#161616] leading-[0.98] tracking-tight mt-6 max-w-4xl text-4xl sm:text-5xl md:text-6xl xl:text-7xl"
          aria-live="polite"
        >
          {headlineThing ? (
            <span>{headlineThing}</span>
          ) : (
            <span>
              You bring the seed.
              <br />
              We build the{' '}
              <span
                className="not-italic font-mono text-[#F5B700]"
                style={{ textShadow: '3px 3px 0 #161616, -1px -1px 0 #161616, 1px -1px 0 #161616, -1px 1px 0 #161616' }}
              >
                tree
              </span>
              .
            </span>
          )}
        </h1>

        <p className="font-sans text-base md:text-lg text-[#161616]/80 max-w-2xl mt-6">
          Websites, voice agents, command centers, and custom apps for founders, operators, and
          small business owners. Live in as little as a week. You own it all.
        </p>

        {/* The front desk terminal */}
        <div
          className={`mt-10 max-w-2xl transition-all duration-700 ${
            phase === 'terminal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] overflow-hidden">
            <div className="flex items-center gap-2 bg-[#0F1422] px-4 py-2.5 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E0301E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3fbf6b]" />
              <span className="font-mono text-[10px] text-[#5C7188] ml-2">mr-mustard — front desk</span>
            </div>
            <div className="p-5 font-mono text-[13px] md:text-sm leading-relaxed text-[#d7dbe6]">
              <div>
                <span className="text-[#5C7188]">$ </span>
                <span className="text-[#FFDD55]">[MODERN MUSTARD SEED]</span>
                <span className="text-[#5C7188]"> // the front desk is open</span>
              </div>
              <div className="mt-1 text-[#7aa2ff]">PLANT YOUR IDEA. Mr. Mustard scopes it on the spot.</div>

              {play === 'idle' || play === 'typing' ? (
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(e) => { e.preventDefault(); submitIdea(); }}
                >
                  <span className="text-[#5C7188]">&gt;</span>
                  <input
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="a booking app for my dog grooming shop"
                    maxLength={300}
                    aria-label="What do you want built?"
                    className="flex-1 bg-transparent outline-none text-base sm:text-sm text-white placeholder:text-[#5C7188]/70 caret-[#F5B700]"
                  />
                  <button
                    type="submit"
                    disabled={idea.trim().length < 3 || play === 'typing'}
                    className="min-h-[44px] font-mono font-bold text-[11px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-3 py-1.5 disabled:opacity-40 hover:translate-y-[1px] transition-transform"
                  >
                    Enter
                  </button>
                </form>
              ) : (
                <div className="mt-3">
                  <span className="text-[#5C7188]">&gt; </span>
                  <span className="text-white">{idea}</span>
                </div>
              )}

              {replyText && (
                <div className="mt-4">
                  <span className="text-[#FFDD55] font-bold">MR.MUSTARD: </span>
                  <span className="whitespace-pre-wrap">{replyText}</span>
                  {play === 'scoped' && <span className="inline-block w-2 h-4 bg-[#F5B700] align-[-2px] animate-pulse ml-0.5" />}
                </div>
              )}

              {(play === 'routed' || play === 'sending' || play === 'sent') && (
                <div className="mt-4">
                  {play === 'routed' && (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        {intentCta && (
                          <Link
                            href={intentCta.href}
                            onClick={() => track('front_desk_route', { route: 'tool' })}
                            className="min-h-[44px] inline-flex items-center font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#F5B700] px-5 py-2.5 text-sm hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#F5B700] transition-all"
                          >
                            {intentCta.label} →
                          </Link>
                        )}
                        <Link
                          href={buildHref}
                          onClick={() => track('front_desk_route', { route: 'build' })}
                          className={`min-h-[44px] inline-flex items-center font-sans font-bold border-2 px-5 py-2.5 text-sm transition-all ${
                            intentCta
                              ? 'bg-transparent text-white border-white/40 hover:border-[#FFDD55] hover:text-[#FFDD55]'
                              : 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[4px_4px_0_0_#F5B700] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#F5B700]'
                          }`}
                        >
                          Build it for me →
                        </Link>
                        <Link
                          href="/mustard-mode"
                          onClick={() => track('front_desk_route', { route: 'learn' })}
                          className="min-h-[44px] inline-flex items-center font-mono font-bold text-[11px] uppercase tracking-wider text-[#FFDD55] underline underline-offset-4 hover:text-white transition-colors"
                        >
                          Teach me instead
                        </Link>
                      </div>
                      <form
                        className="mt-4 border border-white/15 bg-white/5 p-3"
                        onSubmit={(e) => { e.preventDefault(); void submitEmail(); }}
                      >
                        <p className="text-[#d7dbe6]/80 text-[12px]">
                          Or leave your email and Sarah sends a personal scope for this exact idea. No spam, no drip sequence.
                        </p>
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@yourbusiness.com"
                            aria-label="Email for your personal scope"
                            className="flex-1 bg-[#080C16] border border-white/20 px-3 py-2.5 outline-none text-base sm:text-sm text-white placeholder:text-[#5C7188]/70 focus:border-[#F5B700]"
                          />
                          <button
                            type="submit"
                            className="min-h-[44px] w-full sm:w-auto whitespace-nowrap font-mono font-bold text-[11px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-4 py-2"
                          >
                            Send my scope
                          </button>
                        </div>
                        {emailErr && <p className="text-[#ff6b5e] text-[11px] mt-1">{emailErr}</p>}
                      </form>
                    </>
                  )}
                  {(play === 'sending' || play === 'sent') && (
                    <div>
                      <span className="text-[#FFDD55] font-bold">MR.MUSTARD: </span>
                      <span className="whitespace-pre-wrap">{sentText}</span>
                      {play === 'sending' && <span className="inline-block w-2 h-4 bg-[#F5B700] align-[-2px] animate-pulse ml-0.5" />}
                      {play === 'sent' && (
                        <div className="mt-3">
                          <Link
                            href={buildHref}
                            className="font-mono text-[11px] font-bold text-[#FFDD55] underline underline-offset-4"
                          >
                            Skip the wait: book a free call now →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Proof strip: the trust line, legible instead of 10px at 50%. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {['40+ products shipped', 'Fixed quote before work starts', 'You own the code'].map((chip) => (
              <span
                key={chip}
                className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full px-3 py-1.5 shadow-[2px_2px_0_0_#161616]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* CTAs. Once the terminal has routed, it carries its own next steps,
            so on phones this duplicate pair steps aside. */}
        <div className={`mt-8 flex-col sm:flex-row gap-3.5 ${play === 'idle' || play === 'typing' ? 'flex' : 'hidden sm:flex'}`}>
          <Link
            href="/book"
            className="text-center px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Book a Free Call
          </Link>
          <Link
            href="/demos"
            className="text-center px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            See Free Demos
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link
            href="/work"
            className="inline-flex items-center min-h-[44px] font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#161616]/70 hover:text-[#E0301E] transition-colors"
          >
            See the Work →
          </Link>
          <Link
            href="/voice-agents"
            className="inline-flex items-center gap-2 min-h-[44px] font-mono text-[11px] font-bold text-[#161616]/70 hover:text-[#E0301E] transition-colors"
          >
            <span aria-hidden="true">◐</span> Our AI voice agents speak 100+ languages. Hear one →
          </Link>
        </div>
        </div>

        {/* Logo lockup with mascot: desktop, right column with sunburst glow */}
        <div className="hidden lg:block relative">
          <div
            aria-hidden="true"
            className="absolute -inset-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(245,183,0,0.38) 0%, rgba(245,183,0,0.14) 45%, transparent 68%)',
            }}
          />
          <Image
            src="/brand/logo-lockup.png"
            alt="Modern Mustard Seed"
            width={1000}
            height={1093}
            priority
            className="relative w-full h-auto drop-shadow-[8px_8px_0_rgba(22,22,22,0.14)]"
          />
        </div>
      </div>
    </section>
  );
}
