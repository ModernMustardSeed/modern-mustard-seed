import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * THE SECOND KNOCK (loop audit, break #6, 2026-08-20).
 *
 * The build worker knocks the suite-ready announcement exactly once, inline,
 * as soon as the website is banked. If that knock lost (Resend suppression, an
 * unset secret at the time, a transient failure), the lead was stranded
 * forever, because every gate in the announcement route is a permanent hold
 * with no retry. The route's own comment claimed "the worker knocks again";
 * it did not. Now something does.
 *
 * Daily:
 *  1. RE-KNOCK: leads whose suite is eligible (ready site, an email, no
 *     announcement dedupe row) get the hook knocked again, capped per run. The
 *     announcement route's own gates still decide; this only retries the knock.
 *  2. HELD REPORT to Sarah: suites the hook is holding, and why. Since
 *     2026-09-10 that is the outbound governor rather than a walkthrough film,
 *     so a hold usually means the engine is paused or pacing.
 *
 * Fails closed on CRON_SECRET.
 */
const KNOCK_CAP = 10;

function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });
  const secret = process.env.FORGE_NOTIFY_SECRET;

  const { data: leads } = await db
    .from('outbound_leads')
    .select('id, business_name, email, site_demo_id, site_demo_status')
    .eq('site_demo_status', 'ready')
    .not('email', 'is', null)
    .limit(500);

  const results = { knocked: 0, announced: 0, held: [] as string[], noSecret: !secret };

  for (const l of leads ?? []) {
    // Already announced? The messages row is the dedupe record the route uses.
    const { data: dedupe } = await db
      .from('messages')
      .select('id')
      .eq('outbound_lead_id', l.id)
      .eq('subject', 'Demo suite emailed')
      .limit(1);
    if (dedupe?.length) continue;

    if (!secret || results.knocked >= KNOCK_CAP) continue;
    results.knocked++;
    try {
      const res = await fetch(`${SITE.url}/api/hooks/suite-ready`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: l.site_demo_id }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; held?: string; skipped?: string };
      if (j.ok) results.announced++;
      // A hold is a reason, not a failure: the governor is pacing us, or the
      // page is not presentable. Either way a person should see it once a day.
      else if (j.held) results.held.push(`${l.business_name}: ${j.held}`);
    } catch {
      /* next run tries again; that is the whole point of this cron */
    }
  }

  if (results.held.length || results.noSecret) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: last } = await db.from('app_state').select('value').eq('key', 'suitesweep:digest').maybeSingle();
    if ((last?.value as { day?: string } | null)?.day !== today) {
      const lines = [
        results.noSecret ? 'FORGE_NOTIFY_SECRET is not set in this environment: NO announcement can send until it is.' : null,
        results.held.length
          ? `${results.held.length} finished suite${results.held.length === 1 ? '' : 's'} built and waiting to be announced:\n- ${results.held.slice(0, 40).join('\n- ')}\n\nSend any of them by hand from the prospect card. A hand send steps past the pacing gates.`
          : null,
      ].filter(Boolean);
      const sent = await sendViaResend({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `Suite sweep: ${results.announced} announced, ${results.held.length} waiting`,
        text: lines.join('\n\n'),
      });
      if (sent.ok) await db.from('app_state').upsert({ key: 'suitesweep:digest', value: { day: today } });
    }
  }

  return NextResponse.json({ ok: true, ...results, held: results.held.length });
}
