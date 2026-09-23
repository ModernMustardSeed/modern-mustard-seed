import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * THE BENCH.
 *
 * Twenty other companies build a custom home, and the builder holds all of
 * them in their head: who frames fast, who cleans up after themselves, who has
 * not answered a call since March, what each one charges.
 *
 * And one fact that does not belong in anybody's head: whether their liability
 * insurance is still in date. It lapses silently. No email arrives, nothing
 * turns red, and the day it gets checked is the day somebody has already come
 * off a roof and a lawyer is asking the general contractor for a certificate
 * that expired in April.
 *
 * So the certificate is the spine of this file. Everything else is a contact
 * with a rate on it; the dates are why it is worth a room.
 */

export type Rating = 'first-call' | 'fine' | 'last-resort' | 'never-again';

export type Trade = {
  id: string;
  company: string;
  trade: string | null;
  contact_id: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  rate: string | null;
  insurance_expires: string | null;
  license_expires: string | null;
  license_no: string | null;
  last_used_on: string | null;
  rating: Rating | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const TRADE_COLUMNS =
  'id, company, trade, contact_id, contact_name, phone, email, rate, insurance_expires, license_expires, license_no, last_used_on, rating, notes, active, created_at, updated_at';

export const RATING_WORD: Record<Rating, string> = {
  'first-call': 'First call',
  fine: 'Fine',
  'last-resort': 'Last resort',
  'never-again': 'Never again',
};

const DAY = 86_400_000;
const todayMt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

export type CertState = { level: 'ok' | 'soon' | 'urgent' | 'lapsed' | 'unknown'; days: number | null; say: string };

/**
 * How a certificate stands, today.
 *
 * Thirty days is the warning because that is roughly how long it takes to get
 * a renewed certificate out of an insurance agent when nobody is chasing, and
 * a week is urgent because that is when a builder should stop scheduling them
 * onto a job rather than start asking.
 *
 * Unknown is its own state and it is deliberately not green. "We never asked"
 * and "it is in date" are different facts, and only one of them is a defence.
 */
export function certState(expires: string | null | undefined, today = todayMt()): CertState {
  if (!expires) return { level: 'unknown', days: null, say: 'No certificate on file' };
  const days = Math.round((Date.parse(`${expires}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
  if (days < 0) return { level: 'lapsed', days, say: `Lapsed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago` };
  if (days <= 7) return { level: 'urgent', days, say: days === 0 ? 'Runs out today' : `Runs out in ${days} ${days === 1 ? 'day' : 'days'}` };
  if (days <= 30) return { level: 'soon', days, say: `Runs out in ${days} days` };
  return { level: 'ok', days, say: `In date until ${expires}` };
}

export async function listTrades(sb: SupabaseClient, clientEmail: string): Promise<Trade[]> {
  const { data } = await sb
    .from('client_trades')
    .select(TRADE_COLUMNS)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .order('company', { ascending: true })
    .limit(500);
  return (data ?? []) as Trade[];
}

/** Whose certificate needs a person, worst first. */
export function needingCert(trades: Trade[], today = todayMt()): Array<Trade & { cert: CertState }> {
  const order = { lapsed: 0, urgent: 1, soon: 2, unknown: 3, ok: 4 } as const;
  return trades
    .filter((t) => t.active)
    .map((t) => ({ ...t, cert: certState(t.insurance_expires, today) }))
    .filter((t) => t.cert.level !== 'ok')
    .sort((a, b) => order[a.cert.level] - order[b.cert.level] || (a.cert.days ?? 0) - (b.cert.days ?? 0));
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : null);

export type TradeInput = Partial<Record<'company' | 'trade' | 'contact_id' | 'contact_name' | 'phone' | 'email' | 'rate' | 'insurance_expires' | 'license_expires' | 'license_no' | 'last_used_on' | 'rating' | 'notes' | 'active', unknown>>;

export function tradePatch(input: TradeInput): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if ('company' in input) p.company = clean(input.company, 120);
  if ('trade' in input) p.trade = clean(input.trade, 80) || null;
  if ('contact_id' in input) p.contact_id = clean(input.contact_id, 60) || null;
  if ('contact_name' in input) p.contact_name = clean(input.contact_name, 120) || null;
  if ('phone' in input) p.phone = clean(input.phone, 40) || null;
  if ('email' in input) p.email = clean(input.email, 200).toLowerCase() || null;
  if ('rate' in input) p.rate = clean(input.rate, 200) || null;
  if ('insurance_expires' in input) p.insurance_expires = date(input.insurance_expires);
  if ('license_expires' in input) p.license_expires = date(input.license_expires);
  if ('license_no' in input) p.license_no = clean(input.license_no, 80) || null;
  if ('last_used_on' in input) p.last_used_on = date(input.last_used_on);
  if ('rating' in input) p.rating = ['first-call', 'fine', 'last-resort', 'never-again'].includes(String(input.rating)) ? input.rating : null;
  if ('notes' in input) p.notes = clean(input.notes, 4000) || null;
  if ('active' in input) p.active = input.active !== false;
  return p;
}

export async function saveTrade(
  sb: SupabaseClient,
  clientEmail: string,
  input: TradeInput & { id?: unknown },
): Promise<{ ok: true; trade: Trade } | { ok: false; error: string }> {
  const patch = tradePatch(input);
  const email = clientEmail.toLowerCase().trim();
  const id = clean(input.id, 60);

  if (id) {
    patch.updated_at = new Date().toISOString();
    const { data, error } = await sb.from('client_trades').update(patch).eq('id', id).eq('client_email', email).select(TRADE_COLUMNS).single();
    if (error || !data) return { ok: false, error: 'That did not save.' };
    return { ok: true, trade: data as Trade };
  }

  if (!String(patch.company ?? '').trim()) return { ok: false, error: 'Who are they? A company name is enough to start.' };
  const { data, error } = await sb.from('client_trades').insert({ ...patch, client_email: email }).select(TRADE_COLUMNS).single();
  if (error || !data) return { ok: false, error: 'That did not save.' };
  return { ok: true, trade: data as Trade };
}

export async function removeTrade(sb: SupabaseClient, clientEmail: string, id: string): Promise<void> {
  await sb.from('client_trades').delete().eq('id', id).eq('client_email', clientEmail.toLowerCase().trim());
}

/**
 * Bring somebody in from the book rather than typing them twice.
 *
 * The contact keeps being the contact; this row is the working relationship.
 */
export async function tradeFromContact(sb: SupabaseClient, clientEmail: string, contactId: string, trade: string | null): Promise<{ ok: true; trade: Trade } | { ok: false; error: string }> {
  const email = clientEmail.toLowerCase().trim();
  const { data: c } = await sb.from('client_contacts').select('id, name, company, phone, email').eq('client_email', email).eq('id', contactId).maybeSingle();
  if (!c) return { ok: false, error: 'That one is not in your book.' };
  const existing = await sb.from('client_trades').select(TRADE_COLUMNS).eq('client_email', email).eq('contact_id', contactId).maybeSingle();
  if (existing.data) return { ok: true, trade: existing.data as Trade };
  return saveTrade(sb, email, {
    company: (c.company as string) || (c.name as string) || 'Unnamed',
    contact_id: contactId,
    contact_name: (c.name as string) ?? null,
    phone: (c.phone as string) ?? null,
    email: (c.email as string) ?? null,
    trade,
  });
}
