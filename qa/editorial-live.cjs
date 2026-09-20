const { chromium }=require('playwright');
const fs=require('node:fs/promises');
(async()=>{
 const base=process.argv[2]||'http://localhost:3048';
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[], failures=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(base)) failures.push({status:r.status(),url:r.url()})});
 await page.context().addCookies([{name:'mms_consent',value:'denied',url:base}]);
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({animations:'disabled',path:'qa/after-desktop.png'});
 for(const id of ['selected-work','disciplines-heading','founder-heading','mustard-heading','close-heading']){
  await page.locator('#'+id).scrollIntoViewIfNeeded();
  await page.screenshot({animations:'disabled',path:'qa/'+id+'-desktop.png'});
 }
 const widths=[];
 for(const width of [320,375,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>window.scrollTo(0,0));
  widths.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelector('h1').getBoundingClientRect().toJSON()})));
  if(width===390){await page.screenshot({animations:'disabled',path:'qa/after-mobile.png'});await page.locator('#selected-work').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:'qa/work-mobile.png'});}
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.scrollTo(0,0));
 console.log(JSON.stringify({buttons:await page.locator('nav button').evaluateAll(es=>es.map(e=>({text:e.innerText,label:e.getAttribute('aria-label')}))),widths,errors,failures}));
 await fs.writeFile('qa/browser-report.json',JSON.stringify({widths,errors,failures},null,2));

 await page.setViewportSize({width:1100,height:620});
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 await page.keyboard.press('Shift+Tab');
 if(!await page.evaluate(()=>document.getElementById('site-mega-menu').contains(document.activeElement))) throw Error('Menu focus escaped');
 await page.getByRole('button',{name:'Close menu',exact:true}).last().focus();
 await page.screenshot({animations:'disabled',path:'qa/menu-short.png'});
 await page.keyboard.press('Escape');
 if(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded')==='true') throw Error('Menu did not close');
 await page.locator('details').first().locator('summary').click();
 if(!await page.locator('details').first().evaluate(e=>e.open)) throw Error('FAQ failed');
 for(const route of ['/work','/about','/inquire']){
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+route,{waitUntil:'networkidle',timeout:120000});
  await page.screenshot({animations:'disabled',path:'qa/route-'+route.slice(1)+'-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({animations:'disabled',path:'qa/route-'+route.slice(1)+'-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow '+route);
 }
 await page.locator('#inq-name').fill('QA Studio');
 await page.locator('#inq-email').fill('qa@example.com');
 await page.locator('#inq-message').fill('Local interface verification. Request intercepted.');
 await page.locator('#inq-timeline').selectOption('exploring');
 await page.route('**/api/contact',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Test unavailable"}'}));
 await page.getByRole('button',{name:'Send the inquiry',exact:true}).click();
 await page.getByText('Something went wrong. Please try again.',{exact:true}).waitFor();
 await page.screenshot({animations:'disabled',path:'qa/inquiry-error.png'});
 await page.unroute('**/api/contact');
 await page.route('**/api/contact',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await page.getByRole('button',{name:'Send the inquiry',exact:true}).click();
 await page.getByText('Thank you. It is with Sarah.',{exact:true}).waitFor();
 await page.getByText('Thank you. It is with Sarah.',{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({animations:'disabled',path:'qa/inquiry-success.png'});
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Talk to Mr. Mustard now',exact:true}).click();
 await page.screenshot({animations:'disabled',path:'qa/mustard-open.png'});
 console.log('Menu, FAQ, adjacent pages, inquiry error/success, mascot launcher: passed. No requests sent to the contact API.');

 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
