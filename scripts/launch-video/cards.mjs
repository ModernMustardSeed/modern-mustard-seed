/* Renders the MMS client-experience video brand cards (pop-art cabin, locked
   tokens) as PNGs via Playwright.

   Usage: node scripts/launch-video/cards.mjs
   Output: scripts/launch-video/recordings/cards/*.png
*/
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "recordings", "cards");
mkdirSync(OUT, { recursive: true });

const W = 1920, H = 1080;

const FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
`;

const TOKENS = `
  :root { --cream:#FBF6EA; --ink:#161616; --mustard:#F5B700; --red:#E0301E; --blue:#1E50C8; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${W}px; height:${H}px; overflow:hidden; }
  .sans { font-family:'DM Sans', sans-serif; }
  .display { font-family:'Playfair Display', serif; }
  .mono { font-family:'JetBrains Mono', monospace; }
  .halftone { background-image: radial-gradient(circle, rgba(245,183,0,0.30) 1.6px, transparent 1.7px); background-size: 20px 20px; }
  .popcard { background:#fff; border:3px solid var(--ink); box-shadow:9px 9px 0 0 var(--ink); border-radius:18px; }
`;

const intro = `<!doctype html><html><head>${FONTS}<style>${TOKENS}</style></head>
<body class="halftone" style="background-color:var(--cream);display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;">
    <img src="https://modernmustardseed.com/mascot.png" style="height:150px;margin-bottom:28px;filter:drop-shadow(5px 5px 0 rgba(22,22,22,0.9));" onerror="this.style.display='none'"/>
    <div class="mono" style="font-size:24px;font-weight:700;letter-spacing:0.34em;color:var(--red);margin-bottom:26px;">MODERN MUSTARD SEED</div>
    <div class="display" style="font-weight:900;font-size:104px;line-height:1.08;color:var(--ink);">You bring the <span style="background:var(--mustard);border:3px solid var(--ink);box-shadow:7px 7px 0 0 var(--ink);border-radius:14px;padding:0 26px;display:inline-block;">seed</span></div>
    <div class="display" style="font-weight:900;font-size:104px;line-height:1.2;color:var(--ink);margin-top:14px;">we build the <em>tree.</em></div>
  </div>
</body></html>`;

const hook = `<!doctype html><html><head>${FONTS}<style>${TOKENS}</style></head>
<body class="halftone" style="background-color:var(--cream);display:flex;align-items:center;justify-content:center;">
  <div class="popcard" style="text-align:center;max-width:1380px;padding:90px 110px;">
    <div class="mono" style="font-size:22px;font-weight:700;letter-spacing:0.32em;color:var(--red);margin-bottom:30px;">THE FULL TOUR · 90 SECONDS</div>
    <div class="display" style="font-weight:900;font-size:88px;line-height:1.1;color:var(--ink);">This is what it's like<br/>to be <em style="color:var(--blue);">our client.</em></div>
    <div class="sans" style="margin-top:32px;font-size:30px;color:rgba(22,22,22,0.65);">Free tools first. A real portal after. No mystery in between.</div>
  </div>
</body></html>`;

const outro = `<!doctype html><html><head>${FONTS}<style>${TOKENS}</style></head>
<body class="halftone" style="background-color:var(--cream);display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;">
    <div class="display" style="font-weight:900;font-size:92px;line-height:1.12;color:var(--ink);">Bring your idea.<br/>We build it. <em style="color:var(--red);">You own it.</em></div>
    <div class="sans" style="margin-top:48px;display:inline-block;background:var(--mustard);color:var(--ink);font-weight:800;font-size:38px;padding:24px 64px;border:3px solid var(--ink);box-shadow:8px 8px 0 0 var(--ink);border-radius:16px;">modernmustardseed.com</div>
    <div class="mono" style="margin-top:38px;font-size:21px;letter-spacing:0.22em;color:rgba(22,22,22,0.6);">FREE AI AUDIT · FREE LAUNCH CHECKLIST · CLIENT PORTAL INCLUDED</div>
  </div>
</body></html>`;

const lowerThird = (kicker, title) => `<!doctype html><html><head>${FONTS}<style>${TOKENS}
  body { background:transparent; }
</style></head>
<body style="position:relative;">
  <div class="popcard" style="position:absolute;left:64px;bottom:64px;padding:24px 46px 26px 36px;border-radius:16px;">
    <div class="mono" style="font-size:18px;font-weight:700;letter-spacing:0.3em;color:var(--red);margin-bottom:8px;">${kicker}</div>
    <div class="sans" style="font-weight:800;font-size:40px;color:var(--ink);line-height:1.05;">${title}</div>
  </div>
</body></html>`;

const CARDS = [
  { file: "intro.png", html: intro, transparent: false },
  { file: "hook.png", html: hook, transparent: false },
  { file: "outro.png", html: outro, transparent: false },
  { file: "lt-home.png", html: lowerThird("MODERNMUSTARDSEED.COM", "Apps, sites, and AI tools for founders"), transparent: true },
  { file: "lt-audit.png", html: lowerThird("FREE TOOL № 1", "The AI audit finds your bottleneck"), transparent: true },
  { file: "lt-audit-result.png", html: lowerThird("IN ABOUT 30 SECONDS", "Your fix, sized in hours and dollars"), transparent: true },
  { file: "lt-checklist.png", html: lowerThird("FREE TOOL № 2", "A launch checklist for your industry"), transparent: true },
  { file: "lt-portal.png", html: lowerThird("THEN YOU SIGN", "Every client gets a real portal"), transparent: true },
  { file: "lt-portal-detail.png", html: lowerThird("NO MYSTERY", "Live progress, files, billing, one place"), transparent: true },
  { file: "lt-assistant.png", html: lowerThird("MR. MUSTARD", "Your project, answered day or night"), transparent: true },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const c of CARDS) {
  await page.setContent(c.html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, c.file), omitBackground: c.transparent });
  console.log(`✓ ${c.file}`);
}
await browser.close();
console.log(`\n✓ Cards in scripts/launch-video/recordings/cards/`);
