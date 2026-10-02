import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:4320';
const out='qa/flathead-v11';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addCookies([{name:'mms_consent',value:'denied',url:origin}]);
await context.addInitScript(()=>localStorage.setItem('mms-ask-seen',String(Date.now())));
await context.route('**/api/**',route=>route.request().method()==='POST'?route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}):route.continue());
const report=[];
for(const width of [1440,390,320]){
 const page=await context.newPage();await page.setViewportSize({width,height:width===1440?900:844});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
 const launcher=page.getByRole('button',{name:'Call or chat with Mr. Mustard',exact:true});await launcher.waitFor();
 assert(await launcher.getByText('Call or chat',{exact:true}).isVisible());
 const bounds=await launcher.boundingBox();assert(bounds.x>width/2&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<= (width===1440?900:844));
 assert.equal(await page.locator('[data-flathead-edition]').getAttribute('data-flathead-edition'),'11');
 assert.equal(await page.locator('.flathead-home').getAttribute('data-design'),'mms-editorial-2026','stable production monitor marker');
 assert((await page.locator('.lake-art img').evaluate(e=>e.currentSrc)).includes('flathead-sun-near-talk'));
 await page.waitForTimeout(1500);await page.screenshot({path:out+`/home-${width}.png`});
 await launcher.click();const dialog=page.getByRole('dialog',{name:'Talk to Mr. Mustard',exact:true});await dialog.waitFor();
 assert(await dialog.getByRole('button',{name:/Talk live/}).isVisible(),'real live voice entry is configured');
 assert(await dialog.getByRole('button',{name:/Chat/}).isVisible());await page.screenshot({path:out+`/widget-${width}.png`});
 await dialog.getByRole('button',{name:/Chat/}).click();await page.getByRole('dialog',{name:'Mr. Mustard chat'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 report.push({width,edition:11,sunAsset:true,bottomRight:true,callEntry:true,chatEntry:true,overflow:false});await page.close();
}
await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
