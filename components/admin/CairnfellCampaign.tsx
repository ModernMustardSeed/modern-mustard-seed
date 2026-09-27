'use client';
import { useRef, useState } from 'react';

/**
 * Campaign 33: Cairnfell, the builder film. A concept luxury mountain-home
 * builder (log, timber frame, modern mountain) with a real website, a real
 * owner portal and a builder studio, cut into a 64-second film for home
 * builder and contractor groups. The portal is what sells: lead with it.
 * Cairnfell is a concept. Never present it as a client.
 */

const BASE = '/ads/cairnfell';
const card = 'border-2 border-[#161616] bg-white p-5 text-[#161616] shadow-[4px_4px_0_0_#161616]';
const button = 'inline-flex min-h-11 items-center justify-center border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFDD55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

const CUTS = [
  { id: '1x1', title: 'Square', size: '1080 x 1080', poster: 'poster-square', width: 1080, height: 1080, note: 'Facebook groups and feed posts. Upload the file itself so it autoplays.' },
  { id: '9x16', title: 'Vertical', size: '1080 x 1920', poster: 'poster-vertical', width: 1080, height: 1920, note: 'Reels, Stories and TikTok. Every word sits clear of the app buttons.' },
  { id: '16x9', title: 'Wide', size: '1920 x 1080', poster: 'poster', width: 1920, height: 1080, note: 'YouTube, LinkedIn and a website player.' },
];

const DEMO = [
  { href: '/demos/cairnfell', label: 'Open the Cairnfell site' },
  { href: '/demos/cairnfell/portal', label: 'Open the owner portal' },
  { href: '/demos/cairnfell/portal#studio', label: 'Open the builder studio' },
  { href: '/for/contractors', label: 'Open the contractors page' },
];

const COPY: { title: string; text: string }[] = [
  {
    title: 'Group post A (builder and contractor groups)',
    text: `Builders: your homes are beautiful. Does your business look that good online?

This is Cairnfell, a concept builder we made to show what we build for home builders. 🏔️

• A website as good as your work, built so Google and ChatGPT name you when buyers ask who the best builder is. It grades A+ on our presence audit.
• An owner portal: Friday photos from the site, the live schedule, selections approved in one tap, and a concierge that answers your owners at 11 p.m. so you don't have to.
• A studio that runs the rest: every inquiry answered in under a minute, crew photos turned into posts for Instagram, Facebook and Google, every review answered.

Set package prices. You own everything. Changes are included.

Comment BUILDER or message me, and I'll build a demo of your homepage in this style, free.`,
  },
  {
    title: 'Group post B (service-listing groups)',
    text: `OFFERING A SERVICE: Websites, owner portals and marketing systems for home builders

This is Cairnfell, a concept builder we made to show what we build for home builders. 🏔️

• A website as good as your work, built so Google and ChatGPT name you when buyers ask who the best builder is. It grades A+ on our presence audit.
• An owner portal: Friday photos from the site, the live schedule, selections approved in one tap, and a concierge that answers your owners at 11 p.m. so you don't have to.
• A studio that runs the rest: every inquiry answered in under a minute, crew photos turned into posts for Instagram, Facebook and Google, every review answered.

Set package prices. You own everything. Changes are included.

Comment BUILDER or message me, and I'll build a demo of your homepage in this style, free.`,
  },
  {
    title: 'Short caption (Reels, Stories, Instagram)',
    text: `Be the builder Google and ChatGPT suggest. 🏔️ A website, an owner portal and a studio that runs itself. Comment BUILDER for a free demo of your homepage in this style.

#homebuilder #custombuilder #loghome #timberframe #luxuryhomes #contractor #websitedesign`,
  },
  { title: 'Reply to a BUILDER comment', text: `Love it! What's your company name and the town you build in? I'll send your homepage demo within a day.` },
];

const GROUPS = [
  ['DFW Contractors, Subs & Builders (FREE ADVERTISEMENT)', '67K', 'https://www.facebook.com/groups/3472237636322816/'],
  ['East Texas Builders and Contractors', '41K', 'https://www.facebook.com/groups/1905528752794062/'],
  ['Real Estate Investors, Developers, Builders', '25K', 'https://www.facebook.com/groups/commercialrealestate.teamcobra/'],
  ['Roofing Contractors and Companies', '11K', 'https://www.facebook.com/groups/roofingcontractorsandcompanies/'],
  ['Spokane Contractors & Builders', '5K', 'https://www.facebook.com/groups/spokanecontractors/'],
  ['Flathead trades, services, and contractors', '3.4K', 'https://www.facebook.com/groups/340370463037142/'],
  ['Southern Oregon Builders and Contractors Network', '1.3K', 'https://www.facebook.com/groups/ContractorSurplus/'],
  ['Montana Residential Partners', '1K', 'https://www.facebook.com/groups/611551349605375/'],
  ['Arizona Residential Partners', '', 'https://www.facebook.com/groups/2917830594902193/'],
];

const STEPS = [
  'Read the group\'s rules first. Skip any group that bans service posts; a removed post can cost the membership.',
  'Upload the square cut as a video file, then paste post A (or B where the group wants an OFFERING A SERVICE title).',
  'Leave at least 10 minutes between groups and stop at 8 a day, counting every other group post that day.',
  'Groups outside Montana never hear Kalispell or Montana. The post copy already leaves them out.',
  'Log every post in dev\\mms\\marketing\\group-posts-2026-09-26\\posts.md so no group gets it twice.',
];

const REPLY = [
  'Someone comments BUILDER: reply with the line above and ask for the company name and town.',
  'Queue a demo build for their homepage in the Cairnfell style from the cockpit, with their name and their town.',
  'Send the demo link the same day with the owner portal link beside it. The portal is what sells.',
  'Only you mark them contacted.',
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
      setStatus('Text selected. Press Ctrl+C or use your device copy command.');
    }
  }
  return <article className={card}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold">{title}</h3>
      <button type="button" onClick={copyText} className={button} aria-label={`Copy ${title}`}>Copy</button>
    </div>
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(16, Math.max(2, text.split('\n').length + Math.ceil(text.length / 110)))} className="w-full resize-y rounded border border-[#161616]/20 bg-[#FBF6EA] p-3 text-sm leading-relaxed text-[#161616]" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#161616]/75">{status}</p>
  </article>;
}

function Steps({ title, items }: { title: string; items: string[] }) {
  return <section className={card}>
    <h3 className="text-xl font-bold">{title}</h3>
    <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">{items.map((s) => <li key={s}>{s}</li>)}</ol>
  </section>;
}

export default function CairnfellCampaign() {
  return <div id="cairnfell-campaign" className="space-y-7 text-[#161616]">
    <section className="border-2 border-[#161616] bg-[#0E1411] p-6 text-[#ECE6DA] shadow-[6px_6px_0_0_#C39A5B] md:p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-[#D9B57C]">Campaign 33 / Cairnfell, the builder film</p>
      <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Be the builder Google and ChatGPT <span className="text-[#D9B57C]">suggest.</span></h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-[#C9C2B4]">A concept luxury mountain-home builder with a real website, a real owner portal and a builder studio, cut into a 64-second film for home builder and contractor groups. Lead with the portal: it is the part builders cannot get from a template shop. Cairnfell is a concept, and the film&apos;s end card and the site&apos;s footer both say so.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {DEMO.map((d) => <a key={d.href} className={button} href={d.href} target="_blank" rel="noopener">{d.label}</a>)}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-3" aria-label="Cairnfell film cuts">
      {CUTS.map((c) => <article key={c.id} className={card}>
        <h3 className="text-xl font-bold">{c.title}</h3>
        <p className="mb-3 font-mono text-xs">{c.size} · 64 seconds</p>
        <video aria-label={`Cairnfell film, ${c.title.toLowerCase()} cut`} controls playsInline preload="none" width={c.width} height={c.height} poster={`${BASE}/${c.poster}.jpg`} src={`${BASE}/cairnfell-${c.id}.mp4`} className="mx-auto max-h-[560px] w-full bg-[#0E1411]">
          Your browser can&apos;t play this here. Use the download below.
        </video>
        <p className="my-3 text-sm">{c.note}</p>
        <a className={button} href={`${BASE}/cairnfell-${c.id}.mp4`} download>Download {c.title.toLowerCase()} cut</a>
      </article>)}
    </section>

    <section className="grid gap-5 lg:grid-cols-2" aria-label="Cairnfell post copy">
      {COPY.map((c) => <CopyCard key={c.title} title={c.title} text={c.text} />)}
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Contractor and builder groups</h3>
      <ul className="mt-3 divide-y divide-[#161616]/15">
        {GROUPS.map(([name, size, href]) => <li key={href} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <span><a className="font-bold underline decoration-[#F5B700] decoration-2 underline-offset-4" href={href} target="_blank" rel="noopener">{name}</a>{size ? <span className="ml-2 font-mono text-xs text-[#161616]/70">{size} members</span> : null}</span>
        </li>)}
      </ul>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <Steps title="Posting it" items={STEPS} />
      <Steps title="When someone comments BUILDER" items={REPLY} />
    </div>
  </div>;
}
