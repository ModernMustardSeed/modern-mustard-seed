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

export type OutboundRep = { id: string; name: string; role: string; [k: string]: unknown };

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

/**
 * Which rep is making this request? Unlike `outboundRepScope` (whose scopeRepId is
 * null for owners on purpose), this resolves the signed-in admin to their rep row
 * for ANY role, so presence and "pick up where you left off" work for Sarah and
 * Polly too, not only part-time callers. Same name-substring match the cockpit's
 * rep switcher uses. Returns null when the admin isn't a rep at all.
 */
export async function resolveRequestRep(supabase: SupabaseClient): Promise<OutboundRep | null> {
  const session = await getSession();
  if (!session) return null;
  const me = await resolveAdminUserAsync(session.email);
  const { data } = await supabase.from('outbound_reps').select('*').eq('active', true);
  const reps = (data ?? []) as OutboundRep[];
  return reps.find((r) => me.name.toLowerCase().includes(String(r.name).toLowerCase())) ?? null;
}

/**
 * Fetch EVERY row a query would return, working around PostgREST's `max_rows`
 * cap (1000 by default) which silently truncates `.limit()` / `.range()`. Pass a
 * factory that builds a FRESH, fully filtered + ordered query on each call (a
 * Supabase query builder is single-use). The ordering MUST include a stable
 * tiebreaker (e.g. `.order('id')`) or range paging can skip / duplicate rows.
 */
type Rangeable<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};
export async function fetchAllRows<T>(
  makeQuery: () => Rangeable<T>,
  opts: { page?: number; max?: number } = {},
): Promise<{ data: T[]; error: null } | { data: null; error: { message: string } }> {
  const page = opts.page ?? 1000;
  const max = opts.max ?? 20000; // hard ceiling; guards a runaway loop
  const rows: T[] = [];
  for (let from = 0; from < max; from += page) {
    const { data, error } = await makeQuery().range(from, from + page - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < page) break;
  }
  return { data: rows, error: null };
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
