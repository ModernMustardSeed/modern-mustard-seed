import { NextResponse } from 'next/server';
import { bootcampInvite, isInviteWhich } from '@/lib/bootcamp/ics';

/**
 * The calendar file behind every "add it to my calendar" link. Public and
 * cacheable: the dates come from data/bootcamp.ts and change only with a
 * deploy. An optional email puts the person on the ATTENDEE line so their
 * calendar files it as an invitation addressed to them.
 */

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const which = url.searchParams.get('which') || 'kickoff';
  if (!isInviteWhich(which)) return NextResponse.json({ error: 'unknown_invite' }, { status: 404 });

  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const name = (url.searchParams.get('name') || '').trim().slice(0, 80);
  const attendee = EMAIL_RE.test(email) ? { email, name: name || null } : undefined;

  const { filename, ics } = bootcampInvite(which, attendee);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': attendee ? 'private, no-store' : 'public, max-age=3600',
    },
  });
}
