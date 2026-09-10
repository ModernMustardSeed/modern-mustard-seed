'use client';
import { useRef, useState } from 'react';
import copy from '@/data/make-it-real-campaign.json';
const BASE = '/ads/make-it-real';
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

export default function MakeItRealCampaign() {
 return <div id="make-it-real-campaign" className="space-y-7">
  <section className="border-2 border-[#161616] bg-[#080C16] p-6 text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] md:p-8">
   <p className="font-mono text-xs text-[#F5B700]">Campaign 27 / Original music film</p>
   <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">Make it <span className="text-[#F5B700]">real.</span></h2>
   <p className="mt-4 max-w-2xl leading-relaxed">For the idea you kept. An original song and a cinematic journey from a sketchbook into the world. Three 38-second cuts, ready to post.</p>
   <a className={button+' mt-5'} href={BASE+'/make-it-real-campaign.zip'} download>Download the campaign</a>
  </section>
  <section className="grid gap-6 lg:grid-cols-2" aria-label="Make it real films">
   {[{id:'16x9',title:'Widescreen film',width:1920,height:1080,note:'1920 x 1080. The full cinematic composition for YouTube, presentations, and your website.'},{id:'9x16',title:'Reels and Stories',width:1080,height:1920,note:'1080 x 1920. A full-screen cut for Reels, Stories, and Shorts.'},{id:'1x1',title:'Social feed',width:1080,height:1080,note:'1080 x 1080. A square cut for Facebook, Instagram, and LinkedIn feeds.'}].map(cut=><article key={cut.id} className={card+(cut.id==='16x9'?' lg:col-span-2':'')}>
    <h3 className="mb-3 text-xl font-bold">{cut.title}</h3>
    <video aria-label={cut.title+' video'} controls playsInline preload="none" width={cut.width} height={cut.height} poster={BASE+'/preview/poster-'+cut.id+'-800.webp'} src={BASE+'/make-it-real-'+cut.id+'.mp4'} className="mx-auto max-h-[650px] w-full bg-[#080C16]">
     <track kind="captions" src={BASE+'/captions.vtt'} srcLang="en" label="English song lyrics" />
     Your browser does not support video playback. Use the download below.
    </video>
    <p className="my-3 text-sm">{cut.note} Song lyrics are included on screen.</p>
    <div className="flex flex-wrap gap-3"><a className={button} href={BASE+'/make-it-real-'+cut.id+'.mp4'} download>Download {cut.title}</a><a className={button} href={BASE+'/poster-'+cut.id+'.jpg'} download>Download cover</a></div>
   </article>)}
  </section>
  <section className={card}>
   <h3 className="text-xl font-bold">The original song</h3>
   <p className="my-3 text-sm">Make It Real. A 38-second vocal track made for this film.</p>
   <audio aria-label="Make It Real original song" controls preload="none" src={BASE+'/make-it-real-song.mp3'} className="w-full">Download the song below.</audio>
   <div className="mt-4 flex flex-wrap gap-3"><a className={button} href={BASE+'/make-it-real-song.mp3'} download>Download song</a><a className={button} href={BASE+'/captions.srt'} download>Download captions</a><a className={button} href={BASE+'/post-copy.txt'} download>Download post copy</a></div>
  </section>
  <section className="grid gap-5 lg:grid-cols-2" aria-label="Campaign copy">
   {(['Launch post','Short caption','Conversation reply','Video description'] as const).map(key=><CopyCard key={key} title={key} text={copy[key]} />)}
  </section>
  <section className={card}>
   <h3 className="text-xl font-bold">Put the idea in front of people</h3>
   <ol className="mt-3 list-decimal space-y-2 pl-5"><li>Download the cut that fits your post and upload the video directly.</li><li>Copy the Launch post or Short caption. Invite people to tell you what they want to build.</li><li>Use the Conversation reply to learn what their idea does and who it serves.</li></ol>
  </section>
 </div>;
}
