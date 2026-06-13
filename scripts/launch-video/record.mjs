/* Records the MMS client-experience walkthrough on the LIVE site as a webm,
   with a visible synthetic cursor, and writes milestone timestamps for post.

   Usage: node scripts/launch-video/record.mjs --magic "<MAGIC_LINK from seed-demo>"
   Output: scripts/launch-video/recordings/raw.webm + milestones.json
*/
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REC = join(HERE, "recordings");
for (const f of existsSync(REC) ? readdirSync(REC) : []) {
  if (f.endsWith(".webm") || f === "milestones.json") rmSync(join(REC, f));
}
mkdirSync(REC, { recursive: true });

const MAGIC = process.argv.includes("--magic")
  ? process.argv[process.argv.indexOf("--magic") + 1]
  : null;
if (!MAGIC) throw new Error("pass --magic <link> (from seed-demo.mjs)");

const SITE = "https://modernmustardseed.com";
const W = 1920, H = 1080;

const milestones = [];
let t0 = 0;
const mark = (label) => {
  milestones.push({ t: Date.now() - t0, label });
  console.log(`  [${(((Date.now() - t0) / 1000)).toFixed(1)}s] ${label}`);
};

const CURSOR = `
  (() => {
    try { document.cookie = 'mms_consent=denied; path=/; max-age=31536000; samesite=lax'; } catch {}
    const make = () => {
      if (document.getElementById('__cur')) return;
      const d = document.createElement('div');
      d.id = '__cur';
      d.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(245,183,0,0.95);border:2.5px solid #161616;box-shadow:0 2px 10px rgba(22,22,22,0.4);pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:width .12s,height .12s';
      document.documentElement.appendChild(d);
      addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
      addEventListener('mousedown', () => { d.style.width = '30px'; d.style.height = '30px'; }, true);
      addEventListener('mouseup', () => { d.style.width = '22px'; d.style.height = '22px'; }, true);
    };
    if (document.readyState !== 'loading') make();
    else addEventListener('DOMContentLoaded', make);
  })();
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: REC, size: { width: W, height: H } },
});
const page = await ctx.newPage();
await page.addInitScript(CURSOR);
page.setDefaultTimeout(90000);

async function glide(x, y, ms = 600) {
  await page.mouse.move(x, y, { steps: Math.max(12, Math.round(ms / 16)) });
}
async function smoothScroll(toY, dur = 1600) {
  await page.evaluate(([y, d]) => new Promise(res => {
    const start = scrollY, dist = y - start, t1 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t1) / d), e = p < .5 ? 2*p*p : 1-((-2*p+2)**2)/2;
      scrollTo(0, start + dist * e);
      p < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  }), [toY, dur]);
}
async function glideTo(locator, ms = 600) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (box) await glide(box.x + box.width / 2, box.y + box.height / 2, ms);
  return box;
}
async function dismissCookies() {
  const btn = page.locator('button:has-text("Accept all")').first();
  if (await btn.count()) await btn.click().catch(() => {});
}

t0 = Date.now();
console.log("Recording started…");

/* ---- 1. Home ---- */
await page.goto(SITE, { waitUntil: "networkidle" });
await dismissCookies();
mark("hero");
await page.waitForTimeout(2800);
await glide(W / 2, H * 0.55, 600);
await smoothScroll(1050, 2400);
mark("hero-scroll");
await page.waitForTimeout(1600);

/* ---- 2. The AI audit ---- */
await page.goto(`${SITE}/audit`, { waitUntil: "networkidle" });
await dismissCookies();
mark("audit");
await page.waitForTimeout(1400);

const nameIn = page.locator('input[placeholder="Your name"]');
await glideTo(nameIn, 500);
await nameIn.click();
await nameIn.pressSequentially("Avery Brooks", { delay: 42 });
const emailIn = page.locator('input[type="email"]').first();
await emailIn.click();
await emailIn.pressSequentially("avery@harborandpine.com", { delay: 30 });
const urlIn = page.locator('input[placeholder="yourbusiness.com"]');
await urlIn.click();
await urlIn.pressSequentially("lagosociety.com", { delay: 34 });
mark("audit-form");

const breakBtn = page.locator('button:has-text("Break my bottleneck")');
await glideTo(breakBtn, 600);
await breakBtn.click();
mark("audit-run");
// wait for the score ring / result
await page.locator("text=Your #1 bottleneck").first().waitFor({ timeout: 120000 }).catch(() => {});
await page.waitForTimeout(1500);
mark("audit-result");
await smoothScroll(820, 2200);
await page.waitForTimeout(1400);
await smoothScroll(1500, 2000);
await page.waitForTimeout(1200);
mark("audit-scrolled");

/* ---- 3. Launch checklist ---- */
await page.goto(`${SITE}/launch-checklist`, { waitUntil: "networkidle" });
await dismissCookies();
mark("checklist");
await page.waitForTimeout(1400);
const industry = page.locator('button:has-text("Retail")').first();
if (await industry.count()) {
  await glideTo(industry, 700);
  await industry.click().catch(() => {});
}
mark("checklist-pick");
await page.waitForTimeout(1200);
await smoothScroll(900, 2200);
await page.waitForTimeout(1500);
mark("checklist-scrolled");

/* ---- 4. The client portal (the centerpiece) ---- */
await page.goto(MAGIC, { waitUntil: "networkidle" });
await page.waitForURL(/\/portal/, { timeout: 30000 }).catch(() => {});
await page.waitForSelector("text=Welcome back", { timeout: 30000 }).catch(() => {});
mark("portal");
await page.waitForTimeout(2600);

// billing card
const billing = page.locator("text=Your engagement").first();
if (await billing.count()) {
  await glideTo(billing, 700);
  mark("portal-billing");
  await page.waitForTimeout(2000);
}
// project: countdown + milestones
const project = page.locator("text=Harbor & Pine").first();
if (await project.count()) {
  await glideTo(project, 700);
  mark("portal-project");
  await page.waitForTimeout(2600);
}
await smoothScroll(900, 2000);
await page.waitForTimeout(1600);
mark("portal-milestones");

// files / deliverables
const files = page.locator("text=Files and deliverables").first();
if (await files.count()) {
  await glideTo(files, 800);
  mark("portal-files");
  await page.waitForTimeout(2200);
}

// Mr. Mustard assistant
await smoothScroll(0, 1400);
await page.waitForTimeout(600);
const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[placeholder*="ask"]').first();
if (await chatInput.count()) {
  await glideTo(chatInput, 800);
  await chatInput.click().catch(() => {});
  await chatInput.pressSequentially("When do we launch?", { delay: 45 }).catch(() => {});
  mark("assistant-typed");
  await page.keyboard.press("Enter").catch(() => {});
  await page.waitForTimeout(9000); // let Mr. Mustard answer
  mark("assistant-reply");
} else {
  mark("assistant-skip");
}
await page.waitForTimeout(1200);

/* ---- 5. Finale ---- */
await page.goto(SITE, { waitUntil: "networkidle" });
await page.waitForTimeout(2400);
mark("end");

await ctx.close();
await browser.close();

const vids = readdirSync(REC).filter(f => f.endsWith(".webm") && f !== "raw.webm");
if (vids.length) renameSync(join(REC, vids[0]), join(REC, "raw.webm"));
writeFileSync(join(REC, "milestones.json"), JSON.stringify(milestones, null, 2));
console.log(`\n✓ raw.webm + milestones.json in scripts/launch-video/recordings/`);
