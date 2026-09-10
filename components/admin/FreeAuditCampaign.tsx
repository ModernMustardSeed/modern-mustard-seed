'use client';

import { useRef, useState } from 'react';
import copy from '@/data/free-audit-campaign.json';

const BASE = '/ads/free-audit/v2';
const card = 'border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]';
const button = 'inline-flex items-center justify-center border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFDD55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

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
      <h3 className="font-bold text-[#161616]">{title}</h3>
      <button type="button" onClick={copyText} className={button} aria-label={`Copy ${title}`}>Copy</button>
    </div>
    <textarea ref={area} readOnly aria-label={title} value={text} rows={Math.min(14, Math.max(3, Math.ceil(text.length / 75)))} className="w-full resize-y rounded border border-[#161616]/20 bg-[#FBF6EA] p-3 text-sm leading-relaxed text-[#161616]" />
    <p role="status" className="mt-2 min-h-5 text-xs text-[#161616]/75">{status}</p>
  </article>;
}

const images = [
  { file: 'feed-post', label: 'Feed post', size: '1080 × 1350', alt: copy['Image alt text'] },
  { file: 'reel-cover', label: 'Reel cover', size: '1080 × 1920', alt: 'A miniature mustard yellow storefront in a golden spotlight. Get found. Start with a free audit. Comment AUDIT.' },
  { file: 'story-1', label: 'Story 1: Search', size: '1080 × 1920', alt: 'Search has changed. AI is part of how people find a business. Free audit from Modern Mustard Seed.' },
  { file: 'story-2', label: 'Story 2: Follow-up', size: '1080 × 1920', alt: 'They reach out. What happens? Forms, booking, and follow-up. Free audit from Modern Mustard Seed.' },
  { file: 'story-3', label: 'Story 3: Invitation', size: '1080 × 1920', alt: 'Your website and online presence audit is free. Reply AUDIT and send your website in a message.' },
];

export default function FreeAuditCampaign() {
  return <div className="space-y-8" id="free-audit-campaign">
    <section className="border-2 border-[#161616] bg-[#080C16] p-6 text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] md:p-8">
      <p className="font-mono text-xs text-[#F5B700]">Campaign 25 / Free Website Audit</p>
      <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Good at what you do. <span className="text-[#F5B700]">Let&apos;s help them find you.</span></h2>
      <p className="mt-4 max-w-3xl">The cinematic reel with the original song, redesigned ad graphics, regular post, Stories, and replies. A free website and online presence audit covering search visibility, AI discoverability, and the path from inquiry to follow-up.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a className={button} href={`${BASE}/mms-free-audit-campaign.zip`} download>Download complete campaign</a>
        <a className={button} href={`${BASE}/campaign-kit.pdf`} download>Download copy kit PDF</a>
      </div>
      <p className="mt-4 text-sm text-[#FBF6EA]/75">Prepared assets. No ad campaign or automatic reply workflow is running from this page.</p>
    </section>

    <section className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" aria-label="Reel and original song">
      <div className={card}>
        <h3 className="mb-3 font-bold">28-second reel</h3>
        <video controls playsInline preload="none" poster={`${BASE}/preview/reel-cover-800.webp`} className="aspect-[9/16] w-full bg-[#080C16]" src={`${BASE}/free-audit-reel.mp4`}>
          <track kind="captions" src={`${BASE}/reel-captions.vtt`} srcLang="en" label="English lyrics" />
        </video>
        <p className="my-3 text-sm">1080 × 1920. Six animated scenes with the original song and on-screen messaging.</p>
        <a className={button} href={`${BASE}/free-audit-reel.mp4`} download>Download reel</a>
      </div>
      <div className="space-y-5">
        <CopyCard title="Ad primary text" text={copy['Short caption']} />
        <CopyCard title="Ad headline" text="Get your free website audit" />
        <CopyCard title="Ad description" text="Search visibility, AI discoverability, and follow-up. Comment AUDIT." />
        <div className={card}>
          <h3 className="mb-3 font-bold">Original song</h3>
          <audio controls preload="none" className="w-full" src={`${BASE}/original-song.mp3`} />
          <div className="mt-4 flex flex-wrap gap-3">
            <a className={button} href={`${BASE}/original-song.mp3`} download>Download song</a>
            <a className={button} href={`${BASE}/reel-captions.srt`} download>Download captions</a>
          </div>
        </div>
      </div>
    </section>

    <section aria-label="Ad graphics and Stories">
      <h2 className="mb-4 font-display text-2xl font-bold">Feed graphic, cover, and Stories</h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((item) => <article key={item.file} className={card}>
          <picture>
            <source type="image/avif" srcSet={`${BASE}/preview/${item.file}-400.avif 400w, ${BASE}/preview/${item.file}-800.avif 800w`} sizes="(max-width: 640px) 90vw, 400px" />
            <source type="image/webp" srcSet={`${BASE}/preview/${item.file}-400.webp 400w, ${BASE}/preview/${item.file}-800.webp 800w`} sizes="(max-width: 640px) 90vw, 400px" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/preview/${item.file}-800.jpg`} alt={item.alt} width={800} height={item.file === 'feed-post' ? 1000 : 1422} loading="lazy" className="h-80 w-full bg-[#080C16] object-contain" />
          </picture>
          <h3 className="mt-4 font-bold">{item.label}</h3>
          <p className="mb-3 text-sm">{item.size} JPEG</p>
          <a className={button} href={`${BASE}/${item.file}.jpg`} download>Download {item.label}</a>
        </article>)}
      </div>
    </section>

    <section aria-label="Copy and replies">
      <h2 className="mb-4 font-display text-2xl font-bold">Post copy and replies</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        {(['Reel caption', 'Regular post', 'Story caption', 'Pinned comment', 'Public reply', 'DM intake reply', 'Image alt text'] as const).map((key) => <CopyCard key={key} title={key} text={copy[key]} />)}
      </div>
    </section>
    <section className={card}>
      <h2 className="mb-3 font-display text-2xl font-bold">Publishing sequence</h2>
      <p className="whitespace-pre-line leading-relaxed">{copy['Publishing sequence']}</p>
      <p className="mt-4 text-sm leading-relaxed text-[#161616]/75">{copy['Operating note']}</p>
    </section>
  </div>;
}
