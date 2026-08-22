#!/usr/bin/env node
// Renders the MMS "Missed Call Files" social set to exact-size PNGs.
// Art plates come from ./art (Seedream v4), type is composited here in real
// brand fonts so nothing is left to an image model's spelling.
// Usage: node render.mjs [cardId ...]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// --square renders the 1080x1080 cut for X into cards-square/ instead.
const ARGV = process.argv.slice(2);
const SQ = ARGV.includes('--square');
const H = SQ ? 1080 : 1350;
// NOTE: not "out/" — the repo root .gitignore blocks any directory named out/,
// which would silently drop the finished cards from every commit.
const OUT = path.join(HERE, SQ ? 'cards-square' : 'cards');
fs.mkdirSync(OUT, { recursive: true });
const PHONE = '(406) 312-1223';

const dataUri = (f) =>
  `data:image/png;base64,${fs.readFileSync(path.join(HERE, 'art', f)).toString('base64')}`;

// ---------------------------------------------------------------- the set
const CARDS = [
  {
    id: '01-competitor',
    art: 'two-doors.png',
    kind: 'stat',
    eyebrow: 'The Missed Call Files / 01',
    stat: '82',
    unit: '%',
    head: 'will just call the next name on the list.',
    sub: 'When nobody picks up, most people do not leave a message and do not try again. They dial your competitor while they are still standing on your sidewalk.',
    src: 'Source: CallRail consumer survey, 2025',
    focus: '50% 42%',
  },
  {
    /*
      Was a 62% stat card. That figure is on the REFUSED list in
      data/proof-stats.ts: it circulates everywhere and no primary source
      survives contact. The card makes the same point harder without it, so the
      number came out rather than the card.
    */
    id: '02-unanswered',
    art: 'under-sink.png',
    kind: 'call',
    eyebrow: 'The Missed Call Files / 02',
    head: 'You cannot be in two places.',
    kicker: 'The phone does not know that.',
    sub: 'It is never that the owner does not care. It is that they are under a sink, up a ladder, or standing in front of a paying customer. Something still has to answer while you work.',
    src: 'Hear what answers: (406) 312-1223',
    focus: '50% 20%',
  },
  {
    /*
      Was a 52% stat card. Sarah pulled that figure everywhere on 2026-08-18, so
      this is now a CALL card carrying the argument instead of the number, which
      is the stronger half anyway. Same art plate, no new image needed.
    */
    id: '03-after-hours',
    art: 'night-shop.png',
    kind: 'call',
    bigNumber: true,
    eyebrow: 'The objection, answered',
    head: 'People do not hate robots.',
    kicker: 'People hate beeps.',
    sub: 'At nine on a Saturday night nobody is choosing between a robot and a person. They are choosing between a robot and a voicemail beep. One of those two books the job.',
    src: 'Mine says it is an AI in its first sentence. That part is not negotiable.',
    sticker: { small: 'Judge it', big: 'Yourself' },
    focus: '50% 50%',
  },
  {
    id: '04-call-it',
    art: 'receiver-burst.png',
    kind: 'call',
    bigNumber: true,
    eyebrow: 'Open invitation',
    head: 'Call my AI.',
    kicker: 'It picks up on the first ring.',
    sub: 'Ask it anything about your business. It will think out loud with you, pitch you two or three real ideas, and book you in if you want. It will also tell you flat out that it is an AI, because that is the rule.',
    src: 'Free. 24 hours a day. No pitch trap.',
    sticker: { small: 'It costs you', big: 'Nothing' },
    focus: '50% 50%',
  },
  {
    id: '05-break-it',
    art: 'phone-counter.png',
    kind: 'call',
    bigNumber: true,
    eyebrow: 'A dare, not a demo',
    head: 'Try to break it.',
    kicker: 'Then tell me where it cracked.',
    sub: 'Interrupt it. Talk over it. Hand it a made-up business and a strange question. Whatever you find, put it in the comments and I will go fix it this week.',
    src: 'It is an AI, it knows it is an AI, be merciless.',
    sticker: { small: 'Find a crack and', big: 'I fix it' },
    focus: '50% 60%',
  },
  {
    id: '06-what-it-does',
    art: 'switchboard.png',
    kind: 'list',
    eyebrow: 'What happens when it answers',
    head: 'It answers. It thinks. It books.',
    items: [
      'Picks up on ring one, at any hour, in your business voice.',
      'Asks one sharp question, then gives ideas built for what you actually do.',
      'Books the appointment, emails you the transcript, remembers the caller next time.',
    ],
    src: 'Hear all three in about ninety seconds.',
    focus: '50% 45%',
  },
  {
    /*
      Added 2026-08-19 for the stewardship post in the Organic Social tab, which
      was the one angle in that set with no card behind it. New art plate
      (handover.png) generated with Codex image_gen rather than fal, since the
      fal runner reads a key path that does not exist on this machine. Same
      style block as the original six, so it sits in the set rather than beside
      it.
    */
    id: '07-you-own-it',
    art: 'handover.png',
    kind: 'call',
    // Without the number bar this layout leaves a hole where every other card
    // carries its call to action, and a stewardship card with no way to act on
    // it is a poster rather than an ad.
    bigNumber: true,
    eyebrow: 'The Missed Call Files / 07',
    head: 'You own it.',
    kicker: 'Domain, accounts, numbers, all of it.',
    sub: 'Most people who build you something want you to need them forever. That is the business model. We hand the keys over on day one, in your name. Fire us tomorrow and you keep everything, still working.',
    src: 'Stewardship over extraction. It is the whole reason this shop exists.',
    sticker: { small: 'Built to', big: 'Hand over' },
    focus: '50% 55%',
  },
];

// ---------------------------------------------------------------- template
const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:#FBF6EA; --ink:#161616; --mustard:#F5B700; --red:#E0301E;
    --red-dark:#C4160B; --blue:#1E50C8; --gold-dark:#8f6600;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:${H}px;overflow:hidden}
  body{
    background:var(--cream);
    font-family:'DM Sans',sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  /* mustard halftone dot field, the MMS texture */
  .paper{
    position:relative;width:1080px;height:${H}px;padding:60px 62px 54px;
    display:flex;flex-direction:column;
    background-color:var(--cream);
    background-image:radial-gradient(var(--mustard) 1.6px, transparent 1.7px);
    background-size:15px 15px;
  }
  .paper::before{ /* fade the dots out of the middle so type stays crisp */
    content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse 78% 62% at 50% 55%, var(--cream) 45%, rgba(251,246,234,0) 100%);
    pointer-events:none;
  }
  .paper::after{ /* paper grain */
    content:'';position:absolute;inset:0;pointer-events:none;opacity:.16;mix-blend-mode:multiply;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .layer{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}

  /* eyebrow */
  .eyebrow{display:flex;align-items:center;gap:18px;flex:none}
  .eyebrow b{
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:21px;
    letter-spacing:.2em;text-transform:uppercase;color:var(--red-dark);white-space:nowrap;
  }
  .eyebrow i{flex:1;height:3px;background:var(--ink);display:block}

  /* art plate, stickered */
  .plate{flex:none;position:relative;margin:30px 0 0;transform:rotate(-1.1deg)}
  .plate img{
    display:block;width:100%;height:var(--ph,462px);object-fit:cover;
    object-position:var(--focus,50% 50%);
    border:5px solid var(--ink);box-shadow:16px 16px 0 0 var(--mustard);
  }

  /* the signature: a screenprinted stat block punched through the plate edge */
  .stat{position:relative;height:0;z-index:3;display:flex}
  .stat .num{
    position:absolute;left:-10px;top:-92px;display:flex;align-items:baseline;
    background:var(--mustard);border:5px solid var(--ink);box-shadow:13px 13px 0 0 var(--ink);
    transform:rotate(-1.6deg);padding:6px 30px 22px;
    font-family:'Playfair Display',serif;font-weight:900;font-size:152px;line-height:1;
    letter-spacing:-.035em;color:var(--ink);
  }
  .stat .num u{text-decoration:none;color:var(--red);font-size:.56em;margin-left:6px}

  /* the phone number as a printed sign, on the CTA cards */
  .phone{
    align-self:flex-start;background:var(--ink);border:5px solid var(--ink);
    box-shadow:13px 13px 0 0 var(--mustard);transform:rotate(-.7deg);
    padding:14px 34px 20px;margin-top:20px;
  }
  .phone b{
    display:block;font-family:'DM Sans',sans-serif;font-weight:700;font-size:88px;
    line-height:1;letter-spacing:-.02em;color:var(--cream);
  }

  .body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:4px}

  h1{
    font-family:'Playfair Display',serif;font-weight:800;color:var(--ink);
    letter-spacing:-.015em;
  }
  .kind-stat h1{font-size:62px;line-height:1.03;max-width:955px}
  .kind-stat .body{padding-top:114px}
  .kind-call h1{font-size:104px;line-height:.94;letter-spacing:-.03em}
  .kind-list h1{font-size:70px;line-height:1;letter-spacing:-.025em}
  .kicker{
    font-family:'Playfair Display',serif;font-style:italic;font-weight:800;
    font-size:52px;line-height:1.06;color:var(--gold-dark);margin-top:8px;letter-spacing:-.01em;
  }
  .sub{
    font-size:27px;line-height:1.44;color:rgba(22,22,22,.86);max-width:900px;margin-top:22px;
    font-weight:400;
  }
  ol{list-style:none;counter-reset:s;margin-top:26px;display:flex;flex-direction:column;gap:15px}
  ol li{
    counter-increment:s;display:flex;gap:18px;align-items:baseline;
    font-size:26px;line-height:1.35;color:rgba(22,22,22,.88);max-width:930px;
  }
  ol li::before{
    content:counter(s);flex:none;width:44px;height:44px;border:3px solid var(--ink);
    background:var(--mustard);border-radius:50%;
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:22px;color:var(--ink);
    display:flex;align-items:center;justify-content:center;transform:translateY(6px);
  }
  .src{
    font-family:'JetBrains Mono',monospace;font-weight:500;font-size:18px;
    letter-spacing:.04em;color:rgba(22,22,22,.62);margin-top:22px;
  }

  /* the number sticker, same on every card */
  .foot{
    flex:none;display:flex;align-items:flex-end;justify-content:space-between;
    gap:24px;margin-top:26px;
  }
  .mark{
    font-family:'JetBrains Mono',monospace;font-weight:700;font-size:19px;
    letter-spacing:.16em;text-transform:uppercase;color:var(--ink);line-height:1.5;
  }
  .mark span{display:block;color:var(--gold-dark);letter-spacing:.1em}
  .sticker{
    background:var(--red);color:var(--cream);border:4px solid var(--ink);
    box-shadow:9px 9px 0 0 var(--ink);transform:rotate(-2.2deg);
    padding:12px 24px 15px;text-align:center;
  }
  .sticker small{
    display:block;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px;
    letter-spacing:.22em;text-transform:uppercase;opacity:.95;margin-bottom:2px;
  }
  .sticker strong{
    display:block;font-family:'DM Sans',sans-serif;font-weight:700;font-size:44px;
    letter-spacing:-.01em;line-height:1.05;
  }
${SQ ? `
  /* ---- 1080x1080 cut for X: same system, tightened to a square ---- */
  .paper{padding:44px 50px 40px}
  .eyebrow{gap:14px}
  .eyebrow b{font-size:17px}
  .plate{margin:20px 0 0}
  .plate img{border-width:4px;box-shadow:12px 12px 0 0 var(--mustard)}
  .stat .num{
    left:-8px;top:-74px;padding:4px 24px 16px;border-width:4px;
    box-shadow:11px 11px 0 0 var(--ink);font-size:120px;
  }
  .kind-stat h1{font-size:47px;line-height:1.05;max-width:none}
  .kind-stat .body{padding-top:90px}
  .kind-call h1{font-size:74px}
  .kind-list h1{font-size:50px}
  .kicker{font-size:36px;margin-top:6px}
  .phone{padding:10px 24px 14px;margin-top:14px;border-width:4px;box-shadow:10px 10px 0 0 var(--mustard)}
  .phone b{font-size:60px}
  .sub{font-size:20px;line-height:1.42;margin-top:15px;max-width:none}
  ol{margin-top:18px;gap:11px}
  ol li{font-size:19.5px;gap:14px;max-width:none}
  ol li::before{width:34px;height:34px;font-size:17px;border-width:2px;transform:translateY(5px)}
  .src{font-size:14px;margin-top:15px}
  .foot{margin-top:18px}
  .mark{font-size:15px}
  .sticker{padding:9px 18px 12px;border-width:3px;box-shadow:7px 7px 0 0 var(--ink)}
  .sticker small{font-size:13px;letter-spacing:.18em}
  .sticker strong{font-size:32px}
` : ''}
</style></head><body>${body}</body></html>`;

const card = (c) => {
  const stat =
    c.kind === 'stat'
      ? `<div class="stat"><div class="num" data-n="${c.stat}">${c.stat}<u>${c.unit}</u></div></div>`
      : '';
  const lede =
    c.kind === 'list'
      ? `<ol>${c.items.map((i) => `<li>${i}</li>`).join('')}</ol>`
      : `<p class="sub">${c.sub}</p>`;
  const kicker = c.kicker ? `<p class="kicker">${c.kicker}</p>` : '';
  const sign = c.bigNumber ? `<div class="phone"><b>${PHONE}</b></div>` : '';
  // Square keeps the same plate width, so holding the portrait heights keeps the
  // art crop identical between the two cuts. Only the type tightens.
  const ph = SQ
    ? c.kind === 'stat' ? 520 : c.kind === 'list' ? 496 : 438
    : c.kind === 'stat' ? 520 : c.kind === 'list' ? 612 : 484;

  return shell(`<div class="paper kind-${c.kind}"><div class="layer">
    <div class="eyebrow"><b>${c.eyebrow}</b><i></i></div>
    <figure class="plate" style="--ph:${ph}px;--focus:${c.focus}">
      <img src="${dataUri(c.art)}" alt="">
    </figure>
    ${stat}
    <div class="body">
      <h1>${c.head}</h1>
      ${kicker}
      ${sign}
      ${lede}
      <p class="src">${c.src}</p>
    </div>
    <div class="foot">
      <div class="mark">Modern Mustard Seed<span>modernmustardseed.com</span></div>
      <div class="sticker">
        <small>${c.sticker?.small ?? 'Call it right now'}</small>
        <strong>${c.sticker?.big ?? PHONE}</strong>
      </div>
    </div>
  </div></div>`);
};

// ---------------------------------------------------------------- render
const only = ARGV.filter((a) => a !== '--square');
const set = only.length ? CARDS.filter((c) => only.includes(c.id)) : CARDS;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: H } });
for (const c of set) {
  const html = path.join(OUT, `${c.id}.html`);
  fs.writeFileSync(html, card(c));
  await page.goto(`file:///${html.replace(/\\/g, '/')}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const file = path.join(OUT, `${c.id}.png`);
  await page.screenshot({ path: file });
  console.log(`rendered ${path.basename(file)}`);
}
await browser.close();
