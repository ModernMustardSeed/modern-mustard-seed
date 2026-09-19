'use client';
import { useRef, useState } from 'react';
import copy from '@/data/room-to-grow-campaign.json';
const BASE = '/ads/room-to-grow';
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

export default function RoomToGrowCampaign() {
 return <div id="room-to-grow-campaign" className="space-y-7 text-[#161616]">
  <section className="border-2 border-[#161616] bg-[#080C16] p-6 text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] md:p-8">
   <p className="font-mono text-xs text-[#F5B700]">Room to Grow / Idea to Product</p>
   <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">Give it somewhere<br /><span className="text-[#F5B700]">to grow.</span></h2>
   <p className="mt-4 max-w-2xl leading-relaxed">A 64-second film about the business behind the website: design systems, an operating system, admin, and automations. Original artwork, narration, music, and three finished cuts.</p>
   <a className={button+' mt-5'} href={BASE+'/room-to-grow-campaign.zip'} download>Download the campaign</a>
  </section>
  <section className="grid gap-6 lg:grid-cols-2" aria-label="Room to Grow commercial videos">
   {[{id:'16x9',title:'Widescreen',width:1920,height:1080,note:'For LinkedIn, YouTube, and presentations.'},{id:'9x16',title:'Reels and Stories',width:1080,height:1920,note:'For Instagram, Facebook Reels, and Stories.'},{id:'1x1',title:'Square feed',width:1080,height:1080,note:'For Facebook, Instagram, and LinkedIn feeds.'}].map(cut=><article key={cut.id} className={card+(cut.id==='16x9'?' lg:col-span-2':'')}>
    <h3 className="mb-3 text-xl font-bold">{cut.title}</h3>
    <video aria-label={cut.title+' Room to Grow commercial'} controls playsInline preload="none" width={cut.width} height={cut.height} poster={BASE+'/preview/poster-'+cut.id+'-800.webp'} src={BASE+'/room-to-grow-'+cut.id+'.mp4'} className="mx-auto max-h-[650px] w-full bg-[#080C16]">
     <track kind="captions" src={BASE+'/captions.vtt'} srcLang="en" label="English" />
     Your browser does not support video playback. Open or download the video below.
    </video>
    <p className="my-3 text-sm">{cut.width} x {cut.height}. {cut.note} Voiceover, original music, and on-screen captions included.</p>
    <div className="flex flex-wrap gap-3"><a className={button} href={BASE+'/room-to-grow-'+cut.id+'.mp4'} download>Download {cut.title}</a><a className={button} href={BASE+'/room-to-grow-'+cut.id+'.mp4'} target="_blank" rel="noopener noreferrer">Open video</a><a className={button} href={BASE+'/poster-'+cut.id+'.jpg'} download>Download cover</a></div>
   </article>)}
  </section>
  <section className="grid gap-5 lg:grid-cols-2" aria-label="Room to Grow campaign copy">
   <CopyCard title="Launch post" text={copy['Launch post']} />
   <CopyCard title="Booking link" text={copy['Booking link']} />
  </section>
  <section className={card}>
   <h3 className="text-xl font-bold">Ready to post</h3>
   <p className="mt-3 text-sm">Download a video, upload it to your social post, and paste the launch copy. The link sends prospects to your discovery-call booking page.</p>
   <div className="mt-4 flex flex-wrap gap-3"><a className={button} href={BASE+'/captions.srt'} download>Download captions</a><a className={button} href={BASE+'/post-copy.txt'} download>Download post copy</a><a className={button} href="https://modernmustardseed.com/book" target="_blank" rel="noopener noreferrer">Book a discovery call</a></div>
  </section>
 </div>;
}
