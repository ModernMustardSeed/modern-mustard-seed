'use client';
import { useRef, useState } from 'react';
import copy from '@/data/frames-that-roar-campaign.json';

/**
 * Frames That Roar: the 64-second launch film for Wild Things Optometrists,
 * 32 bars at 120 BPM, recorded from the demo site's own pages with its score
 * at -14.6 LUFS. Wild Things is a fictional practice built as a demo, so the
 * ad copy sells the studio (the Launch Film door and the eye care page); the
 * in-character posts are samples to show a prospect, never to run as ads.
 * Each shape ships as the post file, a small MP4 under 10 MB and a WebM. The
 * masters stay in the source rig: dev/wild-things-launch-film/out.
 */
const BASE = '/ads/wild-things';
const card = 'rounded-2xl bg-white p-5 text-[#1f1a14] shadow-[0_20px_40px_-28px_rgba(31,26,20,0.6)] ring-1 ring-[#1f1a14]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-bold text-white hover:bg-[#3a3026] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b5651d]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#1f1a14] ring-2 ring-[#d9a441] hover:bg-[#f6eedf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f1a14]';

const CUTS = [
  { shape: 'vertical', title: 'Reels, TikTok and Stories', ratio: '9:16 · 1080 x 1920', post: 'frames-that-roar-vertical.mp4', postSize: '39 MB', small: '8 MB', webm: '23 MB', w: 1080, h: 1920 },
  { shape: 'square', title: 'Square feed', ratio: '1:1 · 1080 x 1080', post: 'frames-that-roar-square.mp4', postSize: '27 MB', small: '8 MB', webm: '23 MB', w: 1080, h: 1080 },
  { shape: 'wide', title: 'Widescreen', ratio: '16:9 · 1920 x 1080', post: 'frames-that-roar-16x9.mp4', postSize: '41 MB', small: '8 MB', webm: '28 MB', w: 1920, h: 1080 },
];

type Key = keyof typeof copy;

function CopyCard({ title }: { title: Key }) {
  const text = copy[title];
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
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(14, Math.max(3, Math.ceil(text.length / 70)))} className="w-full resize-y rounded-xl border-0 bg-[#f6eedf] p-3 text-sm leading-relaxed text-[#1f1a14] ring-1 ring-[#1f1a14]/10" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#1f1a14]/75">{status}</p>
  </article>;
}

export default function FramesThatRoarCampaign() {
  return <div id="frames-that-roar" className="space-y-7 text-[#1f1a14]">
    <section className="overflow-hidden rounded-3xl bg-[#f6eedf] text-[#1f1a14] ring-1 ring-[#1f1a14]/10">
      <div className="h-6 bg-[repeating-linear-gradient(90deg,#1f1a14_0_18px,#d9a441_18px_36px,#1f1a14_36px_44px,#f6eedf_44px_62px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b5651d]">Launch film / Wild Things Optometrists · Demo build</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl">Frames That Roar. <span className="font-normal text-[#b5651d]">One or two? Two.</span></h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#4a3f33]">The 64-second launch film for Wild Things Optometrists, the safari couture eyewear demo. A giraffe in a beret at the gala, an elephant in first class, a lion at the frame wall, the phoropter and the eye chart that spells the name. Every screen is the real demo site. Scored, -14.6 LUFS, and the type carries it with the sound off.</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4a3f33]">Wild Things is a demo practice, not a real business. Run the studio copy as ads; the sample posts below are for showing a prospect what their own launch would read like.</p>
      </div>
    </section>

    <section className={card} aria-labelledby="roar-download">
      <h3 id="roar-download" className="text-xl font-bold">Download every format</h3>
      <p className="mt-1 text-sm text-[#4a3f33]">The post file is the one to upload to Meta or TikTok. The small MP4 fits upload forms that cap at 10 MB. WebM is for the web. On iPhone a download lands in Files, Downloads; share it from there to Photos or Instagram.</p>
      <div className="mt-4 space-y-5">
        {CUTS.map((c) => <div key={c.shape}>
          <p className="mb-2 text-sm font-bold">{c.title} <span className="font-medium text-[#4a3f33]">· {c.ratio} · 64 sec</span></p>
          <div className="grid gap-3 sm:grid-cols-3">
            <a className={button + ' w-full justify-between'} href={`${BASE}/${c.post}`} download>
              <span className="text-left">Post file, MP4<span className="block text-xs font-medium text-white/75">{c.postSize} · with score</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#d9a441] text-[#1f1a14]">↓</span>
            </a>
            <a className={button + ' w-full justify-between'} href={`${BASE}/frames-that-roar-${c.shape}-small.mp4`} download>
              <span className="text-left">Small MP4<span className="block text-xs font-medium text-white/75">{c.small} · under 10 MB</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#d9a441] text-[#1f1a14]">↓</span>
            </a>
            <a className={button + ' w-full justify-between'} href={`${BASE}/frames-that-roar-${c.shape}.webm`} download>
              <span className="text-left">WebM<span className="block text-xs font-medium text-white/75">{c.webm} · for the web</span></span>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#d9a441] text-[#1f1a14]">↓</span>
            </a>
          </div>
        </div>)}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="Frames That Roar cuts">
      {CUTS.map((c) => <article key={c.shape} className={card + (c.shape === 'wide' ? ' lg:col-span-2' : '')}>
        <h3 className="mb-1 text-xl font-bold">{c.title}</h3>
        <p className="mb-3 text-sm text-[#4a3f33]">{c.ratio} · 64 sec</p>
        <video aria-label={`${c.title}, the Frames That Roar launch film`} controls playsInline preload="none" width={c.w} height={c.h} poster={`${BASE}/frames-that-roar-${c.shape}-poster-800.webp`} className="mx-auto max-h-[640px] w-full rounded-xl bg-[#1f1a14]">
          <source src={`${BASE}/frames-that-roar-${c.shape}-small.mp4`} type="video/mp4" />
          Your browser does not play this video. Download it above.
        </video>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className={button} href={`${BASE}/${c.post}`} download>Download post file</a>
          <a className={quiet} href={`${BASE}/frames-that-roar-${c.shape}-poster.jpg`} download>Cover image</a>
        </div>
      </article>)}
    </section>

    <section aria-labelledby="roar-copy-studio" className="space-y-4">
      <h3 id="roar-copy-studio" className="text-xl font-bold">Ad copy: the studio</h3>
      <p className="text-sm text-[#4a3f33]">For Modern Mustard Seed&apos;s own ads. Two angles: the Launch Film door, and eye care practices through the health page.</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <CopyCard title="Primary text, the launch film" />
        <CopyCard title="Primary text, for eye care" />
        <CopyCard title="Headline, the launch film" />
        <CopyCard title="Headline, for eye care" />
        <CopyCard title="Description" />
        <CopyCard title="Reels caption" />
        <CopyCard title="Call to action" />
      </div>
    </section>

    <section aria-labelledby="roar-copy-sample" className="space-y-4">
      <h3 id="roar-copy-sample" className="text-xl font-bold">Sample posts in the practice&apos;s voice</h3>
      <p className="text-sm text-[#4a3f33]">What the launch would read like for a real practice. Show these to a prospect; do not post them, since the practice and its address are made up.</p>
      <div className="grid gap-5 lg:grid-cols-3">
        <CopyCard title="Sample, Instagram and TikTok" />
        <CopyCard title="Sample, Facebook" />
        <CopyCard title="Sample, YouTube and LinkedIn" />
      </div>
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Ready to post</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#4a3f33]">
        <li>Meta ad for the Launch Film door: upload the vertical post file, add the square and widescreen as placement variants, the launch film primary text and headline, button Learn More on the launch film link.</li>
        <li>Meta ad for eye care: same cuts, the eye care primary text and headline, button Learn More on the health page link.</li>
        <li>Reels and TikTok on the studio accounts: the vertical post file with the Reels caption.</li>
        <li>Upload form caps at 10 MB: use the small MP4 for that shape.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className={quiet} href={`${BASE}/post-copy.txt`} download>Download all post copy</a>
        <a className={quiet} href="/for/health" target="_blank" rel="noopener noreferrer">Open the eye care page</a>
        <a className={quiet} href="/demos/wild-things" target="_blank" rel="noopener noreferrer">Open the demo site</a>
      </div>
    </section>
  </div>;
}
