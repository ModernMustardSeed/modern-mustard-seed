/**
 * THE PRESS RUN API.
 *
 * mode "create": guard stack -> Claude parses the pasted price list ->
 *                run stored -> lead + Sarah notify + proof email -> the
 *                parsed catalog returns for the on-page reveal and the
 *                buyer's pre-checkout review table.
 * mode "update": the buyer edits their items/prices before purchase; the
 *                sanitized catalog replaces the stored run (the paid PDF
 *                renders whatever is current).
 *
 * Every gate fails CLOSED, same spine as sidekick/pictures.
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { getSupabase, insertLead } from '@/lib/supabase';
import { parseCatalog, sanitizeCatalog, renderProofHtml } from '@/lib/press';
import {
  claimProof,
  releaseProof,
  bumpPressDaily,
  savePressRun,
  getPressRun,
  updatePressRun,
  type PressProfile,
  type PressRun,
} from '@/lib/press-store';
import { clientEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GLOBAL_DAILY_CAP = 25;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 6;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Body = {
  mode?: 'create' | 'update';
  business?: string;
  tagline?: string;
  city?: string;
  ownerName?: string;
  priceList?: string;
  email?: string;
  /** update mode */
  runId?: string;
  catalog?: unknown;
  /** honeypot */
  website?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true, runId: 'pressed' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'press_dark' }, { status: 503 });

  if (body.mode === 'update') return handleUpdate(supabase, body);
  return handleCreate(supabase, body, ip);
}

async function handleCreate(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  body: Body,
  ip: string
) {
  const business = (body.business || '').trim().slice(0, 80);
  const tagline = (body.tagline || '').trim().slice(0, 80);
  const city = (body.city || '').trim().slice(0, 60);
  const ownerName = (body.ownerName || '').trim().slice(0, 60);
  const priceList = (body.priceList || '').trim().slice(0, 4000);
  const email = (body.email || '').trim().toLowerCase();

  if (business.length < 2) return NextResponse.json({ error: 'no_business' }, { status: 400 });
  if (ownerName.length < 2) return NextResponse.json({ error: 'no_name' }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: 'no_city' }, { status: 400 });
  if (priceList.length < 20) return NextResponse.json({ error: 'no_list', message: 'Paste your actual price list, menu, or rate sheet. Messy is fine, that is the point.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'bad_email' }, { status: 400 });

  const runId = randomUUID();

  const emailClaim = await claimProof(supabase, email, runId);
  if (emailClaim === 'error') return NextResponse.json({ error: 'press_dark' }, { status: 503 });
  if (emailClaim === 'taken') {
    return NextResponse.json(
      { error: 'already_pressed', message: 'This email already ran its free proof (check your inbox). Ready for the clean file? The tiers are below.' },
      { status: 402 }
    );
  }

  const todayCount = await bumpPressDaily(supabase);
  if (todayCount === null) {
    await releaseProof(supabase, email);
    return NextResponse.json({ error: 'press_dark' }, { status: 503 });
  }
  if (todayCount > GLOBAL_DAILY_CAP) {
    await releaseProof(supabase, email);
    await notifySarah('MUSTARD PRESS: daily cap reached', [
      `The press hit its ${GLOBAL_DAILY_CAP}-proof daily cap. Latest attempt: ${esc(business)} (${esc(email)}).`,
      'Raise GLOBAL_DAILY_CAP in app/api/press/proof/route.ts if this is good traffic.',
    ]);
    return NextResponse.json(
      { error: 'press_full', message: 'The press is out of paper for today. Come back tomorrow morning and your job runs first.' },
      { status: 429 }
    );
  }

  const catalog = await parseCatalog(priceList);
  if (!catalog) {
    await releaseProof(supabase, email);
    return NextResponse.json({ error: 'press_dark', message: 'The typesetter squinted at that list and asked for another look. Try pasting it again in a minute.' }, { status: 503 });
  }

  const profile: PressProfile = { business, tagline, city, ownerName };
  const run: PressRun = { profile, email, ip, createdAt: new Date().toISOString(), catalog, edits: 0 };
  if (!(await savePressRun(supabase, runId, run))) {
    await releaseProof(supabase, email);
    return NextResponse.json({ error: 'press_dark' }, { status: 503 });
  }

  const itemCount = catalog.sections.reduce((n, s) => n + s.items.length, 0);
  try {
    await insertLead({
      type: 'contact',
      email,
      name: ownerName,
      source: 'press-proof',
      status: 'new',
      notes: `[press] ${business} · ${city} · ${catalog.sections.length} sections, ${itemCount} priced items · full catalog on the run (${runId})`,
    });
  } catch {
    /* non-fatal */
  }

  await notifySarah(`PRESS PROOF: ${business} (${city})`, [
    `<strong>${esc(ownerName)}</strong> ran a proof for <strong>${esc(business)}</strong> (${esc(city)}). Email: ${esc(email)}. Run ${runId}.`,
    `${catalog.sections.length} sections, ${itemCount} priced items. This lead handed over their whole catalog; that is a discovery call pre-written.`,
    `<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px">${esc(JSON.stringify(catalog, null, 1).slice(0, 2400))}</pre>`,
  ]);

  await emailProof(email, ownerName, business, runId);

  return NextResponse.json({ runId, profile, catalog, proofHtml: renderProofHtml(profile, catalog, { watermark: true }) });
}

async function handleUpdate(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  body: Body
) {
  const runId = (body.runId || '').trim();
  if (!runId) return NextResponse.json({ error: 'no_run' }, { status: 400 });
  const run = await getPressRun(supabase, runId);
  if (!run) return NextResponse.json({ error: 'no_run' }, { status: 404 });
  if ((run.edits ?? 0) >= 20) {
    return NextResponse.json({ error: 'edit_limit', message: 'That is a lot of resets. Buy the piece and email Sarah for anything bigger.' }, { status: 429 });
  }
  const catalog = sanitizeCatalog(body.catalog);
  if (!catalog) return NextResponse.json({ error: 'bad_catalog' }, { status: 400 });

  const next = { ...run, catalog, edits: (run.edits ?? 0) + 1 };
  if (!(await updatePressRun(supabase, runId, next))) {
    return NextResponse.json({ error: 'press_dark' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, catalog, proofHtml: renderProofHtml(run.profile, catalog, { watermark: true }) });
}

async function notifySarah(subject: string, lines: string[]) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return;
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines
        .map((l) => `<p style="margin:0 0 10px">${l}</p>`)
        .join('')}</div>`,
    });
  } catch (err) {
    console.error('press notify failed', err instanceof Error ? err.message : err);
  }
}

async function emailProof(to: string, ownerName: string, business: string, runId: string) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return;
  const firstName = ownerName.split(' ')[0];
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: 'Mr. Mustard at MUSTARD PRESS <hello@modernmustardseed.com>',
      to,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName}, your proof is off the press`,
      html: clientEmail({
        preheader: `${business}, typeset. The watermarked proof is yours to keep.`,
        eyebrow: 'MUSTARD PRESS',
        greeting: `${firstName}, hot off the press.`,
        body: `<p>Your proof for <strong>${esc(business)}</strong> is set. The button below downloads the watermarked PDF; it is yours to keep either way.</p><p>Want it clean and print-ready? THE PIECE is $97, instant: review your items on the page, pay, and the watermark lifts on the spot.</p>`,
        cta: { label: 'Download your proof (PDF)', url: `${SITE.url}/api/press/pdf?runId=${encodeURIComponent(runId)}` },
        secondary: { label: 'Back to the press', url: `${SITE.url}/press#roll` },
        signature: 'Mr. M. (and Sarah, who owns the shop)',
      }),
    });
  } catch (err) {
    console.error('press proof email failed', err instanceof Error ? err.message : err);
  }
}
