import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { itemDone, progressOf, runbookForClient, setClientItemDone } from '@/lib/golive';
import { clientItems } from '@/data/launch-standard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE CLIENT'S HALF OF THEIR OWN LAUNCH.
 *
 * Same runbook we work from in /admin/golive, filtered to the steps only the
 * owner can do: claiming the Google profile, the video verification, the first
 * photographs, the first reviews. They tick against the same rows, so the
 * moment they finish one it is finished on our board too.
 *
 * They are never shown our half. A client reading a list of keys, deploys and
 * indexing jobs learns nothing and worries about all of it.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rb = await runbookForClient(session.email);
  if (!rb) return NextResponse.json({ launch: null });

  const p = progressOf(rb);
  return NextResponse.json({
    launch: {
      title: rb.title,
      siteUrl: rb.prod_url,
      updatedAt: rb.updated_at,
      /* yoursDone/yoursTotal counts You + Client, which is the wrong denominator
         for a client screen. Theirs is counted here from their items alone. */
      groups: clientItems(rb.data).map((g) => ({
        name: g.group,
        note: g.note,
        items: g.items.map((i) => ({
          id: i.id,
          what: i.what,
          how: i.how ?? null,
          href: i.href ?? null,
          label: i.label ?? null,
          done: itemDone(rb, i),
          doneAt: rb.done[i.id]?.at ?? null,
        })),
      })),
      overall: { done: p.done, total: p.total },
    },
  });
}

/** Tick one of their own steps. The library refuses anything they do not own. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { itemId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON.' }, { status: 400 });
  }
  if (!body.itemId || typeof body.done !== 'boolean') {
    return NextResponse.json({ error: 'itemId and done are required.' }, { status: 400 });
  }

  const next = await setClientItemDone(session.email, body.itemId, body.done);
  if (!next) return NextResponse.json({ error: 'That is not one of your steps.' }, { status: 404 });
  return NextResponse.json({ ok: true, done: Boolean(next[body.itemId]) });
}
