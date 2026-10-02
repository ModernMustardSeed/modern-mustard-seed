import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { wlClean, wlColor, wlSample } from '@/data/white-label';
import { wlLinks, wlSlug } from '@/lib/white-label/key';

export const runtime = 'nodejs';

/**
 * Prep a meeting: mint an agency's signed demo and price sheet links, and keep
 * the agency on the desk (app_state `white-label:agency:<slug>`) so Sarah can
 * find the links again on the morning of the meeting.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  const agency = wlClean(body.agency);
  if (agency.length < 2) return NextResponse.json({ error: 'Agency name is required.' }, { status: 400 });

  const prep = {
    agency,
    color: wlColor(body.color),
    city: wlClean(body.city) || 'Kalispell',
    sample: wlSample(body.sample).id,
    site: wlClean(body.site, 200),
    contact: wlClean(body.contact, 80),
    meetingAt: wlClean(body.meetingAt, 40),
    notes: wlClean(body.notes, 600),
    updatedAt: new Date().toISOString(),
  };

  const links = wlLinks(SITE.url, prep);
  if (!links.sheet) return NextResponse.json({ error: 'ADMIN_SESSION_SECRET is missing, so no key can be signed.' }, { status: 500 });

  const db = getSupabase();
  if (db) {
    const { error } = await db
      .from('app_state')
      .upsert({ key: `white-label:agency:${wlSlug(agency)}`, value: prep, updated_at: prep.updatedAt });
    if (error) console.error('white label prep save failed', error.message);
  }

  return NextResponse.json({ ok: true, prep, links });
}

export async function DELETE(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const slug = new URL(req.url).searchParams.get('slug') || '';
  const db = getSupabase();
  if (!db || !/^[a-z0-9-]{1,60}$/.test(slug)) return NextResponse.json({ error: 'bad_slug' }, { status: 400 });
  await db.from('app_state').delete().eq('key', `white-label:agency:${slug}`);
  return NextResponse.json({ ok: true });
}
