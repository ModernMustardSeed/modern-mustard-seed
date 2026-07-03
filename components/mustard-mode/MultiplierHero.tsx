'use client';

/**
 * THE MULTIPLIER. The MUSTARD MODE signature moment: a living halftone dot
 * field scrubs a mono counter from 1x to 100x, the dots coalesce into
 * Mr. Mustard, blink, and snap into a midnight terminal that coaches the
 * visitor on THEIR ambition. First line is instant (cached intent pool, zero
 * API), the personalized second reply is email-gated (the Level 0 lead).
 *
 * Device tiers: full canvas on desktop, calmer field on small screens,
 * static halftone + instant terminal under prefers-reduced-motion.
 */

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { routeIntent, ambitionPhrase } from '@/data/mustard-mode/coach';

type Phase = 'attract' | 'face' | 'terminal';
type PlayState = 'idle' | 'typing' | 'opener' | 'emailGate' | 'live' | 'done' | 'spent';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

type Dot = {
  hx: number; hy: number;   // home (grid)
  x: number; y: number;     // current
  tx: number; ty: number;   // target (face phase)
  vx: number; vy: number;
  r: number;
  color: string;
  hasTarget: boolean;
};

export default function MultiplierHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('attract');
  const [reduced, setReduced] = useState(false);
  // The scrubbing counter writes straight to the DOM (60fps React re-renders
  // during hydration were the page's whole TBT budget).
  const counterElRef = useRef<HTMLSpanElement | null>(null);
  const counterVal = useRef(1);

  const [play, setPlay] = useState<PlayState>('idle');
  const [ambition, setAmbition] = useState('');
  const [headlineThing, setHeadlineThing] = useState<string | null>(null);
  const [openerText, setOpenerText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openerFull = useRef('');
  const konamiIdx = useRef(0);
  const confettiRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; life: number }[]>([]);

  // ── Motion preference + phase choreography ──────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) {
      setPhase('terminal');
      counterVal.current = 100;
      if (counterElRef.current) counterElRef.current.textContent = '100x';
      return;
    }
    let raf = 0;
    let t0 = 0;
    const ATTRACT_MS = 2600;
    const FACE_MS = 2000;
    const step = (now: number) => {
      if (!t0) t0 = now;
      const t = now - t0;
      if (t < ATTRACT_MS) {
        const p = t / ATTRACT_MS;
        const eased = 1 - Math.pow(1 - p, 3);
        const c = Math.max(1, Math.round(eased * 100));
        counterVal.current = c;
        if (counterElRef.current) counterElRef.current.textContent = `${c}x`;
        raf = requestAnimationFrame(step);
      } else if (t < ATTRACT_MS + FACE_MS) {
        counterVal.current = 100;
        if (counterElRef.current) counterElRef.current.textContent = '100x';
        setPhase('face');
        raf = requestAnimationFrame(step);
      } else {
        setPhase('terminal');
      }
    };
    // Give first paint the main thread; the marquee starts a beat later.
    const kickoff = window.setTimeout(() => { raf = requestAnimationFrame(step); }, 450);
    return () => { window.clearTimeout(kickoff); cancelAnimationFrame(raf); };
  }, []);

  // Bridge React phase into the canvas loop without re-subscribing its RAF.
  const syncRef = useRef<(p: Phase, c: number) => void>(() => {});
  useEffect(() => {
    syncRef.current(phase, counterVal.current);
  }, [phase]);

  // ── The dot field ───────────────────────────────────────────────────
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let started = 0;
    const mouse = { x: -9999, y: -9999 };
    let phaseLocal: Phase = 'attract';
    let faceStart = 0;

    syncRef.current = (p: Phase) => {
      if (p === 'face' && phaseLocal !== 'face') faceStart = performance.now();
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
      const spacing = small ? 26 : 20;
      dots = [];
      for (let gx = spacing / 2; gx < w; gx += spacing) {
        for (let gy = spacing / 2; gy < h; gy += spacing) {
          dots.push({
            hx: gx, hy: gy, x: gx, y: gy, tx: gx, ty: gy,
            vx: 0, vy: 0, r: small ? 1.5 : 1.8,
            color: '#F5B700', hasTarget: false,
          });
        }
      }
      assignFaceTargets();
    };

    // Sample the mascot into dot targets, centered right-of-center.
    // (window.Image: the next/image component import shadows the constructor.)
    const mascot = new window.Image();
    let mascotReady = false;
    mascot.src = '/brand/mascot.png';
    mascot.onload = () => {
      mascotReady = true;
      assignFaceTargets();
    };

    function assignFaceTargets() {
      if (!mascotReady || dots.length === 0) return;
      const off = document.createElement('canvas');
      const cols = 56;
      const rows = Math.round((cols * mascot.height) / mascot.width);
      off.width = cols;
      off.height = rows;
      const octx = off.getContext('2d');
      if (!octx) return;
      octx.drawImage(mascot, 0, 0, cols, rows);
      const data = octx.getImageData(0, 0, cols, rows).data;
      const targets: { x: number; y: number; color: string }[] = [];
      // Coalesce where the real mascot will materialize and stay (bottom-right,
      // the moodboard's spot), so dots-become-coach reads as one continuous act.
      const scale = Math.min((h * 0.78) / rows, (w * 0.42) / cols);
      const ox = w * 0.74 - (cols * scale) / 2;
      const oy = h * 0.56 - (rows * scale) / 2;
      for (let yy = 0; yy < rows; yy++) {
        for (let xx = 0; xx < cols; xx++) {
          const i = (yy * cols + xx) * 4;
          if (data[i + 3] > 140) {
            const rC = data[i], gC = data[i + 1], bC = data[i + 2];
            const dark = rC + gC + bC < 260;
            targets.push({ x: ox + xx * scale, y: oy + yy * scale, color: dark ? '#161616' : '#F5B700' });
          }
        }
      }
      // Map a subset of dots onto targets (shuffled for organic morphing).
      const shuffled = [...dots].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        const d = shuffled[i];
        if (i < targets.length) {
          d.tx = targets[i].x; d.ty = targets[i].y; d.color = targets[i].color; d.hasTarget = true;
        } else {
          d.hasTarget = false;
        }
      }
    }

    const draw = (now: number) => {
      if (!started) started = now;
      ctx.clearRect(0, 0, w, h);
      const inFace = phaseLocal === 'face';
      const inTerminal = phaseLocal === 'terminal';
      const energy = phaseLocal === 'attract' ? Math.min(1, (now - started) / 2600) : 1;

      for (const d of dots) {
        if (inFace && d.hasTarget) {
          d.x += (d.tx - d.x) * 0.08;
          d.y += (d.ty - d.y) * 0.08;
        } else if (inFace && !d.hasTarget) {
          d.x += (d.hx - d.x) * 0.05;
          d.y += (d.hy - d.y) * 0.05;
        } else {
          // attract + terminal: breathe around home, react to cursor
          const wob = inTerminal ? 1.2 : 1 + energy * 3;
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
          if (!inFace) d.color = '#F5B700';
        }
        const blink = inFace && (now - faceStart) > 1400 && (now - faceStart) < 1600;
        ctx.globalAlpha = inTerminal ? 0.42 : blink ? 0.15 : d.hasTarget && inFace ? 0.95 : 0.62;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.hasTarget && inFace ? d.r * 1.5 : d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Konami seed confetti
      const conf = confettiRef.current;
      for (let i = conf.length - 1; i >= 0; i--) {
        const c = conf[i];
        c.vy += 0.15;
        c.x += c.vx;
        c.y += c.vy;
        c.life -= 1;
        if (c.life <= 0 || c.y > h + 20) { conf.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, c.life / 40);
        ctx.fillStyle = '#F5B700';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.r, c.r * 1.4, c.vx * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    // Lazy-init after first paint so the headline owns LCP.
    const kickoff = window.setTimeout(() => {
      build();
      raf = requestAnimationFrame(draw);
    }, 700);
    window.addEventListener('resize', build);
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);
    return () => {
      window.clearTimeout(kickoff);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // ── Konami code ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const expect = KONAMI[konamiIdx.current];
      if (e.key === expect || e.key.toLowerCase() === expect) {
        konamiIdx.current += 1;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          const wrap = wrapRef.current;
          const w = wrap?.clientWidth ?? 800;
          for (let i = 0; i < 140; i++) {
            confettiRef.current.push({
              x: Math.random() * w,
              y: -10 - Math.random() * 120,
              vx: (Math.random() - 0.5) * 2,
              vy: 1 + Math.random() * 3,
              r: 2 + Math.random() * 3,
              life: 160 + Math.random() * 80,
            });
          }
          track('mustard_konami');
        }
      } else {
        konamiIdx.current = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // ── Free play flow ──────────────────────────────────────────────────
  const submitAmbition = useCallback(() => {
    const a = ambition.trim();
    if (a.length < 3 || play !== 'idle') return;
    const intent = routeIntent(a);
    const thing = ambitionPhrase(a);
    setPlay('typing');
    setHeadlineThing(intent.headline.replace('{thing}', thing));
    openerFull.current = intent.line;
    track('mustard_hero_played', { intent: intent.key });
    setTimeout(() => {
      setPlay('opener');
      typeOn(intent.line, setOpenerText, () => setPlay('emailGate'));
    }, 350);
  }, [ambition, play, typeOn]);

  const submitEmail = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailErr('A real email unlocks the run.');
      return;
    }
    setEmailErr(null);
    setBusy(true);
    setPlay('live');
    track('mustard_hero_email');
    try {
      const res = await fetch('/api/mustard-mode/free-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambition: ambition.trim(), email: e, website: honeypot }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; message?: string };
      if (res.ok && data.reply) {
        typeOn(data.reply, setLiveText, () => setPlay('done'));
      } else if (res.status === 402) {
        setLiveText(data.message || 'Your free credit is played. Level up to keep coaching.');
        setPlay('spent');
      } else {
        setLiveText('The coach stepped away from the cabinet for a second. Your run is saved. Check your email, or level up below and pick this up inside.');
        setPlay('done');
      }
    } catch {
      setLiveText('The coach stepped away from the cabinet for a second. Your run is saved. Level up below and pick this up inside.');
      setPlay('done');
    } finally {
      setBusy(false);
    }
  }, [ambition, email, typeOn]);

  const headline = headlineThing;

  return (
    <section ref={wrapRef} className="relative overflow-hidden bg-[#FBF6EA] border-b-2 border-[#161616]" aria-label="MUSTARD MODE. One seed, 100x the output.">
      {/* Static halftone under everything (the only layer when reduced motion) */}
      <div className="absolute inset-0 halftone-bg opacity-60" aria-hidden />
      {!reduced && <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />}

      {/* Mr. Mustard materializes from the dot coalesce and STAYS: the coach
          standing beside the machine, exactly like the approved moodboard. */}
      <style>{`
        @keyframes mm-materialize {
          0% { opacity: 0; transform: rotate(-4deg) scale(0.82) translateY(24px); filter: blur(6px); }
          60% { opacity: 1; filter: blur(0); }
          80% { transform: rotate(-4deg) scale(1.04) translateY(-6px); }
          100% { opacity: 1; transform: rotate(-4deg) scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes mm-bob {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50% { transform: rotate(-4deg) translateY(-10px); }
        }
        .mm-mascot-live {
          animation: mm-materialize 900ms cubic-bezier(.22,1.4,.36,1) both, mm-bob 5s ease-in-out 1s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mm-mascot-live { animation: none; }
        }
      `}</style>
      {(phase === 'terminal' || reduced) && (
        <div
          className="mm-mascot-live pointer-events-none absolute hidden md:block right-[2%] bottom-[-3%] w-[min(26vw,340px)] z-[1]"
          aria-hidden
        >
          <Image
            src="/brand/mascot.png"
            alt=""
            width={885}
            height={1180}
            priority={false}
            className="w-full h-auto drop-shadow-[10px_10px_0_rgba(22,22,22,0.85)]"
          />
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-24 md:pb-24 min-h-[92vh] flex flex-col justify-center">
        <p className="font-mono font-bold text-[11px] md:text-xs tracking-[0.18em] text-[#E0301E] uppercase">
          Mr. Mustard presents // Insert ambition to play // 1 free credit
        </p>

        <h1
          className={`font-display italic font-extrabold text-[#161616] leading-[0.98] tracking-tight mt-4 max-w-4xl ${
            headline ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-5xl md:text-7xl lg:text-8xl'
          }`}
        >
          {headline ? (
            <span>
              {headline.split('100x').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="not-italic font-mono text-[#F5B700]" style={{ textShadow: '2px 2px 0 #161616, -1px -1px 0 #161616, 1px -1px 0 #161616, -1px 1px 0 #161616' }}>
                      100x
                    </span>
                  )}
                </span>
              ))}
            </span>
          ) : (
            <span>
              One seed.{' '}
              <span
                ref={counterElRef}
                className="not-italic font-mono text-[#F5B700] tabular-nums"
                style={{ textShadow: '3px 3px 0 #161616, -1px -1px 0 #161616, 1px -1px 0 #161616, -1px 1px 0 #161616' }}
              >
                {reduced || phase !== 'attract' ? '100x' : '1x'}
              </span>{' '}
              the output.
            </span>
          )}
        </h1>

        <p className="font-sans text-base md:text-lg text-[#161616]/80 max-w-2xl mt-6">
          A personal AI coach, a four-track curriculum, and the exact prompts to ship software, design,
          and ideas with nothing but your Claude subscription. Mr. Mustard trains you. Claude does the
          reps. Your first coaching session starts on this page, free.
        </p>

        {/* The terminal */}
        <div
          className={`mt-10 max-w-2xl transition-all duration-700 ${phase === 'terminal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
        >
          <div className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] rounded-none overflow-hidden">
            <div className="flex items-center gap-2 bg-[#0F1422] px-4 py-2.5 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E0301E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3fbf6b]" />
              <span className="font-mono text-[10px] text-[#5C7188] ml-2">mr-mustard — coach session 001</span>
            </div>
            <div className="p-5 font-mono text-[13px] md:text-sm leading-relaxed text-[#d7dbe6]">
              <div>
                <span className="text-[#5C7188]">$ </span>
                <span className="text-[#FFDD55]">[MUSTARD MODE: ON]</span>
                <span className="text-[#5C7188]"> // 1 free credit</span>
              </div>
              <div className="mt-1 text-[#7aa2ff]">INSERT AMBITION TO PLAY. What do you want to build?</div>

              {play === 'idle' || play === 'typing' ? (
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(e) => { e.preventDefault(); submitAmbition(); }}
                >
                  <span className="text-[#5C7188]">&gt;</span>
                  <input
                    value={ambition}
                    onChange={(e) => setAmbition(e.target.value)}
                    placeholder="a booking app for my dog grooming shop"
                    maxLength={300}
                    aria-label="What do you want to build?"
                    className="flex-1 bg-transparent outline-none text-white placeholder:text-[#5C7188]/70 caret-[#F5B700]"
                  />
                  <button
                    type="submit"
                    disabled={ambition.trim().length < 3 || play === 'typing'}
                    className="font-mono font-bold text-[11px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-3 py-1.5 disabled:opacity-40 hover:translate-y-[1px] transition-transform"
                  >
                    Enter
                  </button>
                </form>
              ) : (
                <div className="mt-3">
                  <span className="text-[#5C7188]">&gt; </span>
                  <span className="text-white">{ambition}</span>
                </div>
              )}

              {openerText && (
                <div className="mt-4">
                  <span className="text-[#FFDD55] font-bold">MR.MUSTARD: </span>
                  <span className="whitespace-pre-wrap">{openerText}</span>
                  {play === 'opener' && <span className="inline-block w-2 h-4 bg-[#F5B700] align-[-2px] animate-pulse ml-0.5" />}
                </div>
              )}

              {(play === 'emailGate' || play === 'live' || play === 'done' || play === 'spent') && (
                <div className="mt-4">
                  {play === 'emailGate' ? (
                    <form
                      className="border border-[#E0301E]/70 bg-[#E0301E]/10 p-3"
                      onSubmit={(e) => { e.preventDefault(); void submitEmail(); }}
                    >
                      <p className="text-[#ff6b5e] font-bold text-[12px] uppercase tracking-wider">[ Save your run to continue ]</p>
                      <p className="text-[#d7dbe6]/80 text-[12px] mt-1">Your personalized coaching reply unlocks with an email. That email is also your Level 0 pass (the starter prompt sampler is on the house).</p>
                      <input
                        type="text"
                        name="website"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="absolute -left-[9999px] h-0 w-0 opacity-0"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@buildsomething.com"
                          aria-label="Email to save your run"
                          className="flex-1 bg-[#080C16] border border-white/20 px-3 py-2 outline-none text-white placeholder:text-[#5C7188]/70 focus:border-[#F5B700]"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="font-mono font-bold text-[11px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-3 py-2 disabled:opacity-40"
                        >
                          {busy ? '...' : 'Save run'}
                        </button>
                      </div>
                      {emailErr && <p className="text-[#ff6b5e] text-[11px] mt-1">{emailErr}</p>}
                    </form>
                  ) : (
                    <div>
                      {play === 'live' && !liveText && (
                        <p className="text-[#5C7188] text-[12px] animate-pulse">MR.MUSTARD is thinking about your run…</p>
                      )}
                      {liveText && (
                        <div>
                          <span className="text-[#FFDD55] font-bold">MR.MUSTARD: </span>
                          <span className="whitespace-pre-wrap">{liveText}</span>
                          {play === 'live' && <span className="inline-block w-2 h-4 bg-[#F5B700] align-[-2px] animate-pulse ml-0.5" />}
                        </div>
                      )}
                      {(play === 'done' || play === 'spent') && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            href="#levels"
                            onClick={() => track('mustard_hero_levelup_click')}
                            className="font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#F5B700] px-5 py-2.5 text-sm hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#F5B700] transition-all"
                          >
                            Level up. Keep this coach →
                          </a>
                          <span className="font-mono text-[11px] text-[#5C7188] self-center">Run saved. It will be waiting in your HQ.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="font-mono text-[10px] text-[#161616]/50 mt-2 tracking-wide">
            FREE PLAY = 1 LIVE COACHING RUN + THE STARTER PROMPT SAMPLER. NO CARD.
          </p>
        </div>

        {/* Pre-terminal CTA (visible during attract/face so there is always an action) */}
        {phase !== 'terminal' && (
          <div className="mt-10 flex gap-4">
            <a href="#levels" className="font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] transition-all">
              See the levels
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
