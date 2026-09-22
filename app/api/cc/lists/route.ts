import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { cleanTags, deleteList, listLists, saveList, tagContacts } from '@/lib/client-lists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LISTS, and the bulk tagging that builds them.
 *
 *   GET     every list with how many people are in it and how many can be emailed
 *   save    make or rename one
 *   delete  drop the name, never the people
 *   tag     add or remove tags across everyone selected in the table
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  try {
    return NextResponse.json({ lists: await listLists(sb, account.clientEmail) });
  } catch {
    // The table arrives with migration 140. Before it lands, the room should
    // render without lists rather than show a broken screen.
    return NextResponse.json({ lists: [] });
  }
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author } = got.desk;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  if (action === 'save') {
    const r = await saveList(sb, account.clientEmail, { id: typeof body.id === 'string' ? body.id : null, name: body.name, tags: body.tags, note: body.note, by: author.name });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: r.id, lists: await listLists(sb, account.clientEmail) });
  }

  if (action === 'delete') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Which list?' }, { status: 400 });
    await deleteList(sb, account.clientEmail, id);
    return NextResponse.json({ ok: true, lists: await listLists(sb, account.clientEmail) });
  }

  if (action === 'tag') {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map((i) => String(i));
    const add = cleanTags(body.add);
    const remove = cleanTags(body.remove);
    if (!ids.length) return NextResponse.json({ error: 'Nobody is selected.' }, { status: 400 });
    if (!add.length && !remove.length) return NextResponse.json({ error: 'Name a tag to add or take off.' }, { status: 400 });
    const { changed } = await tagContacts(sb, account.clientEmail, ids, add, remove);
    return NextResponse.json({ ok: true, changed });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
