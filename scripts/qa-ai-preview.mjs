import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parse} from 'node-html-parser';
import {chromium} from 'playwright';
const base=process.argv[2];
assert.ok(base?.startsWith('https://'));
const origin=new URL(base).origin;
assert.equal(base,origin,'Pass the deployment origin without a trailing slash');
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers=bypass?{'x-vercel-protection-bypass':bypass}:{};
const output=process.env.AI_QA_OUT || 'C:/Users/SMSca/artifacts/mms-ai-discoverability';
await fs.mkdir(output,{recursive:true});
const checks=[];
for(const [path,marker] of [['/ai-websites','carry its share.'],['/resources','Field notes for'],['/blog/ai-readable-website-checklist','Sarah Scarano'],['/montana/kalispell','AI website'],['/about','Sarah Scarano'],['/demos','Demo Station'],['/robots.txt','OAI-SearchBot'],['/sitemap.xml','/ai-websites'],['/llms.txt','AI-native product studio']]){
 const response=await fetch(base+path,{headers,redirect:'manual'});
 const html=await response.text();
 assert.equal(response.status,200,path);
 assert.ok(!html.includes('Authentication Required'),`${path}: preview protection requires VERCEL_AUTOMATION_BYPASS_SECRET`);
 assert.ok(html.toLowerCase().includes(marker.toLowerCase()),`${path}: new-build marker`);
 const doc=parse(html);
 for(const script of doc.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
 const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
 if(!path.endsWith('.txt')&&!path.endsWith('.xml')){
  assert.equal(canonical,'https://modernmustardseed.com'+path);
  assert.ok(doc.querySelector('title')?.textContent,path+': title');
  assert.ok(!/noindex/i.test(doc.querySelector('meta[name="robots"]')?.getAttribute('content') || ''),path+': public metadata');
  if(origin==='https://modernmustardseed.com')assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag')||''),path+': production indexability');
 }
 checks.push({path,status:response.status,marker,canonical,xRobotsTag:response.headers.get('x-robots-tag')});
}
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  // Keep the preview credential on this deployment, never on external requests.
  if(bypass)await page.route('**/*',route=>new URL(route.request().url()).origin===origin
   ?route.continue({headers:{...route.request().headers(),...headers}}):route.continue());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/ai-websites','/resources','/talking-website']){
   errors.length=0;
   await page.goto(base+path,{waitUntil:'networkidle'});
   const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));});
   assert.equal(await page.locator('h1').count(),1);
   assert.ok(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`${output}/preview-${path.slice(1)}-${width}.png`});
  }
  await page.close();
 }
}finally{await browser.close();}
await fs.writeFile(`${output}/preview.json`,JSON.stringify({base,checkedAt:new Date().toISOString(),checks,browserChecks:9},null,2));
console.log(JSON.stringify({base,checks,browserChecks:9}));
