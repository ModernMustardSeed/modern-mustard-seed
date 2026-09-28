'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  POSTER_ADS,
  POSTER_DM,
  POSTER_FIRST_COMMENT,
  POSTER_HEIGHT,
  POSTER_PEOPLE,
  POSTER_WIDTH,
  forPerson,
  posterDownloadName,
  posterFile,
  posterPreview,
  type PosterAd,
  type PosterPerson,
} from '@/data/poster-ads';

/**
 * The Facebook poster ads, ready to post: every trade poster in its Call Sarah
 * and Call Anthony versions, a real download of the full resolution file, and
 * every caption with a copy button. Data lives in data/poster-ads.ts.
 *
 * The posters are static files under public/ads/posters-2026-09-28/, so the
 * download buttons are plain anchors with a download attribute, same as the
 * Social Cards library. The page shows a small WebP preview and downloads the
 * 2160 x 2700 JPG.
 *
 * The Sarah / Anthony switch changes the poster and the caption text together,
 * so what gets copied always names the person and number on the poster.
 */

type View = PosterPerson | 'both';
const VIEWS: { key: View; label: string }[] = [
  { key: 'sarah', label: 'Sarah' },
  { key: 'anthony', label: 'Anthony' },
  { key: 'both', label: 'Both' },
];
const PEOPLE: PosterPerson[] = ['sarah', 'anthony'];
const VIEW_KEY = 'mms-poster-ads-view';

const btn =
  'text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-white text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform';
const btnSolid =
  'text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform';
const eyebrow = 'text-[11px] font-mono font-bold uppercase tracking-[0.18em]';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={done ? btnSolid : btn}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function Poster({ ad, person }: { ad: PosterAd; person: PosterPerson }) {
  const p = POSTER_PEOPLE[person];
  const full = posterFile(ad.slug, person);
  return (
    <figure className="flex flex-col gap-3 min-w-0">
      <a
        href={full}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#F5B700] hover:shadow-[2px_2px_0_0_#F5B700] hover:-translate-y-0.5 transition-all"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterPreview(ad.slug, person)}
          alt={`${ad.name} poster, Call ${p.name} at ${p.phone}`}
          width={864}
          height={1080}
          loading="lazy"
          className="block w-full h-auto"
        />
      </a>
      <figcaption className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[12px] font-mono font-bold uppercase tracking-[0.12em] text-[#8f6600]">
          Call {p.name} · {p.phone}
        </span>
        <a href={full} download={posterDownloadName(ad.slug, person)} className={btnSolid}>
          Download
        </a>
      </figcaption>
    </figure>
  );
}

function CaptionBlock({ label, text, view }: { label: string; text: string; view: View }) {
  const shown = view === 'both' ? text : forPerson(text, view);
  return (
    <div className="border-2 border-[#161616] bg-[#FFFDF6] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`${eyebrow} text-[#E0301E]`}>{label}</span>
        <div className="flex gap-2 flex-wrap">
          {view === 'both' ? (
            PEOPLE.map((person) => (
              <CopyButton
                key={person}
                text={forPerson(text, person)}
                label={`Copy for ${POSTER_PEOPLE[person].name}`}
              />
            ))
          ) : (
            <CopyButton text={shown} />
          )}
        </div>
      </div>
      <p className="text-[14.5px] leading-relaxed text-[#161616]/85 whitespace-pre-line">{shown}</p>
    </div>
  );
}

function AdCard({ ad, view }: { ad: PosterAd; view: View }) {
  const people = view === 'both' ? PEOPLE : [view];
  return (
    <article
      id={ad.slug}
      className="scroll-mt-40 bg-white border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] p-5 sm:p-7 flex flex-col gap-6"
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-[#161616]">{ad.name}</h2>
        <span className={`${eyebrow} text-[#161616]/60`}>
          {ad.captions.length} caption{ad.captions.length === 1 ? '' : 's'}
        </span>
      </header>
      <div
        className={`grid gap-6 items-start ${
          view === 'both' ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]' : 'md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]'
        }`}
      >
        <div className={`grid gap-4 ${people.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {people.map((person) => (
            <Poster key={person} ad={ad} person={person} />
          ))}
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          {ad.captions.map((c) => (
            <CaptionBlock key={c.label} label={`Caption ${c.label}`} text={c.text} view={view} />
          ))}
          {view === 'both' && (
            <p className="text-[12.5px] leading-relaxed text-[#161616]/65">
              Shown in Sarah&apos;s version. Copy for Anthony swaps in {POSTER_PEOPLE.anthony.name} at{' '}
              {POSTER_PEOPLE.anthony.phone}.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PosterAds() {
  const [view, setView] = useState<View>('sarah');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === 'sarah' || saved === 'anthony' || saved === 'both') setView(saved);
    } catch {
      /* storage blocked: stay on the default */
    }
  }, []);

  function pick(v: View) {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage blocked: the switch still works for this visit */
    }
  }

  const captionCount = POSTER_ADS.reduce((n, a) => n + a.captions.length, 0);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="posters" title="Poster Ads" />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pb-12 flex flex-col">
        <header className="flex flex-col gap-4 py-10">
          <span className={`${eyebrow} text-[#E0301E]`}>Facebook groups · made 2026-09-28</span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-none tracking-tight text-[#161616]">
            Poster Ads
          </h1>
          <p className="text-[17px] leading-relaxed text-[#161616]/75 max-w-[64ch]">
            {POSTER_ADS.length} posters, each in a Call Sarah and a Call Anthony version, with {captionCount} captions
            ready to paste. Pick whose version you are posting and every poster and caption below switches with it,
            so the caption always names the same person and number as the poster.
          </p>
          <p className="text-[13.5px] leading-relaxed text-[#161616]/65 max-w-[64ch]">
            Download gets the full {POSTER_WIDTH} × {POSTER_HEIGHT} file, 4:5, native for the Facebook feed. Click a
            poster to open it full size.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3 mb-8">
          <div className="bg-[#F5B700] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 flex flex-col gap-3 text-[#161616]">
            <span className={eyebrow}>Posting rules</span>
            <ul className="flex flex-col gap-2 text-[14.5px] leading-snug font-semibold">
              <li>Read each group&apos;s rules before you post.</li>
              <li>Rotate captions. Never paste the same one twice in a row.</li>
              <li>10+ minutes between groups.</li>
              <li>8 groups a day, max.</li>
              <li>Post the first comment right away, under every post.</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`${eyebrow} text-[#E0301E]`}>First comment</span>
              <CopyButton text={POSTER_FIRST_COMMENT} />
            </div>
            <p className="text-[14.5px] leading-relaxed text-[#161616]/85">{POSTER_FIRST_COMMENT}</p>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`${eyebrow} text-[#E0301E]`}>DM template</span>
              <div className="flex gap-2 flex-wrap">
                {view === 'both' ? (
                  PEOPLE.map((person) => (
                    <CopyButton
                      key={person}
                      text={forPerson(POSTER_DM, person)}
                      label={`Copy for ${POSTER_PEOPLE[person].name}`}
                    />
                  ))
                ) : (
                  <CopyButton text={forPerson(POSTER_DM, view)} />
                )}
              </div>
            </div>
            <p className="text-[14.5px] leading-relaxed text-[#161616]/85">
              {forPerson(POSTER_DM, view === 'both' ? 'sarah' : view)}
            </p>
            <p className="text-[12.5px] leading-relaxed text-[#161616]/65">
              For owners you message directly. No link; attach the matching poster.
            </p>
          </div>
        </section>

        <nav
          className="-mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-[#FBF6EA] border-y-2 border-[#161616] flex items-center gap-2 flex-wrap"
          aria-label="Poster version and trades"
        >
          <span className={`${eyebrow} text-[#161616]/60`}>Version</span>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              className={view === v.key ? btnSolid : btn}
              onClick={() => pick(v.key)}
            >
              {v.label}
            </button>
          ))}
          <span className="hidden md:block w-px h-7 bg-[#161616]/25 mx-2" aria-hidden />
          <div className="flex gap-x-3 gap-y-1 flex-wrap">
            {POSTER_ADS.map((a) => (
              <a
                key={a.slug}
                href={`#${a.slug}`}
                className="text-[12px] font-mono font-bold uppercase tracking-[0.1em] text-[#161616]/70 hover:text-[#161616] underline-offset-4 hover:underline"
              >
                {a.name}
              </a>
            ))}
          </div>
        </nav>

        <div className="pt-8 flex flex-col gap-8">
          {POSTER_ADS.map((ad) => (
            <AdCard key={ad.slug} ad={ad} view={view} />
          ))}
        </div>

        <footer className="border-t-2 border-[#161616]/20 pt-5 mt-12 text-[12px] font-mono uppercase tracking-[0.14em] text-[#161616]/60">
          Files in public/ads/posters-2026-09-28 · captions in data/poster-ads.ts
        </footer>
      </main>
    </div>
  );
}
