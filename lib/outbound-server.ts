import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession, resolveAdminUserAsync } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import type { ZodType } from 'zod';

/**
 * Shared guards for the /api/admin/outbound routes: admin session + a
 * configured service-role Supabase client, with the repo's error shape.
 */
export async function requireOutboundAdmin(): Promise<{ supabase: SupabaseClient } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const supabase = getSupabase();
  if (!supabase) return { error: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) };
  return { supabase };
}

type OutboundRep = { id: string; name: string; role: string; [k: string]: unknown };

/**
 * Resolve who is looking at the dial floor. A rep whose role is 'caller' (e.g. a
 * part-time helper) is scoped to ONLY their own leads and their own dashboard, so
 * they are not buried in the whole team's 1,000-lead queue. Owners / primary reps
 * see the full shared floor exactly as before. Matches the logged-in admin name to
 * a rep the same way the cockpit's rep switcher does.
 */
export async function outboundRepScope(
  supabase: SupabaseClient,
): Promise<{ reps: OutboundRep[]; scopeRepId: string | null; isCaller: boolean }> {
  const [session, repsRes] = await Promise.all([
    getSession(),
    supabase.from('outbound_reps').select('*').eq('active', true).order('name'),
  ]);
  const reps = (repsRes.data ?? []) as OutboundRep[];
  const me = session ? await resolveAdminUserAsync(session.email) : null;
  const myRep = me ? reps.find((r) => me.name.toLowerCase().includes(String(r.name).toLowerCase())) : null;
  const isCaller = !!myRep && myRep.role === 'caller';
  return {
    reps: isCaller ? [myRep as OutboundRep] : reps,
    scopeRepId: isCaller ? (myRep as OutboundRep).id : null,
    isCaller,
  };
}

/** Parse a JSON body against a zod schema. Returns data or a 400 response. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: NextResponse.json({ error: 'Invalid request' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first.path.length ? ` (${first.path.join('.')})` : '';
    return { error: NextResponse.json({ error: `${first.message}${where}` }, { status: 400 }) };
  }
  return { data: parsed.data };
}
