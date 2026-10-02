'use client';

import {useEffect} from 'react';
import {attributedHref, readAttribution} from '@/lib/ai-attribution';
import {openConsent} from '@/lib/consent';
import {flatheadFilms} from '@/data/flathead-films';

export default function FlatheadExperience() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.flathead-home');
    const hero = root?.querySelector<HTMLElement>('.hero');
    const canvas = root?.querySelector<HTMLCanvasElement>('#ocean');
    const button = root?.querySelector<HTMLButtonElement>('.motion');
    if (!root || !hero || !canvas || !button) return;
    const label = button.querySelector<HTMLElement>('.motion-label')!;
    const icon = button.querySelector<HTMLElement>('.motion-icon')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let worker: Worker | undefined, disposed = false, paused = reduced.matches, visible = true;
    const cleanups: (() => void)[] = [];
    function update() {button!.setAttribute('aria-label', paused ? 'Play lake motion' : 'Pause lake motion');button!.setAttribute('aria-pressed',String(paused));label.textContent=paused?'Play the lake':'Pause the lake';icon.textContent=paused?'▷':'Ⅱ';}
    function state() {worker?.postMessage({type:'state',paused,visible:visible&&!document.hidden,motion:1});}
    function fallback() {if(disposed)return;hero!.dataset.ready='false';worker?.terminate();button!.disabled=true;label.textContent='Still artwork';icon.textContent='○';}
    const click = () => {paused=!paused;update();state();}; button.addEventListener('click',click);cleanups.push(()=>button.removeEventListener('click',click));update();
    const resize = new ResizeObserver(()=>worker?.postMessage({type:'resize',width:hero.clientWidth,height:hero.clientHeight}));
    const intersect = new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;state();});
    const pointer = (event: PointerEvent) => {if(event.pointerType!=='mouse')return;const rect=hero.getBoundingClientRect();worker?.postMessage({type:'pointer',x:(event.clientX-rect.left)/rect.width-.5,y:.5-(event.clientY-rect.top)/rect.height});};
    const leave = () => worker?.postMessage({type:'pointer',x:0,y:0});
    const motionChange = () => {paused=reduced.matches;update();state();};
    async function start() {
      const image=hero!.querySelector<HTMLImageElement>('.lake-art img')!, boat=hero!.querySelector<HTMLImageElement>('.boat-fallback')!;
      await Promise.all([image.decode(),boat.decode(),document.fonts.ready]);
      if(disposed)return;
      if(!canvas!.transferControlToOffscreen||typeof Worker==='undefined')return fallback();
      worker=new Worker('/flathead/lake-worker-v9.js',{type:'module'});
      worker.onerror=event=>{event.preventDefault();fallback();};worker.onmessage=event=>{if(disposed)return;if(event.data.type==='ready'){hero!.dataset.ready='true';state();}else fallback();};
      const offscreen=canvas!.transferControlToOffscreen();worker.postMessage({type:'init',paused,config:{canvas:offscreen,url:image.currentSrc||image.src,boatUrl:boat.currentSrc||boat.src,width:hero!.clientWidth,height:hero!.clientHeight,pixelRatio:Math.min(devicePixelRatio,innerWidth<760?1.4:1.7),motion:1}},[offscreen]);
      resize.observe(hero!);intersect.observe(hero!);
    }
    document.addEventListener('visibilitychange',state);reduced.addEventListener('change',motionChange);hero.addEventListener('pointermove',pointer);hero.addEventListener('pointerleave',leave);
    start().catch(fallback);
    const attribution=()=>root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach(link=>link.href=attributedHref(link.getAttribute('href')!,readAttribution()));
    attribution();window.addEventListener('mms-attribution-ready',attribution);
    const consent = root.querySelector<HTMLButtonElement>('[data-cookie-preferences]');
    consent?.addEventListener('click',openConsent);cleanups.push(()=>consent?.removeEventListener('click',openConsent));
    const select=root.querySelector<HTMLSelectElement>('#film-select'),video=root.querySelector<HTMLVideoElement>('#studio-film'),caption=root.querySelector<HTMLElement>('.film-caption'),error=root.querySelector<HTMLElement>('.film-error');
    const selectFilm=()=>{if(!video||!select)return;const film=flatheadFilms[Number(select.value)];if(!film)return;video.pause();if(error)error.hidden=true;video.poster=film.poster;video.src=film.src;video.setAttribute('aria-label',film.title);if(caption)caption.textContent=film.title;video.querySelectorAll('track').forEach(track=>track.remove());if(film.track){const track=document.createElement('track');track.kind='captions';track.src=film.track;track.srclang='en';track.label='English';track.default=true;video.append(track);}video.load();};
    const filmError=()=>{if(error)error.hidden=false;};
    const hideFilm=()=>{if(document.hidden)video?.pause();};
    select?.addEventListener('change',selectFilm);video?.addEventListener('error',filmError);document.addEventListener('visibilitychange',hideFilm);
    const filmObserver=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)video?.pause();});if(video)filmObserver.observe(video);
    return ()=>{disposed=true;worker?.terminate();resize.disconnect();intersect.disconnect();filmObserver.disconnect();cleanups.forEach(clean=>clean());document.removeEventListener('visibilitychange',state);document.removeEventListener('visibilitychange',hideFilm);reduced.removeEventListener('change',motionChange);hero.removeEventListener('pointermove',pointer);hero.removeEventListener('pointerleave',leave);window.removeEventListener('mms-attribution-ready',attribution);select?.removeEventListener('change',selectFilm);video?.removeEventListener('error',filmError);video?.pause();};
  }, []);
  return null;
}
