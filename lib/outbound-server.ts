import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/admin-auth';
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
