/**
 * Persistent cross-call memory for the voice agents (Mr. Mustard et al.).
 *
 * A caller is keyed by phone (inbound calls carry call.customer.number) or by
 * email (web calls have no number, so identity comes from the email they give).
 * The agent reads this at the start of a call (recall_caller tool) to recognize
 * returning callers, and writes it on booking / lead capture and at end-of-call.
 *
 * Every function degrades gracefully: if Supabase is unconfigured or the
 * voice_caller_memory table does not exist yet (migration 028 not run), reads
 * return null and writes no-op, so nothing here can break a live call.
 *
 * Table: see supabase/migrations/028_voice_caller_memory.sql.
 */

import { getSupabase } from '@/lib/supabase';

export type CallerMemory = {
  name?: string | null;
  business?: string | null;
  pain_summary?: string | null;
  last_summary?: string | null;
  booked?: boolean | null;
  call_count?: number | null;
  last_called_at?: string | null;
};

const TABLE = 'voice_caller_memory';

const clean = (s?: string | null) => (s ? s.trim() : '');
/** Keep digits and a leading +, so "+1 (406) 555-1212" and "+14065551212" match. */
const normPhone = (s?: string | null): string | null => {
  const c = clean(s).replace(/[^\d+]/g, '');
  return c.length >= 7 ? c : null; // ignore junk like "Web call" or empty
};
const normEmail = (s?: string | null): string | null => {
  const c = clean(s).toLowerCase();
  return c.includes('@') ? c : null;
};

type Existing = { id: string; call_count: number | null };

/** Find the existing memory row by phone, then by email. null = no match / unavailable. */
async function findRow(
  client: ReturnType<typeof getSupabase>,
  phone: string | null,
  email: string | null,
): Promise<Existing | null> {
  if (!client) return null;
  if (phone) {
    const { data, error } = await client.from(TABLE).select('id,call_count').eq('phone', phone).limit(1);
    if (!error && data && data[0]) return data[0] as Existing;
  }
  if (email) {
    const { data, error } = await client.from(TABLE).select('id,call_count').eq('email', email).limit(1);
    if (!error && data && data[0]) return data[0] as Existing;
  }
  return null;
}

/** Read a caller's memory by phone or email. Returns null when unknown/unavailable. */
export async function recallCaller(args: {
  phone?: string | null;
  email?: string | null;
}): Promise<CallerMemory | null> {
  const client = getSupabase();
  if (!client) return null;
  const phone = normPhone(args.phone);
  const email = normEmail(args.email);
  if (!phone && !email) return null;
  try {
    if (phone) {
      const { data, error } = await client
        .from(TABLE)
        .select('name,business,pain_summary,last_summary,booked,call_count,last_called_at')
        .eq('phone', phone)
        .order('last_called_at', { ascending: false })
        .limit(1);
      if (!error && data && data[0]) return data[0] as CallerMemory;
    }
    if (email) {
      const { data, error } = await client
        .from(TABLE)
        .select('name,business,pain_summary,last_summary,booked,call_count,last_called_at')
        .eq('email', email)
        .order('last_called_at', { ascending: false })
        .limit(1);
      if (!error && data && data[0]) return data[0] as CallerMemory;
    }
    return null;
  } catch (err) {
    console.error('recallCaller failed', err);
    return null;
  }
}

/** Upsert structured facts learned from a tool call (booking / lead capture). */
export async function rememberFromTool(args: {
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  business?: string | null;
  pain?: string | null;
  booked?: boolean;
}): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const phone = normPhone(args.phone);
  const email = normEmail(args.email);
  if (!phone && !email) return;
  try {
    const existing = await findRow(client, phone, email);
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: nowIso, last_called_at: nowIso };
    if (phone) patch.phone = phone;
    if (email) patch.email = email;
    if (clean(args.name)) patch.name = clean(args.name);
    if (clean(args.business)) patch.business = clean(args.business);
    if (clean(args.pain)) patch.pain_summary = clean(args.pain).slice(0, 1000);
    if (args.booked) patch.booked = true;

    if (existing) {
      await client.from(TABLE).update(patch).eq('id', existing.id);
    } else {
      await client.from(TABLE).insert({ ...patch, call_count: 0 });
    }
  } catch (err) {
    console.error('rememberFromTool failed', err);
  }
}

/** Store the end-of-call summary and count the call. Keyed by phone (or email). */
export async function rememberSummary(args: {
  phone?: string | null;
  email?: string | null;
  summary?: string | null;
}): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const phone = normPhone(args.phone);
  const email = normEmail(args.email);
  if (!phone && !email) return;
  const summary = clean(args.summary).slice(0, 2000);
  try {
    const existing = await findRow(client, phone, email);
    const nowIso = new Date().toISOString();
    if (existing) {
      await client
        .from(TABLE)
        .update({
          ...(summary ? { last_summary: summary } : {}),
          last_called_at: nowIso,
          updated_at: nowIso,
          call_count: (existing.call_count ?? 0) + 1,
        })
        .eq('id', existing.id);
    } else {
      await client.from(TABLE).insert({
        phone: phone || null,
        email: email || null,
        last_summary: summary || null,
        call_count: 1,
        last_called_at: nowIso,
        updated_at: nowIso,
      });
    }
  } catch (err) {
    console.error('rememberSummary failed', err);
  }
}

export type CallerRow = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  business: string | null;
  pain_summary: string | null;
  last_summary: string | null;
  booked: boolean | null;
  call_count: number | null;
  first_called_at: string | null;
  last_called_at: string | null;
};

export type CallerListResult = {
  ok: boolean;
  rows: CallerRow[];
  /** 'no-supabase' | 'table-missing' | 'error' when ok is false. */
  reason?: string;
};

/** List caller memories, most recent contact first. Distinguishes a missing table. */
export async function listCallerMemory(limit = 300): Promise<CallerListResult> {
  const client = getSupabase();
  if (!client) return { ok: false, rows: [], reason: 'no-supabase' };
  try {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id,phone,email,name,business,pain_summary,last_summary,booked,call_count,first_called_at,last_called_at',
      )
      .order('last_called_at', { ascending: false })
      .limit(limit);
    if (error) {
      // 42P01 = undefined_table (migration 028 not run yet).
      const reason = /relation .* does not exist|42P01/i.test(JSON.stringify(error))
        ? 'table-missing'
        : 'error';
      return { ok: false, rows: [], reason };
    }
    return { ok: true, rows: (data ?? []) as CallerRow[] };
  } catch (err) {
    console.error('listCallerMemory failed', err);
    return { ok: false, rows: [], reason: 'error' };
  }
}
