/**
 * The MUSTARD PICTURES Screen Test.
 *
 * One per email, forever, atomic via app_state pk claim, fail closed. The
 * storyboard (Claude) is the guaranteed beat; the hero frame (fal) may be in
 * the "darkroom" (generation down or the wallet dry), which degrades
 * gracefully: the treatment still delivers on page + email, Sarah gets told.
 *
 * COGS per run: ~$0.02 storyboard + ~$0.04 frame. Daily backstop caps the day.
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { resendClient } from '@/lib/send-email';
import { getSupabase, insertLead } from '@/lib/supabase';
import { writeStoryboard, paintHeroFrame } from '@/lib/pictures';
import {
  claimScreenTest,
  releaseScreenTest,
  bumpPicturesDaily,
  savePicturesRun,
  updatePicturesRun,
  type PicturesProfile,
  type PicturesRun,
} from '@/lib/pictures-store';
import { getPicturesVertical } from '@/data/pictures';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GLOBAL_DAILY_CAP = 30;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 5;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Body = {
  business?: string;
  vertical?: string;
  city?: string;
  ownerName?: string;
  story?: string;
  email?: string;
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

  // Honeypot: bots get a plausible success that costs nothing.
  if (body.website) return NextResponse.json({ ok: true, runId: 'action' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const business = (body.business || '').trim().slice(0, 80);
  const city = (body.city || '').trim().slice(0, 60);
  const ownerName = (body.ownerName || '').trim().slice(0, 60);
  const story = (body.story || '').trim().slice(0, 500);
  const verticalId = getPicturesVertical((body.vertical || '').trim()).id;
  const email = (body.email || '').trim().toLowerCase();

  if (business.length < 2) return NextResponse.json({ error: 'no_business' }, { status: 400 });
  if (ownerName.length < 2) return NextResponse.json({ error: 'no_name' }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: 'no_city' }, { status: 400 });
  if (story.length < 15) return NextResponse.json({ error: 'no_story' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'bad_email' }, { status: 400 });

  const supabase = getSupabase();
  // Caps live in Supabase. No store = no free model calls. Fail closed.
  if (!supabase) return NextResponse.json({ error: 'studio_dark' }, { status: 503 });

  const runId = randomUUID();

  const emailClaim = await claimScreenTest(supabase, email, runId);
  if (emailClaim === 'error') return NextResponse.json({ error: 'studio_dark' }, { status: 503 });
  if (emailClaim === 'taken') {
    return NextResponse.json(
      { error: 'already_tested', message: 'You already had your Screen Test (check your inbox for the treatment). Ready to roll film? The tiers are below.' },
      { status: 402 }
    );
  }

  const todayCount = await bumpPicturesDaily(supabase);
  if (todayCount === null) {
    await releaseScreenTest(supabase, email);
    return NextResponse.json({ error: 'studio_dark' }, { status: 503 });
  }
  if (todayCount > GLOBAL_DAILY_CAP) {
    await releaseScreenTest(supabase, email);
    await notifySarah('MUSTARD PICTURES: daily cap reached', [
      `The studio hit its ${GLOBAL_DAILY_CAP}-test daily cap. Latest attempt: ${esc(business)} (${esc(email)}).`,
      'Raise GLOBAL_DAILY_CAP in app/api/pictures/screen-test/route.ts if this is good traffic.',
    ]);
    return NextResponse.json(
      { error: 'studio_full', message: 'The lot is fully booked today. Come back tomorrow morning and Mr. Mustard will see you first.' },
      { status: 429 }
    );
  }

  const profile: PicturesProfile = { business, verticalId, city, ownerName, story };

  // The storyboard is the product. If the writer's room is down, release
  // everything so the visitor can simply try again later.
  const storyboard = await writeStoryboard(profile);
  if (!storyboard) {
    await releaseScreenTest(supabase, email);
    return NextResponse.json({ error: 'studio_dark' }, { status: 503 });
  }

  const run: PicturesRun = { profile, email, ip, createdAt: new Date().toISOString(), storyboard };
  if (!(await savePicturesRun(supabase, runId, run))) {
    await releaseScreenTest(supabase, email);
    return NextResponse.json({ error: 'studio_dark' }, { status: 503 });
  }

  // The hero frame may be in the darkroom (fal down or wallet dry). Graceful.
  const frameUrl = await paintHeroFrame(profile);
  if (frameUrl) await updatePicturesRun(supabase, runId, { ...run, frameUrl });

  try {
    await insertLead({
      type: 'contact',
      email,
      name: ownerName,
      source: 'pictures-screen-test',
      status: 'new',
      notes: `[pictures] ${business} · ${getPicturesVertical(verticalId).label} · ${city} · story: ${story.slice(0, 140)}`,
    });
  } catch {
    /* non-fatal */
  }

  await notifySarah(`SCREEN TEST: ${business} (${city})${frameUrl ? '' : ' [frame in darkroom]'}`, [
    `<strong>${esc(ownerName)}</strong> took a Screen Test for <strong>${esc(business)}</strong> (${getPicturesVertical(verticalId).label}, ${esc(city)}). Email: ${esc(email)}. Run ${runId}.`,
    `Their story: ${esc(story)}`,
    `<pre style="white-space:pre-wrap;font-family:inherit">${esc(storyboard)}</pre>`,
    frameUrl
      ? `Hero frame: <a href="${frameUrl}">${frameUrl.slice(0, 80)}…</a>`
      : 'Hero frame FAILED (fal down or wallet empty). If they buy, generate it during production.',
  ]);

  await emailTreatment(email, ownerName, business, storyboard, frameUrl);

  return NextResponse.json({ runId, storyboard, frameUrl, darkroom: !frameUrl });
}

async function notifySarah(subject: string, lines: string[]) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines
        .map((l) => `<p style="margin:0 0 10px">${l}</p>`)
        .join('')}</div>`,
    });
  } catch (err) {
    console.error('pictures notify failed', err instanceof Error ? err.message : err);
  }
}

async function emailTreatment(to: string, ownerName: string, business: string, storyboard: string, frameUrl: string | null) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return;
  const firstName = ownerName.split(' ')[0];
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Mr. Mustard at MUSTARD PICTURES <hello@modernmustardseed.com>',
      to,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName}, your commercial's treatment is ready`,
      html: clientEmail({
        preheader: `The director's treatment for ${business}, from your Screen Test.`,
        eyebrow: 'MUSTARD PICTURES',
        greeting: `${firstName}, that's a wrap on your Screen Test.`,
        body: `<p>Here is the treatment Mr. Mustard directed for <strong>${esc(business)}</strong>. Keep it either way, it is yours.</p>${
          frameUrl ? `<p><img src="${frameUrl}" alt="Your hero frame" style="width:100%;max-width:520px;border:3px solid #161616" /></p>` : '<p><em>Your hero frame is still in the darkroom and will land in a follow-up email.</em></p>'
        }<pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.7;background:#FBF6EA;border:2px solid #161616;padding:18px">${esc(storyboard)}</pre><p>Want it filmed? THE SPOT is $197 and lands within 2 business days, three cuts, ready to run.</p>`,
        cta: { label: 'Roll film', url: 'https://modernmustardseed.com/pictures#roll' },
        signature: 'Mr. M. (and Sarah, who reviews every frame)',
      }),
    });
  } catch (err) {
    console.error('pictures treatment email failed', err instanceof Error ? err.message : err);
  }
}
