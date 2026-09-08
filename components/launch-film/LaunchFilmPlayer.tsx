'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/*
 * The film player for The Launch Film page, and the one we install on a
 * client's site. Poster only until the click, because the film is eighteen
 * megabytes and a visitor who came to read should not pay for it.
 *
 * The browser does not get to pick the file. A <source> list asks canPlayType,
 * and a browser can answer "probably" for VP9 and then never decode a frame:
 * readyState stays 0, no error fires, the list never falls through, and the
 * visitor watches a spinner forever. That happened on the IRL homepage on
 * 2026-09-05. So this player asks Media Capabilities which cut the browser can
 * really decode, loads one file at a time, keeps a watchdog on it, and when
 * every cut has failed it offers the film as a plain link.
 */

export type FilmCut = { src: string; label: 'webm' | 'mp4' };

type Props = {
  cuts: { webm?: string; mp4: string };
  poster: string;
  /** Spoken before the click, e.g. "1:16". */
  runtime: string;
  /** Names the film in analytics events. */
  film: string;
  /** Widescreen by default; pass "tall" for a 9:16 frame. */
  aspect?: 'wide' | 'tall';
  title: string;
};

const STALL_MS = 8000;
const HAVE_CURRENT_DATA = 2;

async function orderCuts(cuts: Props['cuts']): Promise<FilmCut[]> {
  const mp4: FilmCut = { src: cuts.mp4, label: 'mp4' };
  if (!cuts.webm) return [mp4];
  const webm: FilmCut = { src: cuts.webm, label: 'webm' };
  try {
    const capabilities = navigator.mediaCapabilities;
    if (capabilities?.decodingInfo) {
      const info = await capabilities.decodingInfo({
        type: 'file',
        video: { contentType: 'video/webm; codecs="vp9"', width: 1920, height: 1080, bitrate: 1_100_000, framerate: 30 },
        audio: { contentType: 'audio/webm; codecs="opus"' },
      });
      return info.supported && info.smooth ? [webm, mp4] : [mp4, webm];
    }
  } catch {
    /* Fall through to canPlayType. */
  }
  const probe = document.createElement('video');
  return probe.canPlayType('video/webm; codecs="vp9,opus"') === 'probably' ? [webm, mp4] : [mp4, webm];
}

export default function LaunchFilmPlayer({ cuts, poster, runtime, film, aspect = 'wide', title }: Props) {
  const [order, setOrder] = useState<FilmCut[] | null>(null);
  const [index, setIndex] = useState(0);
  const video = useRef<HTMLVideoElement | null>(null);

  const cut = order && index < order.length ? order[index] : null;
  const exhausted = order !== null && index >= order.length;

  async function play() {
    trackEvent('launch_film_play', { film });
    setIndex(0);
    setOrder(await orderCuts(cuts));
  }

  function next() {
    setIndex((i) => i + 1);
  }

  useEffect(() => {
    const el = video.current;
    if (!el || !cut) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let extended = false;
    let done = false;

    const ready = () => {
      done = true;
      if (timer) clearTimeout(timer);
    };
    const check = () => {
      if (done) return;
      if (el.readyState >= HAVE_CURRENT_DATA) return ready();
      if (el.buffered.length > 0 && !extended) {
        extended = true;
        timer = setTimeout(check, STALL_MS);
        return;
      }
      trackEvent('launch_film_stall', { film, cut: cut.label });
      next();
    };
    const onError = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      trackEvent('launch_film_error', { film, cut: cut.label });
      next();
    };
    const onEnded = () => trackEvent('launch_film_watched', { film });

    el.addEventListener('loadeddata', ready);
    el.addEventListener('playing', ready);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);
    timer = setTimeout(check, STALL_MS);

    return () => {
      done = true;
      if (timer) clearTimeout(timer);
      el.removeEventListener('loadeddata', ready);
      el.removeEventListener('playing', ready);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, [cut, film]);

  const frame = aspect === 'tall' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <figure className="w-full">
      <div className={`relative ${frame} w-full overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#080C16] shadow-[8px_8px_0_0_#161616]`}>
        {cut ? (
          <video
            key={cut.src}
            ref={video}
            className="h-full w-full"
            controls
            autoPlay
            playsInline
            preload="auto"
            poster={poster}
            src={cut.src}
            data-cut={cut.label}
            data-film={film}
          />
        ) : exhausted ? (
          <div data-film-fallback className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-body text-base text-[#FBF6EA] max-w-md">
              This browser will not play the film here. It plays everywhere else, so open it on its own.
            </p>
            <a
              href={cuts.mp4}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center rounded-full border-2 border-[#F5B700] bg-[#161616] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700]"
            >
              Open the film
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={play}
            aria-label={`Play ${title}, ${runtime}`}
            className="group absolute inset-0 h-full w-full cursor-pointer border-0 p-0"
          >
            {/* The poster is a frame of the film, not a still made for the page. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster} alt={`A frame from ${title}`} className="h-full w-full object-cover" width={aspect === 'tall' ? 1080 : 1920} height={aspect === 'tall' ? 1920 : 1080} />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,22,0.05)_0%,rgba(8,12,22,0.25)_60%,rgba(8,12,22,0.7)_100%)]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[5px_5px_0_0_#161616] transition-transform duration-200 group-hover:scale-110 sm:h-24 sm:w-24">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 h-8 w-8 fill-[#161616] sm:h-9 sm:w-9">
                  <path d="M6 3.5v17l15-8.5z" />
                </svg>
              </span>
            </span>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#161616] bg-[#FBF6EA] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#161616] sm:bottom-6">
              Watch the film · {runtime}
            </span>
          </button>
        )}
      </div>
    </figure>
  );
}
