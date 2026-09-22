import { getSupabase } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/client-auth';

/**
 * THE PARTNER DESK, the book side.
 *
 * One row per person we want as a partner (migration 138). Everything here is a
 * plain read or write on that table; the letters live in ./letters.ts and the
 * finder in ./discover.ts. Nothing in this file sends mail.
 */

export type ProspectKind = 'creator' | 'referral' | 'community';
export type ProspectStatus = 'queued' | 'emailed' | 'dm_sent' | 'replied' | 'joined' | 'passed';
export type CreatorTier = 'mega' | 'macro' | 'mid' | 'micro';

export const KIND_LABEL: Record<ProspectKind, string> = {
  creator: 'Creators',
  referral: 'Referral pros',
  community: 'Communities',
};

export const KIND_BLURB: Record<ProspectKind, string> = {
  creator: 'YouTube, Instagram, TikTok and newsletter people whose audience runs a business.',
  referral: 'Bookkeepers, insurance agents, commercial realtors, sign shops, printers, coaches, SBDC counselors. People who meet a new owner every week.',
  community: 'Chambers, networking circles, church business ministries, Facebook group admins. One introduction reaches a room.',
};

export type ProspectEvent = {
  ts: number;
  type: 'email' | 'dm' | 'status' | 'note';
  detail: string;
};

export type Prospect = {
  id: string;
  name: string;
  kind: ProspectKind;
  handle: string | null;
  platform: string | null;
  niche: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  x: string | null;
  linkedin: string | null;
  followers: number | null;
  tier: CreatorTier | null;
  source: string;
  status: ProspectStatus;
  step: number;
  notes: string | null;
  last_contacted_at: string | null;
  next_at: string | null;
  history: ProspectEvent[];
  affiliate_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectInput = Partial<Omit<Prospect, 'id' | 'created_at' | 'updated_at' | 'history'>> & { name: string };

const TABLE = 'partner_prospects';
const KINDS: ProspectKind[] = ['creator', 'referral', 'community'];
const STATUSES: ProspectStatus[] = ['queued', 'emailed', 'dm_sent', 'replied', 'joined', 'passed'];

export function tierFor(followers?: number | null): CreatorTier | null {
  const f = followers || 0;
  if (f >= 1_000_000) return 'mega';
  if (f >= 100_000) return 'macro';
  if (f >= 10_000) return 'mid';
  if (f > 0) return 'micro';
  return null;
}

export function isKind(v: unknown): v is ProspectKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

export function isStatus(v: unknown): v is ProspectStatus {
  return typeof v === 'string' && (STATUSES as string[]).includes(v);
}

const bareHandle = (h?: string | null) => (h || '').trim().replace(/^@/, '').toLowerCase();

/** A due follow-up: a letter went out, nobody answered, and the next one is due. */
export function followUpDue(p: Prospect, now = Date.now()): boolean {
  return p.status === 'emailed' && !!p.next_at && new Date(p.next_at).getTime() <= now;
}

function clean(input: ProspectInput): Record<string, unknown> {
  const s = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const email = typeof input.email === 'string' && input.email.trim() ? normalizeEmail(input.email) : null;
  const followers = typeof input.followers === 'number' && Number.isFinite(input.followers) ? Math.max(0, Math.round(input.followers)) : null;
  return {
    name: (input.name || '').trim().slice(0, 160),
    kind: isKind(input.kind) ? input.kind : 'creator',
    handle: s(input.handle, 120),
    platform: s(input.platform, 60),
    niche: s(input.niche, 200),
    email,
    website: s(input.website, 300),
    instagram: s(input.instagram, 120),
    tiktok: s(input.tiktok, 120),
    youtube: s(input.youtube, 300),
    x: s(input.x, 120),
    linkedin: s(input.linkedin, 300),
    followers,
    tier: tierFor(followers),
    source: s(input.source, 40) || 'manual',
    notes: s(input.notes, 4000),
  };
}

/** Same person twice: same email, or same handle on any platform, or same channel URL. */
export function findDuplicate(existing: Prospect[], cand: ProspectInput): Prospect | undefined {
  const email = cand.email ? normalizeEmail(cand.email) : '';
  const handles = new Set(
    [cand.handle, cand.instagram, cand.tiktok, cand.x].map(bareHandle).filter(Boolean)
  );
  const yt = (cand.youtube || '').trim().toLowerCase();
  return existing.find((p) => {
    if (email && p.email && normalizeEmail(p.email) === email) return true;
    if (yt && p.youtube && p.youtube.trim().toLowerCase() === yt) return true;
    for (const h of [p.handle, p.instagram, p.tiktok, p.x].map(bareHandle)) if (h && handles.has(h)) return true;
    return false;
  });
}

export async function listProspects(): Promise<Prospect[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from(TABLE).select('*').order('created_at', { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Prospect[];
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
  return (data as Prospect) ?? null;
}

export async function createProspect(input: ProspectInput): Promise<Prospect> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database not configured');
  const row = clean(input);
  if (!row.name) throw new Error('A name is required');
  const { data, error } = await sb.from(TABLE).insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as Prospect;
}

/** Add many at once, skipping anyone already in the book. Returns what was added and what was skipped. */
export async function bulkCreateProspects(inputs: ProspectInput[]): Promise<{ added: Prospect[]; skipped: string[] }> {
  const existing = await listProspects();
  const added: Prospect[] = [];
  const skipped: string[] = [];
  for (const input of inputs) {
    if (!input.name?.trim()) continue;
    if (findDuplicate(existing, input) || findDuplicate(added, input)) {
      skipped.push(input.name.trim());
      continue;
    }
    const p = await createProspect(input);
    added.push(p);
  }
  return { added, skipped };
}

export async function updateProspect(id: string, patch: Partial<ProspectInput> & { status?: ProspectStatus; step?: number; last_contacted_at?: string | null; next_at?: string | null; affiliate_id?: string | null }): Promise<Prospect | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = clean({ name: patch.name || 'x', ...patch });
  for (const k of ['kind', 'handle', 'platform', 'niche', 'email', 'website', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'followers', 'tier', 'notes'] as const) {
    if (k in patch) row[k] = fields[k];
  }
  if (typeof patch.name === 'string' && patch.name.trim()) row.name = patch.name.trim().slice(0, 160);
  if (isStatus(patch.status)) row.status = patch.status;
  if (typeof patch.step === 'number') row.step = patch.step;
  if ('last_contacted_at' in patch) row.last_contacted_at = patch.last_contacted_at;
  if ('next_at' in patch) row.next_at = patch.next_at;
  if ('affiliate_id' in patch) row.affiliate_id = patch.affiliate_id;
  const { data, error } = await sb.from(TABLE).update(row).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as Prospect;
}

export async function logEvent(id: string, ev: Omit<ProspectEvent, 'ts'>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const current = await getProspect(id);
  if (!current) return;
  const history = [...(current.history || []), { ...ev, ts: Date.now() }].slice(-60);
  await sb.from(TABLE).update({ history, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteProspect(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLE).delete().eq('id', id);
}

/** When someone we wrote to applies on /partners, the book marks them joined on its own. */
export async function markJoinedByEmail(email: string, affiliateId?: string | null): Promise<void> {
  const sb = getSupabase();
  if (!sb || !email) return;
  const { data } = await sb.from(TABLE).select('id, status, history').ilike('email', normalizeEmail(email)).limit(1);
  const row = data?.[0] as { id: string; status: string; history: ProspectEvent[] } | undefined;
  if (!row || row.status === 'joined') return;
  const history = [...(row.history || []), { ts: Date.now(), type: 'status', detail: 'Applied on /partners' }].slice(-60);
  await sb
    .from(TABLE)
    .update({ status: 'joined', next_at: null, history, affiliate_id: affiliateId ?? null, updated_at: new Date().toISOString() })
    .eq('id', row.id);
}

/** Header numbers for the desk. */
export function summarize(rows: Prospect[]) {
  const now = Date.now();
  return {
    total: rows.length,
    queued: rows.filter((p) => p.status === 'queued').length,
    due: rows.filter((p) => followUpDue(p, now)).length,
    waiting: rows.filter((p) => (p.status === 'emailed' || p.status === 'dm_sent') && !followUpDue(p, now)).length,
    replied: rows.filter((p) => p.status === 'replied').length,
    joined: rows.filter((p) => p.status === 'joined').length,
  };
}

/** Parse a pasted CSV: name,email,kind,handle,platform,followers,niche,website. Header row optional. */
export function parseCsv(text: string): ProspectInput[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  let cols = ['name', 'email', 'kind', 'handle', 'platform', 'followers', 'niche', 'website'];
  const first = split(lines[0]).map((c) => c.toLowerCase());
  if (first.includes('name') && (first.includes('email') || first.includes('handle'))) {
    cols = first;
    lines.shift();
  }
  const out: ProspectInput[] = [];
  for (const line of lines) {
    const cells = split(line);
    const rec: Record<string, string> = {};
    cols.forEach((c, i) => (rec[c] = cells[i] || ''));
    if (!rec.name) continue;
    out.push({
      name: rec.name,
      email: rec.email || null,
      kind: isKind(rec.kind) ? rec.kind : 'creator',
      handle: rec.handle || null,
      platform: rec.platform || null,
      followers: rec.followers ? Number(String(rec.followers).replace(/[^0-9]/g, '')) || null : null,
      niche: rec.niche || null,
      website: rec.website || null,
      instagram: rec.instagram || null,
      tiktok: rec.tiktok || null,
      youtube: rec.youtube || null,
      source: 'csv',
    });
  }
  return out;
}
