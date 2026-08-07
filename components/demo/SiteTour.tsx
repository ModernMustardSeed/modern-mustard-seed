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
  frame,
  voiceBusy,
  onActiveChange,
}: {
  siteId: string;
  /** The iframe the site lives in. Same-origin, so we can drive its scroll. */
  frame: React.RefObject<HTMLIFrameElement | null>;
  /** True whenever the Vapi agent is connecting or on a call. */
  voiceBusy: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [invited, setInvited] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch(`/demo/site/${siteId}/tour`)
      .then((r) => r.json())
      .then((d) => { if (alive && d?.tour?.beats?.length) setTour(d.tour); })
      .catch(() => { /* no guide is a fine outcome */ });
    return () => { alive = false; };
  }, [siteId]);

  // The invitation, not the tour, is what "comes on when someone lands".
  //
  // ⚠️ A BROWSER WILL NOT LET A PAGE TALK TO A STRANGER UNPROMPTED. Chrome and
  // Safari block audio playback until the visitor interacts, and a page that
  // starts talking uninvited is exactly the behaviour those rules exist to
  // stop. So she appears, offers, and waits for one tap. That tap is also what
  // unlocks audio for the rest of the visit.
  useEffect(() => {
    if (!tour || done) return;
    try { if (sessionStorage.getItem(`mms_tour_${siteId}`) === 'seen') return; } catch { /* fine */ }
    const t = window.setTimeout(() => setInvited(true), 1400);
    return () => window.clearTimeout(t);
  }, [tour, siteId, done]);

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
  const scrollTo = useCallback((anchor: string) => {
    const doc = frame.current?.contentDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    if (anchor === 'top') { win.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    const section = doc.getElementById(anchor);
    if (!section) return;
    const target = section.querySelector('h1, h2, h3') || section;

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
    win.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [frame]);

  const stop = useCallback((markSeen: boolean) => {
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ''; }
    audioRef.current = null;
    setPlaying(false);
    setInvited(false);
    if (markSeen) {
      setDone(true);
      try { sessionStorage.setItem(`mms_tour_${siteId}`, 'seen'); } catch { /* fine */ }
    }
  }, [siteId]);

  // The agent always wins. Stop mid-word, and do not come back.
  useEffect(() => { if (voiceBusy && playing) stop(true); }, [voiceBusy, playing, stop]);
  useEffect(() => { onActiveChange?.(playing || invited); }, [playing, invited, onActiveChange]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const playFrom = useCallback((i: number) => {
    if (!tour || i >= tour.beats.length) { stop(true); return; }
    indexRef.current = i;
    setIndex(i);
    scrollTo(tour.beats[i].anchor);
    const a = audioRef.current ?? new Audio();
    audioRef.current = a;
    a.src = tour.beats[i].src;
    a.onended = () => {
      // A short breath between stops, so the scroll lands before she speaks.
      window.setTimeout(() => playFrom(indexRef.current + 1), 550);
    };
    // If the clip will not load, keep the tour moving rather than hanging.
    a.onerror = () => window.setTimeout(() => playFrom(indexRef.current + 1), 200);
    a.play().then(() => setPlaying(true)).catch(() => stop(false));
  }, [tour, scrollTo, stop]);

  const start = () => { setInvited(false); playFrom(0); };

  const theme = useMemo(() => {
    const bg = tour?.palette?.bg || '#0b0f14';
    const accent = tour?.palette?.accent || '#e4572e';
    return { bg, accent, ...inkFor(bg) };
  }, [tour]);

  if (!tour || done) return null;

  const beat = tour.beats[index];

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[min(380px,calc(100vw-2rem))] print:hidden">
      {invited && !playing && (
        <div
          className="rounded-2xl border p-4 shadow-2xl backdrop-blur-sm animate-[tourIn_.5s_cubic-bezier(.2,.7,.2,1)]"
          style={{ background: `${theme.bg}f2`, borderColor: `${theme.accent}59`, color: theme.ink }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
            {tour.business}
          </p>
          <p className="mt-2 text-[15px] leading-snug" style={{ color: theme.ink }}>
            Welcome. Would you like me to show you around?
          </p>
          <p className="mt-1 text-[12px]" style={{ color: theme.dim }}>
            About {Math.round(tour.totalMs / 1000)} seconds, with sound.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={start}
              className="rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5"
              style={{ background: theme.accent, color: inkFor(theme.accent).ink }}
            >
              Show me around
            </button>
            <button
              onClick={() => stop(true)}
              className="rounded-full px-3 py-2 text-[12px] font-medium"
              style={{ color: theme.dim }}
            >
              No thanks
            </button>
          </div>
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
