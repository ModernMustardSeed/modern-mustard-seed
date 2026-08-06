'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  type PrompterScript,
  type StudioConfig,
  type StudioTheme,
  scriptWordCount,
  scriptEstSeconds,
  isDirectionLine,
  fmtTime,
} from './types';
import { useBoothCamera, SelfView, TakesDrawer } from './useBoothRecorder';

/**
 * The shared prompter engine. It carries NO brand of its own: every color,
 * label, tab, script and API route arrives in the `studio` config, so
 * /sarah (Modern Mustard Seed) and /sarahcxc (Cross + Covenant) can look and
 * behave like two different houses while the scroll calibration, the recording
 * handshake and the keyboard map stay one implementation worth trusting.
 */

const READ_LINE_FRACTION = 0.3;

/** Fallback chip for a pillar a studio forgot to style. Never crashes a card. */
const PILLAR_FALLBACK = 'bg-[#e4ddcf] text-[#161616]';

type Settings = { speed: number; fontSize: number; mirror: boolean };
const DEFAULTS: Settings = { speed: 1, fontSize: 44, mirror: false };

function loadSettings(lsKey: string): Settings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(lsKey);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      speed: Math.min(3, Math.max(0.4, parsed.speed ?? 1)),
      fontSize: Math.min(76, Math.max(26, parsed.fontSize ?? 44)),
      mirror: Boolean(parsed.mirror),
    };
  } catch {
    return DEFAULTS;
  }
}

/** Direction cue: unmistakably not a spoken line. */
function DirectionCue({ text, fontSize, theme }: { text: string; fontSize: number; theme: StudioTheme }) {
  const size = Math.max(15, Math.round(fontSize * 0.46));
  return (
    <div
      className="mb-7 border-2 border-dashed px-4 py-3"
      style={{ borderColor: `${theme.accent}b3`, background: `${theme.accent}17` }}
    >
      <span
        className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ color: theme.accent }}
      >
        <span aria-hidden="true">▸</span> Direction · don&rsquo;t read aloud
      </span>
      <p className="font-serif italic" style={{ color: `rgba(${theme.creamRgb},0.75)`, fontSize: size, lineHeight: 1.4 }}>
        {text}
      </p>
    </div>
  );
}

/** MMS: the seed that grows a sprout as the read progresses. */
function SeedSprout({ progress, theme }: { progress: number; theme: StudioTheme }) {
  const stem = Math.min(1, Math.max(0, (progress - 0.02) / 0.6));
  const leaves = Math.min(1, Math.max(0, (progress - 0.45) / 0.35));
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" className="shrink-0">
      <g style={{ transformOrigin: '17px 38px', transform: `scaleY(${0.15 + stem * 0.85})`, transition: 'transform 400ms ease' }}>
        <path d="M17 38 C 17 30, 17 24, 17 16" stroke="#7FA98F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>
      <g style={{ opacity: leaves, transform: `scale(${0.5 + leaves * 0.5})`, transformOrigin: '17px 18px', transition: 'opacity 400ms ease, transform 400ms ease' }}>
        <path d="M17 18 C 10 16, 7 10, 8 6 C 13 7, 16 11, 17 16 Z" fill="#8FA98F" />
        <path d="M17 18 C 24 16, 27 10, 26 6 C 21 7, 18 11, 17 16 Z" fill="#7FA98F" />
      </g>
      <ellipse cx="17" cy="39" rx="5.5" ry="4.5" fill={theme.accent} stroke={theme.ink} strokeWidth="1.6" />
    </svg>
  );
}

/**
 * CXC: a cross that draws itself in light as the read progresses. Same job as
 * the MMS seed (it marks the reading line and shows how far in you are), but
 * it belongs to the other house. The upright draws first, the crossbar follows,
 * and the whole mark warms once the read is nearly home.
 */
function CrossMark({ progress, theme }: { progress: number; theme: StudioTheme }) {
  const upright = Math.min(1, Math.max(0, progress / 0.55));
  const bar = Math.min(1, Math.max(0, (progress - 0.4) / 0.45));
  const glow = Math.min(1, Math.max(0, (progress - 0.75) / 0.25));
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" className="shrink-0">
      {/* Faint full cross so the reading line always has a visible anchor, the
          way the MMS seed is visible from the very first frame. The bright
          strokes below draw over it as the read progresses. */}
      <path d="M17 40 L17 5" stroke={theme.accent} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity={0.22} />
      <path d="M6 16 L28 16" stroke={theme.accent} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity={0.22} />
      <path
        d="M17 40 L17 5"
        stroke={theme.accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - upright}
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
      <path
        d="M6 16 L28 16"
        stroke={theme.accentAlt}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - bar}
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
      <circle
        cx="17"
        cy="16"
        r="6.5"
        fill={theme.accent}
        style={{ opacity: glow * 0.28, transition: 'opacity 500ms ease' }}
      />
    </svg>
  );
}

/**
 * Eternal Optimist: a sun that rises as the read progresses. The book's own
 * image, and its closing line. The disc climbs from below the horizon, the rays
 * come out one by one as it clears, and the horizon stays lit the whole way so
 * the mark is never invisible at zero.
 */
function SunMark({ progress, theme }: { progress: number; theme: StudioTheme }) {
  const rise = Math.min(1, Math.max(0, progress));
  const cy = 34 - rise * 17; // below the line, then well above it
  const rays = Math.min(1, Math.max(0, (progress - 0.25) / 0.5));
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id="above-horizon">
          <rect x="0" y="0" width="34" height="34" />
        </clipPath>
      </defs>
      <g clipPath="url(#above-horizon)">
        <g style={{ transition: 'transform 400ms ease' }} transform={`translate(0 ${cy - 17})`}>
          <circle cx="17" cy="17" r="6.5" fill={theme.accent} />
          <g style={{ opacity: rays, transition: 'opacity 500ms ease' }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="17"
                y1="7.5"
                x2="17"
                y2="3.5"
                stroke={theme.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                transform={`rotate(${deg} 17 17)`}
              />
            ))}
          </g>
        </g>
      </g>
      {/* The horizon: always lit, so there is a mark from the very first frame. */}
      <line x1="3" y1="34" x2="31" y2="34" stroke={theme.accentAlt} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ReadingMark({ progress, studio }: { progress: number; studio: StudioConfig }) {
  if (studio.mark === 'cross') return <CrossMark progress={progress} theme={studio.theme} />;
  if (studio.mark === 'sun') return <SunMark progress={progress} theme={studio.theme} />;
  return <SeedSprout progress={progress} theme={studio.theme} />;
}

export default function Prompter({ studio }: { studio: StudioConfig }) {
  const { theme } = studio;
  const NIGHT = theme.night;
  const CREAM = theme.cream;
  const GOLD = theme.accent;
  const INK = theme.ink;
  /** Translucent helpers so every surface tints with the studio, not with MMS. */
  const dim = useCallback((a: number) => `rgba(${theme.creamRgb},${a})`, [theme.creamRgb]);
  const night = useCallback((a: number) => `rgba(${theme.nightRgb},${a})`, [theme.nightRgb]);
  const acc = useCallback(
    (a: number) => `${theme.accent}${Math.round(a * 255).toString(16).padStart(2, '0')}`,
    [theme.accent],
  );
  const PROMPTER_SCRIPTS = studio.scripts;

  const [active, setActive] = useState<PrompterScript | null>(null);
  const [playing, setPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const booth = useBoothCamera(studio.apiBase);
  const [showTakes, setShowTakes] = useState(false);
  const [selfViewOn, setSelfViewOn] = useState(true);
  const [tab, setTab] = useState<string>(studio.tabs[0][0]);
  const [finals, setFinals] = useState<{ name: string; path: string; signedUrl: string | null }[]>([]);
  useEffect(() => {
    fetch(`${studio.apiBase}/finals`, { method: 'POST' })
      .then((r) => r.json())
      .then((j) => setFinals(Array.isArray(j.finals) ? j.finals : []))
      .catch(() => {});
  }, [studio.apiBase]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const yRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const hudTsRef = useRef(0);
  const measuresRef = useRef({ totalH: 1, readLineY: 0 });
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const activeRef = useRef<PrompterScript | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Namespaced per studio so MMS speed/size/mirror never overwrite CXC's.
  const lsKey = `${studio.id}-prompter-settings`;
  useEffect(() => {
    setSettings(loadSettings(lsKey));
  }, [lsKey]);
  useEffect(() => {
    speedRef.current = settings.speed;
    try {
      window.localStorage.setItem(lsKey, JSON.stringify(settings));
    } catch {}
  }, [settings, lsKey]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const applyY = useCallback((y: number) => {
    yRef.current = y;
    if (columnRef.current) columnRef.current.style.transform = `translateY(${y}px)`;
  }, []);

  const measure = useCallback(
    (preserveFraction: boolean) => {
      const vp = viewportRef.current;
      const col = columnRef.current;
      if (!vp || !col) return;
      const prev = measuresRef.current;
      const frac = preserveFraction ? (prev.readLineY - yRef.current) / prev.totalH : 0;
      const readLineY = vp.clientHeight * READ_LINE_FRACTION;
      const totalH = Math.max(1, col.scrollHeight);
      measuresRef.current = { totalH, readLineY };
      applyY(readLineY - Math.min(Math.max(frac, 0), 1) * totalH);
    },
    [applyY],
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const { totalH, readLineY } = measuresRef.current;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      if (playingRef.current && active) {
        const basePxPerSec = totalH / Math.max(30, scriptEstSeconds(active));
        applyY(yRef.current - basePxPerSec * speedRef.current * dt);
        elapsedRef.current += dt;
        const traveled = readLineY - yRef.current;
        if (traveled >= totalH) {
          playingRef.current = false;
          setPlaying(false);
          setDone(true);
          setProgress(1);
          stopRaf();
          return;
        }
        if (ts - hudTsRef.current > 200) {
          hudTsRef.current = ts;
          setProgress(Math.min(1, Math.max(0, traveled / totalH)));
          setElapsed(elapsedRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [active, applyY, stopRaf],
  );

  useEffect(() => {
    if (playing) {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
    return stopRaf;
  }, [playing, tick, stopRaf]);

  const openScript = useCallback(
    (s: PrompterScript) => {
      setActive(s);
      setDone(false);
      setStarted(false);
      setPlaying(false);
      setCountdown(null);
      setProgress(0);
      setElapsed(0);
      elapsedRef.current = 0;
      requestAnimationFrame(() => measure(false));
    },
    [measure],
  );

  /** Section label at the current read position, for take file naming. */
  const currentSectionLabel = useCallback(() => {
    const col = columnRef.current;
    const s = activeRef.current;
    if (!col || !s) return 's01';
    const { readLineY } = measuresRef.current;
    const traveled = readLineY - yRef.current;
    let idx = 0;
    Array.from(col.querySelectorAll<HTMLElement>('[data-section]')).forEach((el, i) => {
      if (el.offsetTop <= traveled + 8) idx = i;
    });
    const slug = (s.sections[idx]?.heading || 'section')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return `s${String(idx + 1).padStart(2, '0')}-${slug}`;
  }, []);

  const backToLibrary = useCallback(() => {
    if (booth.recording) booth.stopTake();
    setPlaying(false);
    setCountdown(null);
    setActive(null);
    setShowTakes(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  }, [booth]);

  const restart = useCallback(() => {
    if (booth.recording) booth.stopTake();
    setDone(false);
    setStarted(false);
    setPlaying(false);
    setCountdown(null);
    setProgress(0);
    setElapsed(0);
    elapsedRef.current = 0;
    measure(false);
  }, [measure, booth]);

  const beginCountdown = useCallback(() => {
    setDone(false);
    setStarted(true);
    setCountdown(3);
    // Camera or screen armed: the take rolls from the countdown so nothing gets clipped.
    const s = activeRef.current;
    if (booth.canRecord && !booth.recording && s) booth.startTake(s.id, currentSectionLabel());
  }, [booth, currentSectionLabel]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setPlaying(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 900);
    return () => clearTimeout(t);
  }, [countdown]);

  const togglePlay = useCallback(() => {
    if (done) {
      restart();
      return;
    }
    if (!started) {
      beginCountdown();
      return;
    }
    if (countdown !== null) return;
    if (playing) {
      // Pausing ends the take; it uploads itself in the background.
      if (booth.recording) booth.stopTake();
      setPlaying(false);
    } else {
      const s = activeRef.current;
      if (booth.canRecord && !booth.recording && s) booth.startTake(s.id, currentSectionLabel());
      setPlaying(true);
    }
  }, [done, started, countdown, playing, beginCountdown, restart, booth, currentSectionLabel]);

  // Script end also ends the take.
  useEffect(() => {
    if (done && booth.recording) booth.stopTake();
  }, [done, booth]);

  const jumpSection = useCallback(
    (dir: 1 | -1) => {
      const col = columnRef.current;
      if (!col) return;
      const { readLineY } = measuresRef.current;
      const tops = Array.from(col.querySelectorAll<HTMLElement>('[data-section]')).map((el) => el.offsetTop);
      const traveled = readLineY - yRef.current;
      let target: number | undefined;
      if (dir === 1) target = tops.find((t) => t > traveled + 8);
      else target = [...tops].reverse().find((t) => t < traveled - 8);
      if (target === undefined) target = dir === 1 ? tops[tops.length - 1] : 0;
      applyY(readLineY - target);
      const { totalH } = measuresRef.current;
      setProgress(Math.min(1, Math.max(0, target / totalH)));
    },
    [applyY],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen();
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    measure(true);
    const onResize = () => measure(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, settings.fontSize, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSettings((s) => ({ ...s, speed: Math.min(3, Math.round((s.speed + 0.1) * 10) / 10) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSettings((s) => ({ ...s, speed: Math.max(0.4, Math.round((s.speed - 0.1) * 10) / 10) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        jumpSection(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpSection(-1);
      } else if (e.key === '+' || e.key === '=') {
        setSettings((s) => ({ ...s, fontSize: Math.min(76, s.fontSize + 2) }));
      } else if (e.key === '-') {
        setSettings((s) => ({ ...s, fontSize: Math.max(26, s.fontSize - 2) }));
      } else if (e.key.toLowerCase() === 'm') {
        setSettings((s) => ({ ...s, mirror: !s.mirror }));
      } else if (e.key.toLowerCase() === 'c') {
        setSelfViewOn((v) => !v);
      } else if (e.key.toLowerCase() === 't') {
        setShowTakes((v) => !v);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'r') {
        restart();
      } else if (e.key === 'Escape') {
        if (playingRef.current) setPlaying(false);
        else backToLibrary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, togglePlay, jumpSection, toggleFullscreen, restart, backToLibrary]);

  /* ---------------------------------- library ---------------------------------- */

  if (!active) {
    return (
      <main className="min-h-screen" style={{ background: NIGHT }}>
        <div
          className="mx-auto max-w-3xl px-5 pb-24 pt-16 sm:pt-24"
          style={{ backgroundImage: `radial-gradient(60rem 30rem at 50% -10%, ${GOLD}17, transparent)` }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            {studio.kicker}
          </p>
          <h1 className="font-display mt-3 text-5xl font-bold sm:text-7xl" style={{ color: CREAM }}>
            {studio.title}
          </h1>
          <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: dim(0.72) }}>
            {studio.blurb}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {studio.tabs.map(([k, label]) => {
              const count = PROMPTER_SCRIPTS.filter((s) => s.kind === k).length;
              const on = tab === k;
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5"
                  style={{
                    background: on ? GOLD : 'transparent',
                    borderColor: on ? INK : dim(0.3),
                    color: on ? INK : dim(0.75),
                    boxShadow: on ? `3px 3px 0 0 ${CREAM}33` : 'none',
                  }}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-6">
            {PROMPTER_SCRIPTS.filter((s) => s.kind === tab).map((s) => {
              const words = scriptWordCount(s);
              return (
                <button
                  key={s.id}
                  onClick={() => openScript(s)}
                  className="group block w-full border-2 text-left transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4"
                  style={{ background: CREAM, borderColor: INK, boxShadow: `6px 6px 0 0 ${theme.accentAlt}` }}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.accentAlt }}>
                        {s.episode}
                      </span>
                      <span
                        className={`border font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${studio.pillarStyles[s.pillar] ?? PILLAR_FALLBACK}`}
                        style={{ borderColor: INK, padding: '1px 7px' }}
                      >
                        {s.pillar}
                      </span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: `${INK}99` }}>
                        {s.session}
                      </span>
                    </div>
                    <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl" style={{ color: INK }}>
                      {s.title}
                    </h2>
                    <p className="font-serif mt-2 text-lg italic leading-snug" style={{ color: `${INK}bf` }}>
                      &ldquo;{s.hook}&rdquo;
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: `${INK}99` }}>
                        ~{fmtTime(scriptEstSeconds(s))} read · {words} words · {s.publish}
                      </span>
                      <span
                        className="ml-auto inline-block border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-transform duration-150 group-hover:translate-x-0.5"
                        style={{ background: GOLD, borderColor: INK, color: INK, boxShadow: `3px 3px 0 0 ${INK}` }}
                      >
                        Load the Prompter →
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 border-t pt-6" style={{ borderColor: dim(0.15) }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                Finished cuts{finals.length > 0 ? ` (${finals.length})` : ''}
              </p>
              {studio.publisher && (
                <a href={studio.publisher.href} className="font-mono text-[11px] uppercase underline" style={{ color: dim(0.82) }}>
                  {studio.publisher.label} →
                </a>
              )}
            </div>
            {finals.length === 0 ? (
              <p className="mt-2 font-mono text-[11px] leading-relaxed" style={{ color: dim(0.5) }}>
                {studio.finalsEmpty}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {finals.map((f) => (
                  <div key={f.path} className="border p-3" style={{ borderColor: dim(0.18), background: dim(0.04) }}>
                    {f.signedUrl && (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={f.signedUrl} controls preload="metadata" className="w-full aspect-video" style={{ background: '#000' }} />
                    )}
                    <p className="mt-2 truncate font-mono text-[11px]" style={{ color: CREAM }}>{f.name}</p>
                    {studio.publisher && (
                      <a href={studio.publisher.href} className="font-mono text-[10px] uppercase underline" style={{ color: GOLD }}>
                        {studio.publisher.label} →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-6" style={{ borderColor: dim(0.15) }}>
            <p className="font-mono text-[11px] leading-relaxed" style={{ color: dim(0.45) }}>
              PRIVATE BOOTH · not linked, not indexed. Takes from this room go to {studio.bucketLabel} and nowhere
              else. Arm the camera and every play/pause cycle records a take, sends it to Claude for the edit, and
              keeps it to rewatch. Dashed &ldquo;Direction&rdquo; blocks are notes from Claude, never read them
              aloud. SPACE play/pause (and record) · ↑↓ speed · ←→ sections · +/− text size · M mirror
              (beam-splitter rig) · C self-view · T takes + replay · F fullscreen · R restart · ESC pause/exit.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------------------------- prompter ---------------------------------- */

  const est = scriptEstSeconds(active);
  const readLinePct = READ_LINE_FRACTION * 100;

  return (
    // z-[130] keeps the booth above the site cookie banner (z-[120]); consent stays reachable on the library view
    <main ref={shellRef} className="fixed inset-0 z-[130] overflow-hidden" style={{ background: NIGHT }}>
      {/* progress bar */}
      <div className="absolute left-0 top-0 z-40 h-[3px] w-full" style={{ background: dim(0.12) }}>
        <div className="h-full transition-[width] duration-200" style={{ width: `${progress * 100}%`, background: GOLD }} />
      </div>

      {/* lens marker */}
      <div className="pointer-events-none absolute left-1/2 top-2.5 z-40 -translate-x-1/2 text-center">
        <div
          className="mx-auto h-2.5 w-2.5 rounded-full border"
          style={{ borderColor: GOLD, boxShadow: `0 0 8px ${GOLD}66` }}
        />
        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: acc(0.6) }}>
          Lens
        </div>
      </div>

      {/* top HUD */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={backToLibrary}
            className="shrink-0 border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-[#FBF6EA]/10"
            style={{ borderColor: dim(0.3), color: dim(0.8) }}
            aria-label="Back to scripts"
          >
            ← Scripts
          </button>
          <div className="hidden max-w-[34vw] truncate font-mono text-[11px] uppercase tracking-[0.14em] lg:block" style={{ color: dim(0.55) }}>
            {active.episode} · {active.title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {booth.recording && (
            <span className="flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: '#E0301E', color: '#FBF6EA', background: 'rgba(224,48,30,0.25)' }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: '#E0301E' }} />
              Rec
            </span>
          )}
          {!booth.enabled ? (
            <button
              onClick={() => void booth.enable()}
              className="border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ borderColor: GOLD, color: GOLD }}
              aria-label="Enable the booth camera"
            >
              Cam On
            </button>
          ) : (
            <button
              onClick={() => !booth.recording && booth.disable()}
              className="border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: dim(0.3), color: dim(0.6) }}
              aria-label="Turn the camera off"
              title={booth.recording ? 'Recording; pause first' : 'Turn the camera off'}
            >
              Cam Off
            </button>
          )}
          {!booth.screenReady ? (
            <button
              onClick={() => void booth.enableScreen()}
              className="border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ borderColor: GOLD, color: GOLD }}
              aria-label="Share your screen for a demo walkthrough take"
            >
              Screen
            </button>
          ) : (
            <button
              onClick={() => !booth.recording && booth.disableScreen()}
              className="border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: '#7FA98F', color: '#7FA98F' }}
              aria-label="Stop sharing the screen"
              title={booth.recording ? 'Recording; pause first' : 'Stop sharing the screen'}
            >
              Screen ●
            </button>
          )}
          <button
            onClick={() => setShowTakes((v) => !v)}
            className="border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ borderColor: dim(0.3), color: dim(0.8) }}
            aria-label="Open the takes drawer (T)"
          >
            Takes{booth.takes.length > 0 ? ` (${booth.takes.length})` : ''}
          </button>
          <div className="font-mono text-[12px] tabular-nums" style={{ color: dim(0.8) }}>
            {fmtTime(elapsed)} <span style={{ color: dim(0.4) }}>/ ~{fmtTime(est)}</span>
          </div>
        </div>
      </div>

      {/* text viewport */}
      <div ref={viewportRef} className="absolute inset-0">
        <div
          ref={columnRef}
          className="mx-auto max-w-4xl px-6 will-change-transform sm:px-10"
          style={{ transform: 'translateY(0px)' }}
        >
          <div style={{ transform: settings.mirror ? 'scaleX(-1)' : 'none' }}>
            {active.sections.map((sec, i) => (
              <section key={sec.heading} data-section>
                {i > 0 && (
                  <div className="my-8 flex justify-center gap-3" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: acc(0.5) }} />
                    ))}
                  </div>
                )}
                <h3
                  className="mb-5 font-mono text-[12px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: acc(0.75) }}
                >
                  {sec.heading}
                </h3>
                {sec.paragraphs.map((p, j) =>
                  isDirectionLine(p) ? (
                    <DirectionCue key={j} text={p} fontSize={settings.fontSize} theme={theme} />
                  ) : (
                    <p
                      key={j}
                      className="mb-7 font-semibold"
                      style={{ color: CREAM, fontSize: settings.fontSize, lineHeight: 1.45 }}
                    >
                      {p}
                    </p>
                  ),
                )}
              </section>
            ))}
            <div className="h-8" />
          </div>
        </div>
      </div>

      {/* focus masks */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10"
        style={{
          height: `calc(${readLinePct}% - 70px)`,
          background: `linear-gradient(to bottom, ${NIGHT} 22%, ${night(0.55)} 75%, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
        style={{
          top: `calc(${readLinePct}% + 150px)`,
          background: `linear-gradient(to top, ${NIGHT} 6%, ${night(0.5)} 60%, transparent)`,
        }}
      />

      {/* the Seed Line */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center gap-2 px-2 sm:px-4"
        style={{ top: `${readLinePct}%` }}
      >
        <ReadingMark progress={progress} studio={studio} />
        <div className="h-[2px] flex-1" style={{ background: `linear-gradient(to right, ${GOLD}, ${acc(0.15)})` }} />
      </div>

      {/* director's note + camera arm (pre-roll) */}
      {!started && !done && countdown === null && (
        <div className="absolute bottom-24 left-1/2 z-30 w-[min(92vw,640px)] -translate-x-1/2 sm:bottom-28">
          {!booth.canRecord && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-2 px-4 py-2.5" style={{ background: '#0B1019', borderColor: GOLD }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: dim(0.8) }}>
                Arm the camera (face takes) or the screen (demo walkthroughs), or both for a face bubble.
              </p>
              <span className="flex shrink-0 gap-2">
                <button
                  onClick={() => void booth.enable()}
                  className="border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: GOLD, borderColor: INK, color: INK }}
                >
                  Arm Camera
                </button>
                <button
                  onClick={() => void booth.enableScreen()}
                  className="border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: 'transparent', borderColor: GOLD, color: GOLD }}
                >
                  Share Screen
                </button>
              </span>
            </div>
          )}
          {booth.camError && (
            <div className="mb-2 border-2 px-4 py-2" style={{ background: '#E0301E', borderColor: INK }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: CREAM }}>
                Camera blocked: {booth.camError}. Allow camera + mic for this site and try again.
              </p>
            </div>
          )}
          {booth.screenError && (
            <div className="mb-2 border-2 px-4 py-2" style={{ background: '#E0301E', borderColor: INK }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: CREAM }}>
                {booth.screenError}
              </p>
            </div>
          )}
          <div className="border-2 p-4 sm:p-5" style={{ background: CREAM, borderColor: INK, boxShadow: `5px 5px 0 0 ${GOLD}` }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              Director&rsquo;s Note
            </p>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: `${INK}d9` }}>
              {active.directorNote}
            </p>
          </div>
        </div>
      )}

      {/* booth camera self-view + takes */}
      <SelfView booth={booth} visible={selfViewOn && !done} theme={theme} />
      <TakesDrawer booth={booth} open={showTakes} onClose={() => setShowTakes(false)} theme={theme} bucketLabel={studio.bucketLabel} />

      {/* countdown */}
      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: night(0.82) }}>
          <div className="text-center">
            <div
              key={countdown}
              className="font-display animate-ping-once text-[9rem] font-bold leading-none sm:text-[13rem]"
              style={{ color: GOLD, textShadow: `0 0 60px ${GOLD}55` }}
            >
              {countdown}
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: dim(0.6) }}>
              Eyes to the lens
            </p>
          </div>
        </div>
      )}

      {/* end card */}
      {done && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: night(0.94) }}>
          <div className="max-w-xl text-center">
            <div className="mx-auto mb-6 w-fit scale-[1.8]">
              <ReadingMark progress={1} studio={studio} />
            </div>
            <h2 className="font-display text-5xl font-bold sm:text-6xl" style={{ color: CREAM }}>
              {studio.endCard.title}
            </h2>
            <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: acc(0.85) }}>
              {active.episode} · {fmtTime(elapsed)} on the clock · {scriptWordCount(active)} words
            </p>
            <p className="font-serif mt-4 text-xl italic" style={{ color: dim(0.75) }}>
              {studio.endCard.creed}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={restart}
                className="border-2 px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{ background: GOLD, borderColor: INK, color: INK, boxShadow: `4px 4px 0 0 ${CREAM}33` }}
              >
                Run It Again
              </button>
              <button
                onClick={backToLibrary}
                className="border-2 px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{ borderColor: dim(0.4), color: CREAM }}
              >
                Back to Scripts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-3 pb-4 pt-2 sm:gap-3">
        <div
          className="flex items-center gap-1.5 border-2 px-2.5 py-2 sm:gap-2 sm:px-3"
          style={{ background: night(0.85), borderColor: dim(0.2), backdropFilter: 'blur(6px)' }}
        >
          <ControlBtn theme={theme} label="Restart (R)" onClick={restart}>
            ↺
          </ControlBtn>
          <ControlBtn theme={theme} label="Slower (↓)" onClick={() => setSettings((s) => ({ ...s, speed: Math.max(0.4, Math.round((s.speed - 0.1) * 10) / 10) }))}>
            −
          </ControlBtn>
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
            className="mx-1 flex h-12 w-12 items-center justify-center border-2 text-xl font-bold transition-transform hover:scale-105 sm:h-14 sm:w-14"
            style={{ background: GOLD, borderColor: INK, color: INK, boxShadow: `3px 3px 0 0 ${dim(0.25)}` }}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <ControlBtn theme={theme} label="Faster (↑)" onClick={() => setSettings((s) => ({ ...s, speed: Math.min(3, Math.round((s.speed + 0.1) * 10) / 10) }))}>
            +
          </ControlBtn>
          <span className="w-12 text-center font-mono text-[11px] tabular-nums" style={{ color: dim(0.75) }}>
            {settings.speed.toFixed(1)}x
          </span>
          <span className="mx-1 h-6 w-px" style={{ background: dim(0.15) }} />
          <ControlBtn theme={theme} label="Smaller text (−)" onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(26, s.fontSize - 2) }))}>
            A−
          </ControlBtn>
          <ControlBtn theme={theme} label="Bigger text (+)" onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(76, s.fontSize + 2) }))}>
            A+
          </ControlBtn>
          <ControlBtn theme={theme} label="Mirror for beam-splitter rig (M)" active={settings.mirror} onClick={() => setSettings((s) => ({ ...s, mirror: !s.mirror }))}>
            ⇋
          </ControlBtn>
          <ControlBtn theme={theme} label="Fullscreen (F)" onClick={toggleFullscreen} className="hidden sm:flex">
            ⛶
          </ControlBtn>
        </div>
      </div>

      <style>{`
        @keyframes ping-once {
          0% {
            transform: scale(1.25);
            opacity: 0;
          }
          35% {
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-ping-once {
          animation: ping-once 500ms ease-out both;
        }
      `}</style>
    </main>
  );
}

function ControlBtn({
  children,
  label,
  onClick,
  active,
  className = '',
  theme,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  theme: StudioTheme;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center border font-mono text-[13px] transition-colors ${className}`}
      style={{
        borderColor: active ? theme.accent : `rgba(${theme.creamRgb},0.25)`,
        color: active ? theme.accent : `rgba(${theme.creamRgb},0.8)`,
        background: active ? `${theme.accent}1f` : 'transparent',
      }}
    >
      {children}
    </button>
  );
}
