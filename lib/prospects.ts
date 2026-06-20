/**
 * Shared rep prospecting tracker. A simple list of businesses each partner is
 * working (cold call or walk-in), shared so Sarah sees activity and reps do not
 * double-call. Backed by the `rep_prospects` table (migration 025). Distinct
 * from `leads` (the inbound CRM Sarah runs).
 */

export type ProspectChannel = 'cold-call' | 'walk-in' | 'online' | 'referral';
export type ProspectStatus = 'to-contact' | 'contacted' | 'demoed' | 'booked' | 'won' | 'not-interested';

export type Prospect = {
  id: string;
  rep_email: string;
  rep_name: string | null;
  business: string;
  city: string | null;
  phone: string | null;
  channel: ProspectChannel;
  status: ProspectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CHANNELS: { value: ProspectChannel; label: string }[] = [
  { value: 'cold-call', label: 'Cold call' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
  { value: 'referral', label: 'Referral' },
];

export const STATUSES: { value: ProspectStatus; label: string }[] = [
  { value: 'to-contact', label: 'To contact' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demoed', label: 'Demoed' },
  { value: 'booked', label: 'Booked' },
  { value: 'won', label: 'Won' },
  { value: 'not-interested', label: 'Not interested' },
];

/** Quick-add city chips. Polly is starting in these markets. */
export const SUGGESTED_CITIES = ['Kalispell', 'Whitefish', 'Columbia Falls', 'Bigfork'];

export const VALID_CHANNELS = new Set(CHANNELS.map((c) => c.value));
export const VALID_STATUSES = new Set(STATUSES.map((s) => s.value));

/** Shown in the one-time setup card so the table can be created with one paste. */
export const SETUP_SQL = `create table if not exists public.rep_prospects (
  id uuid primary key default gen_random_uuid(),
  rep_email text not null,
  rep_name text,
  business text not null,
  city text,
  phone text,
  channel text not null default 'cold-call',
  status text not null default 'to-contact',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists rep_prospects_rep_idx on public.rep_prospects (rep_email);
create index if not exists rep_prospects_status_idx on public.rep_prospects (status);
create index if not exists rep_prospects_city_idx on public.rep_prospects (city);
alter table public.rep_prospects disable row level security;`;

/** Distinguish "table not created yet" from other DB errors so the UI can guide setup. */
export function isMissingTableError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message || String(err || '');
  const code = (err as { code?: string } | null)?.code || '';
  return code === '42P01' || /relation .*rep_prospects.* does not exist|could not find the table|does not exist/i.test(msg);
}
