import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { listContacts, listArchivePosts, tagCounts, contactsCsv, addContact } from '@/lib/client-contacts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE OWNER'S CONTACT BOOK. GET lists everyone with their tags, plus the posts
 * the old provider made; ?format=csv hands the whole book back as a
 * spreadsheet, because it is theirs to take anywhere. POST adds one by hand.
 * Scoped by the signed-in email, and silent when the Command Center is hidden.
 */
export async function GET(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ contacts: null });

  const contacts = await listContacts(sb, project.clientEmail);

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    if (!contacts) return NextResponse.json({ error: 'The contact book is not ready yet.' }, { status: 503 });
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const file = `${project.business.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-contacts-${day}.csv`;
    return new NextResponse(contactsCsv(contacts), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${file}"`,
        'cache-control': 'no-store',
      },
    });
  }

  if (!contacts) return NextResponse.json({ contacts: { ready: false } });
  const posts = (await listArchivePosts(sb, project.clientEmail)) ?? [];
  return NextResponse.json({
    contacts: { ready: true, people: contacts, tags: tagCounts(contacts), posts },
  });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const result = await addContact(sb, project.clientEmail, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, contact: result.contact });
}
