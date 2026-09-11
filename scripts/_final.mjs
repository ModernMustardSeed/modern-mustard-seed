import fs from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const SRC = 'C:/Users/SMSca/AppData/Local/Temp/claude/C--Users-SMSca/08f54074-a221-4811-8a99-f73fc166934f/scratchpad/built-right-lunch.html';
const OUT = 'C:/Users/SMSca/dev/mms/clients/built-right-montana/built-right-lunch-2026-09-10.pdf';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(pathToFileURL(SRC).href, { waitUntil: 'networkidle' });
await p.emulateMedia({ media: 'print' });
await p.waitForTimeout(700);
await p.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.55in', right: '0.55in' } });
await b.close();
// How many sheets did it actually come out as?
const buf = fs.readFileSync(OUT);
const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('pdf', Math.round(buf.length/1024)+' KB |', pages, 'printed pages');
