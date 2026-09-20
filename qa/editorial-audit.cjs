const {chromium}=require('playwright');
const fs=require('node:fs/promises');
(async()=>{
 const base=process.argv[2]||'http://localhost:3049';
 const browser=await chromium.launch({headless:true,args:['--remote-debugging-port=9345']});
 try{
  if(process.argv[3]==='contrast'){
   const context=await browser.newContext({viewport:{width:390,height:844}});
   const page=await context.newPage();
   await page.goto(base+'/inquire',{waitUntil:'networkidle'});
   const AxeBuilder=require('C:/Users/SMSca/dev/mms/products/site-discovery/node_modules/@axe-core/playwright').default;
   const result=await new AxeBuilder({page}).analyze();
   console.log(JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),null,2));
   return;
  }

  const lighthouse=(await import('lighthouse')).default;
  const result=await lighthouse(base,{port:9345,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']});
  await fs.writeFile('qa/lighthouse.json',result.report);
  const r=result.lhr;
  console.log(JSON.stringify({scores:Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,v.score])),lcp:r.audits['largest-contentful-paint'].displayValue,cls:r.audits['cumulative-layout-shift'].displayValue,failures:Object.values(r.audits).filter(x=>x.score!==null&&x.score<.9&&x.details).map(x=>({id:x.id,value:x.displayValue,items:x.details.items?.slice(0,2)}))},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
