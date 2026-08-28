/**
 * The film's open and close cards: the pop-art MMS bookends the rest of the
 * suite already wears (cream, ink borders, gold, the offset hard shadow).
 *
 * They are plain HTML written to disk and opened as file:// pages inside the
 * SAME recording context as the demos, so the whole film is one continuous
 * take with no editing seams to line up later.
 *
 * Both cards animate on a `.go` class the recorder adds, never on load, so the
 * motion starts when the narration does instead of while the page is still
 * settling.
 */

const CREAM = '#FBF6EA';
const INK = '#161616';
const GOLD = '#F5B700';
const RED = '#E0301E';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const SHELL = (body, extraCss = '') => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{background:${CREAM};color:${INK};font-family:"DM Sans",system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;text-align:center;
       /* The halftone the whole pop-art system uses, kept faint. */
       background-image:radial-gradient(${INK}0F 1.1px, transparent 1.2px);
       background-size:14px 14px}
  .eyebrow{font-family:"JetBrains Mono",monospace;font-weight:700;text-transform:uppercase;
           letter-spacing:.34em;font-size:15px;color:${RED}}
  .rule{width:74px;height:5px;background:${GOLD};border:2.5px solid ${INK};border-radius:99px;margin:0 auto}
  .fade{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
  .go .fade{opacity:1;transform:none}
  ${[1, 2, 3, 4, 5].map((i) => `.go .d${i}{transition-delay:${i * 150}ms}`).join('')}
  @media (prefers-reduced-motion:reduce){.fade{transition:none;opacity:1;transform:none}}
</style></head><body>${body}<style>${extraCss}</style></body></html>`;

/**
 * Beat one: whose film this is.
 *
 * The credit line names the BUSINESS, never their town. Sarah, 2026-08-01:
 * "instead of made for Lebanon or whatever city they are in, just say made
 * whatever the company name is instead." A city reads like a mail-merge field;
 * their own name reads like it was made for them, which it was.
 */
export function openCard({ business }) {
  return SHELL(`
  <div style="max-width:1180px;padding:0 64px">
    <p class="eyebrow fade d1">Built by Modern Mustard Seed</p>
    <div class="rule fade d2" style="margin-top:26px"></div>
    <h1 class="fade d3" style="font-family:'Playfair Display',Georgia,serif;font-weight:900;
        font-size:clamp(48px,7.4vw,116px);line-height:1.02;letter-spacing:-.02em;margin-top:30px">
      ${esc(business)}
    </h1>
    <p class="fade d4" style="font-size:26px;line-height:1.5;margin-top:26px;color:${INK}B3">
      A website and a voice agent, made for ${esc(business)}.<br>
      <span style="background:${GOLD};border:2.5px solid ${INK};border-radius:99px;padding:5px 20px;
            display:inline-block;margin-top:20px;font-weight:700;color:${INK};font-size:21px;
            box-shadow:5px 5px 0 0 ${INK}">Everything you are about to see is live</span>
    </p>
  </div>`);
}

/**
 * The last beat: where it lives, and an invitation rather than an accounting.
 *
 * It used to close on "Nothing to sign. Nothing to cancel. Nothing owed."
 * Sarah, 2026-08-01: "the end says something about nothing owed. that's stupid
 * and we could say something better." Its replacement, "No card, no meeting,
 * no catch", died the same way (Sarah 2026-08-03): a negation list still ends
 * the film on what is absent. The close now keeps ONE positive reassurance
 * (the link is theirs to keep) and hands them a concrete ask with a promise
 * attached. Mirror any wording change in the close beat of lines.mjs.
 */
export function closeCard({ business, hubUrl }) {
  const shown = String(hubUrl || '').replace(/^https?:\/\//, '');
  return SHELL(`
  <div style="max-width:1240px;padding:0 64px">
    <p class="eyebrow fade d1">${esc(business)}</p>
    <h1 class="fade d2" style="font-family:'Playfair Display',Georgia,serif;font-weight:900;
        font-size:clamp(42px,6.2vw,96px);line-height:1.05;letter-spacing:-.02em;margin-top:22px">
      It is all yours.
    </h1>
    <p class="fade d3" style="font-size:25px;line-height:1.55;margin-top:24px;color:${INK}B3;max-width:860px;margin-inline:auto">
      Yours to keep, whatever you decide.<br>Tell us the one thing you would change, and we will make it.
    </p>
    <div class="fade d4" style="margin-top:34px;display:inline-block;background:${INK};
         border:3px solid ${INK};border-radius:20px;padding:20px 34px;box-shadow:8px 8px 0 0 ${GOLD}">
      <p style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;
         letter-spacing:.28em;text-transform:uppercase;color:${GOLD}">Your suite</p>
      <p style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:23px;
         color:${CREAM};margin-top:8px;word-break:break-all">${esc(shown)}</p>
    </div>
    <p class="fade d5" style="font-size:20px;margin-top:32px;color:${INK}99">
      Modern Mustard Seed &middot; Kalispell, Montana
    </p>
  </div>`);
}
