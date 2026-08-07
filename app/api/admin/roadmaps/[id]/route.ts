import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { deleteRoadmap, setFeatured } from '@/lib/roadmap-store';

export const runtime = 'nodejs';

/** Feature or unfeature a roadmap (featured rows show as worked examples). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { featured?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }
  if (typeof body.featured !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'featured must be a boolean' }, { status: 400 });
  }

  const ok = await setFeatured(id, body.featured);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const ok = await deleteRoadmap(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
