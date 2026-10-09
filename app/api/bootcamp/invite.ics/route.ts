import { NextResponse } from 'next/server';
import { SITE } from '@/lib/seo';
import { bootcampInvite, isInviteWhich } from '@/lib/bootcamp/ics';
import { regKeyValid, roomLink } from '@/lib/bootcamp/key';

/**
 * The calendar file behind every "add it to my calendar" link. Public and
 * cacheable: the dates come from data/bootcamp.ts and change only with a
 * deploy. An optional email puts the person on the ATTENDEE line so their
 * calendar files it as an invitation addressed to them. A signed id and key
 * (the links in every letter carry them) put the person's own room link in
 * the event, so the calendar entry is the way into the session.
 */

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const which = url.searchParams.get('which') || 'kickoff';
  if (!isInviteWhich(which)) return NextResponse.json({ error: 'unknown_invite' }, { status: 404 });

  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const name = (url.searchParams.get('name') || '').trim().slice(0, 80);
  const attendee = EMAIL_RE.test(email) ? { email, name: name || null } : undefined;

  const id = (url.searchParams.get('id') || '').trim();
  const room = UUID_RE.test(id) && regKeyValid(id, url.searchParams.get('k')) ? roomLink(SITE.url, id) : null;

  const { filename, ics } = bootcampInvite(which, attendee, room);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': attendee || room ? 'private, no-store' : 'public, max-age=3600',
    },
  });
}
