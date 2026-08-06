import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { setItemDone } from '@/lib/golive';

export const runtime = 'nodejs';

/** Toggle a runbook item from the admin UI. Agents use scripts/golive-check.mjs instead. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { slug?: string; itemId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }
  if (!body.slug || !body.itemId || typeof body.done !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const done = await setItemDone(body.slug, body.itemId, body.done, user.email);
  if (!done) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, done });
}
