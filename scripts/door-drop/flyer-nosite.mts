/**
 * THE SECOND HALF PAGE, for a business with no website at all.
 *
 * There are twenty nine of these in the seven towns, and they are the easiest
 * sale in the valley. The audit campaign throws them out by construction: an
 * engine that grades a website has nothing to grade. So they get their own
 * piece, and it is built from the one thing that is certain about them.
 *
 * THE HONESTY PROBLEM, AND WHY THIS FILE IS SHORT ON CLAIMS.
 *
 * "You have no website" is the entire pitch, and it is exactly the kind of
 * sentence that must never be printed off an empty database column. A blank
 * `website` field is just as likely to mean nobody ever looked. So this piece is
 * only built for a lead whose Google listing was OPENED and found to carry no
 * site, stamped into the row as `NO WEBSITE: confirmed on Google Maps` with the
 * date it was checked (scripts/door-drop/addresses.mjs). The date is printed.
 * The source is printed. Anyone can check it in ten seconds on their own phone,
 * which is the point.
 *
 * Everything else on the page is either a fact read off that same panel, their
 * phone and their address, or a consequence that follows from it in plain
 * English. Nothing is generated, because there is nothing to generate from, and
 * a paragraph of invented detail about a business is worse than a blank space.
 *
 * The three moves on the back are fixed copy rather than per-business fixes,
 * and that is deliberate. When a business has no website the work is the same
 * work every time, and pretending otherwise by dressing it in their trade name
 * would be the mail-merge tell this whole campaign is built to avoid.
 */
import {
  INK, PAPER, MUSTARD, CRIMSON, GREEN, TRIM_W, TRIM_H,
  clean, type FlyerOptions,
} from './flyer.mts';
import type { Lead } from './select.mts';

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const town = (c: string | null) =>
  (c ?? '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).trim();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** Readable on paper: (406) 862-1622, never +14068621622. */
export function prettyPhone(p: string | null): string | null {
  const d = String(p ?? '').replace(/\D/g, '');
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (n.length !== 10) return p ? clean(p) : null;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

/** Extra rules this piece needs on top of the shared stylesheet. */
export const NOSITE_CSS = `
.nosite-mark { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; line-height: 0.82;
  letter-spacing: -0.035em; }
.listing { list-style: none; margin: 0; padding: 0; display: grid; row-gap: 0.09in; }
.listing li { display: grid; grid-template-columns: 0.17in 1fr; column-gap: 0.085in; align-items: start; }
.tick { display: grid; place-items: center; width: 0.17in; height: 0.17in; margin-top: 0.012in;
  border: 0.014in solid ${INK}; border-radius: 0.034in; color: ${PAPER};
  font-size: 6.6pt; line-height: 1; font-weight: 700; }
.tick.yes { background: ${GREEN}; }
.tick.no { background: ${CRIMSON}; }
.listing-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.13em; color: rgba(22,22,22,0.72); }
.listing-value { display: block; font-size: 9pt; line-height: 1.3; color: #2E2B27; margin-top: 0.022in; }
.listing-value.missing { color: ${CRIMSON}; font-weight: 700; }
.movetitle { font-size: 9.6pt; font-weight: 700; line-height: 1.2; letter-spacing: -0.005em; }
.movebody { font-size: 8.1pt; line-height: 1.38; color: #3A3733; }
`;

/**
 * FRONT. The finding is the absence, so the absence gets the grade panel's
 * position and the grade panel's weight.
 */
export function noSiteFrontInner(lead: Lead, qr: string, opts: FlyerOptions): string {
  const place = town(lead.city) || 'The Flathead';
  const phone = prettyPhone(lead.phone);
  const address = lead.address ? clean(lead.address) : null;
  const checked = longDate(opts.auditedOn);

  return `<div class="pad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="eyebrow">Free Listing Check</span>
    <span class="eyebrow muted">${esc(place)}, Montana</span>
  </div>
  <div class="rule" style="margin:0.075in 0 0.15in"></div>

  <div style="display:grid;grid-template-columns:1fr 2.42in;column-gap:0.26in;flex:1;min-height:0">

    <div style="display:flex;flex-direction:column;min-width:0">
      <h1 class="name" data-fit data-max="29" data-min="14" style="margin:0;font-size:29pt">${esc(lead.business_name)}</h1>
      <div class="domain" style="margin-top:0.07in">no website on your Google listing</div>

      <p class="headline" style="margin:0.12in 0 0" data-clamp="3">
        We came to audit your website and there is not one to audit. That is the finding, and it is
        the most expensive one on this street.
      </p>

      <div class="eyebrow" style="margin:0.17in 0 0.08in">What That Costs You</div>
      <ul class="findings">
        <li class="finding">
          <span class="xmark">&#10007;</span>
          <span style="min-width:0">
            <span class="finding-cat">Every Search Ends Somewhere Else</span>
            <span class="finding-note" data-clamp="3">Someone who looks you up lands on a page Google owns, beside
              competitors who each have one of their own. You do not choose what that page says.</span>
          </span>
        </li>
        <li class="finding">
          <span class="xmark">&#10007;</span>
          <span style="min-width:0">
            <span class="finding-cat">The AI Assistants Cannot Quote You</span>
            <span class="finding-note" data-clamp="3">When a customer asks an assistant who to call in ${esc(place)},
              it answers out of pages businesses wrote about themselves. You have not written one.</span>
          </span>
        </li>
        <li class="finding">
          <span class="xmark">&#10007;</span>
          <span style="min-width:0">
            <span class="finding-cat">Nothing Works While You Do</span>
            <span class="finding-note" data-clamp="3">Hours, prices, photos of your work, a way to book you at nine
              at night. All of it needs somewhere to live.</span>
          </span>
        </li>
      </ul>

      <div style="flex:1;min-height:0.1in"></div>

      <div class="card yellow" style="padding:0.11in 0.14in">
        <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:12.5pt;line-height:1.15;color:${INK}">
          This is the cheapest problem you have, and it is fixed once.
        </p>
        <p style="margin:0.055in 0 0;font-size:7.9pt;line-height:1.33;color:rgba(22,22,22,0.78)">
          Turn this over for what we would build, in order.
        </p>
      </div>

      <p class="note" style="margin:0.105in 0 0">
        We opened your Google listing on ${esc(checked)} and read what it shows. Nothing here is a guess.
        Check it yourself on your phone in ten seconds.
      </p>
    </div>

    <div style="display:flex;flex-direction:column;min-width:0">
      <div class="card yellow" style="padding:0.15in;display:flex;align-items:center;gap:0.15in">
        <div class="nosite-mark" style="font-size:31pt;color:${INK}">None</div>
        <div style="min-width:0">
          <div class="eyebrow" style="color:rgba(22,22,22,0.72)">Websites<br>You Own</div>
        </div>
      </div>

      <div class="eyebrow" style="margin:0.16in 0 0.08in">Your Listing Today</div>
      <ul class="listing">
        <li>
          <span class="tick ${phone ? 'yes' : 'no'}">${phone ? '&#10003;' : '&#10007;'}</span>
          <span style="min-width:0">
            <span class="listing-label">Phone</span>
            <span class="listing-value${phone ? '' : ' missing'}">${phone ? esc(phone) : 'None shown'}</span>
          </span>
        </li>
        <li>
          <span class="tick ${address ? 'yes' : 'no'}">${address ? '&#10003;' : '&#10007;'}</span>
          <span style="min-width:0">
            <span class="listing-label">Address</span>
            <span class="listing-value${address ? '' : ' missing'}" data-clamp="2">${address ? esc(address) : 'None shown'}</span>
          </span>
        </li>
        <li>
          <span class="tick no">&#10007;</span>
          <span style="min-width:0">
            <span class="listing-label">Website</span>
            <span class="listing-value missing">None shown</span>
          </span>
        </li>
      </ul>

      <div style="flex:1"></div>

      <div class="card" style="margin-top:0.13in;padding:0.1in;display:grid;grid-template-columns:0.92in 1fr;column-gap:0.11in;align-items:center">
        <div style="width:0.92in;height:0.92in">${qr}</div>
        <div style="min-width:0">
          <div class="eyebrow" style="color:${CRIMSON}">See One Built</div>
          <p style="margin:0.04in 0 0;font-size:7.8pt;line-height:1.32;color:#3A3733">
            We build a real one, free, before you decide anything. Keep it or walk away.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/**
 * The three moves. Fixed copy on purpose: when a business has no website the
 * work is the same work every time, and dressing it in their trade name to look
 * bespoke would be the mail-merge tell this campaign exists to avoid.
 */
const MOVES = [
  {
    title: 'A website that is yours',
    body: 'Your name, your phone, your hours, your work in photographs, and a page for each thing you do. '
      + 'On your own domain, in your own account, so it cannot be taken away from you.',
  },
  {
    title: 'Put where the machines read',
    body: 'Structured data, a real FAQ, and an llms.txt file, so Google and the AI assistants can quote you '
      + 'instead of guessing. Most sites in this valley have none of it.',
  },
  {
    title: 'Make the phone the point',
    body: 'One button, one number, and something that answers it while you are on a job. Ours is an AI that '
      + 'picks up, answers questions, and books the work.',
  },
];

/** BACK. What we would build, in order, then the same one line of offer. */
export function noSiteBackInner(lead: Lead, qr: string, _opts: FlyerOptions): string {
  const cards = MOVES.map((m, i) => `<div class="card" style="padding:0.14in 0.15in;display:flex;flex-direction:column;min-width:0">
    <div style="display:flex;align-items:flex-start;gap:0.09in">
      <span class="fixnum" style="color:${MUSTARD};-webkit-text-stroke:0.012in ${INK};flex:none">${i + 1}</span>
      <span class="movetitle" data-clamp="3">${esc(m.title)}</span>
    </div>
    <p class="movebody" style="margin:0.09in 0 0" data-clamp="7">${esc(m.body)}</p>
  </div>`).join('');

  return `<div class="pad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="eyebrow">What We Would Build, In Order</span>
    <span class="eyebrow muted">${esc(lead.business_name)}</span>
  </div>
  <div class="rule" style="margin:0.075in 0 0.15in"></div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:0.15in;align-items:stretch">${cards}</div>

  <div style="flex:1;min-height:0.08in"></div>

  <div class="card ink" style="margin-top:0.15in;padding:0.15in 0.17in;display:grid;grid-template-columns:1fr 0.82in;column-gap:0.16in;align-items:center;box-shadow:0.045in 0.045in 0 0 ${MUSTARD}">
    <div style="min-width:0">
      <h2 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:14.5pt;line-height:1.12;color:${PAPER}">
        We build it first, then we grade it in front of you and take it to an <span style="color:${MUSTARD}">A+</span>.
      </h2>
      <p style="margin:0.07in 0 0;font-size:8pt;line-height:1.38;color:rgba(255,253,246,0.82)">
        Modern Mustard Seed is a one person product studio here in Kalispell. Websites, AI systems, and phone
        agents that answer, at a set package price. You own the code, the domain, and the accounts. Call the
        ranch line and Mr. Mustard, our own AI, will pick up and book you.
      </p>
      <p style="margin:0.09in 0 0;font-family:'JetBrains Mono',monospace;font-size:8.4pt;font-weight:700;letter-spacing:0.04em;color:${MUSTARD}">
        (406) 312-1223 &nbsp;&middot;&nbsp; sarah@modernmustardseed.com
      </p>
    </div>
    <div style="background:${PAPER};border-radius:0.06in;padding:0.055in;width:0.82in;height:0.82in">${qr}</div>
  </div>

  <div style="display:flex;align-items:center;gap:0.1in;margin-top:0.13in">
    ${SEED}
    <span class="foot">Modern Mustard Seed &middot; Kalispell, MT &middot; Apps, Sites, and Specialty AI Tools</span>
    <span style="flex:1"></span>
    <span class="foot credit">modernmustardseed.com</span>
  </div>
</div>`;
}

/** The same mark the audit flyer carries, from app/icon.svg. */
const SEED = `<svg viewBox="0 0 64 64" class="seed" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nsSeedGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE16A"/><stop offset="45%" stop-color="#F4C518"/><stop offset="100%" stop-color="#D69A0E"/>
    </linearGradient>
    <linearGradient id="nsLeafGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD83A"/><stop offset="100%" stop-color="#E2A60C"/>
    </linearGradient>
  </defs>
  <g stroke="#1c1205" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M32 17 C 22 21, 16 31, 16 41 C 16 52, 24 58, 32 58 C 40 58, 48 52, 48 41 C 48 31, 42 21, 32 17 Z" fill="url(#nsSeedGold)"/>
    <path d="M32 18 L 32 11" fill="none"/>
    <path d="M32 12 C 27 6, 20 4, 14 6 C 18 12, 26 14, 32 12 Z" fill="url(#nsLeafGold)"/>
    <path d="M32 12 C 37 5, 45 3, 51 6 C 47 12, 38 15, 32 12 Z" fill="url(#nsLeafGold)"/>
  </g>
  <ellipse cx="26" cy="31" rx="4.2" ry="6.8" fill="#FFFFFF" opacity="0.32" transform="rotate(-20 26 31)"/>
</svg>`;

export const NOSITE_TRIM = { w: TRIM_W, h: TRIM_H };
