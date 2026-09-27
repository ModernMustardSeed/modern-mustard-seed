'use client';
import { useRef, useState } from 'react';
import copy from '@/data/graffiti-couture-campaign.json';
const BASE = '/ads/graffiti-couture';
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

/**
 * The Graffiti Couture launch film: 72 seconds, 36 bars at 120 BPM, rendered
 * frame by frame from the live site, the page paintings and three client
 * sites. Source rig: dev/mms/marketing/graffiti-launch-film-2026-09-26.
 */
export default function GraffitiCoutureCampaign() {
 return <div id="graffiti-couture-campaign" className="space-y-7 text-[#161616]">
  <section className="border-2 border-[#161616] bg-[#0d0d0d] p-6 text-[#f1ede4] shadow-[6px_6px_0_0_#ffd400] md:p-8">
   <p className="font-mono text-xs text-[#ffd400]">Launch Film / Graffiti Couture</p>
   <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">Loud where it counts.<br /><span className="text-[#ffd400]">Tailored everywhere else.</span></h2>
   <p className="mt-4 max-w-2xl leading-relaxed">A 72-second launch film for the relaunched site. Every frame comes from the live site, the paintings on every page, and real pages from brimhomes.com, ddlandscapingfl.com, and crossandcovenant.co. Original synthesized score, mastered to -14 LUFS. Three full cuts, a 58-second Reels cut, and a vertical cut under 10 MB for browser uploads.</p>
   <div className="mt-5 flex flex-wrap gap-3"><a className={button} href={BASE+'/graffiti-couture-9x16-social.mp4'} download>Download the under-10 MB vertical</a><a className={button} href="https://modernmustardseed.com" target="_blank" rel="noopener noreferrer">Open the site</a></div>
  </section>
  <section className="grid gap-6 lg:grid-cols-2" aria-label="Graffiti Couture launch film videos">
   {[{id:'16x9',title:'Widescreen',width:1920,height:1080,note:'For LinkedIn, YouTube, and presentations.'},{id:'9x16',title:'Reels and Stories',width:1080,height:1920,note:'For Instagram, Facebook Reels, TikTok, and Stories.'},{id:'1x1',title:'Square feed',width:1080,height:1080,note:'For Facebook, Instagram, and LinkedIn feeds.'}].map(cut=><article key={cut.id} className={card+(cut.id==='16x9'?' lg:col-span-2':'')}>
    <h3 className="mb-3 text-xl font-bold">{cut.title}</h3>
    <video aria-label={cut.title+' Graffiti Couture launch film'} controls playsInline preload="none" width={cut.width} height={cut.height} poster={BASE+'/preview/poster-'+cut.id+'-800.webp'} src={BASE+'/graffiti-couture-'+cut.id+'.mp4'} className="mx-auto max-h-[650px] w-full bg-[#0d0d0d]">
     <track kind="captions" src={BASE+'/captions.vtt'} srcLang="en" label="English" />
     Your browser does not support video playback. Open or download the video below.
    </video>
    <p className="my-3 text-sm">{cut.width} x {cut.height}, 72 seconds. {cut.note} Original score, no narration, and a caption file of every on-screen word.</p>
    <div className="flex flex-wrap gap-3"><a className={button} href={BASE+'/graffiti-couture-'+cut.id+'.mp4'} download>Download {cut.title}</a><a className={button} href={BASE+'/graffiti-couture-'+cut.id+'.mp4'} target="_blank" rel="noopener noreferrer">Open video</a><a className={button} href={BASE+'/poster-'+cut.id+'.jpg'} download>Download cover</a></div>
   </article>)}
  </section>
  <section className="grid gap-6 lg:grid-cols-2" aria-label="Graffiti Couture short and social cuts">
   <article className={card}>
    <h3 className="text-xl font-bold">The 58-second cut</h3>
    <p className="my-3 text-sm">1080 x 1920, 58 seconds, 9 MB. Four scenes out, same cold open, same end card, its own score so every cut still lands on the beat. Built for Instagram Reels.</p>
    <video aria-label="Graffiti Couture 58-second vertical cut" controls playsInline preload="none" width={1080} height={1920} poster={BASE+'/preview/poster-9x16-800.webp'} src={BASE+'/graffiti-couture-9x16-58s.mp4'} className="mx-auto max-h-[650px] w-full bg-[#0d0d0d]">
     <track kind="captions" src={BASE+'/captions-58s.vtt'} srcLang="en" label="English" />
     Open or download the 58-second cut below.
    </video>
    <div className="mt-4 flex flex-wrap gap-3"><a className={button} href={BASE+'/graffiti-couture-9x16-58s.mp4'} download>Download 58-second cut</a><a className={button} href={BASE+'/graffiti-couture-9x16-58s.mp4'} target="_blank" rel="noopener noreferrer">Open video</a></div>
   </article>
   <article className={card}>
    <h3 className="text-xl font-bold">Under 10 MB, full length</h3>
    <p className="my-3 text-sm">1080 x 1920, 72 seconds, 9.6 MB. The full vertical film sized for upload forms that cap files at 10 MB.</p>
    <video aria-label="Graffiti Couture vertical cut under 10 MB" controls playsInline preload="none" width={1080} height={1920} poster={BASE+'/preview/poster-9x16-800.webp'} src={BASE+'/graffiti-couture-9x16-social.mp4'} className="mx-auto max-h-[650px] w-full bg-[#0d0d0d]">
     <track kind="captions" src={BASE+'/captions.vtt'} srcLang="en" label="English" />
     Open or download the vertical cut below.
    </video>
    <div className="mt-4 flex flex-wrap gap-3"><a className={button} href={BASE+'/graffiti-couture-9x16-social.mp4'} download>Download under 10 MB</a><a className={button} href={BASE+'/graffiti-couture-9x16-social.mp4'} target="_blank" rel="noopener noreferrer">Open video</a></div>
   </article>
  </section>
  <section className="grid gap-5 lg:grid-cols-2" aria-label="Graffiti Couture ad copy">
   <CopyCard title="Primary text" text={copy['Primary text']} />
   <CopyCard title="Headline" text={copy['Headline']} />
   <CopyCard title="Description" text={copy['Description']} />
   <CopyCard title="Call to action" text={copy['Call to action']} />
   <CopyCard title="Reels caption" text={copy['Reels caption']} />
   <CopyCard title="Site link" text={copy['Site link']} />
  </section>
  <section className={card}>
   <h3 className="text-xl font-bold">Ready to post</h3>
   <p className="mt-3 text-sm">Run the widescreen or square cut with the Primary text, Headline, and Description, button set to Learn More on the site link. Post the 58-second cut to Reels with the Reels caption. The ask is the site or a call to Mr. Mustard at (406) 312-1223.</p>
   <div className="mt-4 flex flex-wrap gap-3"><a className={button} href={BASE+'/captions.srt'} download>Download captions</a><a className={button} href={BASE+'/post-copy.txt'} download>Download post copy</a><a className={button} href="tel:+14063121223">Call Mr. Mustard</a></div>
  </section>
 </div>;
}
