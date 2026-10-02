import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const origin=process.argv[2]||'http://127.0.0.1:4320';
const out='qa/flathead';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addCookies([{name:'mms_consent',value:'denied',url:origin}]);
await context.addInitScript(()=>{localStorage.setItem('mms-ask-seen',String(Date.now()));});
await context.route('**/api/**',async route=>{if(route.request().method()==='POST')return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});return route.continue()});
const results=[];
for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',320,740],['tablet',768,1024]]){
 const page=await context.newPage();await page.setViewportSize({width,height});const errors=[];const failed=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)failed.push({url:response.url(),status:response.status()})});
 await page.goto(origin,{waitUntil:'networkidle',timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1600);
 await page.screenshot({path:`${out}/${name}-home.png`});
 await page.locator('.portfolio-band').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-portfolio.png`});
 const rail=page.locator('.portfolio-rail');const before=await rail.evaluate(e=>e.scrollLeft);
 await page.getByRole('button',{name:'Next projects',exact:true}).click();await page.waitForTimeout(800);
 const after=await rail.evaluate(e=>e.scrollLeft);
 await rail.focus();await page.keyboard.press('End');await page.waitForTimeout(300);
 await rail.evaluate(e=>{e.scrollLeft=e.scrollWidth});await page.waitForTimeout(400);
 const endDisabled=await page.getByRole('button',{name:'Next projects',exact:true}).isDisabled();
 for(const image of await page.locator('.portfolio-project img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(async image=>{try{await image.decode()}catch{}});}
 const data=await page.evaluate(()=>({projects:document.querySelectorAll('.portfolio-project:not(.portfolio-clone)').length,frames:[...document.querySelectorAll('.portfolio-project img')].every(i=>i.complete&&i.naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('.portfolio-project:not(.portfolio-clone) a')].map(a=>({href:a.href,target:a.target,rel:a.rel})),faq:document.querySelectorAll('.faq-list details').length,film:document.querySelectorAll('#film-select option').length,font:getComputedStyle(document.querySelector('h1')).fontFamily,ready:document.querySelector('.hero').dataset.ready,footers:document.querySelectorAll('footer').length}));
 await page.locator('#practice').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-services.png`});
 await page.locator('.faq-list details').first().locator('summary').focus();await page.keyboard.press('Enter');const faqOpens=await page.locator('.faq-list details').first().evaluate(e=>e.open);
 await page.selectOption('#film-select',{label:'9:47 PM'});const filmSelect=await page.locator('video').evaluate(v=>v.getAttribute('aria-label')?.includes('9:47'));
 results.push({name,errors,failed,scrollWorks:after>before,endDisabled,faqOpens,filmSelect,...data});await page.close();
}
const source=await readFile('app/sitemap.ts','utf8');const staticSection=source.match(/const STATIC_PATHS = \[([\s\S]*?)\];/)[1];
const routes=[...staticSection.matchAll(/'([^']*)'/g)].map(m=>m[1]||'/').filter(route=>!['/world','/super-nomad','/super-nomad/privacy','/super-nomad/terms','/sarahscarano'].includes(route));
for(let i=0;i<routes.length;i+=3){await Promise.all(routes.slice(i,i+3).map(async path=>{
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
 const data=await page.evaluate(()=>({heading:document.querySelector('h1')?.textContent,font:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).fontFamily:'',overflow:document.documentElement.scrollWidth>innerWidth,canonical:document.querySelector('link[rel="canonical"]')?.href,visible:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).opacity!=='0':false}));
 if(['/inquire','/websites','/white-label','/about','/book','/work','/contact','/ai'].includes(path)){
  await page.screenshot({path:`${out}/${path.slice(1)||'home'}-desktop.png`});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.screenshot({path:`${out}/${path.slice(1)||'home'}-phone.png`});
  data.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 }
 results.push({path,status:response.status(),errors,...data});console.log(path,response.status(),errors.length);
 }catch(error){results.push({path,error:error.message});console.log(path,error.message)}finally{await page.close()}
}));}
// Exercise contact success and recovery without delivering a message.
const form=await context.newPage();const requests=[];let fail=true;
await form.route('**/api/contact',async route=>{requests.push(JSON.parse(route.request().postData()));await new Promise(resolve=>setTimeout(resolve,350));await route.fulfill({status:fail?503:200,contentType:'application/json',body:fail?'{}':'{"ok":true}'})});
await form.goto(origin+'/inquire?kind=white-label&company=QA%20Studio',{waitUntil:'networkidle'});
await form.locator('#inq-name').fill('Design verification');await form.locator('#inq-email').fill('design-check@example.com');await form.locator('#inq-message').fill('Intercepted interface test. No message is sent.');await form.locator('#inq-timeline').selectOption('quarter');
const prefilled=await form.locator('button[aria-pressed=true]').textContent();const submit=form.getByRole('button',{name:'Send the inquiry',exact:true});
await submit.click();await form.getByText('Something went wrong. Please try again.',{exact:true}).waitFor();const errorState=true;
fail=false;await submit.click();await form.getByText('Thank you. It is with Sarah.',{exact:true}).waitFor();
results.push({test:'inquiry-flow',prefilled,errorState,success:true,interceptedRequests:requests.length,source:requests[0]?.source,companyInPayload:requests[0]?.message.includes('QA Studio')});
await form.screenshot({path:`${out}/inquiry-success-phone.png`});
const privatePage=await context.newPage();await privatePage.goto(origin+'/admin/login',{waitUntil:'networkidle'});results.push({test:'private-scope',editorialScope:await privatePage.evaluate(()=>document.documentElement.classList.contains('riv'))});
const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(origin,{waitUntil:'networkidle'});await nojs.locator('.faq-list details summary').first().click();results.push({test:'no-javascript',portfolioCount:await nojs.locator('.portfolio-project:not(.portfolio-clone)').count(),readable:await nojs.locator('.faq-list details').first().evaluate(e=>e.open)});
const booking=await context.newPage();const bookings=[];
const slot={startIso:'2026-10-12T15:00:00Z',display:'Monday, October 12 at 9:00 AM Mountain Time',shortLabel:'Oct 12',dayLabel:'Monday, October 12',timeLabel:'9:00 AM'};
await booking.route('**/api/book/slots*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({slots:[slot]})}));
await booking.route('**/api/book',route=>{bookings.push(JSON.parse(route.request().postData()));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({display:slot.display})})});
await booking.goto(origin+'/book?business=QA%20Studio&idea=Portfolio%20verification#pick',{waitUntil:'domcontentloaded'});
await booking.getByPlaceholder('Jane Builder').fill('Design verification');await booking.getByPlaceholder('you@yourbusiness.com').fill('design-check@example.com');
await booking.locator('#pick button[aria-pressed]').first().click();await booking.locator('form button[type=submit]').click();await booking.getByText('You are on the book.',{exact:true}).waitFor();
results.push({test:'booking-flow',success:true,interceptedRequests:bookings.length,businessPrefilled:bookings[0]?.business==='QA Studio',ideaPrefilled:bookings[0]?.focus==='Portfolio verification',slotRetained:bookings[0]?.startIso===slot.startIso});
await booking.screenshot({path:`${out}/booking-success.png`});
await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));
const bad=results.filter(r=>r.error||r.errors?.length||r.overflow||r.mobileOverflow||r.status>=400||r.scrollWorks===false||r.endDisabled===false||r.faqOpens===false||r.frames===false||r.footers>1);
console.log(JSON.stringify({checks:results.length,failures:bad},null,2));if(bad.length)process.exitCode=1;
