'use client';
import { useRef, useState } from 'react';
import copy from '@/data/flathead-audit-campaign.json';
const BASE = '/ads/flathead-audit';
const card = 'border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]';
const button = 'inline-flex min-h-11 items-center justify-center border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFDD55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';
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

export default function FlatheadAuditCampaign() {
 return <div id="flathead-audit-campaign" className="space-y-7">
  <section className="border-2 border-[#161616] bg-[#080C16] p-6 text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] md:p-8">
   <p className="font-mono text-xs text-[#F5B700]">Campaign 26 / Flathead Community Audit</p>
   <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Built here. <span className="text-[#F5B700]">For here.</span></h2>
   <p className="mt-4 max-w-3xl leading-relaxed">Flathead Lake, downtown Bigfork, and a free audit for our neighbors. Two 28-second films with the original song, animated miniature scenes, and readable on-screen messaging.</p>
   <a className={button+' mt-5'} href={BASE+'/flathead-community-campaign.zip'} download>Download local campaign</a>
  </section>
  <section className="grid gap-6 lg:grid-cols-2" aria-label="Flathead campaign films">
   {[{id:'4x5',title:'Neighborhood feed',cover:'feed-cover',height:1350,note:'1080 x 1350. Use this cut in local Facebook group feeds.'},{id:'9x16',title:'Reels and Stories',cover:'reel-cover',height:1920,note:'1080 x 1920. Full-screen vertical cut.'}].map(cut=><article key={cut.id} className={card}>
    <h3 className="mb-3 text-xl font-bold">{cut.title}</h3>
    <video aria-label={cut.title+' video'} controls playsInline preload="none" width={1080} height={cut.height} poster={BASE+'/preview/'+cut.cover+'-800.webp'} src={BASE+'/flathead-audit-'+cut.id+'.mp4'} className="mx-auto max-h-[650px] w-full bg-[#080C16]">
     <track kind="captions" src={BASE+'/reel-captions.vtt'} srcLang="en" label="English song lyrics" />
     Your browser does not support video playback. Use the download below.
    </video>
    <p className="my-3 text-sm">{cut.note}</p>
    <div className="flex flex-wrap gap-3"><a className={button} href={BASE+'/flathead-audit-'+cut.id+'.mp4'} download>Download {cut.title}</a><a className={button} href={BASE+'/'+cut.cover+'.jpg'} download>Download cover</a></div>
   </article>)}
  </section>
  <section className="grid gap-5 lg:grid-cols-2" aria-label="Local campaign copy">
   {(['Neighborhood post','Short caption','Reply','Video description'] as const).map(key=><CopyCard key={key} title={key} text={copy[key]} />)}
  </section>
  <section className={card}>
   <h3 className="text-xl font-bold">Post it in your community</h3>
   <ol className="mt-3 list-decimal space-y-2 pl-5"><li>Download Neighborhood feed and upload it directly to your local group with the Neighborhood post caption.</li><li>When a neighbor comments AUDIT, reply and collect their website in a message.</li><li>Send their audit with the first fixes clearly prioritized.</li></ol>
   <div className="mt-5 flex flex-wrap gap-3"><a className={button} href={BASE+'/reel-captions.srt'} download>Download song captions</a><a className={button} href={BASE+'/neighborhood-post.txt'} download>Download post text</a></div>
  </section>
 </div>;
}
