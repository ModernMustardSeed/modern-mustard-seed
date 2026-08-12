import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { CELEBRATE_LAUNCH, daysToLaunch } from '@/data/celebrate';
import { closeWaitlistEntry, listWaitlist, waitlistCounts, type CelebrateEntry } from '@/lib/celebrate-store';
import {
  celebrateDrip,
  celebrateDripEmail,
  FAMILY_TOUCH_COUNT,
  TEAM_TOUCH_COUNT,
  lane,
} from '@/lib/celebrate-drip';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE CELEBRATE DESK.
 *
 *   GET                          waitlist, counts, city demand, and the dry-run
 *                                of what the drip would send today.
 *   GET ?preview=team:2          the actual letter, rendered as HTML in the
 *   GET ?preview=family:0        browser. Sends nothing, ever.
 *   GET ?preview=team:2&at=30    render it as it will read at 30 days to launch.
 *   POST { email, reason }       close a file so the drip stops touching it.
 *
 * ⚠️ PREVIEW SENDS NOTHING and never will. Sarah approves what goes out in her
 * name, and a drip is the one send path she cannot read over the shoulder of,
 * so this is how all ten letters get read before the first one leaves. The
 * preview renders from a real waitlist entry when one exists, so what she sees
 * is what a person receives, not a mock.
 */

const SAMPLE: CelebrateEntry = {
  email: 'dana@example.com',
  business: 'Whitefish Dental',
  audience: 'team',
  city: 'Whitefish',
  people: ['Margaret · MAR 14 · Birthday', 'Kelsey R. · MAY 18 · Work Anniversary'],
  surface: 'countdown',
  createdAt: new Date().toISOString(),
  step: 0,
  lastAt: new Date().toISOString(),
  done: false,
};

export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });

  const url = new URL(req.url);
  const preview = url.searchParams.get('preview');

  if (preview) {
    const [rawLane, rawStep] = preview.split(':');
    const audience = rawLane === 'family' ? 'family' : 'team';
    const touches = audience === 'family' ? FAMILY_TOUCH_COUNT : TEAM_TOUCH_COUNT;
    const step = Math.max(0, Math.min(touches - 1, Number(rawStep) || 0));

    // Render from a real person when we have one in that lane, so the parade
    // line and the first name are the genuine article.
    const entries = await listWaitlist(sb, 200);
    const real = entries.find((e) => e.audience === audience && e.people.length > 0)
      ?? entries.find((e) => e.audience === audience);
    const entry: CelebrateEntry = real ?? { ...SAMPLE, audience };

    // ?at=N renders the letter as it will read N days before launch, which is
    // the only way to proof the "14 days to go" copy in August.
    const atParam = url.searchParams.get('at');
    const now =
      atParam !== null && Number.isFinite(Number(atParam))
        ? new Date(CELEBRATE_LAUNCH.at).getTime() - Number(atParam) * 86400000
        : Date.now();

    const mail = celebrateDripEmail(entry, step, now);
    const spec = lane(audience)[step];
    const banner = `<div style="background:#161616;color:#FBF6EA;font-family:ui-monospace,monospace;font-size:12px;padding:12px 18px;letter-spacing:.08em">PREVIEW ONLY, NOTHING SENT &nbsp;·&nbsp; ${audience} touch ${step + 1} of ${touches} (${spec?.label ?? ''}) &nbsp;·&nbsp; T MINUS ${daysToLaunch(now)} DAYS &nbsp;·&nbsp; TO: ${entry.email} &nbsp;·&nbsp; SUBJECT: ${mail.subject}</div>`;
    return new NextResponse(banner + mail.html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const entries = await listWaitlist(sb);
  const report = await celebrateDrip(sb, { dryRun: true });

  return NextResponse.json({
    ok: true,
    launch: { at: CELEBRATE_LAUNCH.at, label: CELEBRATE_LAUNCH.label, daysToLaunch: daysToLaunch(Date.now()) },
    counts: waitlistCounts(entries),
    touches: { team: TEAM_TOUCH_COUNT, family: FAMILY_TOUCH_COUNT },
    dueToday: report,
    waitlist: entries.slice(0, 200).map((e) => ({
      email: e.email,
      business: e.business,
      audience: e.audience,
      city: e.city,
      people: e.people.length,
      surface: e.surface,
      step: e.step,
      of: lane(e.audience).length,
      createdAt: e.createdAt,
      lastAt: e.lastAt,
      done: e.done,
      doneReason: e.doneReason ?? null,
    })),
  });
}

/** Close a file: they booked, they bought, or they asked to be left alone. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });

  let body: { email?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : 'closed by admin';
  if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });

  const closed = await closeWaitlistEntry(sb, email, reason);
  return NextResponse.json({ ok: closed, error: closed ? undefined : 'not on the waitlist' }, { status: closed ? 200 : 404 });
}
