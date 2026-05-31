import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { isSuppressed, alreadyKnown, CHANNEL_TYPES, type ChannelType } from '@/lib/outreach';

export const runtime = 'nodejs';

/** List prospects with their drafted messages, plus pipeline counts. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const [{ data: prospects }, { data: messages }] = await Promise.all([
      supabase.from('prospects').select('*').order('updated_at', { ascending: false }),
      supabase.from('outreach_messages').select('*').order('touch', { ascending: true }),
    ]);

    const byProspect: Record<string, unknown[]> = {};
    for (const m of messages ?? []) (byProspect[m.prospect_id as string] ||= []).push(m);

    const rows = (prospects ?? []).map((p) => ({ ...p, messages: byProspect[p.id as string] ?? [] }));

    const counts: Record<string, number> = {};
    for (const p of prospects ?? []) counts[p.status as string] = (counts[p.status as string] ?? 0) + 1;

    return NextResponse.json({ prospects: rows, counts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg, prospects: [], needsMigration: true }, { status: 500 });
  }
}

/** Add a prospect. Blocks suppressed contacts, existing affiliates, and dupes. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { name?: string; channel?: string; contact?: string; channel_type?: string; tier?: number; source?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 160);
  const contact = (body.contact ?? '').trim().toLowerCase().slice(0, 200);
  if (!name) return NextResponse.json({ error: 'Add a name.' }, { status: 400 });

  if (contact) {
    if (await isSuppressed(contact)) return NextResponse.json({ error: 'That contact opted out. Skipping by design.' }, { status: 409 });
    const known = await alreadyKnown(contact);
    if (known === 'affiliate') return NextResponse.json({ error: 'Already a partner. No need to recruit.' }, { status: 409 });
    if (known === 'prospect') return NextResponse.json({ error: 'Already in your prospect list.' }, { status: 409 });
  }

  const channel_type = (CHANNEL_TYPES as readonly string[]).includes(body.channel_type ?? '') ? (body.channel_type as ChannelType) : 'email';
  const tier = Math.min(4, Math.max(1, Number(body.tier) || 2));

  try {
    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name,
        channel: (body.channel ?? '').slice(0, 300),
        contact: contact || null,
        channel_type,
        tier,
        source: (body.source ?? '').slice(0, 120) || null,
        notes: (body.notes ?? '').slice(0, 4000) || null,
        status: 'new',
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, prospect: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
