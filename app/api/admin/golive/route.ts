import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { addExtraItem, createRunbook, createStandardLaunch, setItemDone, type GoliveWho } from '@/lib/golive';
import type { LaunchFacts } from '@/data/launch-standard';

export const runtime = 'nodejs';

/**
 * Create a runbook from the hub's Add A Project form.
 *
 * With a clientEmail and facts it creates THE STANDARD LAUNCH instead: the
 * checklist for a business with no Google Business Profile yet, split into our
 * steps and theirs, with their half showing up in their portal. That is the
 * default shape for a client launch now, because it is the shape almost every
 * one of them has.
 */
export async function PUT(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: {
    title?: string;
    repo_path?: string;
    prod_url?: string;
    kind?: 'ours' | 'client';
    clientEmail?: string;
    facts?: LaunchFacts;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }
  if (!body.title?.trim()) return NextResponse.json({ ok: false, error: 'title required' }, { status: 400 });

  if (body.clientEmail?.trim() && body.facts?.business) {
    const slug = await createStandardLaunch({
      title: body.title,
      clientEmail: body.clientEmail,
      facts: body.facts,
      repo_path: body.repo_path,
      prod_url: body.prod_url,
    });
    if (!slug) return NextResponse.json({ ok: false, error: 'create failed' }, { status: 500 });
    return NextResponse.json({ ok: true, slug, standard: true });
  }

  const slug = await createRunbook(body as Parameters<typeof createRunbook>[0]);
  if (!slug) return NextResponse.json({ ok: false, error: 'create failed' }, { status: 500 });
  return NextResponse.json({ ok: true, slug });
}

const WHO: GoliveWho[] = ['You', 'Claude', 'Client'];

/** Add a hand-written step to a runbook group. Survives rescans. */
export async function PATCH(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { slug?: string; group?: string; who?: GoliveWho; what?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }
  if (!body.slug || !body.group || !body.what?.trim() || !WHO.includes(body.who as GoliveWho)) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const item = await addExtraItem(body.slug, body.group, body.who as GoliveWho, body.what);
  if (!item) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

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
