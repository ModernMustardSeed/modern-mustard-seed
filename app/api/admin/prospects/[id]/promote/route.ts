import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { convertProspectToLead } from '@/lib/prospect-lead';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';

/**
 * Manually promote a prospect into the inbound pipeline (for the reps who want
 * to push a warm prospect into the CRM before it formally books). Good leads
 * also auto-promote on the Booked/Won status change, so this is the "I judge
 * this one is worth chasing now" button. Requires an email on the prospect.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data, error } = await supabase.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;

  if (!prospect.email) {
    return NextResponse.json({ error: 'Add their email first, then send them to the pipeline.' }, { status: 400 });
  }

  const res = await convertProspectToLead(supabase, prospect, { status: prospect.status === 'to-contact' ? 'new' : undefined });
  if (!res.ok) {
    const msg = res.reason === 'no-email' ? 'Add their email first.' : res.error || 'Could not promote.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true, leadId: res.leadId, created: res.created });
}
