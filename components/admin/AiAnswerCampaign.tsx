'use client';
import { useRef, useState } from 'react';

/**
 * Campaign 32: The AI Answer. The ad says what the Instagram bio says:
 * "Websites Google + ChatGPT recommend", built by Sarah in Kalispell, and
 * DM "ANSWER" for a free check. Mr. Mustard leaps off a comic cover holding
 * the answer. Messaging objective: every result is a DM with a business name
 * and a town, which is everything needed to run the check.
 */

const BASE = '/ads/ai-answer';
const card = 'border-2 border-[#161616] bg-white p-5 text-[#161616] shadow-[4px_4px_0_0_#161616]';
const button = 'inline-flex min-h-11 items-center justify-center border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFDD55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

const CUTS = [
  { id: 'feed', title: 'Feed', size: '1080 x 1350 (4:5)', width: 1080, height: 1350, note: 'Instagram and Facebook feed, Explore. The workhorse.' },
  { id: 'story', title: 'Stories and Reels', size: '1080 x 1920 (9:16)', width: 1080, height: 1920, note: 'Copy stays out of the top 250 and bottom 340, where Instagram puts its own buttons.' },
  { id: 'square', title: 'Square', size: '1080 x 1080 (1:1)', width: 1080, height: 1080, note: 'Right column, Marketplace, and any placement that wants square.' },
];

const COPY: { title: string; text: string }[] = [
  {
    title: 'Primary text A (lead with this)',
    text: `Websites Google + ChatGPT recommend. 🌱

Your customers ask ChatGPT who to call now. It gives them three or four names, not ten blue links.

DM me the word ANSWER. I'll ask for your business and send you exactly what it said. Free.

Built by Sarah in Kalispell, MT.`,
  },
  {
    title: 'Primary text B (Stories and Reels)',
    text: `Does ChatGPT name your business? DM "ANSWER" and I'll check for free. 🌱`,
  },
  {
    title: 'Primary text C (question hook)',
    text: `Ask ChatGPT who's the best in town at what you do. Did it say your name?

If not, that's fixable. DM me ANSWER and I'll send you exactly what it said, free.`,
  },
  { title: 'Headline 1', text: 'Does AI name your business?' },
  { title: 'Headline 2', text: 'Free check: does ChatGPT know you?' },
  { title: 'Description', text: 'Websites by Modern Mustard Seed, Kalispell, MT.' },
  {
    title: 'Message greeting (Meta inbox template)',
    text: `Hi! Type ANSWER and tell me your business name and town. I'll ask ChatGPT and send you exactly what it says.`,
  },
  { title: 'Quick reply button', text: 'ANSWER' },
];

const SETUP = [
  'In Ads Manager, create a campaign with the Engagement objective. Set the conversion location to Messaging apps, with Instagram Direct and Messenger both on.',
  'Budget $10/day. Audience: a 50-mile radius around Kalispell, ages 25 to 65, Advantage+ on.',
  'Upload the Feed image, then customize placements: Stories and Reels get the 9:16 image, the right column gets the square.',
  'Paste Primary text A and Headline 1. The call-to-action button is Send message.',
  'Under Message template, paste the greeting and add ANSWER as a quick reply button.',
  'Publish. Before the first message lands, set up the same greeting in Meta Business Suite, Inbox, Automations, so organic DMs get it too.',
];

const REPLY = [
  'Someone sends ANSWER with their business and town.',
  'Ask ChatGPT who the best of their trade is in their town, word for word, the way a customer would.',
  'Screenshot the answer and send it back the same day. If they are named, point to the one fix that keeps them there. If they are not, say who was named and offer the free audit.',
  'Log them as a lead. Only you mark them contacted.',
];

const JUDGE = [
  'Day 3: check cost per messaging conversation started. Under $3 is healthy for a local offer.',
  'Day 3: if one image is clearly ahead on its placement, stop spending on the one that is behind.',
  'Day 5: duplicate the ad with Primary text C and let A and C fight for four days. Keep the winner.',
  'The truth metric is booked calls from those DMs, not messages.',
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
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(12, Math.max(2, text.split('\n').length + Math.ceil(text.length / 90)))} className="w-full resize-y rounded border border-[#161616]/20 bg-[#FBF6EA] p-3 text-sm leading-relaxed text-[#161616]" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#161616]/75">{status}</p>
  </article>;
}

function Steps({ title, items }: { title: string; items: string[] }) {
  return <section className={card}>
    <h3 className="text-xl font-bold">{title}</h3>
    <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">{items.map((s) => <li key={s}>{s}</li>)}</ol>
  </section>;
}

export default function AiAnswerCampaign() {
  return <div id="ai-answer-campaign" className="space-y-7 text-[#161616]">
    <section className="border-2 border-[#161616] bg-[#F5B700] p-6 text-[#161616] shadow-[6px_6px_0_0_#161616] md:p-8">
      <p className="font-mono text-xs font-bold uppercase tracking-widest">Campaign 32 / The AI Answer</p>
      <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Websites Google + ChatGPT <em className="bg-[#FFFDF6] px-2 not-italic">recommend.</em></h2>
      <p className="mt-4 max-w-3xl leading-relaxed">The Instagram bio, as an ad. Mr. Mustard leaps off a comic cover holding the answer. One ask: DM &ldquo;ANSWER&rdquo; and Sarah checks whether AI names the business. Messaging objective, $10/day, 50 miles around Kalispell.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {CUTS.map((c) => <a key={c.id} className={button + ' bg-[#FFFDF6]'} href={`${BASE}/ai-answer-${c.id}.png`} download>Download {c.title}</a>)}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-3" aria-label="AI Answer ad images">
      {CUTS.map((c) => <article key={c.id} className={card}>
        <h3 className="text-xl font-bold">{c.title}</h3>
        <p className="mb-3 font-mono text-xs">{c.size}</p>
        <a href={`${BASE}/ai-answer-${c.id}.png`} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/ai-answer-${c.id}-800.webp`} width={c.width} height={c.height} alt={`AI Answer ad, ${c.title.toLowerCase()} size: Mr. Mustard leaping with a phone, headline Websites Google + ChatGPT recommend, DM ANSWER`} className="h-auto w-full border border-[#161616]/20" loading="lazy" />
        </a>
        <p className="my-3 text-sm">{c.note}</p>
        <a className={button} href={`${BASE}/ai-answer-${c.id}.png`} download>Download full size</a>
      </article>)}
    </section>

    <section className="grid gap-5 lg:grid-cols-2" aria-label="AI Answer ad copy">
      {COPY.map((c) => <CopyCard key={c.title} title={c.title} text={c.text} />)}
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <Steps title="Set it up in Meta" items={SETUP} />
      <Steps title="When an ANSWER comes in" items={REPLY} />
    </div>
    <Steps title="Read the results" items={JUDGE} />
  </div>;
}
