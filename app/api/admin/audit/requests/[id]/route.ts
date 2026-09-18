import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { cleanListing } from '@/lib/audit-requests';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * Save what Sarah read off their Google listing, or decline / reopen a request.
 * Only the listing facts and the status are writable here: what the visitor
 * typed stays as they gave it, apart from a corrected business name or website.
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = cleanListing(body);
  if (body.website && !patch.website) {
    return NextResponse.json({ error: 'That website does not look like a real address.' }, { status: 400 });
  }
  if (body.status === 'declined' || body.status === 'new') patch.status = body.status;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });

  const { data, error } = await guard.supabase.from('audit_requests').update(patch).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Request not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, request: data });
}
