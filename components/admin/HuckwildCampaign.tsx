'use client';
import { useRef, useState } from 'react';
import copy from '@/data/huckwild-campaign.json';

/**
 * The HUCKWILD launch film: 64 seconds, 30 bars at 112.5 BPM, recorded frame
 * by frame from the live site's WebGL glass, with an original synthesised
 * score at -14 LUFS. Every shape comes in three files: the ad cut (1080p,
 * about 3.6 Mbps, for Meta and TikTok uploads), a small MP4 under 6 MB for
 * capped upload forms and texting, and a WebM for the web. The 180 MB masters
 * stay in the source rig: dev/mms/marketing/huckwild-film-2026-10-01/out.
 * HUCKWILD is a concept build; the studio angle says so.
 */
const BASE = '/ads/huckwild';
const card = 'rounded-2xl bg-white p-5 text-[#33123F] shadow-[0_20px_40px_-28px_rgba(51,18,63,0.6)] ring-1 ring-[#33123F]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4B2160] px-5 py-3 text-sm font-bold text-white hover:bg-[#33123F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E9A83A]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#33123F] ring-2 ring-[#E9A83A] hover:bg-[#F6ECDC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4B2160]';

const CUTS = [
  { shape: 'vertical', title: 'Reels, TikTok and Stories', ratio: '9:16 · 1080 x 1920', ad: '29 MB', small: '5 MB', webm: '12 MB', w: 1080, h: 1920 },
  { shape: 'square', title: 'Square feed', ratio: '1:1 · 1080 x 1080', ad: '32 MB', small: '6 MB', webm: '8 MB', w: 1080, h: 1080 },
  { shape: 'wide', title: 'Widescreen', ratio: '16:9 · 1920 x 1080', ad: '29 MB', small: '5 MB', webm: '11 MB', w: 1920, h: 1080 },
];

function CopyCard({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      area.current?.focus();
      area.current?.select();
      setStatus('Text selected. Use your device copy command.');
    }
  }
  return <article className={card}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold">{title}</h3>
      <button type="button" onClick={copyText} className={quiet} aria-label={`Copy ${title}`}>Copy</button>
    </div>
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(14, Math.max(3, Math.ceil(text.length / 70)))} className="w-full resize-y rounded-xl border-0 bg-[#F6ECDC] p-3 text-sm leading-relaxed text-[#33123F] ring-1 ring-[#33123F]/10" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#33123F]/75">{status}</p>
  </article>;
}

export default function HuckwildCampaign() {
  return <div id="huckwild-campaign" className="space-y-7 text-[#33123F]">
    <section className="overflow-hidden rounded-3xl bg-[#F6ECDC] text-[#33123F] ring-1 ring-[#33123F]/10">
      <div className="h-6 bg-[repeating-linear-gradient(90deg,#4B2160_0_36px,#C33149_36px_72px,#E9A83A_72px_108px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C33149]">Launch film / HUCKWILD · Concept build</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl">Drink the legend. <span className="font-normal text-[#4B2160]">Stir the glass.</span></h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#4B2160]">A 64-second launch film for HUCKWILD, the wild Montana huckleberry drink mix. Every frame comes from the live site: the WebGL glass you stir, berries tapped until they burst, the page taking the ink, and the 400 numbered pouches of Patch 001. Original score mastered to -14 LUFS. No narration, so it plays muted; the type carries the story.</p>
      </div>
    </section>

    <section className={card} aria-labelledby="huckwild-download">
      <h3 id="huckwild-download" className="text-xl font-bold">Download every format</h3>
      <p className="mt-1 text-sm text-[#4B2160]">The ad cut is the one to upload to Meta or TikTok. The small MP4 fits upload forms that cap at 10 MB. WebM is for the web. On iPhone a download lands in Files, Downloads; share it from there to Photos or Instagram.</p>
      <div className="mt-4 space-y-5">
        {CUTS.map((c) => <div key={c.shape}>
          <p className="mb-2 text-sm font-bold">{c.title} <span className="font-medium text-[#4B2160]">· {c.ratio} · 64 sec</span></p>
          <div className="grid gap-3 sm:grid-cols-3">
            <a className={button + ' w-full justify-between'} href={`${BASE}/huckwild-${c.shape}.mp4`} download>
              <span className="text-left">Ad cut, MP4<span className="block text-xs font-medium text-white/75">{c.ad} · with score</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#E9A83A] text-[#33123F]">↓</span>
            </a>
            <a className={button + ' w-full justify-between'} href={`${BASE}/huckwild-${c.shape}-small.mp4`} download>
              <span className="text-left">Small MP4<span className="block text-xs font-medium text-white/75">{c.small} · with score</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#E9A83A] text-[#33123F]">↓</span>
            </a>
            <a className={button + ' w-full justify-between'} href={`${BASE}/huckwild-${c.shape}.webm`} download>
              <span className="text-left">WebM<span className="block text-xs font-medium text-white/75">{c.webm} · for the web</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#E9A83A] text-[#33123F]">↓</span>
            </a>
          </div>
        </div>)}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="HUCKWILD launch film cuts">
      {CUTS.map((c) => <article key={c.shape} className={card + (c.shape === 'wide' ? ' lg:col-span-2' : '')}>
        <h3 className="mb-1 text-xl font-bold">{c.title}</h3>
        <p className="mb-3 text-sm text-[#4B2160]">{c.ratio} · 64 sec</p>
        <video aria-label={`${c.title}, the HUCKWILD launch film`} controls playsInline preload="none" width={c.w} height={c.h} poster={`${BASE}/huckwild-${c.shape}-poster-800.webp`} className="mx-auto max-h-[640px] w-full rounded-xl bg-[#33123F]">
          <source src={`${BASE}/huckwild-${c.shape}-small.mp4`} type="video/mp4" />
          Your browser does not play this video. Download it above.
        </video>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className={button} href={`${BASE}/huckwild-${c.shape}.mp4`} download>Download ad cut</a>
          <a className={quiet} href={`${BASE}/huckwild-${c.shape}-poster.jpg`} download>Cover image</a>
        </div>
      </article>)}
    </section>

    <section aria-labelledby="huckwild-copy-drink" className="space-y-4">
      <h3 id="huckwild-copy-drink" className="text-xl font-bold">Ad copy: the drink</h3>
      <div className="grid gap-5 lg:grid-cols-2">
        <CopyCard title="Primary text" text={copy['Primary text']} />
        <CopyCard title="Primary text, the legend" text={copy['Primary text, the legend']} />
        <CopyCard title="Headline" text={copy['Headline']} />
        <CopyCard title="Description" text={copy['Description']} />
        <CopyCard title="Reels caption" text={copy['Reels caption']} />
        <CopyCard title="Site link" text={copy['Site link']} />
      </div>
    </section>

    <section aria-labelledby="huckwild-copy-studio" className="space-y-4">
      <h3 id="huckwild-copy-studio" className="text-xl font-bold">Ad copy: the studio angle</h3>
      <p className="text-sm text-[#4B2160]">For Modern Mustard Seed&apos;s own ads: the film as proof of the Launch Film door. It names HUCKWILD as a concept build.</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <CopyCard title="Primary text, the studio angle" text={copy['Primary text, the studio angle']} />
        <CopyCard title="Headline, the studio angle" text={copy['Headline, the studio angle']} />
        <CopyCard title="Description, the studio angle" text={copy['Description, the studio angle']} />
        <CopyCard title="Call to action" text={copy['Call to action']} />
      </div>
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Ready to post</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#4B2160]">
        <li>Meta ad for the drink: upload the vertical ad cut, add the square and widescreen as placement variants. Primary text, Headline, Description, button Sign Up on the site link.</li>
        <li>Meta ad for the studio: same cuts, the studio angle copy, button Learn More on the Launch Film link.</li>
        <li>Reels and TikTok: the vertical ad cut with the Reels caption. It plays muted, so the type on screen carries it.</li>
        <li>Upload form caps at 10 MB: use the small MP4 for that shape.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className={quiet} href={`${BASE}/post-copy.txt`} download>Download all post copy</a>
        <a className={quiet} href="https://huckwild.vercel.app" target="_blank" rel="noopener noreferrer">Open the HUCKWILD site</a>
      </div>
    </section>
  </div>;
}
