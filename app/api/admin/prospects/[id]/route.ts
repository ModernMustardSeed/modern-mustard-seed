import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { VALID_STATUSES, type Prospect, type ProspectStatus } from '@/lib/prospects';
import { convertProspectToLead, isGoodLeadStatus } from '@/lib/prospect-lead';

export const runtime = 'nodejs';

/** Update a prospect's status, notes, contact details, etc. When the status
 *  becomes a good lead (Booked or Won), the prospect is auto-promoted into the
 *  inbound pipeline so it joins the digest and follow-up loop. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { status?: string; notes?: string; phone?: string; website?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.has(body.status as never)) return NextResponse.json({ error: 'Bad status' }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 2000) || null;
  if (typeof body.phone === 'string') patch.phone = body.phone.slice(0, 40) || null;
  if (typeof body.website === 'string') patch.website = body.website.trim().slice(0, 300) || null;
  if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase().slice(0, 200) || null;

  try {
    const { data: updated, error } = await supabase
      .from('rep_prospects')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    // Auto-promote to the pipeline the moment a prospect turns into a good lead.
    // Phone-first: a phone OR an email is enough (cold prospects rarely have email).
    let promotion: { promoted: boolean; leadId?: string; needsContact?: boolean } = { promoted: false };
    if (typeof body.status === 'string' && isGoodLeadStatus(body.status as ProspectStatus)) {
      const prospect = updated as Prospect;
      const res = await convertProspectToLead(supabase, prospect);
      if (res.ok) promotion = { promoted: true, leadId: res.leadId };
      else if (res.reason === 'no-contact') promotion = { promoted: false, needsContact: true };
    }

    return NextResponse.json({ ok: true, prospect: updated, ...promotion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not update.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Remove a prospect. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  try {
    const { error } = await supabase.from('rep_prospects').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not delete.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
