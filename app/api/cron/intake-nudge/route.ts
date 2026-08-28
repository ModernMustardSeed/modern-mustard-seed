import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { findStalls } from '@/lib/acq/stalls';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE PROMISE KEEPER (loop audit, breaks #1 and #4, 2026-08-20).
 *
 * Before this cron existed, a buyer who ignored the one confirmation email was
 * billed monthly forever while nothing built, nothing chased, and no alarm
 * rang. And the "released within 7 days" promise on the page had no machinery
 * measuring it.
 *
 * Daily, two jobs:
 *  1. NUDGE: paid orders with no intake get chased at 1 day, 3 days, and 7
 *     days (the last one warmer and personal). State rides app_state
 *     `intakenudge:<orderId>` and only advances after a confirmed send.
 *  2. SLA DIGEST to Sarah: anything quietly stuck. Paid 7+ days and not
 *     delivered; a reveal date in the past with no approval; an office
 *     sitting in provisioning/configuring for 48+ hours. One digest email,
 *     at most once a day, only when something is actually stuck.
 *
 * Fails closed on CRON_SECRET: an unset secret is a 401, not an open door
 * (the newsletter cron's silent-401 misfire is the precedent we copy the
 * defensive half of, not the silent half).
 */
const NUDGE_STEPS_HOURS = [24, 72, 168];

function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });

  const now = Date.now();
  const results = { nudged: 0, skipped: 0, slaFlags: [] as string[] };

  // ── 1. The nudges ─────────────────────────────────────────────────────────
  const { data: orders } = await db
    .from('demo_orders')
    .select('id, email, name, business_name, hub_demo_id, created_at, status, intake_at')
    .eq('status', 'paid')
    .is('intake_at', null)
    .gte('created_at', new Date(now - 45 * 86400_000).toISOString())
    .limit(200);

  for (const o of orders ?? []) {
    if (!o.email || !o.hub_demo_id) continue;
    const ageHours = (now - new Date(o.created_at as string).getTime()) / 3600_000;
    const due = NUDGE_STEPS_HOURS.filter((h) => ageHours >= h).length; // 0..3
    if (due === 0) continue;

    const key = `intakenudge:${o.id}`;
    const { data: st } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
    const sentSteps = Number((st?.value as { step?: number } | null)?.step ?? 0);
    if (sentSteps >= due) {
      results.skipped++;
      continue;
    }

    const first = (o.name as string | null)?.split(' ')[0];
    const intakeUrl = `${SITE.url}/demo/order/${o.hub_demo_id}/thanks`;
    const step = sentSteps + 1; // send at most one step per day, in order
    const subject =
      step === 1
        ? `${first ? `${first}, ` : ''}two minutes and your build starts`
        : step === 2
          ? `${first ? `${first}, ` : ''}we are ready when you are`
          : `${first ? `${first}, ` : ''}I am holding your build for you`;
    const text =
      step === 3
        ? `It has been a week since you ordered for ${o.business_name ?? 'your business'}, and I have not started building because I never got your details: your hours, your photos, the things only you know.\n\nYou are paying for this, so I want it live. The form takes about two minutes:\n${intakeUrl}\n\nIf something is in the way, just reply to this email and tell me. I read every one.\n\nSarah`
        : `Your ${o.business_name ? `${o.business_name} ` : ''}build is queued and waiting on one thing: the two-minute form with your details (hours, logo, the specifics only you know).\n\n${intakeUrl}\n\nThe moment it lands, we build. Reply here with any questions.\n\nSarah`;

    const sent = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: o.email as string,
      replyTo: 'sarah@modernmustardseed.com',
      subject,
      text,
    });
    if (sent.ok) {
      await db.from('app_state').upsert({ key, value: { step, at: new Date().toISOString() } });
      results.nudged++;
    }
  }

  // ── 2. The SLA digest ─────────────────────────────────────────────────────
  const sevenDaysAgo = new Date(now - 7 * 86400_000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 86400_000).toISOString();

  const { data: lateOrders } = await db
    .from('demo_orders')
    .select('business_name, status, created_at')
    .in('status', ['paid', 'intake_done'])
    .lt('created_at', sevenDaysAgo)
    .limit(50);
  for (const o of lateOrders ?? []) {
    results.slaFlags.push(`7-day promise lapsed: ${o.business_name ?? 'unknown'} (${o.status}, ordered ${(o.created_at as string).slice(0, 10)})`);
  }

  const { data: staleReveal } = await db
    .from('projects')
    .select('business_name, reveal_at')
    .is('approved_at', null)
    .not('reveal_at', 'is', null)
    .lt('reveal_at', new Date(now).toISOString())
    .limit(50);
  for (const p of staleReveal ?? []) {
    results.slaFlags.push(`reveal date passed, not approved: ${p.business_name ?? 'unknown'} (reveal ${(p.reveal_at as string).slice(0, 10)})`);
  }

  const { data: stuckOffices } = await db
    .from('fo_offices')
    .select('business_name, status, created_at')
    .in('status', ['provisioning', 'configuring'])
    .lt('created_at', twoDaysAgo)
    .limit(50);
  for (const f of stuckOffices ?? []) {
    results.slaFlags.push(`office stuck in ${f.status}: ${f.business_name ?? 'unknown'} (since ${(f.created_at as string).slice(0, 10)})`);
  }

  /*
   * ── 3. The acquisition half of the loop ──────────────────────────────────
   *
   * The two checks above watch what happens AFTER somebody pays. Everything
   * before that had nobody watching it at all, which is how a finished demo for
   * Lyons Roofing sat unsent for a day and was found only because Sarah asked
   * about that one lead by name (2026-08-27).
   *
   * Same digest rather than a new cron: one daily mail called "what is quietly
   * stuck" is read, and two are not.
   */
  const stalls = await findStalls(db);
  for (const s of stalls) results.slaFlags.push(`${s.severity === 'critical' ? 'STUCK' : 'watch'}: ${s.title}. ${s.detail}`);

  // The heartbeat. Silence from this digest has to mean "checked and clean"
  // rather than "the cron died three weeks ago", so every run stamps the clock
  // whether or not it found anything, and findStalls reports its own staleness.
  await db.from('app_state').upsert({ key: 'stalls:lastRun', value: { at: new Date().toISOString() } });

  if (results.slaFlags.length) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: last } = await db.from('app_state').select('value').eq('key', 'sla:digest').maybeSingle();
    if ((last?.value as { day?: string } | null)?.day !== today) {
      const sent = await sendViaResend({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `SLA: ${results.slaFlags.length} thing${results.slaFlags.length === 1 ? '' : 's'} quietly stuck`,
        text: `The promise keeper found work waiting on a human:\n\n- ${results.slaFlags.join('\n- ')}\n\nDelivery Board: ${SITE.url}/admin/delivery · Front Office: ${SITE.url}/admin/front-office`,
      });
      if (sent.ok) await db.from('app_state').upsert({ key: 'sla:digest', value: { day: today } });
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
