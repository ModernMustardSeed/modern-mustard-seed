import type { OutboundLead } from '@/lib/outbound';

/**
 * The AI Game Plan one-pager: the letter-size sheet Sarah hands a business at
 * the door. Three QR codes (demo hub, forged site, integration plan), the
 * findings mined from the lead's research notes, and the studio contact bar.
 *
 * Deliberately ink-light: white fills and thin mustard borders only, because
 * these print on a home printer. The only dense ink on the page is the QR
 * codes themselves.
 *
 * Served print-ready at /admin/outbound/gameplan/<leadId>; the same template
 * drives the local batch tool that renders the route-day PDF packs.
 */

/** Pull one `MARKER: value` line out of the research notes. */
function noteLine(notes: string, marker: string): string | null {
  const m = notes.match(new RegExp(`^${marker}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

/**
 * The WEBSITE research line carries internal sales directives ("do NOT pitch
 * the website", "do not lead with the site"). Those must never print on the
 * customer's page. Keep the descriptive half, drop the directive sentences,
 * and soften verdict labels into customer-safe language.
 */
function sanitizeWeb(web: string | null): string | null {
  if (!web) return null;
  let s = web
    .split(/(?<=[.;])\s+/)
    .filter((part) => !/do not|don't|pitch|disqualif|lead with|internal|verified aug|verified 20/i.test(part))
    .join(' ');
  s = s
    .replace(/\bSTRONG:\s*/i, 'solid and current: ')
    .replace(/\bBROKEN:\s*/i, 'broken: ')
    .replace(/\bDEAD:\s*/i, 'down: ')
    .replace(/\bNONE\.\s*/i, 'none. ')
    .replace(/\s+-\s+/, ': ')
    .trim();
  return s || null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type PlanStep = { t: string; d: string };

function planSteps(voiceFirst: boolean): PlanStep[] {
  const voice: PlanStep = { t: 'An agent that answers every call', d: 'Your own AI front desk picks up when you cannot: after hours, weekends, lunch, mid-job. It answers real questions, books real appointments, and texts you the details. Scan the code below and talk to it yourself.' };
  const site: PlanStep = { t: 'A website that books while you sleep', d: 'Not a brochure. A site built to turn a search into a booked job: clear services, real reviews, tap-to-call, and online booking that works at 11pm.' };
  const os: PlanStep = { t: 'One command center for all of it', d: 'Every call, booking, and lead in one dashboard you own. No logins to seven tools. You see exactly what the phone and the website brought in.' };
  return voiceFirst ? [voice, site, os] : [site, voice, os];
}

export type GameplanQrs = { hubQr: string | null; siteQr: string | null; planQr: string | null };

export function gameplanSheetHtml(l: OutboundLead, { hubQr, siteQr, planQr }: GameplanQrs): string {
  const notes = l.notes || '';
  const trade = noteLine(notes, 'TRADE') || '';
  const web = sanitizeWeb(noteLine(notes, 'WEBSITE')) || '';
  const reviews = noteLine(notes, 'REVIEWS') || '';
  const hours = noteLine(notes, 'HOURS') || '';
  const gap = noteLine(notes, 'GAP') || '';
  const voiceFirst = /voice demo only|voice-first|Voice only|voice demo first/i.test(notes);
  const steps = planSteps(voiceFirst);
  const found = [
    web ? `<li><b>Your website today:</b> ${esc(web.replace(/ - /, ': '))}</li>` : '',
    reviews ? `<li><b>Your reputation:</b> ${esc(reviews)}. People already trust you. The internet just does not show it well enough.</li>` : '',
    hours ? `<li><b>Your phone coverage:</b> ${esc(hours)}</li>` : '',
  ].filter(Boolean).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Game Plan: ${esc(l.business_name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap">
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; }
  html { background: #E9E4D8; }
  body { font-family: 'Barlow', sans-serif; color: #221C10; background: #E9E4D8; padding: 28px 12px 48px; }
  .sheet { width: 8.5in; min-height: 11in; margin: 0 auto; background: #fff; box-shadow: 0 10px 34px rgba(34,28,16,0.22); padding: 0.55in 0.6in; display: flex; flex-direction: column; }
  .printbar { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; z-index: 5; }
  .printbar button, .printbar a { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 14px; border: 2px solid #221C10; border-radius: 8px; padding: 8px 16px; cursor: pointer; text-decoration: none; }
  .printbar button { background: #F5B700; color: #221C10; box-shadow: 3px 3px 0 0 #221C10; }
  .printbar a { background: #fff; color: #221C10; }
  @media print {
    html, body { background: #fff; padding: 0; }
    .sheet { width: auto; min-height: 0; margin: 0; box-shadow: none; padding: 0.55in 0.6in; height: 11in; }
    .printbar { display: none; }
  }
  .band { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 4px solid #221C10; padding-bottom: 10px; }
  .wordmark { font-family: 'Barlow Condensed'; font-weight: 700; font-size: 15px; letter-spacing: 0.18em; }
  .wordmark span { color: #F5B700; }
  .date { font-size: 12px; color: #6B6250; }
  h1 { font-family: 'Barlow Condensed'; font-weight: 700; font-size: 52px; line-height: 0.95; text-transform: uppercase; margin-top: 18px; }
  h1 .accent { color: #F5B700; }
  .prepared { font-size: 15px; margin-top: 6px; color: #6B6250; }
  .prepared b { color: #221C10; }
  .intro { font-size: 13.5px; line-height: 1.45; margin-top: 14px; max-width: 62ch; }
  h2 { font-family: 'Barlow Condensed'; font-weight: 700; font-size: 19px; text-transform: uppercase; letter-spacing: 0.06em; margin: 18px 0 6px; }
  h2 .n { display: inline-block; background: #F5B700; color: #221C10; border-radius: 4px; padding: 0 7px; margin-right: 6px; }
  ul { padding-left: 18px; font-size: 12.5px; line-height: 1.5; }
  li { margin: 3px 0; }
  .leak { background: #fff; border: 1.5px solid #E4DCC8; border-left: 5px solid #F5B700; border-radius: 6px; padding: 10px 14px; font-size: 13px; line-height: 1.45; margin-top: 6px; }
  .steps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 6px; }
  .step { border: 1.5px solid #E4DCC8; border-radius: 8px; padding: 10px 12px; }
  .step b { display: block; font-family: 'Barlow Condensed'; font-size: 16px; font-weight: 700; text-transform: uppercase; line-height: 1.1; margin-bottom: 5px; }
  .step p { font-size: 11px; line-height: 1.45; }
  .built { display: flex; gap: 18px; align-items: center; background: #fff; color: #221C10; border: 2px solid #221C10; border-top: 6px solid #F5B700; border-radius: 10px; padding: 14px 18px; margin-top: auto; }
  .built .qr { width: 1in; height: 1in; background: #fff; flex-shrink: 0; }
  .built .qr svg { width: 100%; height: 100%; }
  .built h3 { font-family: 'Barlow Condensed'; font-size: 22px; font-weight: 700; text-transform: uppercase; color: #221C10; }
  .built h3 span { color: #B8860B; }
  .built p { font-size: 12px; line-height: 1.45; margin-top: 4px; color: #221C10; }
  .qrlabel { font-size: 10px; text-align: center; margin-top: 3px; color: #221C10; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; }
  .contact { display: flex; justify-content: center; gap: 6px 22px; flex-wrap: wrap; border: 1.5px solid #E4DCC8; border-radius: 8px; padding: 8px 14px; margin-top: 12px; font-size: 12px; color: #221C10; }
  .contact b { font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 0.04em; }
  .contact .m { color: #B8860B; }
  footer { display: flex; justify-content: space-between; align-items: baseline; font-size: 10.5px; color: #6B6250; margin-top: 8px; }
  footer b { color: #221C10; }
</style></head><body>
<div class="printbar">
  <button onclick="window.print()">Print this sheet</button>
  <a href="/admin/outbound">Back to Outbound</a>
</div>
<div class="sheet">
  <div class="band">
    <div class="wordmark">MODERN <span>MUSTARD</span> SEED</div>
    <div class="date">Prepared ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; modernmustardseed.com</div>
  </div>
  <h1>The AI <span class="accent">Game Plan</span></h1>
  <p class="prepared">Prepared for <b>${esc(l.business_name)}</b>${l.city ? ` &middot; ${esc(l.city)}, ${esc(l.state || 'MT')}` : ''}${trade ? ` &middot; ${esc(trade)}` : ''}</p>
  <p class="intro">We looked at how ${esc(l.business_name)} shows up online and what happens to your phone when nobody can answer it. This page is what we found and what we would do about it. It is yours to keep either way, and the demos on it are already live.</p>

  <h2><span class="n">1</span>What we found</h2>
  <ul>${found || '<li>We are still gathering research on this business.</li>'}</ul>

  ${gap ? `<h2><span class="n">2</span>The leak</h2>
  <div class="leak">${esc(gap)}. A missed call does not wait: the average caller who reaches voicemail calls the next business on the list. You never see the jobs you lose this way, which is exactly why they are easy to lose.</div>` : ''}

  <h2><span class="n">3</span>The plan</h2>
  <div class="steps">
    ${steps.map((s) => `<div class="step"><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div>`).join('')}
  </div>

  <div class="built">
    ${hubQr ? `<div><div class="qr">${hubQr}</div><div class="qrlabel">Your demos</div></div>` : ''}
    ${siteQr ? `<div><div class="qr">${siteQr}</div><div class="qrlabel">Your new site</div></div>` : ''}
    ${planQr ? `<div><div class="qr">${planQr}</div><div class="qrlabel">Your full plan</div></div>` : ''}
    <div>
      <h3>Already built. <span>Live right now.</span></h3>
      <p>We did not bring a sales deck, we brought the finished thing. Scan the codes: your own AI agent ready to talk${siteQr ? ', the website we built you' : ''}${planQr ? ', and your full step-by-step AI plan, with everything AI can do for a business like yours and our free playbook shelf inside' : ''}. Talk to the agent. Ask it what you would ask a front desk.</p>
    </div>
  </div>

  <div class="contact">
    <span><b>Sarah Scarano</b> &middot; (406) 250-6076 &middot; call or text me directly</span>
    <span><b class="m">Talk to our AI any time:</b> Mr. Mustard &middot; (406) 312-1223</span>
    <span><b>modernmustardseed.com</b> &middot; sarah@modernmustardseed.com</span>
  </div>

  <footer>
    <div><b>Set package pricing.</b> Changes included. No hourly billing, ever. You own everything we build.</div>
    <div>Kalispell, Montana &middot; yes, an AI answers our phone too</div>
  </footer>
</div>
</body></html>`;
}
