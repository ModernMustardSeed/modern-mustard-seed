import {chromium} from 'playwright';
import {mkdir,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';

const work=path.resolve('.video-work/built-right');await mkdir(work,{recursive:true});
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let output='',errors='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>errors+=d);child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(errors.slice(-1500))))});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1,recordVideo:{dir:work,size:{width:1600,height:1000}}});
await context.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const gate=document.createElement('div');gate.id='capture-gate';gate.style.cssText='position:fixed;inset:0;background:#000;z-index:2147483647';document.body.append(gate);const style=document.createElement('style');style.textContent='html{scrollbar-width:none}::-webkit-scrollbar{display:none}';document.head.append(style)});});
const page=await context.newPage();const response=await page.goto('https://builtrightinmontana.com',{waitUntil:'domcontentloaded'});if(response.status()!==200)throw new Error('Built Right did not load');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2200);
const take=await page.evaluate(async()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const scroll=async(to,ms)=>{const from=scrollY,start=performance.now();await new Promise(done=>{const frame=now=>{const t=Math.min(1,(now-start)/ms);const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;window.scrollTo({top:from+(to-from)*ease,behavior:'instant'});t<1?requestAnimationFrame(frame):done()};requestAnimationFrame(frame)});};
 const projects=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Projects')?.closest('section');const contact=document.querySelector('#start-your-project');if(!projects||!contact)throw new Error('Expected real project and inquiry sections');
 window.scrollTo({top:0,behavior:'instant'});document.querySelector('#capture-gate').remove();const start=performance.now();await wait(3600);await scroll(projects.getBoundingClientRect().top+scrollY-110,3200);await wait(2600);await scroll(contact.getBoundingClientRect().top+scrollY-110,3200);await wait(3400);return (performance.now()-start)/1000;
});
await page.waitForTimeout(300);const video=page.video();await page.close();await context.close();await browser.close();const raw=await video.path();
const duration=Number((await run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',raw])).trim());const start=Math.max(0,duration-take-.3),fade=.8;
const filter=`[0:v]trim=start=${start.toFixed(3)}:duration=${take.toFixed(3)},setpts=PTS-STARTPTS,scale=1280:800:flags=lanczos,fps=25[v];[v]split=3[body][head][tail];[body]trim=duration=${(take-fade).toFixed(3)},setpts=PTS-STARTPTS[b];[head]trim=duration=${fade},setpts=PTS-STARTPTS[h];[tail]trim=start=${(take-fade).toFixed(3)},setpts=PTS-STARTPTS[t];[t][h]xfade=transition=fade:duration=${fade}:offset=0[x];[b][x]concat=n=2:v=1:a=0[out]`;
await run('ffmpeg',['-y','-i',raw,'-filter_complex',filter,'-map','[out]','-an','-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p','-crf','33','-preset','slow','-g','50','-movflags','+faststart','public/video/built-right-scroll.mp4']);
await run('ffmpeg',['-y','-i','public/video/built-right-scroll.mp4','-frames:v','1','-q:v','3','public/video/built-right-scroll-poster.jpg']);
console.log(JSON.stringify({seconds:take,bytes:(await stat('public/video/built-right-scroll.mp4')).size,poster:'public/video/built-right-scroll-poster.jpg'}));
