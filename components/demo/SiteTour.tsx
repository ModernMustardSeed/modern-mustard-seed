'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * THE HOSTESS. The website welcomes you and walks you through itself.
 *
 * Sarah, 2026-08-06: *"can we use that same voice as a guide and hostess of the
 * website almost... it still has the voice agent that can book you and help
 * you, but theres also a welcome and business tour."* So the page now has two
 * mouths with strict right of way:
 *
 *   HOSTESS  proactive, one-way, pre-rendered, free. Offers herself, and yields.
 *   AGENT    reactive, two-way, live, metered. Always wins.
 *
 * ⛔ THEY MUST NEVER SPEAK AT ONCE. A visitor hearing two voices over each other
 * does not think "rich experience", they think the site is broken and they
 * leave. `voiceBusy` stops the hostess mid-word, and she does not resume: the
 * person is talking to a human-ish thing now, and interrupting THAT to finish a
 * tour would be worse than losing the tour.
 */

export type TourBeat = { id: string; anchor: string; text: string; ms: number; src: string };
export type Tour = { business: string; palette: { bg: string; accent: string }; beats: TourBeat[]; totalMs: number };

/** Readable ink for a background, so the card works on cream sites and noir ones alike. */
function inkFor(hex: string): { ink: string; dim: string } {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
  // Rec. 601 luma: good enough to choose black or white text.
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 140;
  return light ? { ink: '#12100e', dim: 'rgba(18,16,14,0.62)' } : { ink: '#f6f2ea', dim: 'rgba(246,242,234,0.66)' };
}

export default function SiteTour({
  siteId,
  manifestUrl,
  frame,
  voiceBusy,
  onActiveChange,
  invite,
}: {
  /** A built demo site. Its manifest is served signed, per site. */
  siteId?: string;
  /** A page that owns its own static manifest (our marketing site). */
  manifestUrl?: string;
  /**
   * The iframe the site lives in, same-origin so we can drive its scroll.
   * OMIT on a page that IS the site: the tour then scrolls the real window.
   */
  frame?: React.RefObject<HTMLIFrameElement | null>;
  /** True whenever a live voice agent is connecting or on a call. */
  voiceBusy: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Override the invitation copy. Defaults to the client-site wording. */
  invite?: { eyebrow?: string; line?: string };
}) {
  const url = manifestUrl ?? (siteId ? `/demo/site/${siteId}/tour` : null);
  const key = manifestUrl ?? siteId ?? 'tour';
  const [tour, setTour] = useState<Tour | null>(null);
  const [invited, setInvited] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(0);
  /** Cancels whatever glide is in flight. Only one camera move at a time. */
  const glideRef = useRef<(() => void) | null>(null);
  /** Bumps whenever the tour stops or restarts, so a settled glide from the
   *  previous run cannot wake up and start talking over the new one. */
  const runRef = useRef(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      // The demo route wraps its payload; a static manifest is the payload.
      .then((d) => { const t = d?.tour ?? d; if (alive && t?.beats?.length) setTour(t); })
      .catch(() => { /* no guide is a fine outcome */ });
    return () => { alive = false; };
  }, [url]);

  // The invitation, not the tour, is what "comes on when someone lands".
  //
  // ⚠️ A BROWSER WILL NOT LET A PAGE TALK TO A STRANGER UNPROMPTED. Chrome and
  // Safari block audio playback until the visitor interacts, and a page that
  // starts talking uninvited is exactly the behaviour those rules exist to
  // stop. So she appears, offers, and waits for one tap. That tap is also what
  // unlocks audio for the rest of the visit.
  useEffect(() => {
    if (!tour || done) return;
    try { if (sessionStorage.getItem(`mms_tour_${key}`) === 'seen') return; } catch { /* fine */ }
    const t = window.setTimeout(() => setInvited(true), 1400);
    return () => window.clearTimeout(t);
  }, [tour, key, done]);

  /**
   * Frame the section's CONTENT, not its padding box.
   *
   * Sarah, 2026-08-07: *"there is too much padding at top and it cuts bottom of
   * section off."* `scrollIntoView({block:'start'})` aligns the section's top
   * EDGE to the viewport top, and a well-designed section opens with a lot of
   * vertical padding. So the visitor got a screen of empty space while the
   * words the hostess was reading sat below the fold. Scroll to the section's
   * first heading instead, and pay back whatever a fixed header is covering.
   */
  const glideTo = useCallback((anchor: string): Promise<void> => {
    // With a frame we drive the embedded site; without one this page IS the
    // site, so the tour scrolls the real window.
    const doc = frame ? frame.current?.contentDocument : document;
    const win = frame ? doc?.defaultView : window;
    if (!doc || !win) return Promise.resolve();

    const settle = (top: number) => glide(win, top);

    if (anchor === 'top') return settle(0);

    const section = doc.getElementById(anchor);
    if (!section) return Promise.resolve();
    let target: Element = section.querySelector('h1, h2, h3') || section;
    // Take the eyebrow with the heading. Sections label themselves with a short
    // line above the h2 ("WHAT WE LIGHT"), and anchoring on the heading alone
    // slides that label up under the fixed header, where it reads as clipped.
    const eyebrow = target.previousElementSibling;
    const eyebrowText = eyebrow?.textContent?.trim() ?? '';
    if (eyebrow && eyebrowText.length > 0 && eyebrowText.length < 40) target = eyebrow;

    // A pinned header sits over whatever we scroll to, so measure the real one
    // rather than guessing a constant that is wrong on every other site. Only
    // count bars parked at the top and shorter than a third of the screen: a
    // full-height fixed overlay is not a header.
    let headerH = 0;
    for (const el of Array.from(doc.querySelectorAll('header, nav, [class*="fixed"], [class*="sticky"]'))) {
      const cs = win.getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.top <= 4 && r.height > 0 && r.height < win.innerHeight * 0.33) headerH = Math.max(headerH, r.height);
    }

    const top = win.scrollY + target.getBoundingClientRect().top - headerH - Math.round(win.innerHeight * 0.06);
    return settle(Math.max(0, top));

    /**
     * THE CAMERA MOVE. Sarah, 2026-08-08: *"make the audio tour a little more
     * fluid on mms site, it bounces around a bit and i dont love that."*
     *
     * Three things were causing the bounce, and this replaces all of them:
     *
     * 1. `behavior:'smooth'` runs at roughly ONE duration no matter the
     *    distance, so a hop between neighbours crawled and a flight across
     *    three full-screen chapters whipped. Here the duration scales with the
     *    distance and then caps, so every move reads like the same camera.
     * 2. It fired and the clip started talking in the same tick, so the visitor
     *    heard the sentence about a section while still flying past two others.
     *    This resolves near the end of the move, and `playFrom` waits on it.
     * 3. Landing a few pixels off a section you are already looking at reads as
     *    a twitch, not a move. Under an eighth of a screen, do not move at all.
     *
     * A human touching the wheel wins instantly: we cancel and let them drive.
     * Fighting a visitor for the scrollbar is the worst bounce of them all.
     */
    function glide(w: Window, to: number): Promise<void> {
      glideRef.current?.();
      const from = w.scrollY;
      const dist = to - from;
      if (Math.abs(dist) < w.innerHeight * 0.12) return Promise.resolve();
      if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        w.scrollTo({ top: to, behavior: 'instant' });
        return Promise.resolve();
      }

      // Long enough to read as a drive, short enough that she is not waiting.
      const ms = Math.min(1500, Math.max(620, Math.abs(dist) * 0.72));
      // She may start speaking just before the wheels stop. Arriving in silence
      // feels like a stall; arriving as she starts feels like one gesture.
      const speakAt = ms * 0.74;

      return new Promise<void>((resolve) => {
        const t0 = performance.now();
        let raf = 0;
        let spoken = false;
        const done = () => {
          w.cancelAnimationFrame(raf);
          w.removeEventListener('wheel', abort);
          w.removeEventListener('touchstart', abort);
          w.removeEventListener('keydown', abort);
          glideRef.current = null;
          if (!spoken) { spoken = true; resolve(); }
        };
        function abort() { done(); }
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / ms);
          // easeInOutCubic: pulls away and settles, no hard stop at either end.
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          // ⚠️ 'instant', NEVER 'auto'. Per CSSOM-View, behavior:'auto' means
          // "defer to the element's CSS scroll-behavior", and globals.css sets
          // that to smooth. So an 'auto' scrollTo per frame kicks off a fresh
          // browser easing sixty times a second, each one chasing the last:
          // the scroll lags, overshoots, and reverses. Measured in a harness
          // 2026-08-08: 'auto' gave 10 direction reversals and landed 5,600px
          // short of the target; 'instant' gives 0 reversals and lands exactly.
          // That mismatch IS the bounce Sarah saw.
          w.scrollTo({ top: Math.round(from + dist * e), behavior: 'instant' });
          if (!spoken && now - t0 >= speakAt) { spoken = true; resolve(); }
          if (p < 1) raf = w.requestAnimationFrame(step);
          else done();
        };
        glideRef.current = done;
        // Passive listeners: we are only watching for the human, never blocking.
        w.addEventListener('wheel', abort, { passive: true, once: true });
        w.addEventListener('touchstart', abort, { passive: true, once: true });
        w.addEventListener('keydown', abort, { once: true });
        raf = w.requestAnimationFrame(step);
      });
    }
  }, [frame]);

  const stop = useCallback((markSeen: boolean) => {
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ''; }
    audioRef.current = null;
    // Kill the camera too. Stopping the voice while the page kept flying was
    // its own kind of broken.
    glideRef.current?.();
    runRef.current += 1;
    setPlaying(false);
    setInvited(false);
    if (markSeen) {
      setDone(true);
      try { sessionStorage.setItem(`mms_tour_${key}`, 'seen'); } catch { /* fine */ }
    }
  }, [key]);

  // The agent always wins. Stop mid-word, and do not come back.
  useEffect(() => { if (voiceBusy && playing) stop(true); }, [voiceBusy, playing, stop]);
  useEffect(() => { onActiveChange?.(playing || invited); }, [playing, invited, onActiveChange]);
  useEffect(() => () => { audioRef.current?.pause(); glideRef.current?.(); }, []);

  const playFrom = useCallback((i: number) => {
    if (!tour || i >= tour.beats.length) { stop(true); return; }
    indexRef.current = i;
    setIndex(i);
    // Drive first, THEN talk. The glide resolves as the page settles, so the
    // sentence about a section arrives while that section is on screen instead
    // of somewhere over the two chapters we flew past to get here.
    const run = runRef.current;
    glideTo(tour.beats[i].anchor).then(() => {
      if (run !== runRef.current) return; // stopped, or restarted, mid-glide
      const a = audioRef.current ?? new Audio();
      audioRef.current = a;
      a.src = tour.beats[i].src;
      a.onended = () => {
        // A breath between stops. Shorter than it was, because the glide now
        // carries its own pause instead of racing the voice.
        window.setTimeout(() => { if (run === runRef.current) playFrom(indexRef.current + 1); }, 320);
      };
      // If the clip will not load, keep the tour moving rather than hanging.
      a.onerror = () => window.setTimeout(() => { if (run === runRef.current) playFrom(indexRef.current + 1); }, 200);
      a.play().then(() => setPlaying(true)).catch(() => stop(false));
    });
  }, [tour, glideTo, stop]);

  const start = () => { setInvited(false); runRef.current += 1; playFrom(0); };

  const theme = useMemo(() => {
    const bg = tour?.palette?.bg || '#0b0f14';
    const accent = tour?.palette?.accent || '#e4572e';
    return { bg, accent, ...inkFor(bg) };
  }, [tour]);

  if (!tour) return null;

  const beat = tour.beats[index];
  const secs = Math.round(tour.totalMs / 1000);
  const runtime = secs < 95 ? `${secs} second` : `${Math.round(secs / 30) / 2} minute`;

  return (
    // z-[80]: above the journey's letterbox (60), flock (55), and rail (70).
    // Nothing is allowed to sit on top of the hostess (Sarah: "i dont see the tour").
    <div className="fixed bottom-4 left-4 z-[80] max-w-[min(380px,calc(100vw-2rem))] print:hidden">
      {/* THE HOSTESS IS NEVER GONE. Declining, finishing, or a same-tab
          revisit used to unmount her entirely, and Sarah read that as broken
          ("tour in bottom left is gone", 2026-08-07). Whenever neither the
          invite nor the player is up, a small speaker chip keeps her one tap
          away. It still yields to Mr. Mustard while he has the floor. */}
      {!invited && !playing && !voiceBusy && (
        <button
          onClick={start}
          aria-label="Play the spoken tour"
          title="Play the spoken tour"
          className="flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-0.5"
          style={{ background: `${theme.bg}f2`, borderColor: `${theme.accent}80` }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" fill={theme.accent} stroke="none" />
            <path d="M16 9a4 4 0 0 1 0 6" />
            <path d="M19 6a8 8 0 0 1 0 12" />
          </svg>
        </button>
      )}
      {invited && !playing && (
        <div
          className="rounded-2xl border p-4 shadow-2xl backdrop-blur-sm animate-[tourIn_.5s_cubic-bezier(.2,.7,.2,1)]"
          style={{ background: `${theme.bg}f2`, borderColor: `${theme.accent}59`, color: theme.ink }}
        >
          {/* Sarah 2026-08-07: "lets make the opt in button more obvious." The
              first version was a quiet text button that read as a cookie
              banner. This one announces itself: a speaking-mark that pulses to
              say the page has a voice, then a full-width button in the site's
              own accent with a ring drawing the eye to it. The decline stays
              deliberately quiet, because it is not the action we want. */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: theme.accent }} />
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round">
                <path d="M11 5 6 9H3v6h3l5 4V5z" fill={theme.accent} stroke="none" />
                <path d="M16 9a4 4 0 0 1 0 6" />
                <path d="M19 6a8 8 0 0 1 0 12" />
              </svg>
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
              {invite?.eyebrow ?? tour.business}
            </p>
          </div>
          <p className="mt-2.5 text-[17px] font-semibold leading-snug" style={{ color: theme.ink }}>
            {invite?.line ?? 'Welcome. Would you like me to show you around?'}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: theme.dim }}>
            {/* Past a minute and a half, seconds stop reading as a length and
                start reading as a number. "A 123 second tour" is a commitment
                the visitor has to do arithmetic on. */}
            A {runtime} tour, out loud. Turn your sound on.
          </p>
          <button
            onClick={start}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ background: theme.accent, color: inkFor(theme.accent).ink, boxShadow: `0 0 0 3px ${theme.accent}33` }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Show me around
          </button>
          <button
            onClick={() => stop(true)}
            className="mt-1.5 w-full rounded-lg py-1.5 text-[12px] font-medium"
            style={{ color: theme.dim }}
          >
            No thanks
          </button>
        </div>
      )}

      {playing && beat && (
        <div
          className="rounded-2xl border p-4 shadow-2xl backdrop-blur-sm"
          style={{ background: `${theme.bg}f2`, borderColor: `${theme.accent}59`, color: theme.ink }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: theme.accent }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: theme.accent }} />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
              Showing you around
            </p>
          </div>
          {/* Captions are not decoration: they carry the tour for anyone with
              sound off, and they are the accessible version of a voice. */}
          <p className="mt-2 text-[14px] leading-snug" aria-live="polite" style={{ color: theme.ink }}>
            {beat.text}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => stop(true)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ borderColor: `${theme.accent}80`, color: theme.ink }}
            >
              Stop
            </button>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {tour.beats.map((b, i) => (
                <span
                  key={b.id}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === index ? 18 : 6,
                    background: i <= index ? theme.accent : `${theme.accent}40`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes tourIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
