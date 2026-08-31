/**
 * Renders one lead into everything the drop needs: their website preview, and
 * the two sides of the card that shows it.
 *
 *   npx tsx scripts/mailer/render.mts --sample                 # first mailable lead
 *   npx tsx scripts/mailer/render.mts --lead <uuid>
 *   npx tsx scripts/mailer/render.mts --fixture roofing        # no database needed
 *   npx tsx scripts/mailer/render.mts --sample --guides        # trim/safe guides on
 *
 * Output lands in .mailer-out/<code>/ as four PNGs plus a proof.pdf that prints
 * both sides at exact size on letter paper. Hold that against a ruler before
 * anything is paid for.
 *
 * Cost per lead: one headless page load. No model call, no API call, nothing
 * billable. That is the entire reason the mailer can address 4,400 businesses
 * when a real demo build is 29 minutes of headless Claude.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import { previewFor, type MailerLead } from '../../lib/mailer/preview.ts';
import { previewSiteHtml, NAV_HEIGHT } from '../../lib/mailer/site-html.ts';
import { postcardFrontHtml, postcardBackHtml, CARD_PX, PREVIEW_SHOT, type Recipient } from '../../lib/mailer/postcard-html.ts';
import { newMailCode, mailUrl } from '../../lib/mailer/code.ts';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string): boolean => args.includes(`--${name}`);

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
try {
  for (const line of readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* env comes from the process */ }

const ORIGIN = env.MAILER_ORIGIN || 'https://modernmustardseed.com';
const STUDIO_PHONE = env.MMS_STUDIO_PHONE || '(406) 312-1223';
const RETURN_ADDRESS = (env.MAILER_RETURN_ADDRESS || 'Modern Mustard Seed|PO Box 1373|Kalispell, MT 59903').split('|');

/** Fixtures let the whole render path be exercised with no database and no network. */
const FIXTURES: Record<string, MailerLead> = {
  roofing: {
    id: 'fixture-roofing-0001', business_name: 'Summit Ridge Roofing', trade: 'roofing', niche: 'home_service',
    city: 'Kalispell', state: 'MT', phone: '+1-406-555-0142', address: '1180 N Main St',
    rating: 4.8, review_count: 163, emergency_service: true, open_24_7: false,
  },
  hvac: {
    id: 'fixture-hvac-0001', business_name: 'On Time Plumbing, Heating, Cooling & Electric', trade: 'hvac', niche: 'home_service',
    city: 'Bel Aire', state: 'KS', phone: '+1-316-263-5055', address: '4065 N Woodlawn Blvd',
    rating: 4.6, review_count: 891, emergency_service: true, open_24_7: true,
  },
  plumbing: {
    id: 'fixture-plumbing-0001', business_name: 'Cardinal Plumbing Co.', trade: 'plumbing', niche: 'home_service',
    city: 'Round Rock', state: 'TX', phone: '+1-512-555-0119', address: '705 Chisholm Trail',
    rating: 4.9, review_count: 412, emergency_service: true, open_24_7: false,
  },
};

async function loadLead(): Promise<{ lead: MailerLead; recipient: Recipient; code: string }> {
  const fixture = flag('fixture');
  if (fixture || has('fixture')) {
    const lead = FIXTURES[fixture || 'roofing'];
    if (!lead) throw new Error(`No fixture "${fixture}". Have: ${Object.keys(FIXTURES).join(', ')}`);
    return {
      lead,
      code: newMailCode(),
      recipient: {
        business: lead.business_name, contact: null, line1: lead.address || '1 Main St',
        city: lead.city || 'Kalispell', state: lead.state || 'MT', zip: '59901',
      },
    };
  }

  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --fixture).');

  const id = flag('lead');
  const qs = id
    ? `id=eq.${encodeURIComponent(id)}`
    : 'mail_address_status=eq.mailable&order=lead_score.desc.nullslast';
  const res = await fetch(
    `${url}/rest/v1/outbound_leads?select=id,business_name,contact_name,trade,niche,city,state,phone,address,postal_code,rating,review_count,emergency_service,open_24_7,mail_code&${qs}&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  if (!res.ok || !rows.length) throw new Error(`No lead found (${res.status}). Run backfill-zip.mts first, or pass --fixture.`);
  const r = rows[0] as MailerLead & { contact_name?: string; postal_code?: string; mail_code?: string };

  return {
    lead: r,
    code: r.mail_code || newMailCode(),
    recipient: {
      business: r.business_name,
      contact: r.contact_name || null,
      line1: r.address || '',
      city: r.city || '',
      state: r.state || '',
      zip: (r as { postal_code?: string }).postal_code || '',
    },
  };
}

const dataUri = (buf: Buffer, mime = 'image/png'): string => `data:${mime};base64,${buf.toString('base64')}`;

async function main(): Promise<void> {
  const { lead, recipient, code } = await loadLead();
  const spec = previewFor(lead);
  const displayUrl = mailUrl(code, ORIGIN).replace(/^https?:\/\//, '');
  const outDir = flag('out') || path.join(ROOT, '.mailer-out', code);
  mkdirSync(outDir, { recursive: true });

  const assetOrigin = existsSync(path.join(ROOT, 'public', spec.heroImage.replace(/^\//, '')))
    ? `file://${path.join(ROOT, 'public').replace(/\\/g, '/')}`
    : ORIGIN;

  const browser = await chromium.launch();
  try {
    // --- the website itself -------------------------------------------------
    // Shot at the card's own aspect ratio (see PREVIEW_SHOT) so nothing is
    // cropped when it lands in the browser frame on the front.
    const site = await browser.newPage({
      viewport: { width: PREVIEW_SHOT.captureWidth, height: PREVIEW_SHOT.captureHeight },
      deviceScaleFactor: 2,
    });
    await site.setContent(previewSiteHtml(spec, { assetOrigin, width: PREVIEW_SHOT.captureWidth, heroHeight: PREVIEW_SHOT.captureHeight - NAV_HEIGHT }), { waitUntil: 'load' });
    // Backgrounds are CSS images; without this the card can print a hero that
    // had not finished decoding when the shutter fired.
    await site.waitForTimeout(400);
    const cardShot = (await site.screenshot({ type: 'png' })) as Buffer;
    writeFileSync(path.join(outDir, 'preview-card.png'), cardShot);

    // The whole page, for the landing page's own use and for Sarah's eyes.
    await site.setViewportSize({ width: 1440, height: 1010 });
    await site.setContent(previewSiteHtml(spec, { assetOrigin, width: 1440 }), { waitUntil: 'load' });
    await site.waitForTimeout(300);
    writeFileSync(path.join(outDir, 'preview-full.png'), (await site.screenshot({ type: 'png', fullPage: true })) as Buffer);
    await site.close();

    // --- the card -----------------------------------------------------------
    const qrPng = await QRCode.toBuffer(mailUrl(code, ORIGIN), {
      type: 'png', width: 720, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#111111ff', light: '#ffffffff' },
    });

    const cardOpts = {
      previewImage: dataUri(cardShot),
      qrImage: dataUri(qrPng),
      code,
      displayUrl,
      studioPhone: STUDIO_PHONE,
      returnAddress: RETURN_ADDRESS,
    };

    const card = await browser.newPage({ viewport: { width: CARD_PX.w, height: CARD_PX.h } });
    const guides = has('guides') ? '<script>document.body.classList.add("guides")</script>' : '';

    await card.setContent(postcardFrontHtml(spec, cardOpts) + guides, { waitUntil: 'load' });
    await card.waitForTimeout(250);
    const front = (await card.screenshot({ type: 'png' })) as Buffer;
    writeFileSync(path.join(outDir, 'front.png'), front);

    await card.setContent(postcardBackHtml(spec, recipient, cardOpts) + guides, { waitUntil: 'load' });
    await card.waitForTimeout(250);
    const back = (await card.screenshot({ type: 'png' })) as Buffer;
    writeFileSync(path.join(outDir, 'back.png'), back);
    await card.close();

    // --- proof.pdf, at exact physical size ---------------------------------
    const pdf = await PDFDocument.create();
    for (const png of [front, back]) {
      const img = await pdf.embedPng(png);
      // 72pt to the inch. The page IS the card, so a printer set to 100% puts
      // a ruler-accurate proof on the desk.
      const page = pdf.addPage([(CARD_PX.w / 300) * 72, (CARD_PX.h / 300) * 72]);
      page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    writeFileSync(path.join(outDir, 'proof.pdf'), Buffer.from(await pdf.save()));
  } finally {
    await browser.close();
  }

  console.log(`${spec.business}`);
  console.log(`  code       ${code}`);
  console.log(`  design     ${spec.trade} / ${spec.layout} / ${spec.palette.name}`);
  console.log(`  card       ${CARD_PX.w}x${CARD_PX.h}px  (${(CARD_PX.w / 300).toFixed(2)}in x ${(CARD_PX.h / 300).toFixed(2)}in @300dpi)`);
  console.log(`  url        ${mailUrl(code, ORIGIN)}`);
  console.log(`  out        ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
