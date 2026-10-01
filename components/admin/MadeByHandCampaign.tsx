'use client';

/**
 * Made by Hand: the cut-paper film of the site itself. 64 seconds, 32 bars on
 * a 120 BPM grid, rendered frame by frame from the homepage's own paper
 * layers, the site's scene art, five real builds and the live site. Silent on
 * purpose: Sarah picks the song, and every cut sits on a bar line so a 120 BPM
 * track laid in from its first downbeat lines up. Each shape ships as the post
 * file, a small file under 10 MB and a WebM. The 190 MB masters stay in the
 * source rig: dev/mms/marketing/mms-paper-film-2026-10-01/out.
 */
const BASE = '/ads/made-by-hand';
const card = 'rounded-2xl bg-white p-5 text-[#0b3b44] shadow-[0_20px_40px_-28px_rgba(11,59,68,0.6)] ring-1 ring-[#0b3b44]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b3b44] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e4b56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b3b44] ring-2 ring-[#81d8d0] hover:bg-[#d8f3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';

const CUTS = [
  { shape: 'wide', title: 'Widescreen', ratio: '16:9 · 1920 x 1080', post: '41 MB', small: '6 MB', webm: '24 MB', w: 1920, h: 1080 },
  { shape: 'vertical', title: 'Reels, TikTok and Stories', ratio: '9:16 · 1080 x 1920', post: '41 MB', small: '5 MB', webm: '19 MB', w: 1080, h: 1920 },
  { shape: 'square', title: 'Square feed', ratio: '1:1 · 1080 x 1080', post: '37 MB', small: '7 MB', webm: '16 MB', w: 1080, h: 1080 },
];

export default function MadeByHandCampaign() {
  return <div id="made-by-hand" className="space-y-7 text-[#0b3b44]">
    <section className="overflow-hidden rounded-3xl bg-[#efe3cc] text-[#0b3b44] ring-1 ring-[#0b3b44]/10">
      <div className="h-6 bg-[repeating-linear-gradient(90deg,#81d8d0_0_36px,#fffaf0_36px_72px,#f5b700_72px_108px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0a7c78]">Brand film / The Paper Riviera</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl">Made by hand. <span className="font-normal text-[#0a7c78]">Every piece.</span></h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#2c4c52]">64 seconds in the new site&apos;s look. The homepage diorama drops onto the table piece by piece, the headline lands on torn paper, five real builds get taped up, then the five disciplines, Mr. Mustard, the life, the reviews, Kalispell, and the wordmark. Drawn on twos and boiling like stop-motion. Every word is the site&apos;s own copy. No music yet: you choose the song.</p>
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="Made by Hand cuts">
      {CUTS.map((c) => <article key={c.shape} className={card + (c.shape === 'wide' ? ' lg:col-span-2' : '')}>
        <h3 className="mb-1 text-xl font-bold">{c.title}</h3>
        <p className="mb-3 text-sm text-[#2c4c52]">{c.ratio} · 64 sec · silent</p>
        <video aria-label={`${c.title}, the Made by Hand film`} controls playsInline preload="none" width={c.w} height={c.h} poster={`${BASE}/made-by-hand-${c.shape}-poster-800.webp`} className="mx-auto max-h-[640px] w-full rounded-xl bg-[#0b3b44]">
          <source src={`${BASE}/made-by-hand-${c.shape}-small.mp4`} type="video/mp4" />
          Your browser does not play this video. Download it below.
        </video>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a className={button + ' w-full justify-between'} href={`${BASE}/made-by-hand-${c.shape}.mp4`} download>
            <span className="text-left">Post file, MP4<span className="block text-xs font-medium text-white/75">{c.post} · full quality</span></span>
            <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
          </a>
          <a className={button + ' w-full justify-between'} href={`${BASE}/made-by-hand-${c.shape}-small.mp4`} download>
            <span className="text-left">Small MP4<span className="block text-xs font-medium text-white/75">{c.small} · under 10 MB</span></span>
            <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
          </a>
          <a className={button + ' w-full justify-between'} href={`${BASE}/made-by-hand-${c.shape}.webm`} download>
            <span className="text-left">WebM<span className="block text-xs font-medium text-white/75">{c.webm} · for the web</span></span>
            <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#f5b700] text-[#0b3b44]">↓</span>
          </a>
        </div>
        <div className="mt-3"><a className={quiet} href={`${BASE}/made-by-hand-${c.shape}-poster.jpg`} download>Cover image</a></div>
      </article>)}
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Choosing the song</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2c4c52]">
        <li>Every cut sits on a bar line at 120 BPM. A song at 120, 60 or 240 BPM, trimmed so its first downbeat is at 0:00, lines up with every cut and every word.</li>
        <li>The headline lands at 0:04. A song whose first big hit is on its third bar hits the words.</li>
        <li>The one held moment, the sunset toast, runs 0:52 to 0:58. The wordmark lands at 0:58 and the film goes to black at 1:04.</li>
        <li>Send the song and it gets laid in, faded out over the last three seconds, and mastered to -14 LUFS in all three shapes.</li>
      </ul>
    </section>
  </div>;
}
