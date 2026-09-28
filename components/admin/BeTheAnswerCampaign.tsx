'use client';
import { useRef, useState } from 'react';
import copy from '@/data/be-the-answer-campaign.json';

/**
 * Be the Answer: a 34 second motion ad and a poster in the Riviera look.
 * Someone asks an AI assistant who to call and gets three names, none of
 * them yours; we build the site that changes that, show our own Lighthouse
 * scores, then the marketing engine, voice agents and custom software behind
 * it. Built to be downloaded from a phone. Source rig:
 * dev/mms/marketing/be-the-answer-2026-09-28.
 */
const BASE = '/ads/be-the-answer';
const card = 'rounded-2xl bg-white p-5 text-[#0b3b44] shadow-[0_20px_40px_-28px_rgba(11,59,68,0.6)] ring-1 ring-[#0b3b44]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b3b44] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e4b56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b3b44] ring-2 ring-[#81d8d0] hover:bg-[#d8f3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';

const CUTS = [
  { file: 'be-the-answer-9x16.mp4', poster: '9x16', title: 'Reels, TikTok and Stories', spec: '9:16 · 1080 x 1920 · 34 sec · 9 MB', w: 1080, h: 1920, captions: 'captions.vtt' },
  { file: 'be-the-answer-9x16-20s.mp4', poster: '9x16', title: 'The 20-second cut', spec: '9:16 · 1080 x 1920 · 20 sec · 3 MB', w: 1080, h: 1920, captions: 'captions-20s.vtt' },
  { file: 'be-the-answer-16x9.mp4', poster: '16x9', title: 'Widescreen', spec: '16:9 · 1920 x 1080 · 34 sec · 9 MB', w: 1920, h: 1080, captions: 'captions.vtt' },
  { file: 'be-the-answer-1x1.mp4', poster: '1x1', title: 'Square feed', spec: '1:1 · 1080 x 1080 · 34 sec · 6 MB', w: 1080, h: 1080, captions: 'captions.vtt' },
  { file: 'be-the-answer-9x16-social.mp4', poster: '9x16', title: 'Vertical under 10 MB', spec: '9:16 · 34 sec · 4 MB, for upload forms that cap files', w: 1080, h: 1920, captions: 'captions.vtt' },
];
const POSTERS = [
  { file: 'be-the-answer-letter.pdf', title: 'Poster, print PDF', spec: '8.5 x 11 in, vector type, QR to the free audit' },
  { file: 'be-the-answer-poster-letter.jpg', title: 'Poster, letter image', spec: '2550 x 3300, 300 dpi' },
  { file: 'be-the-answer-feed.png', title: 'Poster, Instagram feed', spec: '1080 x 1350 (4:5)' },
  { file: 'be-the-answer-story.png', title: 'Poster, Stories', spec: '1080 x 1920 (9:16)' },
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

export default function BeTheAnswerCampaign() {
  return <div id="be-the-answer-campaign" className="space-y-7 text-[#0b3b44]">
    <section className="overflow-hidden rounded-3xl bg-[#fbf5ea] text-[#0b3b44] ring-1 ring-[#0b3b44]/10">
      <div className="h-6 bg-[repeating-linear-gradient(90deg,#81d8d0_0_36px,#fff_36px_72px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0a7c78]">Motion ad + poster / Be the Answer</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl">Be the <span className="font-normal text-[#0a7c78]">answer.</span></h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#2c4c52]">When they ask AI who to call, does it say your name? A 34-second motion ad: the question typed into an AI assistant, three names and none of them yours, then the site we build, our own 100 Lighthouse scores, and the marketing engine, voice agents and custom software behind it. Original score, every cut on the beat, -14 LUFS, captions included. Plus a poster for print and social with a QR to the free presence audit.</p>
      </div>
    </section>

    <section className={card} aria-labelledby="bta-download">
      <h3 id="bta-download" className="text-xl font-bold">Download to your phone</h3>
      <p className="mt-1 text-sm text-[#2c4c52]">Tap a cut. On iPhone it lands in Downloads; open it there and share to Photos or straight to Instagram. On Android it lands in Downloads and your gallery.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CUTS.map((c) => <a key={c.file} className={button + ' w-full justify-between'} href={`${BASE}/${c.file}`} download>
          <span className="text-left">{c.title}<span className="block text-xs font-medium text-white/75">{c.spec}</span></span>
          <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
        </a>)}
      </div>
    </section>

    <section className={card} aria-labelledby="bta-poster">
      <h3 id="bta-poster" className="text-xl font-bold">The poster</h3>
      <p className="mt-1 text-sm text-[#2c4c52]">Print the PDF at letter size for counters, windows and handouts. The QR opens the free presence audit, tagged so print scans show up as their own source. Post the feed or Stories image with the Poster copy below.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,320px)_1fr]">
        <img src={`${BASE}/preview/poster-print-800.webp`} alt="The Be the Answer poster: the beach painting with an AI chat naming Your Business first, the headline Be the answer., the services, and a QR to the free presence audit" width={800} height={1035} className="w-full rounded-xl shadow-[0_20px_40px_-24px_rgba(11,59,68,0.6)]" />
        <div className="grid content-start gap-3">
          {POSTERS.map((p) => <a key={p.file} className={button + ' w-full justify-between'} href={`${BASE}/${p.file}`} download>
            <span className="text-left">{p.title}<span className="block text-xs font-medium text-white/75">{p.spec}</span></span>
            <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
          </a>)}
        </div>
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="Be the Answer cuts">
      {CUTS.slice(0, 4).map((c) => <article key={c.file} className={card + (c.poster === '16x9' ? ' lg:col-span-2' : '')}>
        <h3 className="mb-1 text-xl font-bold">{c.title}</h3>
        <p className="mb-3 text-sm text-[#2c4c52]">{c.spec}</p>
        <video aria-label={`${c.title}, Be the Answer`} controls playsInline preload="none" width={c.w} height={c.h} poster={`${BASE}/preview/poster-${c.poster}-800.webp`} src={`${BASE}/${c.file}`} className="mx-auto max-h-[640px] w-full rounded-xl bg-[#0b3b44]">
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

    <section className="grid gap-5 lg:grid-cols-2" aria-label="Be the Answer ad copy">
      <CopyCard title="Primary text" text={copy['Primary text']} />
      <CopyCard title="Primary text, short" text={copy['Primary text, short']} />
      <CopyCard title="Headline" text={copy['Headline']} />
      <CopyCard title="Headline, question" text={copy['Headline, question']} />
      <CopyCard title="Description" text={copy['Description']} />
      <CopyCard title="Call to action" text={copy['Call to action']} />
      <CopyCard title="Reels caption" text={copy['Reels caption']} />
      <CopyCard title="Poster copy" text={copy['Poster copy']} />
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Ready to post</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2c4c52]">
        <li>Meta ad: upload the vertical, let Meta place widescreen and square for feed. Primary text, Headline, Description, button Learn More to the free presence audit link.</li>
        <li>Stories and Reels: the 20-second cut with the short primary text or the Reels caption. It plays muted, so the words on screen carry it.</li>
        <li>The ask is the free presence audit; the second link points AI searchers at /ai.</li>
        <li>The scores on screen are our own site&apos;s, measured in Lighthouse. Say &quot;built to score 100&quot;, never promise a ranking or that AI will recommend anyone.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className={quiet} href={`${BASE}/post-copy.txt`} download>Download all post copy</a>
        <a className={quiet} href={`${BASE}/captions.srt`} download>Captions (34 sec)</a>
        <a className={quiet} href={`${BASE}/captions-20s.srt`} download>Captions (20 sec)</a>
        <a className={quiet} href="tel:+14063121223">Call Mr. Mustard</a>
      </div>
    </section>
  </div>;
}
