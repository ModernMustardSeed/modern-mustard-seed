// Builds the shootable Facebook deck (fb-deck.html) from the SOURCE files, so the
// artifact can never drift from REELS-24.md / fb-content-bank.json / FB-PLAYBOOK.md.
//   node build-artifact.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = f => readFileSync(path.join(__dirname, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ------------------------------------------------------------------ parse reels
function parseReels(md) {
  const reels = [];
  let batch = '';
  const blocks = md.split(/\n(?=## R\d+ ·|# BATCH )/);
  for (const blk of blocks) {
    const bm = blk.match(/^# BATCH \d+: (.+)$/m);
    if (bm && !blk.startsWith('## R')) { batch = bm[1].trim(); continue; }
    const hm = blk.match(/^## R(\d+) · (.+)$/m);
    if (!hm) continue;
    const meta = blk.match(/\*\*Pillar:\*\* (.+?) · \*\*Shot:\*\* (.+?) · \*\*Length:\*\* (.+?)$/m) || [];
    const hookLabel = blk.match(/\*\*HOOK \(([^)]*)\)\*\*/);
    // the quoted line(s) right after the HOOK marker
    const hookBody = blk.match(/\*\*HOOK \([^)]*\)\*\*\n((?:> .*\n?)+)/);
    const scriptBody = blk.match(/\*\*SCRIPT\*\*\n((?:>.*\n?)+)/);
    const beats = blk.match(/\*\*ON-SCREEN BEATS:\*\* (.+?)$/m);
    const caption = blk.match(/\*\*CAPTION:\*\* (.+?)$/m);
    const ask = blk.match(/\*\*ASK REEL \(([^)]*)\)/);
    const unquote = s => s.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
    reels.push({
      n: +hm[1],
      title: hm[2].trim(),
      batch,
      pillar: (meta[1] || '').trim(),
      shot: (meta[2] || '').trim(),
      length: (meta[3] || '').trim(),
      onScreenHook: hookLabel ? (hookLabel[1].match(/"([^"]*)"/) || [, hookLabel[1]])[1] : '',
      hook: hookBody ? unquote(hookBody[1]) : '',
      script: scriptBody ? unquote(scriptBody[1]).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : [],
      beats: beats ? beats[1].split('→').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) : [],
      caption: caption ? caption[1].trim() : '',
      ask: ask ? ask[1] : null,
    });
  }
  return reels;
}

// ------------------------------------------------------------------ parse group copy
function parseGroup(md) {
  const grab = (heading, mode) => {
    const i = md.indexOf(heading);
    if (i === -1) return '';
    const rest = md.slice(i + heading.length);
    const end = rest.search(/\n###? /);
    const chunk = end === -1 ? rest : rest.slice(0, end);
    if (mode === 'quote') {
      return chunk.split('\n').filter(l => l.startsWith('>')).map(l => l.replace(/^> ?/, '')).join('\n').trim();
    }
    return chunk.split('\n').filter(l => /^\d+\.\s/.test(l)).join('\n').trim();
  };
  const name = (md.match(/\*\*PRIMARY: `(.+?)`\*\*/) || [, ''])[1];
  const strip = s => s.replace(/\*\*/g, '').replace(/\*/g, '');
  return {
    name,
    description: strip(grab('### Group description (paste as-is)', 'quote')),
    questions: strip(grab('### Membership questions', 'list')),
    rules: strip(grab('### Rules (5,', 'list')),
    pinned: strip(grab('### Pinned "Start Here" post', 'quote')),
  };
}

// ------------------------------------------------------------------ growth tactics
function parseTactics(md) {
  const i = md.indexOf('## 6. The growth tactics');
  const rest = md.slice(i);
  const end = rest.indexOf('### Target groups');
  return rest.slice(0, end).split('\n')
    .filter(l => /^\d+\.\s\*\*/.test(l))
    .map(l => {
      const m = l.match(/^\d+\.\s\*\*(.+?)\*\*\s*(.*)$/);
      return { head: m[1].replace(/\.$/, ''), body: m[2].replace(/\*\*/g, '') };
    });
}

const reels = parseReels(R('REELS-24.md'));
const posts = JSON.parse(R('fb-content-bank.json'));
const playbook = R('FB-PLAYBOOK.md');
const group = parseGroup(playbook);
const tactics = parseTactics(playbook);

// post dates: Mon/Thu/Sat starting 2026-07-27
const POST_DAYS = [1, 4, 6];
const dates = [];
let probe = Date.parse('2026-07-26T00:00:00Z');
while (dates.length < posts.length) {
  probe += 86400000;
  const d = new Date(probe);
  if (POST_DAYS.includes(d.getUTCDay())) dates.push(d.toISOString().slice(0, 10));
}
const fmtDate = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

if (reels.length !== 24) throw new Error(`Expected 24 reels, parsed ${reels.length}`);
const bad = reels.filter(r => !r.hook || !r.script.length || !r.caption);
if (bad.length) throw new Error(`Reels missing fields: ${bad.map(b => 'R' + b.n).join(', ')}`);
if (!group.name || !group.description || !group.pinned) throw new Error('Group copy failed to parse');
if (tactics.length < 8) throw new Error(`Expected 10 tactics, parsed ${tactics.length}`);

// ------------------------------------------------------------------ render
const shotChip = s => s === 'FACE' ? 'face' : s === 'SCREEN' ? 'screen' : 'both';

const reelCards = reels.map(r => `
<article class="card reel" data-batch="${esc(r.batch)}" data-n="${r.n}">
  <header class="reel-head">
    <div class="eyebrow">R${r.n} · ${esc(r.pillar)}</div>
    <div class="chips">
      <span class="chip chip-${shotChip(r.shot)}">${esc(r.shot)}</span>
      <span class="chip chip-time">${esc(r.length)}</span>
      ${r.ask ? `<span class="chip chip-ask">ASK ${esc(r.ask)}</span>` : ''}
    </div>
  </header>
  <h3 class="reel-title">${esc(r.title)}</h3>

  <div class="hook">
    <div class="hook-label">Hook · first 1.5 seconds</div>
    <p class="hook-line">${esc(r.hook)}</p>
    ${r.onScreenHook ? `<div class="hook-screen"><span>on screen</span> ${esc(r.onScreenHook)}</div>` : ''}
  </div>

  <div class="script" data-script>
    ${r.script.map(p => `<p>${esc(p)}</p>`).join('\n    ')}
  </div>

  ${r.beats.length ? `<div class="beats">
    <div class="mini-label">On-screen text beats</div>
    <ol class="beat-list">${r.beats.map(b => `<li>${esc(b)}</li>`).join('')}</ol>
  </div>` : ''}

  <div class="caption-block">
    <div class="mini-label">Caption <span class="warn">no link in the caption</span></div>
    <p class="caption-text" data-caption>${esc(r.caption)}</p>
    <div class="row">
      <button class="btn" data-copy>Copy caption</button>
      <button class="btn btn-prompt" data-prompt="${r.n}">Teleprompter</button>
      <label class="shot-toggle"><input type="checkbox" data-shot="R${r.n}"> Shot</label>
    </div>
  </div>
</article>`).join('\n');

const postCards = posts.map((p, i) => `
<article class="card post">
  <header class="post-head">
    <div class="eyebrow">${esc(p.pillar)}</div>
    <time class="post-date">${esc(fmtDate(dates[i]))}</time>
  </header>
  <h3 class="post-title">${esc(p.headline)}</h3>
  <div class="post-body" data-caption>${p.fb.map(t => `<p>${esc(t)}</p>`).join('')}</div>
  ${p.firstComment ? `<div class="first-comment"><div class="mini-label">Paste as the first comment</div><p>${esc(p.firstComment)}</p></div>` : ''}
  <div class="row"><button class="btn" data-copy>Copy post</button>${p.cta ? '<span class="chip chip-ask">THE ASK</span>' : ''}</div>
</article>`).join('\n');

const groupBlocks = [
  ['Group name', group.name],
  ['Description', group.description],
  ['Join questions', group.questions],
  ['Rules', group.rules],
  ['Pinned "Start Here" post', group.pinned],
].map(([label, body]) => `
<article class="card">
  <div class="eyebrow">${esc(label)}</div>
  <div class="copy-body" data-caption>${body.split('\n').filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}</div>
  <div class="row"><button class="btn" data-copy>Copy</button></div>
</article>`).join('\n');

const tacticItems = tactics.map((t, i) => `
<li class="tactic">
  <label><input type="checkbox" data-shot="T${i}">
  <span><strong>${esc(t.head)}</strong> ${esc(t.body)}</span></label>
</li>`).join('');

const promptData = JSON.stringify(reels.map(r => ({ n: r.n, t: r.title, h: r.hook, s: r.script })));

const html = `<title>Main Street AI: the Facebook deck</title>
<style>
:root{
  --cream:#FBF6EA; --ink:#161616; --mustard:#F5B700; --red:#C4160B;
  --blue:#1E50C8; --gold-text:#8f6600; --midnight:#080C16;
  --bg:var(--cream); --fg:var(--ink); --card:#FFFFFF; --line:var(--ink);
  --shadow:4px 4px 0 0 var(--ink); --muted:rgba(22,22,22,.68);
  --hairline:rgba(22,22,22,.14); --dot:rgba(245,183,0,.30);
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
@media (prefers-color-scheme:dark){
  :root{ --bg:var(--midnight); --fg:#F3EFE4; --card:#11172a; --line:#F5B700;
    --shadow:4px 4px 0 0 rgba(245,183,0,.85); --muted:rgba(243,239,228,.66);
    --hairline:rgba(243,239,228,.16); --red:#FF7A6B; --blue:#8FB4FF; --gold-text:#F5B700; --dot:rgba(245,183,0,.16); }
}
:root[data-theme="dark"]{ --bg:var(--midnight); --fg:#F3EFE4; --card:#11172a; --line:#F5B700;
  --shadow:4px 4px 0 0 rgba(245,183,0,.85); --muted:rgba(243,239,228,.66);
  --hairline:rgba(243,239,228,.16); --red:#FF7A6B; --blue:#8FB4FF; --gold-text:#F5B700; --dot:rgba(245,183,0,.16); }
:root[data-theme="light"]{ --bg:var(--cream); --fg:var(--ink); --card:#FFFFFF; --line:var(--ink);
  --shadow:4px 4px 0 0 var(--ink); --muted:rgba(22,22,22,.68);
  --hairline:rgba(22,22,22,.14); --red:#C4160B; --blue:#1E50C8; --gold-text:#8f6600; --dot:rgba(245,183,0,.30); }

*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--sans);
  font-size:17px;line-height:1.55;-webkit-text-size-adjust:100%;
  background-image:radial-gradient(var(--dot) 1.1px,transparent 1.1px);
  background-size:18px 18px;background-attachment:fixed;}
.wrap{max-width:820px;margin:0 auto;padding:28px 18px 96px;}

.masthead{margin-bottom:22px}
.kicker{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--red);margin:0 0 10px}
h1{font-size:clamp(30px,7vw,46px);line-height:1.04;margin:0 0 10px;font-weight:800;letter-spacing:-.02em;text-wrap:balance}
.sub{margin:0;color:var(--muted);max-width:60ch}
.status{margin-top:16px;border:2px solid var(--line);background:var(--card);box-shadow:var(--shadow);padding:12px 14px}
.status .mini-label{margin-bottom:4px}
.status p{margin:0;font-size:14.5px}

.tabs{position:sticky;top:0;z-index:30;display:flex;gap:8px;padding:12px 0;
  background:var(--bg);border-bottom:1px solid var(--hairline);margin:22px 0 20px;overflow-x:auto}
.tab{flex:0 0 auto;font-family:var(--mono);font-size:11.5px;letter-spacing:.11em;text-transform:uppercase;
  padding:8px 13px;border:2px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;font-weight:700}
.tab[aria-selected="true"]{background:var(--mustard);color:var(--ink);box-shadow:var(--shadow)}
.tab:focus-visible,.btn:focus-visible,.filter:focus-visible{outline:3px solid var(--blue);outline-offset:2px}

.panel[hidden]{display:none}
.stack{display:flex;flex-direction:column;gap:20px}

.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
.filter{font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;padding:6px 11px;
  border:2px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;font-weight:700}
.filter[aria-pressed="true"]{background:var(--mustard);color:var(--ink)}
.progress{font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--gold-text);margin-left:auto;font-weight:700}

.card{background:var(--card);border:2px solid var(--line);box-shadow:var(--shadow);padding:20px 18px}
.card.done{opacity:.5}
.eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.17em;text-transform:uppercase;color:var(--red);font-weight:700}
.mini-label{font-family:var(--mono);font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--gold-text);font-weight:700;margin-bottom:6px}
.warn{color:var(--red);letter-spacing:.09em}

.reel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border:1.5px solid var(--line);font-weight:700;white-space:nowrap}
.chip-face{background:var(--mustard);color:var(--ink)}
.chip-screen{background:var(--blue);color:#fff;border-color:var(--blue)}
.chip-both{background:transparent;color:var(--fg)}
.chip-time{background:transparent;color:var(--muted);font-variant-numeric:tabular-nums}
.chip-ask{background:var(--red);color:#fff;border-color:var(--red)}
.reel-title{font-size:24px;line-height:1.15;margin:10px 0 16px;font-weight:800;letter-spacing:-.015em;text-wrap:balance}

.hook{background:var(--mustard);color:var(--ink);border:2px solid var(--ink);padding:14px 15px;margin-bottom:16px}
.hook-label{font-family:var(--mono);font-size:9.5px;letter-spacing:.17em;text-transform:uppercase;font-weight:700;opacity:.72;margin-bottom:7px}
.hook-line{margin:0;font-size:19px;line-height:1.32;font-weight:700}
.hook-screen{margin-top:10px;padding-top:9px;border-top:1.5px solid rgba(22,22,22,.28);font-size:14px;font-weight:600}
.hook-screen span{font-family:var(--mono);font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;opacity:.7;margin-right:6px}

.script p{margin:0 0 13px;font-size:17.5px;line-height:1.62}
.script p:last-child{margin-bottom:0}

.beats{margin-top:17px;padding-top:15px;border-top:1px solid var(--hairline)}
.beat-list{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px;counter-reset:b}
.beat-list li{counter-increment:b;font-size:13.5px;padding:5px 10px;border:1.5px solid var(--hairline);background:var(--bg);line-height:1.35}
.beat-list li::before{content:counter(b);font-family:var(--mono);font-size:9.5px;color:var(--gold-text);margin-right:7px;font-weight:700}

.caption-block{margin-top:17px;padding-top:15px;border-top:1px solid var(--hairline)}
.caption-text{margin:0 0 13px;font-size:15.5px;color:var(--muted)}
.row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.btn{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:9px 14px;
  border:2px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;font-weight:700}
.btn:active{transform:translate(2px,2px)}
.btn-prompt{background:var(--mustard);color:var(--ink);border-color:var(--ink)}
.shot-toggle{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;
  display:flex;align-items:center;gap:7px;cursor:pointer;margin-left:auto}
.shot-toggle input{width:19px;height:19px;accent-color:var(--mustard);cursor:pointer}

.post-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.post-date{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.post-title{font-size:20px;line-height:1.2;margin:9px 0 14px;font-weight:800;letter-spacing:-.012em;text-wrap:balance}
.post-body p,.copy-body p{margin:0 0 11px;font-size:16px}
.post-body p:last-child,.copy-body p:last-child{margin-bottom:0}
.first-comment{margin-top:15px;padding:12px 13px;border:2px dashed var(--hairline);background:var(--bg)}
.first-comment p{margin:0;font-size:14.5px;color:var(--muted)}
.post .row{margin-top:15px}

.tactic-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:13px}
.tactic label{display:flex;gap:12px;align-items:flex-start;cursor:pointer}
.tactic input{width:20px;height:20px;flex:0 0 auto;margin-top:2px;accent-color:var(--mustard);cursor:pointer}
.tactic strong{font-weight:800}
.done-text{text-decoration:line-through;opacity:.55}

.note{font-size:15px;color:var(--muted);margin:0 0 18px;max-width:62ch}

/* teleprompter */
.prompter{position:fixed;inset:0;z-index:100;background:var(--midnight);color:#F3EFE4;
  display:none;flex-direction:column;padding:22px 20px 18px}
.prompter[open]{display:flex}
.prompter-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:0 0 auto;
  padding-bottom:14px;border-bottom:1px solid rgba(243,239,228,.2)}
.prompter-title{font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--mustard);font-weight:700}
.prompter-body{flex:1 1 auto;overflow-y:auto;padding:22px 0 40px}
.prompter-hook{background:var(--mustard);color:var(--ink);padding:16px 17px;margin-bottom:26px;font-size:clamp(21px,5.2vw,30px);line-height:1.26;font-weight:800}
.prompter-body p{font-size:clamp(21px,5vw,30px);line-height:1.5;margin:0 0 24px;font-weight:600}
.prompter-close{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;
  background:transparent;border:2px solid var(--mustard);color:var(--mustard);padding:8px 14px;cursor:pointer;font-weight:700}
.prompter-nav{flex:0 0 auto;display:flex;gap:10px;padding-top:14px;border-top:1px solid rgba(243,239,228,.2)}
.prompter-nav button{flex:1;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;
  background:transparent;border:2px solid rgba(243,239,228,.4);color:#F3EFE4;padding:12px;cursor:pointer;font-weight:700}
.prompter-nav button:disabled{opacity:.3;cursor:default}

.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(90px);
  background:var(--ink);color:var(--cream);font-family:var(--mono);font-size:11px;letter-spacing:.11em;
  text-transform:uppercase;padding:11px 18px;border:2px solid var(--mustard);z-index:200;
  transition:transform .22s ease;font-weight:700}
.toast.show{transform:translateX(-50%) translateY(0)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (max-width:520px){ .wrap{padding:20px 13px 88px} .card{padding:17px 15px} .shot-toggle{margin-left:0} }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="kicker">Modern Mustard Seed · Facebook organic</p>
    <h1>Main Street AI</h1>
    <p class="sub">24 Reels, 30 scheduled posts, and the group. Everything you need to shoot a batch and run the lane. Built ${new Date('2026-07-23T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.</p>
    <div class="status">
      <div class="mini-label">Before anything schedules</div>
      <p>Blotato only holds your personal Facebook profile, not the MMS Page. Pull the Page ID from Meta Business Suite, reconnect Facebook with Page access, then set <code>FB_PAGE_ID</code>. Reels are posted by hand from the phone either way.</p>
    </div>
  </header>

  <nav class="tabs" role="tablist">
    <button class="tab" role="tab" aria-selected="true" data-tab="reels">Reels · 24</button>
    <button class="tab" role="tab" aria-selected="false" data-tab="posts">Posts · 30</button>
    <button class="tab" role="tab" aria-selected="false" data-tab="group">The Group</button>
    <button class="tab" role="tab" aria-selected="false" data-tab="growth">Growth</button>
  </nav>

  <section class="panel" id="reels" role="tabpanel">
    <p class="note">Shoot 8 at a time, about 90 minutes. One take each, do not review between takes. Change your shirt between batches. Post natively from the Facebook app so you get trending audio, and never put a link in the caption.</p>
    <div class="filters">
      <button class="filter" data-filter="all" aria-pressed="true">All</button>
      <button class="filter" data-filter="Weeks 1 to 2" aria-pressed="false">Batch 1</button>
      <button class="filter" data-filter="Weeks 3 to 4" aria-pressed="false">Batch 2</button>
      <button class="filter" data-filter="Weeks 5 to 6" aria-pressed="false">Batch 3</button>
      <span class="progress" id="progress">0 / 24 shot</span>
    </div>
    <div class="stack">${reelCards}</div>
  </section>

  <section class="panel" id="posts" role="tabpanel" hidden>
    <p class="note">Scheduled Monday, Thursday and Saturday at 8am Mountain, starting July 27, running through October 3. These fire through Blotato once the Page ID is set. Exactly one of the thirty carries an ask.</p>
    <div class="stack">${postCards}</div>
  </section>

  <section class="panel" id="group" role="tabpanel" hidden>
    <p class="note">Facebook makes you create the group by hand. Paste each block below. Join question three asks for an email, which builds a list Facebook cannot take away from you.</p>
    <div class="stack">${groupBlocks}</div>
  </section>

  <section class="panel" id="growth" role="tabpanel" hidden>
    <p class="note">Mechanical, not creative. Most people skip these and wonder why nothing works. Tick them off as they become habit.</p>
    <div class="card"><ol class="tactic-list">${tacticItems}</ol></div>
  </section>
</div>

<div class="prompter" id="prompter" role="dialog" aria-modal="true" aria-label="Teleprompter">
  <div class="prompter-top">
    <span class="prompter-title" id="pTitle"></span>
    <button class="prompter-close" id="pClose">Close</button>
  </div>
  <div class="prompter-body" id="pBody"></div>
  <div class="prompter-nav">
    <button id="pPrev">Previous</button>
    <button id="pNext">Next reel</button>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const REELS = ${promptData};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1600);
}

// tabs
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
  $$('.panel').forEach(p => { p.hidden = p.id !== tab.dataset.tab; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

// batch filter
$$('.filter').forEach(f => f.addEventListener('click', () => {
  $$('.filter').forEach(x => x.setAttribute('aria-pressed', String(x === f)));
  const want = f.dataset.filter;
  $$('.reel').forEach(c => { c.hidden = want !== 'all' && c.dataset.batch !== want; });
}));

// copy
$$('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
  const card = btn.closest('.card');
  const src = $('[data-caption]', card);
  const text = src.tagName === 'P' ? src.textContent : $$('p', src).map(p => p.textContent).join('\\n\\n');
  navigator.clipboard.writeText(text).then(() => toast('Copied'), () => toast('Copy failed'));
}));

// persistent checkboxes (shot list + growth habits)
const KEY = 'msa-fb-checks';
const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
function refreshProgress(){
  const shot = REELS.filter(r => saved['R' + r.n]).length;
  $('#progress').textContent = shot + ' / ' + REELS.length + ' shot';
}
$$('[data-shot]').forEach(box => {
  const id = box.dataset.shot;
  box.checked = !!saved[id];
  const paint = () => {
    const card = box.closest('.card');
    if (card && card.classList.contains('reel')) card.classList.toggle('done', box.checked);
    const span = box.parentElement.querySelector('span');
    if (span) span.classList.toggle('done-text', box.checked);
  };
  paint();
  box.addEventListener('change', () => {
    saved[id] = box.checked;
    localStorage.setItem(KEY, JSON.stringify(saved));
    paint(); refreshProgress();
  });
});
refreshProgress();

// teleprompter
let pIndex = 0;
const prompter = $('#prompter');
function openPrompter(n){
  pIndex = REELS.findIndex(r => r.n === n);
  if (pIndex < 0) pIndex = 0;
  renderPrompter();
  prompter.setAttribute('open', '');
  $('#pClose').focus();
}
function renderPrompter(){
  const r = REELS[pIndex];
  $('#pTitle').textContent = 'R' + r.n + ' · ' + r.t;
  $('#pBody').innerHTML = '<div class="prompter-hook"></div>' + r.s.map(() => '<p></p>').join('');
  $('.prompter-hook', $('#pBody')).textContent = r.h;
  $$('#pBody p').forEach((p, i) => { p.textContent = r.s[i]; });
  $('#pBody').scrollTop = 0;
  $('#pPrev').disabled = pIndex === 0;
  $('#pNext').disabled = pIndex === REELS.length - 1;
}
$$('[data-prompt]').forEach(b => b.addEventListener('click', () => openPrompter(+b.dataset.prompt)));
$('#pClose').addEventListener('click', () => prompter.removeAttribute('open'));
$('#pPrev').addEventListener('click', () => { if (pIndex > 0) { pIndex--; renderPrompter(); } });
$('#pNext').addEventListener('click', () => { if (pIndex < REELS.length - 1) { pIndex++; renderPrompter(); } });
document.addEventListener('keydown', e => {
  if (!prompter.hasAttribute('open')) return;
  if (e.key === 'Escape') prompter.removeAttribute('open');
  if (e.key === 'ArrowRight' && pIndex < REELS.length - 1) { pIndex++; renderPrompter(); }
  if (e.key === 'ArrowLeft' && pIndex > 0) { pIndex--; renderPrompter(); }
});
</script>`;

writeFileSync(path.join(__dirname, 'fb-deck.html'), html);
console.log(`Built fb-deck.html`);
console.log(`  ${reels.length} reels, ${posts.length} posts, ${tactics.length} tactics, group copy OK`);
console.log(`  posts run ${dates[0]} .. ${dates[posts.length - 1]}`);
