import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { deleteProspect, getProspect, isStatus, logEvent, updateProspect, type ProspectInput, type ProspectStatus } from '@/lib/partner-desk/store';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Edit a prospect: fields, notes, or a status set by hand (replied, joined, passed, dm_sent). */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  let body: Partial<ProspectInput> & { status?: ProspectStatus; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const current = await getProspect(id);
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const patch: Parameters<typeof updateProspect>[1] = { ...body };
    delete (patch as { note?: string }).note;
    if (isStatus(body.status) && body.status !== current.status) {
      // A human answer or a human decision ends the follow-up clock.
      if (['replied', 'joined', 'passed'].includes(body.status)) patch.next_at = null;
      if (body.status === 'dm_sent') patch.last_contacted_at = new Date().toISOString();
      await logEvent(id, { type: 'status', detail: `${current.status} to ${body.status}` });
    } else {
      delete patch.status;
    }
    if (typeof body.note === 'string' && body.note.trim()) {
      await logEvent(id, { type: 'note', detail: body.note.trim().slice(0, 1000) });
    }
    const updated = await updateProspect(id, patch);
    return NextResponse.json({ prospect: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not update' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await deleteProspect(id);
  return NextResponse.json({ ok: true });
}
