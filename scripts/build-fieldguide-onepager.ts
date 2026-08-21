/**
 * THE ONE-PAGER. Builds the printable Claude Code starter sheet.
 *
 *   node_modules/.bin/tsx scripts/build-fieldguide-onepager.ts
 *
 * Outputs into public/downloads/:
 *   modern-mustard-seed-claude-code-field-guide.pdf   letter, print and email
 *   modern-mustard-seed-claude-code-field-guide.png   2x, for socials
 *
 * Every word comes from data/fieldguide.ts, so the sheet and the page at
 * /fieldguide can never drift apart. The sheet is deliberately NOT a summary of
 * the page: it is the smallest thing that is genuinely useful on its own, and
 * it ends at the two doors, the ranch line and the calendar.
 *
 * It must stay ONE page. The script measures the rendered height and fails loud
 * if the content ever grows past the sheet.
 */

import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOOP, PROMPT_GROUPS, RULES, TRIAGE } from '../data/fieldguide';

const SITE = 'https://modernmustardseed.com';
const GUIDE_URL = `${SITE}/fieldguide`;
const BOOK_URL = `${SITE}/book`;
const PHONE = '(406) 312-1223';

/** US Letter at 96dpi. The whole design is laid out to this box, exactly. */
const W = 816;
const H = 1056;

const OUT_DIR = join(process.cwd(), 'public', 'downloads');
const BASENAME = 'modern-mustard-seed-claude-code-field-guide';

/* ------------------------------------------------------------------ */

const pick = (groupId: string, promptId: string) => {
  const g = PROMPT_GROUPS.find((x) => x.id === groupId);
  const p = g?.prompts.find((x) => x.id === promptId);
  if (!p) throw new Error(`one-pager: prompt ${groupId}/${promptId} is gone from data/fieldguide.ts`);
  return p;
};

/** Three prompts earn a spot on paper: understand, plan, unbreak. */
const SHEET_PROMPTS = [
  { ...pick('understand', 'orient'), sheet: 'Read this project and explain it like I have never seen it: what it does, the five files that matter most, and the one thing most likely to break. No jargon, and do not write any code.' },
  { ...pick('build', 'plan'), sheet: 'I want to add [THE FEATURE]. Read the code that already does something similar, then give me a plan: the approach, every file you would change, and what could go wrong. Plan only, no code yet.' },
  { ...pick('fix', 'error'), sheet: '[PASTE THE WHOLE ERROR] Reproduce this first. Then tell me the cause in one sentence. Then fix it and show me the run that proves it.' },
];

/** The three failures every beginner hits in week one. */
const SHEET_TRIAGE = TRIAGE.slice(0, 3);

const SETUP = [
  { cmd: 'npm install -g @anthropic-ai/claude-code', note: 'Once. Needs Node 18+ from nodejs.org.' },
  { cmd: 'cd my-project', note: 'It only sees the folder you start it in.' },
  { cmd: 'claude', note: 'That is the whole thing. Sign in when the browser opens.' },
  { cmd: '/init', note: 'It writes itself a briefing on your project. Never skip.' },
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function qr(url: string) {
  return QRCode.toDataURL(url, {
    margin: 0,
    width: 320,
    errorCorrectionLevel: 'M',
    color: { dark: '#161616ff', light: '#00000000' },
  });
}

/* ------------------------------------------------------------------ */

async function html() {
  const [qrGuide, qrBook] = await Promise.all([qr(GUIDE_URL), qr(BOOK_URL)]);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px}
  body{
    background:#FBF6EA; color:#161616;
    font-family:"DM Sans",system-ui,sans-serif; font-feature-settings:"liga" 0,"clig" 0;
    -webkit-font-smoothing:antialiased;
    background-image:radial-gradient(rgba(22,22,22,.075) 1.4px, transparent 1.5px);
    background-size:14px 14px;
    display:flex; flex-direction:column;
    padding:26px 38px 0;
    overflow:hidden;
  }
  .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
  .disp{font-family:"Playfair Display",Georgia,serif}
  .eyebrow{font-family:"JetBrains Mono",monospace;font-size:7.5px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#E0301E}

  /* ---- masthead ---- */
  .top{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:2px solid #161616}
  .brand{display:flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  .stamp{font-family:"JetBrains Mono",monospace;font-size:7.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#161616;background:#F5B700;border:1.5px solid #161616;border-radius:999px;padding:3px 10px}

  /* ---- title ---- */
  .title{padding:6px 0 0}
  .t1{font-family:"Playfair Display",Georgia,serif;font-weight:900;font-size:41px;line-height:1.03;letter-spacing:-.02em;display:block;padding-bottom:2px}
  .t1 em{font-style:italic;color:#E0301E}
  .t2{display:block;margin-top:8px;font-family:"JetBrains Mono",monospace;font-size:8.5px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:rgba(22,22,22,.45)}
  .lede{margin-top:10px;font-size:10.6px;line-height:1.6;max-width:640px;color:#3a3733}
  .lede b{color:#161616;font-weight:700}

  /* ---- shared card grammar ---- */
  .card{background:#FFFDF6;border:2px solid #161616;border-radius:10px;box-shadow:3px 3px 0 0 #161616}
  .h{font-family:"Playfair Display",Georgia,serif;font-weight:900;font-size:14px;line-height:1.15;letter-spacing:-.01em}
  .num{font-family:"JetBrains Mono",monospace;font-size:8px;font-weight:700;color:#E0301E;letter-spacing:.12em}

  /* ---- body grid ---- */
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}

  .term{background:#16161A;border:2px solid #161616;border-radius:8px;overflow:hidden;margin-top:9px}
  .term .row{padding:4px 9px;border-bottom:1px solid rgba(255,255,255,.08)}
  .term .row:last-child{border-bottom:0}
  .term code{display:block;font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:700;color:#FFDD55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .term small{display:block;font-size:7.8px;line-height:1.32;color:rgba(243,238,225,.6);margin-top:2px}

  .loop li{display:grid;grid-template-columns:16px 1fr;gap:8px;padding:3px 0;border-bottom:1px solid rgba(22,22,22,.1);align-items:baseline}
  .loop li:last-child{border-bottom:0}
  .loop b{font-family:"JetBrains Mono",monospace;font-size:9px;color:#161616;background:#F5B700;border:1.5px solid #161616;border-radius:4px;width:16px;text-align:center;display:inline-block;line-height:15px;height:16px}
  .loop span{font-size:8.7px;line-height:1.4;color:#3a3733}
  .loop strong{color:#161616;font-weight:700}

  .p-box{border:1.5px solid rgba(22,22,22,.16);background:#FBF6EA;border-radius:7px;padding:6px 8px;margin-top:4px;
    font-family:"JetBrains Mono",monospace;font-size:8px;line-height:1.5;color:rgba(22,22,22,.88)}
  .p-title{font-size:10px;font-weight:700;color:#161616}
  .p-when{font-family:"JetBrains Mono",monospace;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E0301E}
  .p-item+.p-item{margin-top:8px}

  .triage{margin-top:9px;padding-top:8px;border-top:1.5px solid rgba(22,22,22,.14)}
  .t-head{display:block;font-family:"JetBrains Mono",monospace;font-size:7px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#E0301E;margin-bottom:6px}
  .triage div{display:grid;grid-template-columns:1fr;gap:1px;padding:3px 0;border-bottom:1px solid rgba(22,22,22,.08)}
  .triage div:last-child{border-bottom:0}
  .triage b{font-size:8.6px;font-weight:700;color:#161616;line-height:1.3}
  .triage span{font-size:8.4px;line-height:1.35;color:#3a3733}

  /* ---- rules ---- */
  .rules{display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;margin-top:7px}
  .rules li{display:grid;grid-template-columns:15px 1fr;gap:7px;align-items:baseline}
  .rules i{font-family:"JetBrains Mono",monospace;font-style:normal;font-size:8px;font-weight:700;color:#E0301E}
  .rules span{font-size:8.9px;line-height:1.4;color:#3a3733}
  .rules strong{color:#161616;font-weight:700}
  .rules code{font-family:"JetBrains Mono",monospace;font-size:8.2px;font-weight:700;background:rgba(22,22,22,.07);border-radius:3px;padding:0 3px}

  /* ---- characters strip ---- */
  .chars{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(22,22,22,.12)}
  .chars div{display:flex;gap:7px;align-items:baseline}
  .chars kbd{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;background:#F5B700;border:1.5px solid #161616;border-radius:5px;padding:0 7px;line-height:18px;display:inline-block}
  .chars p{font-size:8px;line-height:1.32;color:#3a3733}

  /* ---- footer ---- */
  .foot{margin:10px -38px 0;background:#F5B700;border-top:2px solid #161616;padding:13px 38px 11px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .foot h3{font-family:"Playfair Display",Georgia,serif;font-weight:900;font-size:16px;line-height:1.16;letter-spacing:-.01em}
  .foot p{font-size:8.8px;line-height:1.42;color:rgba(22,22,22,.8);margin-top:5px}
  .foot .url{font-family:"JetBrains Mono",monospace;font-size:9.5px;font-weight:700;margin-top:7px;display:block}
  .qbox{display:flex;gap:11px;align-items:flex-start}
  .qbox img{width:62px;height:62px;flex:0 0 62px;background:#FFFDF6;border:1.5px solid #161616;border-radius:6px;padding:3px}
  .divider{border-left:2px solid rgba(22,22,22,.22);padding-left:22px}
  .credit{margin:0 -38px;background:#161616;color:#FBF6EA;padding:6px 38px;display:flex;justify-content:space-between;align-items:center;
    font-family:"JetBrains Mono",monospace;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase}
  .credit b{color:#F5B700}
</style></head>
<body>

  <div class="top">
    <div class="brand">
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22c-4.4 0-8-3.2-8-7.4C4 9.6 8.6 5 12 2c3.4 3 8 7.6 8 12.6 0 4.2-3.6 7.4-8 7.4z" fill="#161616"/>
        <path d="M12 19.6c-3 0-5.6-2.2-5.6-5.1 0-3.5 3.2-7 5.6-9.2 2.4 2.2 5.6 5.7 5.6 9.2 0 2.9-2.6 5.1-5.6 5.1z" fill="#FFDD55"/>
      </svg>
      Modern Mustard Seed
    </div>
    <span class="stamp">Free · Print it · Pass it on</span>
  </div>

  <div class="title">
    <span class="t1">Claude Code,</span>
    <span class="t1">from <em>zero</em>.</span>
    <span class="t2">The one-page start</span>
    <p class="lede">Claude Code turns plain English into working software, in your own project, on your own computer. <b>You do not need to know how to code.</b> You need to know what you want and how to check you got it. That is this sheet.</p>
  </div>

  <div class="grid">

    <!-- LEFT COLUMN -->
    <div>
      <div class="card" style="padding:13px 14px">
        <span class="num">01</span>
        <h2 class="h" style="margin-top:3px">The first five minutes</h2>
        <div class="term">
          ${SETUP.map((s) => `<div class="row"><code>${esc(s.cmd)}</code><small>${esc(s.note)}</small></div>`).join('')}
        </div>
        <p style="font-size:8.2px;line-height:1.42;color:#3a3733;margin-top:6px">
          Then ask it something you can check. Press <strong>Esc</strong> any time to stop it. You are never stuck.
        </p>
      </div>

      <div class="card" style="padding:13px 14px;margin-top:12px">
        <span class="num">02</span>
        <h2 class="h" style="margin-top:3px">The loop that actually works</h2>
        <ul class="loop" style="margin-top:7px;list-style:none">
          ${SHEET_LOOP.map(
            (l, i) => `<li><b>${i + 1}</b><span><strong>${esc(l.label)}</strong> ${esc(l.text)}</span></li>`,
          ).join('')}
        </ul>
      </div>
    </div>

    <!-- RIGHT COLUMN -->
    <div class="card" style="padding:13px 14px">
      <span class="num">03</span>
      <h2 class="h" style="margin-top:3px">Three prompts that do the work</h2>
      <p style="font-size:8.2px;line-height:1.42;color:#3a3733;margin-top:4px">
        Type these in exactly. Replace anything in [BRACKETS]. Seventeen more on the full guide.
      </p>
      ${SHEET_PROMPTS.map(
        (p) => `
        <div class="p-item">
          <div class="p-title">${esc(p.title)}</div>
          <div class="p-when">${esc(p.when)}</div>
          <div class="p-box">${esc(p.sheet)}</div>
        </div>`,
      ).join('')}

      <div class="triage">
        <span class="t-head">If it goes sideways</span>
        ${SHEET_TRIAGE.map(
          (t) => `<div><b>${esc(t.symptom)}</b><span>${esc(t.fix)}</span></div>`,
        ).join('')}
      </div>
    </div>
  </div>

  <!-- RULES -->
  <div class="card" style="padding:11px 14px;margin-top:10px">
    <span class="num">04</span>
    <h2 class="h" style="margin-top:3px">Six rules we paid for</h2>
    <ul class="rules" style="list-style:none">
      ${RULES.slice(0, 6)
        .map(
          (r, i) =>
            `<li><i>${String(i + 1).padStart(2, '0')}</i><span><strong>${esc(r.title)}</strong> ${esc(r.short).replace(
              /--help/g,
              '<code>--help</code>',
            )}</span></li>`,
        )
        .join('')}
    </ul>
    <div class="chars">
      ${SHEET_CHARS.map((c) => `<div><kbd>${esc(c.key)}</kbd><p>${esc(c.what)}</p></div>`).join('')}
    </div>
  </div>

  <!-- FOOTER: the two doors -->
  <div class="foot">
    <div class="qbox">
      <img src="${qrGuide}" alt="">
      <div>
        <h3>The whole guide, free.</h3>
        <p>Seventeen prompts you can copy, the CLAUDE.md template, all twelve rules, and what to do when it goes sideways.</p>
        <span class="url">modernmustardseed.com/fieldguide</span>
      </div>
    </div>
    <div class="qbox divider">
      <img src="${qrBook}" alt="">
      <div>
        <h3>Stuck? Or want it built?</h3>
        <p>Call <b>${PHONE}</b> and Mr. Mustard, our own AI agent, picks up at any hour. Or book thirty minutes with Sarah and bring nothing but the idea.</p>
        <span class="url">modernmustardseed.com/book</span>
      </div>
    </div>
  </div>

  <div class="credit">
    <span>Made by <b>Modern Mustard Seed</b> · Kalispell, Montana</span>
    <span>Apps, Sites, and Specialty AI Tools</span>
  </div>

</body></html>`;
}

/**
 * The loop, cut to sheet length. Same five steps as LOOP on the page, said in
 * the number of words a piece of paper can hold. The assert keeps the two in
 * step: add a stage to the loop and this build fails until the sheet learns it.
 */
const SHEET_LOOP = [
  { label: 'Explore.', text: 'Have it read the code and explain it back. End with "do not write any code yet".' },
  { label: 'Plan.', text: 'Shift+Tab twice. It thinks, it cannot touch a file. Read the plan before approving it.' },
  { label: 'Build.', text: 'One outcome per request. Small pieces, so you can tell which one broke.' },
  { label: 'Prove.', text: 'Never accept "done". Ask for the real output or the loaded page.' },
  { label: 'Save.', text: 'Say "commit this" every time it works. That is your undo button.' },
];
if (SHEET_LOOP.length !== LOOP.length) {
  throw new Error('one-pager: the loop changed in data/fieldguide.ts. Update SHEET_LOOP to match.');
}

/** The four characters, at sheet length. */
const SHEET_CHARS = [
  { key: '/', what: 'The command menu, always current for your version' },
  { key: '@', what: 'Point at a file so it reads the right one' },
  { key: '#', what: 'Save a rule to memory, permanently' },
  { key: '!', what: 'Run a terminal command without leaving' },
];

/* ------------------------------------------------------------------ */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const markup = await html();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(markup, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // One page or it is not a one-pager. Fail loud rather than silently clipping.
  const overflow = await page.evaluate(() => {
    const b = document.body;
    return { scroll: b.scrollHeight, client: b.clientHeight };
  });
  const blocks = await page.evaluate(() =>
    [...document.body.children].map((el) => ({
      cls: (el.className || el.tagName).toString().slice(0, 16),
      h: Math.round(el.getBoundingClientRect().height),
    })),
  );
  console.log('blocks:', JSON.stringify(blocks));

  if (overflow.scroll > overflow.client + 2) {
    throw new Error(
      `one-pager overflows the sheet: content is ${overflow.scroll}px, the page is ${overflow.client}px. Trim something in data/fieldguide.ts or this script.`,
    );
  }

  const png = join(OUT_DIR, `${BASENAME}.png`);
  await page.screenshot({ path: png });

  const pdfPage = await browser.newPage({ viewport: { width: W, height: H } });
  await pdfPage.setContent(markup, { waitUntil: 'networkidle' });
  await pdfPage.evaluate(() => document.fonts.ready);
  await pdfPage.waitForTimeout(400);
  const pdf = await pdfPage.pdf({
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    pageRanges: '1',
  });
  writeFileSync(join(OUT_DIR, `${BASENAME}.pdf`), pdf);

  await browser.close();
  console.log(`one-pager built  ${overflow.scroll}/${overflow.client}px used`);
  console.log(`  ${join('public', 'downloads', `${BASENAME}.pdf`)}`);
  console.log(`  ${join('public', 'downloads', `${BASENAME}.png`)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
