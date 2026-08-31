/**
 * THE DROP. Leads in, postcards out.
 *
 *   npx tsx scripts/mailer/run-campaign.mts --campaign sep-w1 --limit 25
 *      Dry run against the TEST key. Renders everything, submits nothing that
 *      costs money, and tells you what it would have spent.
 *
 *   npx tsx scripts/mailer/run-campaign.mts --campaign sep-w1 --limit 25 --send
 *      Same, but really submits to the provider on the TEST key. Free. This is
 *      the run that proves the artwork passes the provider's own validator.
 *
 *   npx tsx scripts/mailer/run-campaign.mts --campaign sep-w1 --limit 500 --send --live
 *      Spends money. Requires the live key, a spend ceiling, and a typed
 *      confirmation.
 *
 * THE FOUR GUARDS, in the order they will save you:
 *
 *   1. --live is never implied. Absent it, the test key is used, full stop.
 *   2. MAILER_MAX_SPEND_CENTS caps one invocation. Default $250. A fat-fingered
 *      --limit 40000 stops at the ceiling instead of at the credit limit.
 *   3. mail_pieces has a unique index on (outbound_lead_id, campaign). The
 *      database refuses a duplicate even if this script is run twice at once.
 *   4. The piece row is written BEFORE the provider is called and updated
 *      after. A crash mid-drop leaves a 'queued' row, never a silent
 *      double-send.
 *
 * Cost per piece is about $0.70 all in. At the observed funnel that is the
 * cheapest consent this business has ever bought.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium, type Browser } from 'playwright';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import { previewFor, type MailerLead } from '../../lib/mailer/preview.ts';
import { previewSiteHtml, NAV_HEIGHT } from '../../lib/mailer/site-html.ts';
import { postcardFrontHtml, postcardBackHtml, CARD_PX, PREVIEW_SHOT, type Recipient } from '../../lib/mailer/postcard-html.ts';
import { newMailCode, mailUrl } from '../../lib/mailer/code.ts';
import { getMailProvider, MailProviderError, type MailAddress } from '../../lib/mailer/provider.ts';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (n: string): string | undefined => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (n: string): boolean => args.includes(`--${n}`);

const CAMPAIGN = (flag('campaign') || '').trim();
const LIMIT = Number(flag('limit')) || 10;
const SEND = has('send');
const LIVE = has('live');
const MIN_SCORE = Number(flag('min-score')) || 0;

if (!CAMPAIGN || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(CAMPAIGN)) {
  console.error('--campaign <name> is required (lowercase, digits and dashes). It is the duplicate guard.');
  process.exit(1);
}

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
try {
  for (const line of readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* env from the process */ }
for (const [k, v] of Object.entries(env)) process.env[k] = v;

const SUPA = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };

const ORIGIN = env.MAILER_ORIGIN || 'https://modernmustardseed.com';
const STUDIO_PHONE = env.MMS_STUDIO_PHONE || '(406) 312-1223';
const RETURN_LINES = (env.MAILER_RETURN_ADDRESS || 'Modern Mustard Seed|PO Box 1373|Kalispell, MT 59903').split('|');
const MAX_SPEND_CENTS = Number(env.MAILER_MAX_SPEND_CENTS) || 25000;
/** What a 6x9 postcard costs when the provider does not tell us. */
const ASSUMED_PIECE_CENTS = 70;

const FROM: MailAddress = {
  name: RETURN_LINES[0] || 'Modern Mustard Seed',
  line1: RETURN_LINES[1] || 'PO Box 1373',
  city: (RETURN_LINES[2] || 'Kalispell, MT 59903').split(',')[0].trim(),
  state: ((RETURN_LINES[2] || '').match(/\b([A-Z]{2})\b/) || [])[1] || 'MT',
  zip: ((RETURN_LINES[2] || '').match(/\b(\d{5})\b/) || [])[1] || '59903',
};

type Lead = MailerLead & {
  contact_name: string | null;
  postal_code: string | null;
  mail_code: string | null;
  lead_score: number | null;
};

async function sql<T>(path_: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPA}/rest/v1/${path_}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

/**
 * Who gets a card. Deliberately narrow: a verified address, not suppressed,
 * not already a customer, and not already mailed in THIS campaign.
 */
async function selectLeads(): Promise<Lead[]> {
  const qs = new URLSearchParams({
    select: 'id,business_name,contact_name,trade,niche,city,state,phone,address,postal_code,rating,review_count,emergency_service,open_24_7,mail_code,lead_score',
    mail_address_status: 'eq.mailable',
    postal_code: 'not.is.null',
    unsubscribed_at: 'is.null',
    status: 'not.in.(dnc,lost,client,won)',
    bounced: 'not.is.true',
    is_test: 'not.is.true',
    order: 'lead_score.desc.nullslast',
    limit: String(LIMIT * 3),
  });
  if (MIN_SCORE) qs.set('lead_score', `gte.${MIN_SCORE}`);
  const rows = await sql<Lead[]>(`outbound_leads?${qs}`);

  // Exclude anyone already mailed in this campaign. The unique index is the
  // real guard; this is so a re-run does not burn its whole limit on rejects.
  const already = await sql<Array<{ outbound_lead_id: string }>>(
    `mail_pieces?select=outbound_lead_id&campaign=eq.${encodeURIComponent(CAMPAIGN)}&limit=100000`
  );
  const seen = new Set(already.map((r) => r.outbound_lead_id));
  return rows.filter((r) => !seen.has(r.id) && r.address && r.postal_code).slice(0, LIMIT);
}

async function ensureCode(lead: Lead): Promise<string> {
  if (lead.mail_code) return lead.mail_code;
  // Collisions are astronomically unlikely (29^7) but a unique index turns one
  // into a crash mid-drop, so retry rather than assume.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newMailCode();
    try {
      await sql(`outbound_leads?id=eq.${lead.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ mail_code: code }),
      });
      return code;
    } catch (err) {
      if (!String(err).includes('23505')) throw err;
    }
  }
  throw new Error('could not mint a unique mail code');
}

const dataUri = (buf: Buffer | Uint8Array): string => `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;

async function renderCard(browser: Browser, lead: Lead, code: string, recipient: Recipient) {
  const spec = previewFor(lead);
  const displayUrl = mailUrl(code, ORIGIN).replace(/^https?:\/\//, '');

  const site = await browser.newPage({
    viewport: { width: PREVIEW_SHOT.captureWidth, height: PREVIEW_SHOT.captureHeight },
    deviceScaleFactor: 2,
  });
  await site.setContent(previewSiteHtml(spec, { assetOrigin: ORIGIN, width: PREVIEW_SHOT.captureWidth, heroHeight: PREVIEW_SHOT.captureHeight - NAV_HEIGHT }), { waitUntil: 'load' });
  await site.waitForTimeout(350);
  const shot = (await site.screenshot({ type: 'png' })) as Buffer;
  await site.close();

  const qr = await QRCode.toBuffer(mailUrl(code, ORIGIN), {
    type: 'png', width: 720, margin: 1, errorCorrectionLevel: 'M',
  });

  const opts = {
    previewImage: dataUri(shot),
    qrImage: dataUri(qr),
    code,
    displayUrl,
    studioPhone: STUDIO_PHONE,
    returnAddress: RETURN_LINES,
  };

  const page = await browser.newPage({ viewport: { width: CARD_PX.w, height: CARD_PX.h } });
  await page.setContent(postcardFrontHtml(spec, opts), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const frontPng = (await page.screenshot({ type: 'png' })) as Buffer;
  await page.setContent(postcardBackHtml(spec, recipient, opts), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const backPng = (await page.screenshot({ type: 'png' })) as Buffer;
  await page.close();

  const toPdf = async (png: Buffer): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(png);
    const p = doc.addPage([(CARD_PX.w / 300) * 72, (CARD_PX.h / 300) * 72]);
    p.drawImage(img, { x: 0, y: 0, width: p.getWidth(), height: p.getHeight() });
    return doc.save();
  };

  return { spec, frontPdf: await toPdf(frontPng), backPdf: await toPdf(backPng), frontPng, backPng };
}

async function confirmLive(count: number, ceilingCents: number): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\nAbout to mail ${count} real postcards, up to $${(ceilingCents / 100).toFixed(2)}. This cannot be undone.\nType the campaign name "${CAMPAIGN}" to go ahead: `
  );
  rl.close();
  return answer.trim() === CAMPAIGN;
}

async function main(): Promise<void> {
  const leads = await selectLeads();
  const mode = !SEND ? 'DRY RUN (nothing submitted)' : LIVE ? 'LIVE (real postage)' : 'TEST KEY (free)';
  console.log(`campaign "${CAMPAIGN}"  ${leads.length} leads  ${mode}\n`);
  if (!leads.length) {
    console.log('Nothing to mail. Run backfill-zip.mts --apply, or pick a different campaign name.');
    return;
  }

  const ceilingCents = Math.min(MAX_SPEND_CENTS, leads.length * ASSUMED_PIECE_CENTS);
  if (SEND && LIVE) {
    if (leads.length * ASSUMED_PIECE_CENTS > MAX_SPEND_CENTS) {
      console.error(
        `Refusing: ${leads.length} pieces is about $${((leads.length * ASSUMED_PIECE_CENTS) / 100).toFixed(2)}, over the ` +
          `$${(MAX_SPEND_CENTS / 100).toFixed(2)} ceiling. Lower --limit or raise MAILER_MAX_SPEND_CENTS deliberately.`
      );
      process.exit(1);
    }
    if (!(await confirmLive(leads.length, ceilingCents))) {
      console.log('Not confirmed. Nothing was mailed.');
      return;
    }
  }

  const provider = SEND ? getMailProvider(LIVE) : null;
  if (SEND && !provider) {
    console.error(`No ${LIVE ? 'LOB_API_KEY_LIVE' : 'LOB_API_KEY_TEST'} in the environment. Nothing was mailed.`);
    process.exit(1);
  }

  const outDir = path.join(ROOT, '.mailer-out', CAMPAIGN);
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  let sent = 0;
  let failed = 0;
  let spentCents = 0;

  try {
    for (const lead of leads) {
      const code = await ensureCode(lead);
      const recipient: Recipient = {
        business: lead.business_name,
        contact: lead.contact_name,
        line1: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        zip: lead.postal_code || '',
      };

      const { spec, frontPdf, backPdf, frontPng } = await renderCard(browser, lead, code, recipient);
      writeFileSync(path.join(outDir, `${code}-front.png`), frontPng);

      // The row exists BEFORE any money moves. If the process dies in the next
      // line, the piece reads 'queued' and a human can tell what happened.
      let pieceId: string | null = null;
      try {
        const [piece] = await sql<Array<{ id: string }>>('mail_pieces?select=id', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            outbound_lead_id: lead.id,
            campaign: CAMPAIGN,
            mail_code: code,
            business_name: lead.business_name,
            address_line1: recipient.line1,
            city: recipient.city,
            state: recipient.state,
            postal_code: recipient.zip,
            preview: { trade: spec.trade, layout: spec.layout, palette: spec.palette.name, headline: spec.headline },
            status: SEND ? 'rendered' : 'queued',
            provider: SEND ? (LIVE ? 'lob' : 'lob-test') : null,
            rendered_at: new Date().toISOString(),
          }),
        });
        pieceId = piece.id;
      } catch (err) {
        if (String(err).includes('23505')) {
          console.log(`  skip  ${lead.business_name} (already mailed in ${CAMPAIGN})`);
          continue;
        }
        throw err;
      }

      if (!SEND) {
        console.log(`  dry   ${code}  ${lead.business_name}  ->  ${recipient.city}, ${recipient.state} ${recipient.zip}`);
        continue;
      }

      try {
        const result = await provider!.send({
          to: {
            name: (lead.contact_name || lead.business_name).slice(0, 40),
            company: lead.business_name,
            line1: recipient.line1,
            city: recipient.city,
            state: recipient.state,
            zip: recipient.zip,
          },
          from: FROM,
          frontPdf,
          backPdf,
          description: `${CAMPAIGN} · ${lead.business_name} · ${code}`,
          metadata: { campaign: CAMPAIGN, mail_code: code, lead_id: lead.id },
        });
        const cost = result.costCents ?? ASSUMED_PIECE_CENTS;
        spentCents += cost;
        sent++;
        await sql(`mail_pieces?id=eq.${pieceId}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'sent',
            provider_id: result.id,
            cost_cents: result.costCents,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        await sql(`outbound_leads?id=eq.${lead.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ mail_last_sent_at: new Date().toISOString() }),
        });
        console.log(`  sent  ${code}  ${lead.business_name}  ${result.id}${result.expectedDelivery ? `  eta ${result.expectedDelivery}` : ''}`);
      } catch (err) {
        failed++;
        const message = err instanceof MailProviderError ? err.message : String(err);
        await sql(`mail_pieces?id=eq.${pieceId}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'failed', error: message.slice(0, 900), updated_at: new Date().toISOString() }),
        });
        console.log(`  FAIL  ${code}  ${lead.business_name}\n        ${message}`);
        // The first failure in a drop is almost always the contract, not the
        // row. Stop rather than fail four thousand times in a loop.
        if (failed === 1 && sent === 0) {
          console.log('\nStopping after the first failure. Fix it, then re-run: mailed pieces are never re-sent.');
          break;
        }
      }

      if (spentCents >= MAX_SPEND_CENTS) {
        console.log(`\nSpend ceiling reached ($${(spentCents / 100).toFixed(2)}). Stopping.`);
        break;
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nsent ${sent}   failed ${failed}   spent $${(spentCents / 100).toFixed(2)}${LIVE ? '' : ' (test key, no money moved)'}`);
  console.log(`artwork: ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
