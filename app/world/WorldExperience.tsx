'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './world.css';

const A = '/world';

/** A parallax cutout. The outer .layer gets the scroll transform (written by JS);
 *  an inner wrapper carries any looping stop-motion animation so the two never fight. */
function Cutout({
  src, alt, style, data, anim, cover, priority,
}: {
  src: string; alt: string; style: React.CSSProperties;
  data?: Record<string, number>; anim?: string; cover?: boolean; priority?: boolean;
}) {
  const d: Record<string, string> = {};
  if (data) for (const k in data) d[`data-${k}`] = String(data[k]);
  return (
    <div className={`layer${cover ? ' layer-cover' : ''}`} style={style} data-layer="" {...d}>
      <div className={anim} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Image src={src} alt={alt} fill sizes="100vw" priority={priority}
          style={{ objectFit: cover ? 'cover' : 'contain' }} />
      </div>
    </div>
  );
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export default function WorldExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scenes = Array.from(root.querySelectorAll<HTMLElement>('[data-scene]')).map((scene) => ({
      scene,
      els: Array.from(scene.querySelectorAll<HTMLElement>('[data-layer]')).map((el) => ({
        el,
        px: parseFloat(el.dataset.px || '0'),
        py: parseFloat(el.dataset.py || '0'),
        sc: parseFloat(el.dataset.sc || '0'),
        rot: parseFloat(el.dataset.rot || '0'),
        fade: el.dataset.fade || '',
      })),
    }));
    const sky = {
      dawn: root.querySelector<HTMLElement>('.sky-dawn'),
      day: root.querySelector<HTMLElement>('.sky-day'),
      golden: root.querySelector<HTMLElement>('.sky-golden'),
      dusk: root.querySelector<HTMLElement>('.sky-dusk'),
      sun: root.querySelector<HTMLElement>('.sky-sun'),
    };
    const fill = root.querySelector<HTMLElement>('.progress-fill');

    const poseScene = (s: (typeof scenes)[number], p: number) => {
      for (const L of s.els) {
        L.el.style.transform =
          `translate3d(${L.px * p}px, ${L.py * p}px, 0) scale(${1 + L.sc * p}) rotate(${L.rot * p}deg)`;
        if (L.fade === 'in') L.el.style.opacity = String(clamp(p / 0.28));
        else if (L.fade === 'out') L.el.style.opacity = String(clamp((1 - p) / 0.28));
        else if (L.fade === 'inout') L.el.style.opacity = String(clamp(Math.min(p / 0.22, (1 - p) / 0.22)));
      }
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      const g = clamp(-rect.top / (root.offsetHeight - vh));

      if (sky.dawn) sky.dawn.style.opacity = String(1 - smoothstep(0.04, 0.26, g));
      if (sky.day) sky.day.style.opacity = String(smoothstep(0.08, 0.3, g) * (1 - smoothstep(0.44, 0.6, g)));
      if (sky.golden) sky.golden.style.opacity = String(smoothstep(0.48, 0.66, g) * (1 - smoothstep(0.82, 0.95, g)));
      if (sky.dusk) sky.dusk.style.opacity = String(smoothstep(0.82, 0.98, g));
      if (sky.sun) { sky.sun.style.transform = `translateY(${g * 60}vh) scale(${1 - g * 0.25})`; }
      if (fill) fill.style.height = `${g * 100}%`;

      for (const s of scenes) {
        const r = s.scene.getBoundingClientRect();
        const p = clamp(-r.top / (s.scene.offsetHeight - vh));
        poseScene(s, p);
      }
    };

    if (reduce) {
      // one settled pose + a warm sky, no scroll churn
      const vh = window.innerHeight;
      for (const s of scenes) {
        const r = s.scene.getBoundingClientRect();
        const visible = r.top < vh && r.bottom > 0;
        poseScene(s, visible ? 0.5 : 0.5);
      }
      if (sky.golden) sky.golden.style.opacity = '1';
      if (sky.dawn) sky.dawn.style.opacity = '0';
      return;
    }

    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  async function plant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const idea = String(data.get('idea') || '').trim();
    if (!email.includes('@')) { setStatus('error'); setMsg('A real email, please.'); return; }
    setStatus('sending'); setMsg('');
    try {
      const res = await fetch('/api/world/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, idea }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setStatus('done'); setMsg(json.message || 'It is planted. Check your inbox.'); form.reset(); }
      else { setStatus('error'); setMsg(json.error || 'Something went sideways. Try again.'); }
    } catch {
      setStatus('error'); setMsg('Network hiccup. Try again.');
    }
  }

  return (
    <div className="world" ref={rootRef}>
      {/* ---------------- SKY (sticky backdrop, crossfades dawn -> dusk) ---------------- */}
      <div className="world-sky" aria-hidden>
        <div className="sky-layer sky-dawn" />
        <div className="sky-layer sky-day" />
        <div className="sky-layer sky-golden" />
        <div className="sky-layer sky-dusk" />
        <div className="sky-sun" />
        <div className="sky-grain" />
      </div>

      <div className="progress-rail" aria-hidden><div className="progress-fill" /></div>

      {/* ===================== 1 — SKY / TITLE ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          {/* drifting clouds: parallax on .layer, drift on inner track */}
          <div className="layer" data-layer="" data-py={90} data-sc={0.5} data-fade="out"
            style={{ left: 0, top: '10vh', width: '100vw', height: '22vh' }}>
            <div className="cloud-track cloud-a" style={{ width: '26vw', height: '100%' }}>
              <div className="anim-float" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <Image src={`${A}/cloud.png`} alt="" fill sizes="30vw" priority style={{ objectFit: 'contain' }} />
              </div>
            </div>
          </div>
          <div className="layer" data-layer="" data-py={140} data-sc={0.7} data-fade="out"
            style={{ left: 0, top: '30vh', width: '100vw', height: '26vh' }}>
            <div className="cloud-track cloud-b" style={{ width: '34vw', height: '100%' }}>
              <Image src={`${A}/cloud.png`} alt="" fill sizes="36vw" style={{ objectFit: 'contain' }} />
            </div>
          </div>
          <div className="layer" data-layer="" data-py={70} data-sc={0.4} data-fade="out"
            style={{ left: 0, top: '62vh', width: '100vw', height: '20vh' }}>
            <div className="cloud-track cloud-c" style={{ width: '22vw', height: '100%' }}>
              <Image src={`${A}/cloud.png`} alt="" fill sizes="24vw" style={{ objectFit: 'contain' }} />
            </div>
          </div>
          {/* peaks rising in at the bottom to promise the descent */}
          <Cutout src={`${A}/mountains.png`} alt="Clay Mission Mountains"
            data={{ py: -70, sc: 0.12 }} priority
            style={{ left: '-10vw', bottom: '-6vh', width: '120vw', height: '46vh', opacity: 0.9 }} />

          <div className="copy" data-layer="" data-py={-40} data-fade="out" style={{ paddingTop: '4vh' }}>
            <p className="copy-eyebrow text-[11px] md:text-xs text-pop-red font-bold uppercase mb-5">Modern Mustard Seed</p>
            <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight text-[15vw] md:text-[8.5rem] drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]">
              The Mustard<br />Seed World
            </h1>
            <p className="font-sans text-white/90 text-lg md:text-2xl mt-6 max-w-xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              Scroll down into the little studio on the shore of Flathead Lake.
            </p>
            <div className="scroll-hint mt-10 text-white/80 font-mono text-xs tracking-widest">SCROLL ↓</div>
          </div>
        </div>
      </section>

      {/* ===================== 2 — THE VALLEY REVEAL ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          <Cutout src={`${A}/mountains.png`} alt="Snow-capped clay mountains over the valley"
            data={{ py: -46, sc: 0.16 }}
            style={{ left: '-12vw', top: '10vh', width: '124vw', height: '52vh' }} />
          {/* water band */}
          <Cutout src={`${A}/water.png`} alt="Flathead Lake, in clay" cover
            data={{ py: 30, sc: 0.08 }}
            style={{ left: 0, bottom: 0, width: '100vw', height: '46vh' }} />
          {/* HQ on the shore */}
          <Cutout src={`${A}/hq.png`} alt="The Modern Mustard Seed headquarters"
            data={{ py: -14, sc: 0.22 }} anim="anim-float"
            style={{ left: '9vw', top: '40vh', width: '26vw', height: '30vh' }} />
          <Cutout src={`${A}/sailboat.png`} alt="Clay sailboat with a mustard sail" anim="anim-bob"
            data={{ px: 60, py: -8 }}
            style={{ right: '20vw', top: '58vh', width: '11vw', height: '13vh' }} />
          <Cutout src={`${A}/jetski.png`} alt="A mustard seed on a jet ski" anim="anim-bob"
            data={{ px: -120, py: 6 }}
            style={{ right: '6vw', top: '68vh', width: '15vw', height: '12vh' }} />
          <Cutout src={`${A}/garden.png`} alt="Clay mustard-flower garden"
            data={{ py: 120, sc: 0.5 }}
            style={{ left: '-4vw', bottom: '-4vh', width: '44vw', height: '30vh' }} />
          <Cutout src={`${A}/pine.png`} alt="Clay pine tree" anim="sway"
            data={{ py: 150, sc: 0.5 }}
            style={{ right: '-2vw', bottom: '-2vh', width: '16vw', height: '40vh' }} />

          <div className="copy" data-layer="" data-py={-30} data-fade="inout"
            style={{ position: 'absolute', top: '12vh' }}>
            <p className="copy-eyebrow text-[11px] text-pop-red font-bold uppercase mb-4">Where we work</p>
            <h2 className="font-display font-extrabold text-[#14202e] leading-[1.02] text-[8vw] md:text-6xl">
              A whole studio,<br />built like a tiny world.
            </h2>
            <p className="font-sans text-[#25384a] text-base md:text-xl mt-5 max-w-lg mx-auto">
              Snow on the peaks, deep water below, and a headquarters that runs on sunlight and good ideas.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 3 — THE LAKE ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          <Cutout src={`${A}/scene-lake.png`} alt="A mustard seed jet-skiing on Flathead Lake" cover priority
            data={{ py: -30, sc: 0.18 }}
            style={{ inset: 0, width: '100%', height: '100%' }} />
          <div className="scene-vignette" />
          {/* a few water sparkles (keyframe-driven; no data-layer so JS never clobbers them) */}
          <div className="layer spark" style={{ left: '22%', top: '64%', width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,.9)' }} />
          <div className="layer spark" style={{ left: '54%', top: '72%', width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,.85)', animationDelay: '.8s' }} />
          <div className="layer spark" style={{ left: '70%', top: '60%', width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,.8)', animationDelay: '1.4s' }} />

          <div className="copy" data-layer="" data-py={-40} data-fade="inout"
            style={{ position: 'absolute', left: '8vw', top: '18vh', textAlign: 'left', margin: 0 }}>
            <p className="copy-eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">The Lake</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[8vw] md:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              We work where<br />it feels like play.
            </h2>
            <p className="font-sans text-white/90 text-base md:text-xl mt-5 max-w-md drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              Big builds, handled from a jet ski. The best studios make the hard stuff look easy.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 4 — HEADQUARTERS ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          <Cutout src={`${A}/mountains.png`} alt=""
            data={{ py: -20, sc: 0.08 }}
            style={{ left: '-20vw', top: '9vh', width: '74vw', height: '36vh', opacity: 0.8 }} />
          <Cutout src={`${A}/hq.png`} alt="Inside the Modern Mustard Seed headquarters"
            data={{ py: -10, sc: 0.3 }} anim="anim-float"
            style={{ left: '6vw', top: '22vh', width: '46vw', height: '56vh' }} />
          {/* animated window glow layered over the building */}
          <div className="layer glass-glow" data-layer="" data-py={-10} data-sc={0.3}
            style={{ left: '15vw', top: '42vh', width: '20vw', height: '20vh', borderRadius: '40%',
              background: 'radial-gradient(circle, rgba(255,206,110,0.85), rgba(255,180,60,0) 70%)',
              mixBlendMode: 'screen' }} />
          <Cutout src={`${A}/garden.png`} alt=""
            data={{ py: 90, sc: 0.4 }}
            style={{ left: '-2vw', bottom: '-3vh', width: '40vw', height: '26vh' }} />

          <div className="copy" data-layer="" data-py={-30} data-fade="inout"
            style={{ position: 'absolute', right: '7vw', top: '24vh', textAlign: 'left', margin: 0, maxWidth: '30rem' }}>
            <p className="copy-eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">Headquarters</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[8vw] md:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
              Where your<br />app gets built.
            </h2>
            <p className="font-sans text-white/90 text-base md:text-xl mt-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
              Apps, websites, and specialty AI tools. Shipped in weeks, not months, from a cabin with a rooftop garden.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-6">
              {['Apps', 'Websites', 'AI Tools'].map((c) => (
                <span key={c} className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#161616] bg-gold-bright border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 5 — THE GARDENS ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          <Cutout src={`${A}/seedwave.png`} alt="A mustard seed tending the garden" anim="anim-bob"
            data={{ py: -18, sc: 0.1 }}
            style={{ left: '12vw', top: '26vh', width: '18vw', height: '40vh' }} />
          <Cutout src={`${A}/garden.png`} alt="Rows of clay mustard flowers" anim="sway"
            data={{ py: 70, sc: 0.35 }}
            style={{ left: '-6vw', bottom: '-4vh', width: '58vw', height: '36vh' }} />
          <Cutout src={`${A}/garden.png`} alt="" anim="sway"
            data={{ py: 110, sc: 0.5 }}
            style={{ right: '-8vw', bottom: '-6vh', width: '56vw', height: '34vh' }} />

          <div className="copy" data-layer="" data-py={-30} data-fade="inout"
            style={{ position: 'absolute', right: '8vw', top: '20vh', textAlign: 'right', margin: 0, maxWidth: '32rem' }}>
            <p className="copy-eyebrow text-[11px] text-pop-red font-bold uppercase mb-4">The Gardens</p>
            <h2 className="font-display font-extrabold text-[#14202e] leading-[1.02] text-[8vw] md:text-6xl">
              We grow things<br />that grow themselves.
            </h2>
            <p className="font-sans text-[#25384a] text-base md:text-xl mt-5 ml-auto">
              Lead engines, automations, and tools that keep working after we leave. Plant once, harvest for years.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 6 — THE CREW / RUN IT FROM YOUR PHONE ===================== */}
      <section data-scene className="scene scene-tall">
        <div className="stage">
          <Cutout src={`${A}/water.png`} alt="" cover
            data={{ py: 20 }}
            style={{ left: 0, bottom: 0, width: '100vw', height: '40vh', opacity: 0.5, filter: 'blur(3px)' }} />
          <Cutout src={`${A}/family.png`} alt="The Mustard family, waving from the shore" anim="anim-float"
            data={{ py: -12, sc: 0.14 }}
            style={{ left: '50%', top: '30vh', width: '60vw', height: '52vh', marginLeft: '-30vw' }} />
          {/* glowing phone (parallax on outer .layer, float keyframe on inner) */}
          <div className="layer" data-layer="" data-py={-30}
            style={{ left: '30vw', top: '40vh', width: '52px', height: '86px' }}>
            <div className="anim-float" style={{ width: '100%', height: '100%', borderRadius: '12px',
              background: 'linear-gradient(160deg,#fff6d8,#ffd23f)', border: '3px solid #161616',
              boxShadow: '0 0 34px 6px rgba(255,221,85,.75), 4px 4px 0 0 #161616' }} />
          </div>

          <div className="copy" data-layer="" data-py={-30} data-fade="inout"
            style={{ position: 'absolute', top: '8vh' }}>
            <p className="copy-eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">The Crew</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[8vw] md:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
              Run the whole thing<br />from your phone.
            </h2>
            <p className="font-sans text-white/90 text-base md:text-xl mt-5 max-w-xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
              That is the promise. Systems so simple your business fits in your pocket. Even the dog gets a day off.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 7 — PLANT YOUR SEED (CTA) ===================== */}
      <section data-scene className="scene scene-cta">
        <div className="stage" style={{ alignItems: 'flex-start', paddingTop: '12vh' }}>
          <Cutout src={`${A}/garden.png`} alt="" anim="sway"
            data={{ py: 40, sc: 0.2 }}
            style={{ left: '-8vw', bottom: '-4vh', width: '60vw', height: '30vh', opacity: 0.9 }} />
          <Cutout src={`${A}/seedwave.png`} alt="A little mustard seed, ready to grow" anim="anim-bob"
            data={{ py: -8 }}
            style={{ right: '6vw', bottom: '-2vh', width: '20vw', height: '46vh', opacity: 0.95 }} />
          <div className="ground-soft" />

          <div className="copy" style={{ maxWidth: '34rem' }}>
            <p className="copy-eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">Your turn</p>
            <h2 className="font-display font-extrabold text-white leading-[1.0] text-[13vw] md:text-7xl drop-shadow-[0_6px_30px_rgba(0,0,0,0.4)]">
              Plant your seed.
            </h2>
            <p className="font-sans text-white/90 text-base md:text-xl mt-5 mb-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
              Tell us what you want to grow. Sarah reads every one and usually replies the same day.
            </p>

            {status === 'done' ? (
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 text-left">
                <div className="text-4xl mb-2">🌱</div>
                <p className="font-display font-extrabold text-2xl text-[#161616]">It is planted.</p>
                <p className="font-sans text-[#3a3a3a] mt-1">{msg}</p>
                <Link href="/work" className="inline-block mt-4 font-mono text-xs font-bold uppercase tracking-wider text-pop-blue underline underline-offset-4">
                  See what we have grown →
                </Link>
              </div>
            ) : (
              <form onSubmit={plant} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 md:p-7 text-left pointer-events-auto">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input name="name" placeholder="Your name"
                    className="font-sans w-full rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
                  <input name="email" type="email" required placeholder="you@business.com"
                    className="font-sans w-full rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <input name="idea" placeholder="What do you want to grow?"
                  className="font-sans w-full mt-3 rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
                <button type="submit" disabled={status === 'sending'}
                  className="mt-4 w-full font-mono font-bold uppercase tracking-wider text-[#161616] bg-gold-400 border-2 border-[#161616] rounded-lg px-5 py-3.5 shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60">
                  {status === 'sending' ? 'Planting…' : 'Plant it 🌱'}
                </button>
                {status === 'error' && <p className="font-sans text-pop-red text-sm mt-3">{msg}</p>}
                <p className="font-sans text-[13px] text-[#5a5a5a] mt-4">
                  Ready to go all in?{' '}
                  <Link href="/build-queue" className="text-pop-blue font-semibold underline underline-offset-2">
                    Start a full project →
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
