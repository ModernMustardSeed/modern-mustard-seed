'use client';
import { useRef, useState } from 'react';
import copy from '@/data/riviera-campaign.json';

/**
 * The Riviera commercial: 46 seconds, 23 bars at 120 BPM, rendered frame by
 * frame from the site's own paintings, the live homepage and five real
 * builds, with an original synthesised score at -14 LUFS. Built to be
 * downloaded from a phone: every cut has a full-width download button first.
 * Source rig: dev/mms/marketing/riviera-film-2026-09-27.
 */
const BASE = '/ads/riviera';
const card = 'rounded-2xl bg-white p-5 text-[#0b3b44] shadow-[0_20px_40px_-28px_rgba(11,59,68,0.6)] ring-1 ring-[#0b3b44]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b3b44] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e4b56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b3b44] ring-2 ring-[#81d8d0] hover:bg-[#d8f3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';

const CUTS = [
  { file: 'riviera-9x16.mp4', poster: '9x16', title: 'Reels, TikTok and Stories', spec: '9:16 · 1080 x 1920 · 46 sec · 12 MB', w: 1080, h: 1920, captions: 'captions.vtt' },
  { file: 'riviera-9x16-26s.mp4', poster: '9x16', title: 'The 26-second cut', spec: '9:16 · 1080 x 1920 · 26 sec · 4 MB', w: 1080, h: 1920, captions: 'captions-26s.vtt' },
  { file: 'riviera-16x9.mp4', poster: '16x9', title: 'Widescreen', spec: '16:9 · 1920 x 1080 · 46 sec · 12 MB', w: 1920, h: 1080, captions: 'captions.vtt' },
  { file: 'riviera-1x1.mp4', poster: '1x1', title: 'Square feed', spec: '1:1 · 1080 x 1080 · 46 sec · 9 MB', w: 1080, h: 1080, captions: 'captions.vtt' },
  { file: 'riviera-9x16-social.mp4', poster: '9x16', title: 'Vertical under 10 MB', spec: '9:16 · 46 sec · 6 MB, for upload forms that cap files', w: 1080, h: 1920, captions: 'captions.vtt' },
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
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(14, Math.max(3, Math.ceil(text.length / 70)))} className="w-full resize-y rounded-xl border-0 bg-[#fbf5ea] p-3 text-sm leading-relaxed text-[#0b3b44] ring-1 ring-[#0b3b44]/10" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#0b3b44]/75">{status}</p>
  </article>;
}

export default function RivieraCampaign() {
  return <div id="riviera-campaign" className="space-y-7 text-[#0b3b44]">
    <section className="overflow-hidden rounded-3xl bg-[#fbf5ea] text-[#0b3b44] ring-1 ring-[#0b3b44]/10">
      <div className="h-6 bg-[repeating-linear-gradient(90deg,#81d8d0_0_36px,#fff_36px_72px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0a7c78]">Commercial / The Riviera</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl">We build it. <span className="font-normal text-[#0a7c78]">You live it.</span></h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#2c4c52]">A 46-second commercial in the new site&apos;s look. Mr. Mustard&apos;s phone lights up on the sand, the business runs, the family lives. Every frame comes from the site&apos;s own paintings, the live homepage, and five real builds. Original score, every cut on the beat, mastered to -14 LUFS. No narration, so it plays muted; captions included.</p>
      </div>
    </section>

    <section className={card} aria-labelledby="riviera-download">
      <h3 id="riviera-download" className="text-xl font-bold">Download to your phone</h3>
      <p className="mt-1 text-sm text-[#2c4c52]">Tap a cut. On iPhone it lands in Downloads; open it there and share to Photos or straight to Instagram. On Android it lands in Downloads and your gallery.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CUTS.map((c) => <a key={c.file} className={button + ' w-full justify-between'} href={`${BASE}/${c.file}`} download>
          <span className="text-left">{c.title}<span className="block text-xs font-medium text-white/75">{c.spec}</span></span>
          <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
        </a>)}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="Riviera commercial cuts">
      {CUTS.slice(0, 4).map((c) => <article key={c.file} className={card + (c.poster === '16x9' ? ' lg:col-span-2' : '')}>
        <h3 className="mb-1 text-xl font-bold">{c.title}</h3>
        <p className="mb-3 text-sm text-[#2c4c52]">{c.spec}</p>
        <video aria-label={`${c.title}, the Riviera commercial`} controls playsInline preload="none" width={c.w} height={c.h} poster={`${BASE}/preview/poster-${c.poster}-800.webp`} src={`${BASE}/${c.file}`} className="mx-auto max-h-[640px] w-full rounded-xl bg-[#0b3b44]">
          <track kind="captions" src={`${BASE}/${c.captions}`} srcLang="en" label="English" />
          Your browser does not play this video. Download it with the button below.
        </video>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className={button} href={`${BASE}/${c.file}`} download>Download</a>
          <a className={quiet} href={`${BASE}/${c.file}`} target="_blank" rel="noopener noreferrer">Open video</a>
          <a className={quiet} href={`${BASE}/poster-${c.poster}.jpg`} download>Cover image</a>
        </div>
      </article>)}
    </section>

    <section className="grid gap-5 lg:grid-cols-2" aria-label="Riviera ad copy">
      <CopyCard title="Primary text" text={copy['Primary text']} />
      <CopyCard title="Primary text, the AI angle" text={copy['Primary text, the AI angle']} />
      <CopyCard title="Headline" text={copy['Headline']} />
      <CopyCard title="Description" text={copy['Description']} />
      <CopyCard title="Call to action" text={copy['Call to action']} />
      <CopyCard title="Reels caption" text={copy['Reels caption']} />
      <CopyCard title="Site link" text={copy['Site link']} />
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Ready to post</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2c4c52]">
        <li>Meta ad: upload the vertical, let Meta place the widescreen and square for feed. Primary text, Headline, Description, button Learn More on the site link.</li>
        <li>AI searchers: run the 26-second cut with &quot;Primary text, the AI angle&quot; and point it at /ai. Mr. Mustard answering the phone is the whole pitch.</li>
        <li>Reels and TikTok: the 26-second cut with the Reels caption. It plays muted, so the words on screen carry it.</li>
        <li>Captions: upload the .srt if the platform asks; decline auto-captions.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className={quiet} href={`${BASE}/post-copy.txt`} download>Download all post copy</a>
        <a className={quiet} href={`${BASE}/captions.srt`} download>Captions (46 sec)</a>
        <a className={quiet} href={`${BASE}/captions-26s.srt`} download>Captions (26 sec)</a>
        <a className={quiet} href="tel:+14063121223">Call Mr. Mustard</a>
      </div>
    </section>
  </div>;
}
