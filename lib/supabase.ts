import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/** Server-side Supabase client with service role. Lazy-init to avoid build errors. */
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.supabase_url;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type LeadType = 'build-queue' | 'audit' | 'contact' | 'newsletter';
export type LeadStatus = 'new' | 'replied' | 'booked' | 'won' | 'lost' | 'archived';

export type LeadRow = {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  business_name: string | null;
  idea_description: string | null;
  message: string | null;
  industry: string | null;
  audit_url: string | null;
  audit_score: number | null;
  revenue_range: string | null;
  timeline: string | null;
  suggested_playbook: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadInsert = Omit<Partial<LeadRow>, 'id' | 'created_at' | 'updated_at'> & {
  type: LeadType;
  email: string;
};

/** Best-effort insert. Logs and swallows errors so missing Supabase config never breaks the public site. */
export async function insertLead(lead: LeadInsert): Promise<void> {
  const client = getSupabase();
  if (!client) {
    console.warn('Supabase not configured, skipping lead insert');
    return;
  }
  try {
    const { error } = await client.from('leads').insert(lead);
    if (error) console.error('Supabase insert error:', error);
  } catch (err) {
    console.error('Supabase insert threw:', err);
  }
}
