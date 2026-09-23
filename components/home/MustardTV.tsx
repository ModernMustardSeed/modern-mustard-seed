'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import s from './MustardTV.module.css';

/**
 * MUSTARD TV. The studio's films on a pop-art set with a channel dial. It plays
 * muted while it is on screen (nothing loads before that), static crackles
 * between channels, the next channel comes on when a film ends, and the sound
 * knob is one tap. Under prefers-reduced-motion it waits for a press and the
 * static stays off.
 *
 * The cuts are 720p copies of the ad-playbook films in public/video/tv, made
 * light enough to autoplay on a landing page. Inspiration first, product second.
 */

const CHANNELS = [
  { key: 'make-it-real', title: 'Make It Real', line: 'Something you can call your own.', runtime: '38 sec' },
  { key: 'build-the-tree', title: 'Let’s Build the Tree', line: 'One desk. Your idea. Then watch it grow.', runtime: '24 sec' },
  { key: 'wonderful-time', title: 'A Wonderful Time To Be Alive', line: 'The studio film. Consume less. Create.', runtime: '96 sec' },
  { key: 'debating', title: 'While You Were Debating', line: 'One person. Idea to market, one pass.', runtime: '44 sec' },
  { key: 'scenic-route', title: 'The Scenic Route', line: 'Down the road to Mustard Seed Ranch.', runtime: '30 sec' },
  { key: 'little-yes', title: 'A Little Yes', line: 'The Mustard family musical.', runtime: '64 sec' },
  { key: 'night-shift', title: 'The Night Shift', line: 'There is only one of you. Now there are two.', runtime: '29 sec' },
  { key: 'good-news', title: 'Good News', line: 'Your business thrives. You get your life back.', runtime: '36 sec' },
] as const;

export default function MustardTV() {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [static_, setStatic] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [paused, setPaused] = useState(true);
  const video = useRef<HTMLVideoElement | null>(null);
  const set = useRef<HTMLDivElement | null>(null);
  const reduced = useRef(false);
  const switchTimer = useRef<number | undefined>(undefined);
  const ch = CHANNELS[idx];

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = set.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { setOnScreen(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(switchTimer.current); };
  }, []);

  // Play while on screen (unless the visitor asked for stillness), pause off it.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (onScreen && !reduced.current) v.play().catch(() => {});
    if (!onScreen) v.pause();
  }, [onScreen, idx]);

  const tune = (next: number, how: string) => {
    const i = (next + CHANNELS.length) % CHANNELS.length;
    if (i === idx) return;
    trackEvent('mustard_tv_channel', { channel: CHANNELS[i].key, how });
    if (reduced.current) { setIdx(i); return; }
    setStatic(true);
    window.clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => { setIdx(i); setStatic(false); }, 380);
  };

  const toggleSound = () => {
    const v = video.current;
    const next = !muted;
    setMuted(next);
    if (v) { v.muted = next; if (!next && v.paused) v.play().catch(() => {}); }
    trackEvent('mustard_tv_sound', { on: !next });
  };

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  return (
    <div className={s.wrap}>
      <div ref={set} className={s.set}>
        <div className={s.antenna} aria-hidden="true"><i /><i /><b /></div>
        <div className={s.cabinet}>
          <div className={s.bezel}>
            <div className={s.screen}>
              <video
                key={ch.key}
                ref={video}
                className={s.video}
                src={seen ? `/video/tv/${ch.key}.mp4` : undefined}
                poster={`/video/tv/${ch.key}.webp`}
                muted={muted}
                playsInline
                preload="none"
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onEnded={() => tune(idx + 1, 'ended')}
                onClick={togglePlay}
                aria-label={`${ch.title}, a film by Modern Mustard Seed`}
              />
              <div className={s.glass} aria-hidden="true" />
              <div className={s.static} data-on={static_ || undefined} aria-hidden="true" />
              <span className={s.osd} aria-hidden="true">CH {String(idx + 1).padStart(2, '0')}</span>
              {paused && !static_ && (
                <button type="button" className={s.bigPlay} onClick={togglePlay} aria-label={`Play ${ch.title}`}>▶</button>
              )}
            </div>
          </div>
          <div className={s.panel}>
            <span className={s.badge}>Mustard<br />TV</span>
            <button type="button" className={s.dial} style={{ ['--turn' as string]: `${idx * 45}deg` }} onClick={() => tune(idx + 1, 'dial')} aria-label="Next channel">
              <i aria-hidden="true" />
            </button>
            <span className={s.dialLabel}>Channel</span>
            <div className={s.rocker}>
              <button type="button" onClick={() => tune(idx - 1, 'down')} aria-label="Previous channel">▼</button>
              <button type="button" onClick={() => tune(idx + 1, 'up')} aria-label="Next channel">▲</button>
            </div>
            <button type="button" className={s.sound} onClick={toggleSound} aria-pressed={!muted}>
              {muted ? 'Sound on' : 'Mute'}
            </button>
            <span className={s.grille} aria-hidden="true" />
          </div>
        </div>
        <div className={s.feet} aria-hidden="true"><i /><i /></div>
      </div>

      <p className={s.now} aria-live="polite">
        <strong>Now showing:</strong> {ch.title} <span>· {ch.runtime}</span>
        <em>{ch.line}</em>
      </p>

      <ol className={s.guide} aria-label="Channel guide">
        {CHANNELS.map((c, i) => (
          <li key={c.key}>
            <button type="button" onClick={() => tune(i, 'guide')} aria-pressed={i === idx} className={s.chip}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {c.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
