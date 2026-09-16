import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { projectForEmail } from '@/lib/client-leads';
import { clientGuide } from '@/lib/command-center/guide';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE OWNER'S MANUAL, printable. The same words as the How-it-works card,
 * set for paper in their colours, one page per section. Open it and print;
 * the browser makes the PDF. Generated from lib/command-center/guide.ts so
 * the paper can never say something the portal does not.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // The manual is the proposal as much as the handbook: a client on a
  // project may read it before the Command Center is switched on.
  const project = projectForEmail(session.email);
  if (!project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  const guide = clientGuide(project);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(project.business)}: your Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--ink:#161616;--green:#48603c;--sienna:#9b4f2f;--paper:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:400 12.5pt/1.55 "Source Sans 3",system-ui,sans-serif}
.page{max-width:7.5in;margin:0 auto;padding:.6in .5in}
h1{font-family:Fraunces,Georgia,serif;font-weight:800;font-size:30pt;line-height:1.05;margin:0 0 6pt;color:var(--green)}
h2{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:18pt;margin:0 0 6pt;color:var(--ink);border-top:3px solid var(--sienna);padding-top:10pt}
.eyebrow{font-size:9pt;letter-spacing:.22em;text-transform:uppercase;color:var(--sienna);font-weight:600;margin:0 0 4pt}
.lede{font-size:13pt;color:#333;margin:0 0 18pt}
section{margin:0 0 16pt;break-inside:avoid}
p{margin:0 0 7pt}
.foot{margin-top:24pt;padding-top:8pt;border-top:1px solid #ccc;font-size:9.5pt;color:#555;display:flex;justify-content:space-between;gap:12pt}
.print{position:fixed;top:12px;right:12px;background:var(--green);color:#fff;border:0;border-radius:8px;padding:10px 14px;font:600 11pt "Source Sans 3",sans-serif;cursor:pointer}
@media print{.print{display:none}.page{padding:0}@page{margin:.6in .5in}}
</style></head><body>
<button class="print" onclick="window.print()">Print or save as PDF</button>
<div class="page">
<p class="eyebrow">${esc(project.business)}</p>
<h1>Your Command Center</h1>
<p class="lede">What each part does on its own, and the one thing you do. Keep this in the truck; the live version is at ${esc(project.office.host)}.</p>
${guide.map((g) => `<section><h2>${esc(g.title)}</h2>${g.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</section>`).join('')}
<div class="foot"><span>Built and kept by Modern Mustard Seed, Kalispell. Sarah Scarano, (406) 250-6076, sarah@modernmustardseed.com.</span><span>${esc(today)}</span></div>
</div></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
