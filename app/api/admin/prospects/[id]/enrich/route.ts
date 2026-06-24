import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { enrichProspect } from '@/lib/enrich';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';
export const maxDuration = 45;

/**
 * Find a prospect's website, phone, and contact email from its name + city, so
 * the rep never has to search. Fills blanks (never overwrites a website or phone
 * the row already has) and returns what it found. The client then auto-runs the
 * audit on the discovered website.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data, error } = await supabase.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;

  const found = await enrichProspect({
    business: prospect.business,
    city: prospect.city,
    website: prospect.website,
    phone: prospect.phone,
  });

  // Persist only the blanks we filled. Email always updates if we found one and
  // the row has none, so the rep can email straight from the card.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!prospect.website && found.website) patch.website = found.website;
  if (!prospect.phone && found.phone) patch.phone = found.phone;
  if (!prospect.email && found.email) patch.email = found.email;

  let saved = prospect;
  if (Object.keys(patch).length > 1) {
    const { data: updated, error: updErr } = await supabase.from('rep_prospects').update(patch).eq('id', id).select('*').single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    saved = updated as Prospect;
  }

  return NextResponse.json({
    ok: true,
    website: saved.website,
    email: saved.email,
    phone: saved.phone,
    found,
  });
}
