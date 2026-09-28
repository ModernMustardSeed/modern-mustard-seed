'use client';
import { useRef, useState } from 'react';
import posters from '@/data/warning-posters.json';

/**
 * Warning Posters: "Warning: may cause too many jobs." Eight trades, one joke
 * each, Mr. Mustard in a panic and Mrs. Mustard unbothered. Two sets:
 * 1200 x 900 for Google Business Profile posts (all eight published
 * 2026-09-28) and 4:5 for Facebook. Google rejects any post with a phone
 * number in the text or on the image, so the Google set says "Tap Call";
 * the Facebook set carries Sarah's direct line. Source rigs:
 * dev/mms/marketing/gbp-posts-2026-09-28 and fb-niche-posters-2026-09-28.
 */
const BASE = '/ads/warning-posters';
const card = 'rounded-2xl bg-white p-5 text-[#0b3b44] shadow-[0_20px_40px_-28px_rgba(11,59,68,0.6)] ring-1 ring-[#0b3b44]/10';
const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b3b44] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e4b56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';
const quiet = 'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b3b44] ring-2 ring-[#81d8d0] hover:bg-[#d8f3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78]';

function CopyButton({ label, text }: { label: string; text: string }) {
  const [status, setStatus] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      area.current?.classList.remove('sr-only');
      area.current?.focus();
      area.current?.select();
      setStatus('Text selected. Use your device copy command.');
    }
  }
  return <span className="inline-flex flex-col">
    <button type="button" onClick={copyText} className={quiet} aria-label={label}>{label}</button>
    <textarea ref={area} readOnly aria-hidden="true" tabIndex={-1} value={text} className="sr-only mt-2 w-full rounded-xl bg-[#fbf5ea] p-2 text-xs" />
    <span role="status" className="mt-1 min-h-4 text-xs text-[#0b3b44]/75">{status}</span>
  </span>;
}

export default function WarningPostersCampaign() {
  return <div id="warning-posters-campaign" className="space-y-7 text-[#0b3b44]">
    <section className="overflow-hidden rounded-3xl bg-[#fbf5ea] text-[#0b3b44] ring-1 ring-[#0b3b44]/10">
      <div className="h-6 bg-[repeating-linear-gradient(-45deg,#f5b700_0_18px,#0b3b44_18px_36px)]" aria-hidden="true" />
      <div className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0a7c78]">Posters / Google posts + Facebook / 8 trades</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.02] md:text-6xl"><span className="text-[#ff6f59]">Warning:</span> <span className="font-normal text-[#0a7c78]">may cause</span> too many jobs.</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#2c4c52]">Mr. Mustard in a panic, Mrs. Mustard unbothered: &ldquo;Google. And ChatGPT.&rdquo; One poster per trade. The Google set is 1200 x 900 and all eight went live on the Business Profile on 2026-09-28. The Facebook set is 4:5 with Sarah&apos;s direct line.</p>
      </div>
    </section>

    <section className={card}>
      <h3 className="text-xl font-bold">Google post rules, learned the hard way</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2c4c52]">
        <li>No phone number in the post text or on the image. The first eight carried one and Google rejected every one. The profile&apos;s own Call button reaches Sarah.</li>
        <li>Post as an Update: paste the text, add the Google image, then Add more details, Button, Learn more, and paste the link.</li>
        <li>Every link is tagged <code className="rounded bg-[#fbf5ea] px-1">utm_campaign=warning-posters</code> with the trade as <code className="rounded bg-[#fbf5ea] px-1">utm_content</code>, so clicks show up by trade.</li>
        <li>The script that posts them: <code className="rounded bg-[#fbf5ea] px-1">dev/mms/marketing/google-business-profile/post-poster.mjs</code>.</li>
      </ul>
    </section>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="The eight posters">
      {posters.map((p) => <article key={p.slug} className={card}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0a7c78]">{p.trade}</p>
        <h3 className="mt-1 text-xl font-bold">{p.headline}</h3>
        <p className="mt-1 text-sm italic text-[#2c4c52]">&ldquo;{p.joke}&rdquo;</p>
        <div className="mt-4 grid grid-cols-[3fr_2fr] items-start gap-3">
          <a href={`${BASE}/google/${p.slug}.jpg`} target="_blank" rel="noopener noreferrer" className="block">
            <img src={`${BASE}/preview/google-${p.slug}.webp`} alt={`Google post image for ${p.trade}: ${p.headline}`} width={600} height={450} loading="lazy" className="w-full rounded-xl ring-1 ring-[#0b3b44]/10" />
            <span className="mt-1 block text-xs text-[#2c4c52]">Google · 1200 x 900</span>
          </a>
          <a href={`${BASE}/facebook/${p.slug}.jpg`} target="_blank" rel="noopener noreferrer" className="block">
            <img src={`${BASE}/preview/facebook-${p.slug}.webp`} alt={`Facebook poster for ${p.trade}: ${p.headline}`} width={540} height={675} loading="lazy" className="w-full rounded-xl ring-1 ring-[#0b3b44]/10" />
            <span className="mt-1 block text-xs text-[#2c4c52]">Facebook · 4:5</span>
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <a className={button} href={`${BASE}/google/${p.slug}.jpg`} download={`warning-${p.slug}-google.jpg`}>Google image</a>
          <a className={button} href={`${BASE}/facebook/${p.slug}.jpg`} download={`warning-${p.slug}-facebook.jpg`}>Facebook poster</a>
          <CopyButton label="Copy post text" text={p.text} />
          <CopyButton label="Copy link" text={p.link} />
        </div>
      </article>)}
    </section>
  </div>;
}
