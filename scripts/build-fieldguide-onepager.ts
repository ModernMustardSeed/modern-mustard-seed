/**
 * THE FIELD CARD. Builds the printable Claude Code starter sheet.
 *
 *   pnpm fieldguide:sheet
 *
 * Outputs into public/downloads/:
 *   modern-mustard-seed-claude-code-field-guide.pdf         one sheet, two sides
 *   modern-mustard-seed-claude-code-field-guide-front.png   for socials and DMs
 *   modern-mustard-seed-claude-code-field-guide-back.png
 *
 * WHY TWO SIDES, WHEN SARAH ASKED FOR A ONE-PAGER. It is still one sheet of
 * paper: print duplex, pin it up, done. The first version tried to be both the
 * on-ramp and the reference on a single face and ended up being neither. A
 * person reads the front once and never again; the back is what they keep
 * looking at for a month. Those are two documents with two densities, and
 * cramming them together is what made the first sheet feel like a summary
 * instead of an object.
 *
 * SIDE A STILL STANDS ALONE. Someone who only ever sees the front gets a
 * complete working start: the install, the loop, and where to go next. That is
 * a hard constraint, because the front is what gets posted as an image.
 *
 * TYPE FLOOR. Nothing is under 9px, about 6.8pt in print. The first sheet had
 * 7.8px notes on it, which is a size you can set but cannot read across a desk.
 *
 * Every word comes from data/fieldguide.ts, so the card and the page at
 * /fieldguide can never drift. The build measures each side and fails loud
 * rather than silently clipping a punchline.
 */

import { chromium, type Page } from 'playwright';
import QRCode from 'qrcode';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTERS, LOOP, PROMPT_GROUPS, RULES, TRIAGE } from '../data/fieldguide';

const SITE = 'https://modernmustardseed.com';
/**
 * Printed QR codes carry their own attribution so paper can be told apart from
 * the social cut. NOT `?ref=`: that namespace belongs to partner codes, and a
 * collision there would pay commission to a partner named "sheet".
 */
const TAG = 'utm_source=sheet&utm_medium=print';
const GUIDE_URL = `${SITE}/fieldguide?${TAG}`;
const BOOK_URL = `${SITE}/book?${TAG}`;
const PHONE = '(406) 312-1223';
const EDITION = 'Ed. 1';

/** US Letter at 96dpi. Both sides are laid out to this box, exactly. */
const W = 816;
const H = 1056;

const OUT_DIR = join(process.cwd(), 'public', 'downloads');
const BASENAME = 'modern-mustard-seed-claude-code-field-guide';

/* ------------------------------------------------------------------ */
/* Content, cut to card length                                        */
/* ------------------------------------------------------------------ */

const pick = (groupId: string, promptId: string) => {
  const g = PROMPT_GROUPS.find((x) => x.id === groupId);
  const p = g?.prompts.find((x) => x.id === promptId);
  if (!p) throw new Error(`field card: prompt ${groupId}/${promptId} is gone from data/fieldguide.ts`);
  return p;
};

const SETUP = [
  { cmd: 'npm install -g @anthropic-ai/claude-code', note: 'Once, ever. Needs Node 18+ from nodejs.org' },
  { cmd: 'cd my-project', note: 'It only ever sees the folder you start it in' },
  { cmd: 'claude', note: 'That is the whole thing. Sign in when the browser opens' },
  { cmd: '/init', note: 'It reads your project and writes itself a briefing. Never skip' },
];

/** Side A checklist. Ticking a box on paper is the point. */
const FIRST_TWENTY = [
  'Install Node, then Claude Code',
  'Open a terminal in your project folder',
  'Type claude and sign in',
  'Run /init, then read what it wrote about you',
  'Ask it to explain your own project back to you',
  'Press Esc mid-answer, so you know that you can',
];

/**
 * The loop at card length. Same five stages as the page, said in the number of
 * words paper can hold. The assert keeps them in step: add a stage to the loop
 * and this build fails until the card learns it.
 */
const SHEET_LOOP = [
  { label: 'Explore', text: 'Have it read the code and explain it back, before anything else' },
  { label: 'Plan', text: 'Shift+Tab twice. It thinks, it cannot touch a file. Read the plan' },
  { label: 'Build', text: 'One outcome per request, so you can tell which one broke' },
  { label: 'Prove', text: 'Never accept "done". Ask for the real output, every time' },
  { label: 'Save', text: 'Say "commit this" whenever it works. That is your undo button' },
];
if (SHEET_LOOP.length !== LOOP.length) {
  throw new Error('field card: the loop changed in data/fieldguide.ts. Update SHEET_LOOP to match.');
}

/** Five prompts earn a place on the wall. Trimmed for width, same intent. */
const CARD_PROMPTS = [
  {
    ...pick('understand', 'orient'),
    sheet:
      'Read this project and explain it like I have never seen it: what it does, the five files that matter most, and the one thing most likely to break. No jargon, and do not write any code.',
  },
  {
    ...pick('build', 'plan'),
    sheet:
      'I want to add [THE FEATURE]. Read the code that already does something similar, then plan it: the approach, every file you would change, what could go wrong. Plan only, no code.',
  },
  {
    ...pick('fix', 'error'),
    sheet:
      '[PASTE THE WHOLE ERROR] Reproduce this first. Tell me the cause in one sentence. Then fix it and show me the run that proves it.',
  },
  {
    ...pick('review', 'critic'),
    sheet:
      'Review this as the engineer who maintains it after I quit. Every problem, worst first, with the file and line. Do not list strengths.',
  },
  {
    ...pick('ship', 'deploy'),
    sheet:
      'I want this live on the internet at a real address. One step at a time, wait for me after each, and tell me any cost before I commit.',
  },
];

/** The keys, at card length. KEYS on the page runs to three lines in a column. */
const CARD_KEYS: [string, string][] = [
  ['Esc', 'Stop it now, keep everything so far'],
  ['Esc Esc', 'Go back and edit an earlier message'],
  ['Shift+Tab', 'Cycle: ask, auto-accept, plan mode'],
  ['Up arrow', 'Your previous prompts'],
  ['Ctrl+C', 'Cancel. Twice quits'],
];

/**
 * The wording IS the skill, and one pair proves it faster than a paragraph
 * claiming it. Both examples are real requests, shortened.
 */
const SAY_IT = [
  {
    bad: 'make the site look better',
    good: 'On the homepage at 390px wide the hero button wraps onto three lines. Keep it on one line down to 320px, without dropping the text below 16px.',
  },
  {
    bad: 'is this any good?',
    good: 'Find the three things most likely to break this in production, worst first, with the file and line. Do not tell me what is good about it.',
  },
];

const CARD_COMMANDS: [string, string][] = [
  ['/clear', 'Next task, clean slate. Use it more than feels necessary'],
  ['/compact', 'Long job, same thread, running out of room'],
  ['/rewind', 'It broke something. Put the code and the chat back'],
  ['/init', 'First time in a project. Writes the briefing'],
  ['/permissions', 'Stop approving the same safe command forever'],
  ['/agents', 'A specialist with its own instructions and memory'],
  ['/help', 'The true, current list for your version'],
  ['claude -c', 'Continue the last conversation where you left it'],
  ['claude -r', 'Pick an older conversation from a list'],
  ['claude update', 'Get the newest version'],
];

/**
 * The homepage journey art, inlined. The card is rendered with setContent, so
 * a relative src would resolve against about:blank and silently render nothing.
 * Same footage the site opens with: the card and the homepage are one world.
 */
const art = (name: string) =>
  `data:image/jpeg;base64,${readFileSync(join(process.cwd(), 'public', 'journey', `${name}.jpg`)).toString('base64')}`;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function qr(url: string) {
  return QRCode.toDataURL(url, {
    margin: 0,
    width: 400,
    errorCorrectionLevel: 'M',
    color: { dark: '#161616ff', light: '#00000000' },
  });
}

/* ------------------------------------------------------------------ */
/* Marks                                                              */
/* ------------------------------------------------------------------ */

const SEED = `<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 22c-4.4 0-8-3.2-8-7.4C4 9.6 8.6 5 12 2c3.4 3 8 7.6 8 12.6 0 4.2-3.6 7.4-8 7.4z" fill="#161616"/>
  <path d="M12 19.6c-3 0-5.6-2.2-5.6-5.1 0-3.5 3.2-7 5.6-9.2 2.4 2.2 5.6 5.7 5.6 9.2 0 2.9-2.6 5.1-5.6 5.1z" fill="#FFDD55"/>
</svg>`;

const masthead = (side: string, label: string) => `
  <div class="top">
    <div class="brand">${SEED}<span>Modern Mustard Seed</span></div>
    <div class="topright">
      <span class="side">${side}</span>
      <span class="stamp">${label}</span>
    </div>
  </div>`;

/* ------------------------------------------------------------------ */
/* SIDE A: the start. Air, one hero, one diagram, two doors.          */
/* ------------------------------------------------------------------ */

function sideA(qrGuide: string, qrBook: string) {
  return `
<section class="sheet a">
  ${masthead('Side A · The Start', `Field Card ${EDITION}`)}

  <img class="portrait" src="${art('poster-drive')}" alt="">

  <div class="hero">
    <h1><span>Claude Code,</span><span>from <em>zero</em>.</span></h1>
    <p class="lede">
      Claude Code turns plain English into working software, in your own project, on your own computer.
      <b>You do not need to know how to code.</b> You need to know what you want and how to check that you
      got it. The rest of it is on this card.
    </p>
  </div>

  <div class="split">
    <div>
      <span class="eyebrow">01 · The first five minutes</span>
      <div class="term">
        ${SETUP.map((s) => `<div class="row"><code>${esc(s.cmd)}</code><small>${esc(s.note)}</small></div>`).join('')}
      </div>
    </div>

    <div>
      <span class="eyebrow">02 · Your first twenty minutes</span>
      <ul class="check">
        ${FIRST_TWENTY.map((t) => `<li><i></i><span>${esc(t)}</span></li>`).join('')}
      </ul>
      <p class="aside">
        Ask it about your own code, not "hello", so you can judge the answer. It is also the fastest way to
        learn what your project actually does.
      </p>
    </div>
  </div>

  <div class="loopwrap">
    <span class="eyebrow">03 · The loop that actually works</span>
    <p class="loopnote">Almost every bad result comes from jumping straight to Build. This is the whole method.</p>
    <div class="loop">
      <div class="rail"></div>
      ${SHEET_LOOP.map(
        (l, i) => `
        <div class="station">
          <b>${i + 1}</b>
          <h4>${esc(l.label)}</h4>
          <p>${esc(l.text)}</p>
        </div>`,
      ).join('')}
    </div>
    <svg class="return" viewBox="0 0 728 32" preserveAspectRatio="none" aria-hidden="true">
      <path d="M706 0 L706 18 Q706 28 692 28 L36 28 Q22 28 22 18 L22 10"
        fill="none" stroke="#161616" stroke-width="2.5" stroke-dasharray="7 5"/>
      <path d="M15 14 L22 1 L29 14 Z" fill="#161616"/>
    </svg>
    <p class="loopfoot">Then around again, one small piece at a time</p>
  </div>

  <div class="saywrap">
    <span class="eyebrow">04 · Say it like this</span>
    <div class="says">
      ${SAY_IT.map(
        (t) => `
        <div class="say">
          <div class="bad"><i>Instead of</i><span>&ldquo;${esc(t.bad)}&rdquo;</span></div>
          <div class="good"><i>Say</i><span>&ldquo;${esc(t.good)}&rdquo;</span></div>
        </div>`,
      ).join('')}
    </div>
  </div>

  <div class="doors">
    <div class="door">
      <img src="${qrGuide}" alt="">
      <div>
        <span class="dlabel">Keep going</span>
        <h3>The whole guide, free.</h3>
        <p>Seventeen prompts you can copy with one tap, the CLAUDE.md template, all twelve rules, and a plain English glossary. No signup.</p>
        <span class="url">modernmustardseed.com/fieldguide</span>
      </div>
    </div>
    <div class="door">
      <img src="${qrBook}" alt="">
      <div>
        <span class="dlabel">Or hand it off</span>
        <h3>Stuck? Or want it built?</h3>
        <p>Call <b>${PHONE}</b> and Mr. Mustard, our own AI agent, picks up at any hour. Or book thirty minutes and bring nothing but the idea.</p>
        <span class="url">modernmustardseed.com/book</span>
      </div>
    </div>
  </div>

  <div class="credit">
    <span>Made by <b>Modern Mustard Seed</b> · Kalispell, Montana</span>
    <span>Turn over for the reference &rarr;</span>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* SIDE B: the reference. The side that stays on the wall.            */
/* ------------------------------------------------------------------ */

function sideB() {
  return `
<section class="sheet b">
  ${masthead('Side B · The Reference', 'Pin this side out')}

  <div class="btitle">
    <img class="chip" src="${art('poster-tree')}" alt="">
    <h2>The reference</h2>
    <p>Anything in [BRACKETS] is yours to replace. That is the only editing these need.</p>
  </div>

  <div class="bgrid">
    <div class="panel">
      <span class="eyebrow">Prompts that do the work</span>
      ${CARD_PROMPTS.map(
        (p) => `
        <div class="p">
          <div class="phead"><b>${esc(p.title)}</b><span>${esc(p.when.replace(/\.$/, ''))}</span></div>
          <p>${esc(p.sheet)}</p>
        </div>`,
      ).join('')}
    </div>

    <div class="col">
      <div class="panel">
        <span class="eyebrow">Commands worth knowing</span>
        <table class="kv cmd">
          ${CARD_COMMANDS.map(([c, w]) => `<tr><td><code>${esc(c)}</code></td><td>${esc(w)}</td></tr>`).join('')}
        </table>
      </div>

      <div class="panel">
        <span class="eyebrow">When it goes sideways</span>
        <table class="kv tri">
          ${TRIAGE.slice(0, 5).map((t) => `<tr><td><b>${esc(t.symptom)}</b></td><td>${esc(t.fix)}</td></tr>`).join('')}
        </table>
      </div>

    </div>
  </div>

  <div class="panel keys">
    <span class="eyebrow">The keys, and the four characters that do work</span>
    <div class="keyrow">
      ${CARD_KEYS.map(([k, w]) => `<div><kbd>${esc(k)}</kbd><span>${esc(w)}</span></div>`).join('')}
    </div>
    <div class="charrow">
      ${CHARACTERS.map(
        (c) => `<div><kbd class="big">${esc(c.key)}</kbd><span>${esc(c.what.split(/[.,]/)[0])}</span></div>`,
      ).join('')}
    </div>
  </div>

  <div class="panel rules">
    <span class="eyebrow">The twelve rules, learned the expensive way</span>
    <ol>
      ${RULES.map(
        (r, i) =>
          `<li><i>${String(i + 1).padStart(2, '0')}</i><span><b>${esc(r.title)}</b> ${esc(r.short).replace(
            /--help/g,
            '<code>--help</code>',
          )}</span></li>`,
      ).join('')}
    </ol>
  </div>

  <div class="credit">
    <span>modernmustardseed.com/fieldguide · ${PHONE}</span>
    <span>Free to copy, print, and pass along</span>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */

const CSS = `
  @page { size: ${W}px ${H}px; margin: 0; }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;background:#FBF6EA}
  body{font-family:"DM Sans",system-ui,sans-serif;color:#161616;
    font-feature-settings:"liga" 0,"clig" 0;-webkit-font-smoothing:antialiased}

  .sheet{width:${W}px;height:${H}px;position:relative;overflow:hidden;
    background:#FBF6EA;
    background-image:radial-gradient(rgba(22,22,22,.07) 1.4px, transparent 1.5px);
    background-size:15px 15px;
    padding:34px 44px 0;display:flex;flex-direction:column}
  .sheet + .sheet{break-before:page;page-break-before:always}

  code,kbd{font-family:"JetBrains Mono",ui-monospace,monospace}

  /* ---- masthead ---- */
  .top{display:flex;align-items:center;justify-content:space-between;
    padding-bottom:11px;border-bottom:2.5px solid #161616}
  .brand{display:flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;
    font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  .topright{display:flex;align-items:center;gap:9px}
  .side{font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:rgba(22,22,22,.5)}
  .stamp{font-family:"JetBrains Mono",monospace;font-size:8.5px;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;background:#F5B700;
    border:1.5px solid #161616;border-radius:999px;padding:3px 10px}

  .eyebrow{display:block;font-family:"JetBrains Mono",monospace;font-size:8.5px;font-weight:700;
    letter-spacing:.22em;text-transform:uppercase;color:#E0301E}

  /* ---- the journey art ---- */
  .portrait{position:absolute;right:44px;top:104px;width:196px;height:196px;
    object-fit:cover;object-position:52% 50%;border-radius:50%;
    border:4px solid #161616;box-shadow:7px 7px 0 0 #F5B700}
  .chip{width:46px;height:46px;object-fit:cover;border-radius:50%;
    border:2.5px solid #161616;box-shadow:3px 3px 0 0 #F5B700;flex:none;align-self:center}

  /* ---- side A hero ---- */
  .hero{padding:26px 0 0}
  h1{display:flex;flex-direction:column;gap:1px}
  h1 span{display:block;font-family:"Playfair Display",Georgia,serif;font-weight:900;
    font-size:57px;line-height:1.03;letter-spacing:-.022em;padding-bottom:2px}
  h1 em{font-style:italic;color:#E0301E}
  .lede{margin-top:15px;font-size:12px;line-height:1.62;max-width:498px;color:#3a3733}
  .lede b{color:#161616;font-weight:700}

  /* ---- side A columns ---- */
  .split{display:grid;grid-template-columns:1.06fr .94fr;gap:20px;margin-top:24px}

  .term{margin-top:8px;background:#12141A;border:2px solid #161616;border-radius:9px;
    box-shadow:4px 4px 0 0 #F5B700;overflow:hidden}
  .term .row{padding:7px 11px;border-bottom:1px solid rgba(255,255,255,.09)}
  .term .row:last-child{border-bottom:0}
  .term code{display:block;font-size:10.2px;font-weight:700;color:#FFDD55;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .term small{display:block;font-size:9px;line-height:1.4;color:rgba(243,238,225,.62);margin-top:2px}

  .check{list-style:none;margin-top:9px}
  .check li{display:grid;grid-template-columns:14px 1fr;gap:9px;align-items:start;
    padding:5.5px 0;border-bottom:1px solid rgba(22,22,22,.11)}
  .check li:last-child{border-bottom:0}
  .check i{display:block;width:14px;height:14px;border:2px solid #161616;border-radius:3px;
    background:#FFFDF6;margin-top:1px}
  .check span{font-size:9.8px;line-height:1.4;color:#3a3733}
  .aside{margin-top:9px;font-size:9.2px;line-height:1.45;color:rgba(22,22,22,.55);font-style:italic}

  /* ---- the loop ---- */
  .loopwrap{margin-top:26px}
  .loopnote{margin-top:6px;font-size:9.6px;line-height:1.45;color:#3a3733}
  .loop{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:14px}
  .rail{position:absolute;left:9%;right:9%;top:15px;height:2.5px;background:#161616}
  .station{position:relative;text-align:center;padding:0 2px}
  .station b{position:relative;display:block;width:32px;height:32px;margin:0 auto;
    background:#F5B700;border:2.5px solid #161616;border-radius:50%;
    font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;line-height:27px}
  .station h4{margin-top:8px;font-family:"Playfair Display",Georgia,serif;font-weight:900;
    font-size:15px;letter-spacing:-.01em}
  .station p{margin-top:3px;font-size:9px;line-height:1.4;color:#3a3733}
  .return{display:block;width:100%;height:32px;margin-top:6px}
  .loopfoot{text-align:center;font-family:"JetBrains Mono",monospace;font-size:8.5px;
    font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(22,22,22,.45)}

  /* ---- say it like this ---- */
  .saywrap{margin-top:28px}
  .says{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:11px}
  .say{border-left:3px solid #F5B700;padding-left:13px}
  .say i{display:block;font-family:"JetBrains Mono",monospace;font-style:normal;font-size:7.8px;
    font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  .say .bad i{color:rgba(22,22,22,.4)}
  .say .bad span{display:block;margin-top:2px;font-size:11px;line-height:1.4;
    color:rgba(22,22,22,.45);text-decoration:line-through;text-decoration-thickness:1px}
  .say .good{margin-top:8px}
  .say .good i{color:#E0301E}
  .say .good span{display:block;margin-top:2px;font-size:10.4px;line-height:1.5;color:#161616;font-weight:500}

  /* ---- the two doors ---- */
  .doors{margin:auto -44px 0;background:#F5B700;border-top:2.5px solid #161616;
    padding:16px 44px 14px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .door{display:flex;gap:12px;align-items:flex-start}
  .door + .door{border-left:2px solid rgba(22,22,22,.24);padding-left:24px}
  .door img{width:76px;height:76px;flex:0 0 76px;background:#FFFDF6;
    border:1.5px solid #161616;border-radius:6px;padding:4px}
  .dlabel{display:block;font-family:"JetBrains Mono",monospace;font-size:8px;font-weight:700;
    letter-spacing:.2em;text-transform:uppercase;color:#8A1006}
  .door h3{margin-top:3px;font-family:"Playfair Display",Georgia,serif;font-weight:900;
    font-size:17px;line-height:1.14;letter-spacing:-.01em}
  .door p{margin-top:4px;font-size:9.2px;line-height:1.46;color:rgba(22,22,22,.8)}
  .url{display:block;margin-top:6px;font-family:"JetBrains Mono",monospace;
    font-size:9.4px;font-weight:700}

  .credit{margin:0 -44px;background:#161616;color:#FBF6EA;padding:8px 44px;
    display:flex;justify-content:space-between;align-items:center;
    font-family:"JetBrains Mono",monospace;font-size:8.2px;letter-spacing:.13em;text-transform:uppercase}
  .credit b{color:#F5B700}

  /* ---- side B ---- */
  .btitle{padding:14px 0 12px;display:flex;align-items:baseline;gap:16px}
  .btitle h2{font-family:"Playfair Display",Georgia,serif;font-weight:900;font-size:30px;
    line-height:1.06;letter-spacing:-.02em;flex:none}
  .btitle p{font-size:9.8px;line-height:1.5;color:#3a3733}

  .bgrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
  .col{display:flex;flex-direction:column;gap:13px}
  .panel{background:#FFFDF6;border:2px solid #161616;border-radius:10px;
    box-shadow:3px 3px 0 0 #161616;padding:11px 13px 12px}

  .p{margin-top:8px}
  .phead{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap}
  .phead b{font-size:10.4px;font-weight:700}
  .phead span{font-family:"JetBrains Mono",monospace;font-size:7.6px;font-weight:700;
    letter-spacing:.09em;text-transform:uppercase;color:#E0301E}
  .p > p{margin-top:3px;padding:6px 8px;background:#FBF6EA;border:1.5px solid rgba(22,22,22,.15);
    border-radius:6px;font-family:"JetBrains Mono",monospace;font-size:8.9px;line-height:1.52;
    color:rgba(22,22,22,.88)}

  table.kv{width:100%;border-collapse:collapse;margin-top:7px}
  table.kv td{padding:4px 0;font-size:9.3px;line-height:1.38;color:#3a3733;vertical-align:top}
  table.kv tr + tr td{border-top:1px solid rgba(22,22,22,.1)}
  table.kv td:first-child{width:1%;white-space:nowrap;padding-right:11px}
  kbd{display:inline-block;background:#FBF6EA;border:1.5px solid #161616;border-radius:4px;
    padding:1px 6px;font-size:8.8px;font-weight:700;line-height:1.5}
  kbd.big{font-size:12px;background:#F5B700;padding:0 7px;line-height:1.6}
  table.cmd code{font-size:9px;font-weight:700;color:#161616}
  table.tri td:first-child{width:46%;white-space:normal}
  table.tri b{font-size:9.3px;font-weight:700;color:#161616}

  .chars{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:10px;
    padding-top:9px;border-top:1.5px solid rgba(22,22,22,.14)}
  .chars div{display:flex;gap:7px;align-items:center}
  .chars span{font-size:8.8px;line-height:1.32;color:#3a3733}

  .keys{margin-top:12px}
  .keyrow{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:9px}
  .keyrow > div{display:flex;flex-direction:column;gap:4px}
  .keyrow kbd{align-self:flex-start}
  .keyrow span{font-size:8.9px;line-height:1.36;color:#3a3733}
  .charrow{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:10px;
    padding-top:10px;border-top:1.5px solid rgba(22,22,22,.14)}
  .charrow > div{display:flex;gap:8px;align-items:center}
  .charrow span{font-size:8.9px;line-height:1.34;color:#3a3733}

  .rules{margin-top:12px}
  .rules ol{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:4px 15px;margin-top:7px}
  .rules li{display:grid;grid-template-columns:16px 1fr;gap:7px;align-items:baseline}
  .rules i{font-family:"JetBrains Mono",monospace;font-style:normal;font-size:8.4px;
    font-weight:700;color:#E0301E}
  .rules span{font-size:9px;line-height:1.38;color:#3a3733}
  .rules b{color:#161616;font-weight:700}
  .rules code{font-family:"JetBrains Mono",monospace;font-size:8.6px;font-weight:700;
    background:rgba(22,22,22,.07);border-radius:3px;padding:0 3px}

  .sheet.b .credit{margin-top:auto}
`;

const shell = (body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap">
<style>${CSS}</style></head><body>${body}</body></html>`;

/* ------------------------------------------------------------------ */

/** A side that overflows its own sheet is a side with a clipped punchline. */
async function assertFits(page: Page, name: string) {
  const bad = await page.evaluate((h) => {
    const sheet = document.querySelector('.sheet') as HTMLElement;
    const over: string[] = [];
    if (sheet.scrollHeight > h + 2) over.push(`sheet is ${sheet.scrollHeight}px of ${h}px`);
    sheet.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > h + 2) {
        over.push(`${(el.className || el.tagName).toString().slice(0, 22)} runs to ${Math.round(r.bottom)}px`);
      }
    });


    return { over: over.slice(0, 3), used: sheet.scrollHeight };
  }, H);
  if (bad.over.length) throw new Error(`field card ${name} overflows: ${bad.over.join('; ')}`);
  return bad.used;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const [qrGuide, qrBook] = await Promise.all([qr(GUIDE_URL), qr(BOOK_URL)]);

  const A = sideA(qrGuide, qrBook);
  const B = sideB();

  const browser = await chromium.launch();

  // Each side alone, for the fit check and the shareable PNGs.
  for (const [name, body] of [
    ['front', A],
    ['back', B],
  ] as const) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await page.setContent(shell(body), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const used = await assertFits(page, name);
    await page.screenshot({ path: join(OUT_DIR, `${BASENAME}-${name}.png`) });
    console.log(`  ${name.padEnd(5)} ${used}/${H}px`);
    await page.close();
  }

  // Both sides in one document, so the PDF paginates to one duplex sheet.
  const pdfPage = await browser.newPage({ viewport: { width: W, height: H } });
  await pdfPage.setContent(shell(A + B), { waitUntil: 'networkidle' });
  await pdfPage.evaluate(() => document.fonts.ready);
  await pdfPage.waitForTimeout(400);
  const pdf = await pdfPage.pdf({
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    pageRanges: '1-2',
  });
  writeFileSync(join(OUT_DIR, `${BASENAME}.pdf`), pdf);

  await browser.close();
  console.log('field card built, one sheet, two sides');
  console.log(`  ${join('public', 'downloads', `${BASENAME}.pdf`)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
