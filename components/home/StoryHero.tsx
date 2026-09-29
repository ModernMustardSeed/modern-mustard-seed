'use client';

import { useEffect, useRef } from 'react';
import Link from '@/components/AttributionLink';
import s from './StoryHero.module.css';

/**
 * The homepage hero as a scroll story (preview, 2026-09-29).
 *
 * Open the page: the empty Riviera beach settles in, the umbrella pops open,
 * the loungers slide in, Mr. Mustard drops onto his, Mrs. Mustard, the kids
 * and the dog arrive. Scroll: the camera pushes into Mr. Mustard's phone; the
 * phone fills the screen and a website assembles on it (we build websites);
 * a call rings in and the AI answers and books the job (agentic systems that
 * run your business); the camera pulls back to the family at sunset (so you
 * can run your life).
 *
 * Every piece is painted art cut into layers (public/art/story). The story is
 * driven by one scroll listener that writes a handful of CSS variables; all
 * motion is transform and opacity, so it runs on the compositor. With
 * prefers-reduced-motion the section is the finished scene, not pinned.
 */

const PIECES = [
  // name, left %, top %, width % of the scene, intro class, depth (parallax), alt
  { n: 'umbrella', x: 60.5, y: 24.4, w: 33.9, k: 'umbrella', d: 0.35 },
  { n: 'mrs', x: 33.9, y: 52.7, w: 33.9, k: 'mrs', d: 0.7 },
  { n: 'mr', x: 55.3, y: 45.9, w: 40.4, k: 'mr', d: 0.8 },
  { n: 'kids', x: 7.8, y: 63.5, w: 27.3, k: 'kids', d: 0.9 },
  { n: 'dog', x: 2.6, y: 54.7, w: 14.3, k: 'dog', d: 1 },
] as const;

/** Mr. Mustard's phone, in scene percentages: where the camera flies. */
const PHONE = { x: 70, y: 55.7 };

function Pic({ name, className }: { name: string; className?: string }) {
  return <picture className={className}>
    <source type="image/avif" srcSet={`/art/story/${name}.avif`} />
    <img src={`/art/story/${name}.webp`} alt="" decoding="async" draggable={false} />
  </picture>;
}

export default function StoryHero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scene = el.querySelector<HTMLElement>('[data-scene]');
    let frame = 0;
    const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // How far the phone must travel to reach the centre of the screen, measured once per resize.
    const measure = () => {
      if (!scene) return;
      const r = scene.getBoundingClientRect();
      const px = r.left + (PHONE.x / 100) * r.width;
      const py = r.top + (PHONE.y / 100) * r.height;
      el.style.setProperty('--dx', `${window.innerWidth / 2 - px}px`);
      el.style.setProperty('--dy', `${window.innerHeight / 2 - py}px`);
    };

    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      const zoomIn = ease(seg(p, 0.02, 0.22));
      const zoomOut = ease(seg(p, 0.72, 0.86));
      const set = (k: string, v: number) => el.style.setProperty(k, v.toFixed(4));
      set('--p', p);
      set('--zoom', zoomIn * (1 - zoomOut));
      set('--dev', ease(seg(p, 0.16, 0.3)) * (1 - ease(seg(p, 0.72, 0.84))));
      set('--site', seg(p, 0.28, 0.5));
      set('--call', seg(p, 0.5, 0.7));
      set('--sun', ease(seg(p, 0.74, 0.88)));
      set('--fin', ease(seg(p, 0.84, 0.97)));
      set('--intro', 1 - ease(seg(p, 0.02, 0.14)));
      el.dataset.intro = p < 0.1 ? '1' : '0';
      el.dataset.fin = p > 0.9 ? '1' : '0';
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onResize = () => { el.style.setProperty('--zoom', '0'); measure(); update(); };
    measure(); update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, []);

  return (
    <section ref={root} className={s.story} data-story="" aria-labelledby="studio-heading">
      <div className={s.stage}>
        <div className={s.scene} data-scene="">
          <picture className={s.plate}>
            <source type="image/avif" srcSet="/art/story/plate-960.avif 960w, /art/story/plate-1600.avif 1600w" sizes="max(100vw, 150svh)" />
            <img src="/art/story/plate-1600.webp" alt="Painting: an empty French Riviera beach in bright sun, turquoise sea, a whitewashed cliffside village and a white yacht offshore. The Mustard family arrives: an umbrella opens, Mr. Mustard settles onto a lounger with his phone, Mrs. Mustard in her straw hat beside him, the kids build a sandcastle and the dog leaps in." width={1600} height={1067} fetchPriority="high" decoding="async" />
          </picture>
          <picture className={s.sunset} aria-hidden="true">
            <source type="image/avif" srcSet="/art/story/sunset-960.avif 960w, /art/story/sunset-1600.avif 1600w" sizes="max(100vw, 150svh)" />
            <img src="/art/story/sunset-1600.webp" alt="" width={1600} height={1067} loading="lazy" decoding="async" />
          </picture>
          {PIECES.map((pc) => (
            <div key={pc.n} className={`${s.piece} ${s[pc.k]}`} style={{ ['--x' as string]: `${pc.x}%`, ['--y' as string]: `${pc.y}%`, ['--w' as string]: `${pc.w}%`, ['--d' as string]: pc.d }} aria-hidden="true">
              <Pic name={pc.n} />
            </div>
          ))}
        </div>
        <div className={s.haze} aria-hidden="true" />

        <div className={s.copy}>
          <p className={s.credit}>Modern Mustard Seed <i>·</i> Design &amp; agentic systems studio <i>·</i> Kalispell, Montana</p>
          <h1 id="studio-heading" className={s.name}>We build websites and <em>agentic systems</em> that run your business.</h1>
          <p className={s.line}>So you can <em>run your life.</em></p>
          <div className={s.actions}>
            <Link href="/inquire" className={s.cta}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link>
            <a href="#selected-work" className={s.quiet}>See the work</a>
          </div>
        </div>
        <p className={s.cue} aria-hidden="true"><span className={s.mouse} />Scroll the story</p>

        {/* The phone: the camera flies into it, and the work happens on its screen. */}
        <div className={s.device} aria-hidden="true">
          <div className={s.phone}>
            <div className={s.island} />
            <div className={s.screen}>
              <div className={s.site}>
                <div className={`${s.b} ${s.b0}`}><i className={s.logo} /><span /><span /><span /></div>
                <div className={`${s.b} ${s.b1}`}><div className={s.heroImg} /><b>Your Business</b><small>Serving the whole valley since 2011</small><em>Book now</em></div>
                <div className={`${s.b} ${s.b2}`}><strong>★★★★★</strong><span>5.0 on Google</span></div>
                <div className={`${s.b} ${s.b3}`}><div /><div /><div /></div>
                <div className={`${s.b} ${s.b4}`}><i>✓</i>Built to score 100 on SEO</div>
              </div>
              <div className={s.call}>
                <div className={`${s.c} ${s.c0}`}><small>Incoming call</small><b>New customer</b><div className={s.wave}><i /><i /><i /><i /><i /><i /><i /></div><span>Answered by your AI receptionist</span></div>
                <div className={`${s.c} ${s.them} ${s.c1}`}>Can someone look at my roof this week?</div>
                <div className={`${s.c} ${s.ai} ${s.c2}`}>Absolutely. I have Thursday at 9:00 or Friday at 1:00.</div>
                <div className={`${s.c} ${s.them} ${s.c3}`}>Thursday works.</div>
                <div className={`${s.c} ${s.ai} ${s.c4}`}>You&apos;re booked. A confirmation is on its way.</div>
                <div className={`${s.c} ${s.booked} ${s.c5}`}>✓ Job booked · Thursday 9:00</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.captions}>
          <p className={s.capA}><span>Chapter one</span>We build <em>websites.</em></p>
          <p className={s.capB}><span>Chapter two</span>And <em>agentic systems</em> that run your business.</p>
          <div className={s.finale}>
            <p className={s.capC}><span>Chapter three</span>So you can <em>run your life.</em></p>
            <div className={s.actions}>
              <Link href="/inquire" className={s.cta}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link>
              <Link href="/ai" className={s.quietLight}>AI for your business</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
