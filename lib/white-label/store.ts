import { getSupabase } from '@/lib/supabase';
import { wlSlug } from '@/lib/white-label/key';

/**
 * The white label book: agencies and the clients they sell. Service role
 * only (RLS on, no policies). Migration 153.
 */

export type AgencyStatus = 'applied' | 'approved' | 'active' | 'paused' | 'declined';
export type ClientStatus = 'submitted' | 'building' | 'review' | 'live' | 'paused' | 'cancelled';

export type Agency = {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  color: string | null;
  logo_url: string | null;
  client_count: string | null;
  sells: string | null;
  status: AgencyStatus;
  founding: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  source: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WlClient = {
  id: string;
  agency_id: string;
  business: string;
  website: string | null;
  city: string | null;
  contact_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  transfer_number: string | null;
  test_number: string | null;
  hours: string | null;
  services_text: string | null;
  lines: string[];
  status: ClientStatus;
  stripe_items: Record<string, string>;
  notes: string | null;
  agency_approved_at: string | null;
  live_at: string | null;
  /** The Vapi assistant that answers for this client (migration 158). */
  vapi_assistant_id: string | null;
  /** The receptionist's name, as callers hear it. */
  agent_name: string | null;
  /** The office's own marks: { "<vapi call id>": "<iso time handled>" }. */
  desk_handled: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export const AGENCY_STATUSES: AgencyStatus[] = ['applied', 'approved', 'active', 'paused', 'declined'];
export const CLIENT_STATUSES: ClientStatus[] = ['submitted', 'building', 'review', 'live', 'paused', 'cancelled'];

function db() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  return sb;
}

/** A slug nobody else holds: "northfork-creative", then "northfork-creative-2". */
async function freeSlug(name: string): Promise<string> {
  const base = wlSlug(name) || 'agency';
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { data } = await db().from('white_label_agencies').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createAgency(input: Partial<Agency> & { name: string; email: string }): Promise<Agency> {
  // One row per address: a second application updates the first instead of duplicating it.
  const { data: prior } = await db().from('white_label_agencies').select('*').ilike('email', input.email.trim()).limit(1);
  if (prior?.[0]) {
    const { data, error } = await db()
      .from('white_label_agencies')
      .update({ ...strip(input), updated_at: new Date().toISOString() })
      .eq('id', prior[0].id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Agency;
  }
  const slug = await freeSlug(input.name);
  const { data, error } = await db()
    .from('white_label_agencies')
    .insert({ ...strip(input), slug, email: input.email.trim().toLowerCase() })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Agency;
}

function strip<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && !['id', 'slug', 'created_at'].includes(k)) out[k] = v;
  return out as Partial<T>;
}

export async function getAgency(id: string): Promise<Agency | null> {
  const { data } = await db().from('white_label_agencies').select('*').eq('id', id).maybeSingle();
  return (data as Agency) ?? null;
}

export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const { data } = await db().from('white_label_agencies').select('*').eq('slug', slug).maybeSingle();
  return (data as Agency) ?? null;
}

export async function listAgencies(): Promise<Agency[]> {
  const { data } = await db().from('white_label_agencies').select('*').order('created_at', { ascending: false }).limit(200);
  return (data as Agency[]) ?? [];
}

export async function updateAgency(id: string, patch: Partial<Agency>): Promise<Agency> {
  const { data, error } = await db()
    .from('white_label_agencies')
    .update({ ...strip(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Agency;
}

export async function createClient(input: Partial<WlClient> & { agency_id: string; business: string }): Promise<WlClient> {
  const { data, error } = await db().from('white_label_clients').insert(strip(input)).select('*').single();
  if (error) throw new Error(error.message);
  return data as WlClient;
}

export async function getClient(id: string): Promise<WlClient | null> {
  const { data } = await db().from('white_label_clients').select('*').eq('id', id).maybeSingle();
  return (data as WlClient) ?? null;
}

export async function listClients(agencyId?: string): Promise<WlClient[]> {
  let q = db().from('white_label_clients').select('*').order('created_at', { ascending: false }).limit(500);
  if (agencyId) q = q.eq('agency_id', agencyId);
  const { data } = await q;
  return (data as WlClient[]) ?? [];
}

export async function updateClient(id: string, patch: Partial<WlClient>): Promise<WlClient> {
  const { data, error } = await db()
    .from('white_label_clients')
    .update({ ...strip(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as WlClient;
}

export async function getClientByAssistant(assistantId: string): Promise<WlClient | null> {
  const { data } = await db().from('white_label_clients').select('*').eq('vapi_assistant_id', assistantId).maybeSingle();
  return (data as WlClient) ?? null;
}
