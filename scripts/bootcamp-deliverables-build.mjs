#!/usr/bin/env node
/**
 * Builds the three bootcamp tier deliverables from their sources in
 * private/bootcamp/src into private/bootcamp/dist:
 *
 *   directors-deck.pdf        VIP and up. Forty cards, Letter landscape.
 *   directors-deck-files.zip  VIP and up. The same forty as copy-paste files.
 *   studio-kit.zip            Platinum and cohort. Rules file, skills, hooks.
 *   operators-playbook.pdf    Platinum and cohort. The manual, Letter portrait.
 *   manifest.json             Size and sha256 of each, read by the admin desk.
 *
 * The dist files are committed and served only through the signed route
 * app/api/bootcamp/kit/[item]/route.ts. Run this after editing any source:
 *
 *   node scripts/bootcamp-deliverables-build.mjs
 *
 * Playwright is not a dependency of this repo. Point PLAYWRIGHT_PATH at any
 * installed copy, or it falls back to the Cross + Covenant checkout.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { deflateRawSync, crc32 } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir, tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'private', 'bootcamp', 'src');
const DIST = join(ROOT, 'private', 'bootcamp', 'dist');
const TMP = join(tmpdir(), 'mms-bootcamp-deliverables');
mkdirSync(DIST, { recursive: true });
mkdirSync(TMP, { recursive: true });

const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT_PATH || join(homedir(), 'dev', 'mms', 'products', 'cross-covenant', 'node_modules', 'playwright');
const { chromium } = require(PW);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n) => String(n).padStart(2, '0');

/* -------------------------------------------------------------------------- */
/* Zip, store-and-deflate, no dependency                                       */
/* -------------------------------------------------------------------------- */

function zip(entries) {
  // entries: [{ name, data: Buffer }]
  const locals = [];
  const centrals = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, deflated);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + deflated.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@500;700&display=block" rel="stylesheet">';

const BASE_CSS = `
:root { --cream:#FBF6EA; --ink:#161616; --gold:#F5B700; --red:#C4160B; --paper:#FFFFFF; --soft:#3A3733; --rule:#E7DFCB; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--cream); color: var(--ink); font-family: 'DM Sans', system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3, .display { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; letter-spacing: -0.01em; }
em { font-style: italic; }
.mono, .kicker, .callout-label { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.kicker { color: var(--red); font-size: 10.5pt; }
.seed { display:inline-block; width: 0.62em; height: 0.82em; background: var(--gold); border: 2px solid var(--ink); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; vertical-align: -0.08em; margin-right: 0.35em; }
.brand { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 9pt; letter-spacing: 0.16em; text-transform: uppercase; }
`;

/* -------------------------------------------------------------------------- */
/* The Director's Deck                                                         */
/* -------------------------------------------------------------------------- */

async function deckHtml() {
  const { DECK, SUITS, CARDS } = await import(pathToFileURL(join(SRC, 'directors-deck', 'deck.mjs')).href);
  let n = 0;
  const suitPages = SUITS.map((suit, si) => {
    const cards = CARDS.filter((c) => c.suit === suit.key);
    const divider = `
<section class="page divider">
  <div class="div-num mono">Suit ${si + 1} of ${SUITS.length}</div>
  <h1 class="div-name">${esc(suit.name)}</h1>
  <p class="div-line">${esc(suit.line)}</p>
  <ol class="div-list">${cards.map((c, i) => `<li><span class="mono">${pad(n + i + 1)}</span> ${esc(c.title)}</li>`).join('')}</ol>
</section>`;
    const pages = cards.map((c) => {
      n += 1;
      const isSkill = c.kind === 'skill';
      const label = isSkill ? `Skill file · save as ~/.claude/skills/${c.skill.name}/SKILL.md` : 'Paste this';
      const body = isSkill
        ? `<pre class="skill">---\nname: ${esc(c.skill.name)}\ndescription: ${esc(c.skill.description)}\n---\n\n${esc(c.prompt)}</pre>`
        : `<p class="prompt">${esc(c.prompt).replace(/\{([^}]+)\}/g, '<span class="slot">{$1}</span>')}</p>`;
      return `
<section class="page card ${isSkill ? 'is-skill' : ''}">
  <header class="card-head">
    <span class="kicker">Card ${pad(n)} · ${esc(suit.name)}</span>
    <span class="brand"><span class="seed"></span>The Director's Deck</span>
  </header>
  <h2 class="card-title">${esc(c.title)}</h2>
  <p class="when"><span class="mono">When</span> ${esc(c.when)}</p>
  <div class="box"><div class="box-label mono">${esc(label)}</div>${body}</div>
  <p class="why"><span class="mono">Why it works</span> ${esc(c.why)}</p>
</section>`;
    });
    return divider + pages.join('');
  }).join('');

  const contents = SUITS.map((s, i) => {
    const cards = CARDS.filter((c) => c.suit === s.key);
    const first = CARDS.indexOf(cards[0]) + 1;
    return `<li><span class="mono">${pad(first)} to ${pad(first + cards.length - 1)}</span><strong>${esc(s.name)}</strong><em>${esc(s.line)}</em></li>`;
  }).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(DECK.title)}</title>${FONTS}<style>
${BASE_CSS}
@page { size: 11in 8.5in; margin: 0; }
.page { width: 11in; height: 8.5in; padding: 0.6in 0.75in; position: relative; overflow: hidden; page-break-after: always; break-after: page; }
.cover { background: var(--cream); display: flex; flex-direction: column; justify-content: space-between; }
.cover h1 { font-size: 76pt; line-height: 0.95; font-weight: 900; position: relative; z-index: 2; }
.cover .sub, .cover .band, .cover .kicker { position: relative; z-index: 2; }
.cover .sub { font-size: 18pt; color: var(--soft); max-width: 7.2in; margin-top: 0.25in; line-height: 1.35; }
.cover .band { border-top: 2.5px solid var(--ink); padding-top: 0.18in; display: flex; justify-content: space-between; align-items: baseline; }
.cover .disc { position: absolute; right: -1.6in; top: -1.6in; width: 5.6in; height: 5.6in; border-radius: 50%; background: var(--gold); border: 2.5px solid var(--ink); }
.cover .deckstack { position: absolute; right: 2.55in; top: 3.0in; z-index: 1; }
.cover .deckstack div { position: absolute; width: 2.3in; height: 3.2in; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 14px; box-shadow: 6px 6px 0 var(--ink); }
.cover .deckstack div:nth-child(1) { transform: rotate(-9deg); left: -0.4in; }
.cover .deckstack div:nth-child(2) { transform: rotate(-3deg); left: -0.1in; }
.cover .deckstack div:nth-child(3) { transform: rotate(4deg); left: 0.2in; padding: 0.25in; font-family: 'Playfair Display', serif; font-weight: 900; font-size: 44pt; line-height: 1; }
.cover .deckstack div:nth-child(3) small { display:block; font-family:'JetBrains Mono', monospace; font-size: 8pt; letter-spacing: 0.16em; color: var(--red); margin-bottom: 0.15in; }
.intro { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6in; }
.intro h2 { font-size: 34pt; line-height: 1.05; margin: 0.15in 0 0.25in; }
.intro p { font-size: 12.5pt; line-height: 1.6; color: var(--soft); margin-bottom: 0.16in; }
.intro ol { list-style: none; margin-top: 0.4in; }
.intro ol li { display: grid; grid-template-columns: 1.2in 1fr; grid-template-rows: auto auto; column-gap: 0.15in; padding: 0.11in 0; border-bottom: 1.5px solid var(--rule); }
.intro ol li .mono { grid-row: span 2; font-size: 9pt; color: var(--red); padding-top: 3px; }
.intro ol li strong { font-family: 'Playfair Display', serif; font-size: 15pt; }
.intro ol li em { font-size: 10.5pt; color: var(--soft); }
.divider { background: var(--gold); display: flex; flex-direction: column; justify-content: center; border: 0; }
.div-num { font-size: 11pt; color: var(--ink); }
.div-name { font-size: 110pt; line-height: 0.92; font-weight: 900; margin: 0.12in 0 0.2in; }
.div-line { font-size: 20pt; max-width: 7in; font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; }
.div-list { list-style: none; margin-top: 0.45in; display: grid; grid-template-columns: 1fr 1fr; gap: 0.08in 0.4in; max-width: 8in; }
.div-list li { font-size: 13pt; font-weight: 700; border-top: 2px solid var(--ink); padding-top: 0.07in; }
.div-list .mono { font-size: 9pt; margin-right: 0.08in; }
.card { display: flex; flex-direction: column; }
.card-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid var(--ink); padding-bottom: 0.12in; }
.card-title { font-size: 40pt; line-height: 1.02; margin-top: 0.28in; }
.when { margin-top: 0.12in; font-size: 13pt; color: var(--soft); }
.when .mono, .why .mono { font-size: 8.5pt; color: var(--red); margin-right: 0.1in; }
.box { margin-top: 0.28in; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 14px; box-shadow: 7px 7px 0 var(--ink); padding: 0.28in 0.34in; flex: 1; min-height: 0; position: relative; }
.box-label { font-size: 8.5pt; color: var(--ink); background: var(--gold); display: inline-block; padding: 4px 10px; border: 2px solid var(--ink); border-radius: 999px; margin-bottom: 0.16in; letter-spacing: 0.1em; }
.prompt { font-size: 15pt; line-height: 1.55; }
.slot { background: #FFF1C2; border-bottom: 2px solid var(--gold); padding: 0 3px; font-weight: 700; }
.skill { font-family: 'JetBrains Mono', monospace; font-size: 8.3pt; line-height: 1.5; white-space: pre-wrap; color: var(--ink); columns: 2; column-gap: 0.4in; column-fill: auto; height: 100%; }
.is-skill .box { display: flex; flex-direction: column; }
.is-skill .box .skill { flex: 1; min-height: 0; }
.is-skill .box-label { text-transform: none; align-self: flex-start; }
.why { margin-top: 0.24in; font-size: 12pt; line-height: 1.45; max-width: 9in; }
.back { background: var(--ink); color: var(--cream); display:flex; flex-direction: column; justify-content: center; }
.back h2 { font-size: 48pt; line-height: 1; color: var(--cream); }
.back h2 em { color: var(--gold); }
.back p { font-size: 14pt; line-height: 1.55; max-width: 6.8in; margin-top: 0.25in; color: #E9E2D2; }
.back .brand { color: var(--gold); margin-top: 0.5in; }
</style></head><body>
<section class="page cover">
  <div class="disc"></div>
  <div class="deckstack"><div></div><div></div><div><small>CARD 01 · DIRECT</small>The one-page <em>brief</em></div></div>
  <div><p class="kicker">The One-Person Company Bootcamp · VIP</p></div>
  <div>
    <h1>The Director's<br><em>Deck</em></h1>
    <p class="sub">${esc(DECK.subtitle)}</p>
  </div>
  <div class="band"><span class="brand"><span class="seed"></span>Modern Mustard Seed</span><span class="mono" style="font-size:9pt">${esc(DECK.edition)}</span></div>
</section>
<section class="page intro">
  <div>
    <p class="kicker">How to use the deck</p>
    <h2>In the words we <em>actually type.</em></h2>
    ${DECK.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
  </div>
  <div>
    <p class="kicker">The eight suits</p>
    <ol>${contents}</ol>
  </div>
</section>
${suitPages}
<section class="page back">
  <p class="kicker" style="color:var(--gold)">After the deck</p>
  <h2>Forty cards. One <em>standard.</em></h2>
  <p>The cards work because each one carries a standard the plain request did not. When a card stops producing work you would ship as it is, rewrite it in your own words and keep the standard. The editable copies of all forty are in directors-deck-files.zip, in your room.</p>
  <p>Licensed to the ticket holder for use in their own business. Claude is made by Anthropic; Modern Mustard Seed is an independent studio and is not affiliated with Anthropic.</p>
  <p class="brand"><span class="seed"></span>Modern Mustard Seed · modernmustardseed.com</p>
</section>
</body></html>`;
}

async function deckFiles() {
  const { DECK, SUITS, CARDS } = await import(pathToFileURL(join(SRC, 'directors-deck', 'deck.mjs')).href);
  const entries = [];
  const top = 'directors-deck';
  const lines = [`# ${DECK.title}`, '', DECK.subtitle, '', ...DECK.intro.flatMap((p) => [p, '']), '## The cards', ''];
  CARDS.forEach((c, i) => {
    const suit = SUITS.find((s) => s.key === c.suit);
    const num = pad(i + 1);
    if (c.kind === 'skill') {
      const body = `---\nname: ${c.skill.name}\ndescription: ${c.skill.description}\n---\n\n${c.prompt}\n`;
      entries.push({ name: `${top}/skills/${c.skill.name}/SKILL.md`, data: Buffer.from(body, 'utf8') });
      lines.push(`${num}. **${c.title}** (${suit.name}, skill file): skills/${c.skill.name}/SKILL.md`);
    } else {
      const file = `prompts/${num}-${slug(suit.name)}-${slug(c.title)}.md`;
      const body = `# ${num}. ${c.title}\n\n**Suit:** ${suit.name}\n**When:** ${c.when}\n\n## Paste this\n\n${c.prompt}\n\n## Why it works\n\n${c.why}\n`;
      entries.push({ name: `${top}/${file}`, data: Buffer.from(body, 'utf8') });
      lines.push(`${num}. **${c.title}** (${suit.name}): ${file}`);
    }
  });
  lines.push('', '## Installing the six skill files', '', 'Copy each folder inside skills/ into ~/.claude/skills/ (on Windows, C:\\Users\\<you>\\.claude\\skills\\). Start a new Claude Code session and the skills load on their own.', '', 'Licensed to the ticket holder for use in their own business. Modern Mustard Seed, modernmustardseed.com.', '');
  entries.unshift({ name: `${top}/README.md`, data: Buffer.from(lines.join('\n'), 'utf8') });
  return zip(entries);
}

/* -------------------------------------------------------------------------- */
/* The Operator's Playbook                                                     */
/* -------------------------------------------------------------------------- */

function playbookHtml() {
  const chapters = readFileSync(join(SRC, 'playbook', 'chapters.html'), 'utf8');
  const toc = [...chapters.matchAll(/<section class="chapter" id="([^"]+)">\s*<p class="kicker">([^<]+)<\/p>\s*<h1>([\s\S]*?)<\/h1>/g)]
    .map((m) => `<li><span class="mono">${m[2]}</span><a href="#${m[1]}">${m[3]}</a></li>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The Operator's Playbook</title>${FONTS}<style>
${BASE_CSS}
@page { size: Letter; margin: 0.85in 0.9in 0.9in;
  @bottom-left { content: "The Operator's Playbook  ·  Modern Mustard Seed"; font-family: 'JetBrains Mono', monospace; font-size: 6.5pt; letter-spacing: 1.5px; color: #8a8375; text-transform: uppercase; }
  @bottom-right { content: counter(page); font-family: 'JetBrains Mono', monospace; font-size: 7pt; color: #8a8375; } }
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
html, body { background: #FFFFFF; }
body { font-size: 11pt; line-height: 1.62; color: var(--soft); }
.cover { width: 8.5in; height: 11in; padding: 0.8in; background: var(--cream); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; break-after: page; }
.cover .disc { position: absolute; right: -2.6in; top: 4.4in; width: 7in; height: 7in; border-radius: 50%; background: var(--gold); border: 2.5px solid var(--ink); }
.cover .book { position: absolute; right: 0.9in; top: 5.55in; width: 2.9in; height: 3.6in; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 10px; box-shadow: 9px 9px 0 var(--ink); padding: 0.32in; transform: rotate(4deg); }
.cover .book p { font-family:'JetBrains Mono', monospace; font-size: 7.5pt; letter-spacing: 0.14em; color: var(--red); text-transform: uppercase; }
.cover .book h3 { font-size: 30pt; line-height: 1; margin-top: 0.2in; color: var(--ink); }
.cover .book ul { list-style: none; margin-top: 0.3in; font-size: 9pt; color: var(--ink); }
.cover .book li { border-top: 1.5px solid var(--ink); padding: 5px 0; }
.cover h1 { font-size: 64pt; line-height: 0.95; color: var(--ink); font-weight: 900; max-width: 5in; position: relative; }
.cover .sub { font-size: 15pt; max-width: 3.5in; margin-top: 0.22in; color: var(--soft); position: relative; }
.cover .band { border-top: 2.5px solid var(--ink); padding-top: 0.16in; display: flex; justify-content: space-between; position: relative; color: var(--ink); }
.toc { page-break-after: always; break-after: page; }
.toc h2 { font-size: 28pt; color: var(--ink); margin: 0.06in 0 0.2in; }
.toc ol { list-style: none; }
.toc li { display: grid; grid-template-columns: 1.25in 1fr; padding: 0.04in 0; border-bottom: 1.5px solid var(--rule); align-items: baseline; }
.toc li .mono { font-size: 8pt; color: var(--red); }
.toc li a { font-family: 'Playfair Display', serif; font-weight: 800; font-size: 13.5pt; color: var(--ink); text-decoration: none; }
.chapter { page-break-before: always; break-before: page; }
.chapter h1 { font-size: 34pt; line-height: 1.05; color: var(--ink); margin: 0.08in 0 0.22in; }
.chapter h2 { font-size: 16pt; color: var(--ink); margin: 0.3in 0 0.08in; break-after: avoid; }
.lede { font-size: 14pt; line-height: 1.5; color: var(--ink); font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; border-left: 5px solid var(--gold); padding-left: 0.18in; margin-bottom: 0.25in; }
p { margin-bottom: 0.12in; }
ul, ol { margin: 0.04in 0 0.16in 0.26in; }
li { margin-bottom: 0.05in; }
strong { color: var(--ink); }
code { font-family: 'JetBrains Mono', monospace; font-size: 9.5pt; background: #F1EADA; padding: 1px 5px; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; margin: 0.12in 0 0.2in; font-size: 9.8pt; break-inside: avoid; border: 2.5px solid var(--ink); }
th { background: var(--ink); color: var(--cream); text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; padding: 7px 10px; }
td { padding: 7px 10px; border-top: 1.5px solid var(--rule); vertical-align: top; color: var(--ink); background: var(--paper); }
.callout, .law, .paid, .do { border: 2.5px solid var(--ink); border-radius: 12px; padding: 0.16in 0.2in; margin: 0.2in 0; box-shadow: 5px 5px 0 var(--ink); break-inside: avoid; }
.callout { background: var(--paper); }
.law { background: var(--gold); }
.law p:last-child { color: var(--ink); font-weight: 700; font-size: 12pt; }
.paid { background: #FDECEA; }
.do { background: #E3F4EF; }
.callout-label { font-size: 8pt; color: var(--red); margin-bottom: 0.05in; }
.law .callout-label { color: var(--ink); }
.callout p:last-child, .law p:last-child, .paid p:last-child, .do p:last-child { margin-bottom: 0; }
.checks { list-style: none; margin-left: 0; }
.checks li { padding-left: 0.32in; position: relative; margin-bottom: 0.09in; color: var(--ink); }
.checks li::before { content: ''; position: absolute; left: 0; top: 0.03in; width: 0.16in; height: 0.16in; border: 2px solid var(--ink); border-radius: 3px; background: var(--paper); }
.end { page-break-before: always; break-before: page; text-align: left; }
.end h2 { font-size: 30pt; color: var(--ink); margin-bottom: 0.2in; }
</style></head><body>
<section class="cover">
  <div class="disc"></div>
  <div class="book"><p>Chapter 8</p><h3>Guard<em>rails</em></h3><ul><li>Block what is never right</li><li>Ask about what cannot be undone</li><li>Allow everything else</li></ul></div>
  <div><p class="kicker">The One-Person Company Bootcamp · Platinum</p></div>
  <div>
    <h1>The Operator's <em>Playbook</em></h1>
    <p class="sub">The written manual for running a company with a crew of AI agents. From the desk that runs Modern Mustard Seed.</p>
  </div>
  <div class="band"><span class="brand"><span class="seed"></span>Modern Mustard Seed</span><span class="mono" style="font-size:9pt">Launch 1 · February 2027</span></div>
</section>
<section class="toc">
  <p class="kicker">Contents</p>
  <h2>Fourteen chapters and a <em>checklist.</em></h2>
  <ol>${toc}</ol>
</section>
${chapters}
<section class="end">
  <p class="kicker">License and thanks</p>
  <h2>Built to be <em>yours.</em></h2>
  <p>This playbook is licensed to the Platinum or cohort seat holder for use in their own business. It may be shared inside that business. It may not be resold, republished or used to train others outside it.</p>
  <p>The Studio Kit in your room holds the rules file, the twelve skills and the ten guards this book describes, ready to install. Questions go in your room during the run, and to sarah@modernmustardseed.com after it.</p>
  <p>Claude and Claude Code are made by Anthropic. Modern Mustard Seed is an independent studio and is not affiliated with or endorsed by Anthropic.</p>
  <p class="brand" style="margin-top:0.4in;color:var(--ink)"><span class="seed"></span>Modern Mustard Seed · modernmustardseed.com</p>
</section>
</body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Render                                                                      */
/* -------------------------------------------------------------------------- */

async function pdf(browser, html, out, opts) {
  const file = join(TMP, `${out}.html`);
  writeFileSync(file, html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() =>
    [...document.querySelectorAll('.box, .skill, .toc, .chapter')]
      .filter((el) => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)
      .map((el) => (el.closest('.page')?.querySelector('.card-title, h1')?.textContent ?? el.className).trim().slice(0, 60)),
  );
  if (over.length) console.warn(`${out}: overflow on ${[...new Set(over)].join(' | ')}`);
  await page.pdf({ path: join(DIST, out), printBackground: true, preferCSSPageSize: true, ...opts });
  await page.close();
}

const browser = await chromium.launch();
try {
  await pdf(browser, await deckHtml(), 'directors-deck.pdf', {});
  await pdf(browser, playbookHtml(), 'operators-playbook.pdf', {});
} finally {
  await browser.close();
}

writeFileSync(join(DIST, 'directors-deck-files.zip'), await deckFiles());

const kitDir = join(SRC, 'studio-kit');
const kitEntries = walk(kitDir).map((full) => ({
  name: ['studio-kit', ...relative(kitDir, full).split(sep)].join('/'),
  data: readFileSync(full),
}));
writeFileSync(join(DIST, 'studio-kit.zip'), zip(kitEntries));

const manifest = {};
for (const name of ['directors-deck.pdf', 'directors-deck-files.zip', 'studio-kit.zip', 'operators-playbook.pdf']) {
  const buf = readFileSync(join(DIST, name));
  manifest[name] = { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), builtAt: new Date().toISOString() };
}
writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const [name, m] of Object.entries(manifest)) console.log(`${name.padEnd(28)} ${(m.bytes / 1024).toFixed(0).padStart(6)} KB`);
if (!existsSync(join(DIST, 'studio-kit.zip'))) process.exit(1);
