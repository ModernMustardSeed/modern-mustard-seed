/** Admin: change an agency's status, founding flag or notes. Approving sends the welcome. */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getAgency, updateAgency, AGENCY_STATUSES, type AgencyStatus } from '@/lib/white-label/store';
import { approveAgency } from '@/lib/white-label/actions';

export const runtime = 'nodejs';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const a = await getAgency(id);
  if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { status?: AgencyStatus; founding?: boolean; notes?: string };
  try {
    if (b.status === 'approved' && (a.status === 'applied' || a.status === 'declined')) {
      return NextResponse.json({ ok: true, agency: await approveAgency(id) });
    }
    const patch: Record<string, unknown> = {};
    if (b.status && AGENCY_STATUSES.includes(b.status)) patch.status = b.status;
    if (typeof b.founding === 'boolean') patch.founding = b.founding;
    if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 2000);
    return NextResponse.json({ ok: true, agency: await updateAgency(id, patch) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save.' }, { status: 500 });
  }
}
