import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { readSnapshot, publishSnapshot, setSnapshotPublished } from '@/lib/build-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function status(s: { published: boolean; snapshot: { publishedAt: string } | null }) {
  return { published: s.published, publishedAt: s.snapshot?.publishedAt ?? null };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(status(await readSnapshot()));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  try {
    if (body.action === 'publish') return NextResponse.json(status(await publishSnapshot()));
    if (body.action === 'unpublish') return NextResponse.json(status(await setSnapshotPublished(false)));
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
