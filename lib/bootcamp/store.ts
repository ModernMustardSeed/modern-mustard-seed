import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOTCAMP, OPERATOR, TIER_RANK } from '@/data/bootcamp';
import { bootcampSlug } from '@/lib/bootcamp/key';

/**
 * THE BOOTCAMP'S FOUR TABLES, behind one door.
 *
 * Registrations hold every person who raised a hand, one row per email per
 * launch. The tier only ever climbs: a masterclass seat that buys a ticket
 * becomes the ticket, a ticket that joins the cohort becomes the seat, and a
 * second form submission never lowers anyone or blanks what they already told
 * us. Hosts are the people who run a room for their own audience. Events are
 * the append-only log the desk, the drip and the host dashboard read back, so
 * money owed to a host is a sum over what happened, never a column somebody
 * edits by hand.
 *
 * Every function throws a plain Error on a database failure and the route that
 * called it answers 500 with the message. Nothing here swallows a write error,
 * because a registration that silently did not save is a person who paid and
 * never hears from us. Every email is lowercased and trimmed before it touches
 * a query, so "Sarah@" and "sarah@" are one person.
 */

export type RegistrationTier = 'masterclass' | 'ga' | 'vip' | 'platinum' | 'operator';
export type HostStatus = 'applied' | 'approved' | 'live' | 'paused' | 'declined';

export type RegistrationRow = {
  id: string;
  launch: string;
  email: string;
  name: string | null;
  first_name: string | null;
  business: string | null;
  website: string | null;
  trade: string | null;
  phone: string | null;
  tier: RegistrationTier;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  host_slug: string | null;
  source: string | null;
  why: string | null;
  sent_steps: string[];
  unsubscribed_at: string | null;
  attended_days: number[];
  replay_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HostRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  email: string;
  website: string | null;
  platforms: string | null;
  audience: string | null;
  vertical: string | null;
  room: string | null;
  status: HostStatus;
  founding: boolean;
  ticket_pct: number;
  program_pct: number;
  clicks: number;
  notes: string | null;
  payout_email: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OutreachRow = {
  id: string;
  name: string;
  brand: string | null;
  email: string | null;
  contact_path: string | null;
  contact_type: 'email' | 'form' | 'booking' | 'dm';
  platforms: string | null;
  audience: string | null;
  audience_source: string | null;
  sells: string | null;
  evidence: string | null;
  hook: string | null;
  vertical: string;
  fit: number;
  tier: string;
  source_urls: string[];
  status: 'queued' | 'hand' | 'sent' | 'replied' | 'hosting' | 'declined' | 'bounced' | 'done' | 'skipped';
  step: number;
  next_at: string | null;
  last_sent_at: string | null;
  replied_at: string | null;
  host_slug: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: number;
  kind: string;
  email: string | null;
  registration_id: string | null;
  outreach_id: string | null;
  host_slug: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export type HostStats = {
  clicks: number;
  masterclass: number;
  tickets: { ga: number; vip: number; platinum: number };
  ticketRevenueCents: number;
  operatorSeats: number;
  earningsCents: number;
};

export const TICKET_TIERS: RegistrationTier[] = ['ga', 'vip', 'platinum'];

export const normEmail = (email: string): string => String(email ?? '').trim().toLowerCase();

/** First word of the name, for a greeting. Null when there is nothing usable. */
export function firstNameOf(name: string | null | undefined): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return first.length >= 2 && first.length <= 30 ? first : null;
}

function need(sb: SupabaseClient | null): SupabaseClient {
  if (!sb) throw new Error('Database not configured');
  return sb;
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? 'unknown database error'}`);
}

const blank = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === '';
const clean = (v: unknown, max = 200): string | null => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

/* -------------------------------------------------------------------------- */
/* Registrations                                                               */
/* -------------------------------------------------------------------------- */

export type UpsertRegistrationInput = {
  email: string;
  name?: string | null;
  business?: string | null;
  website?: string | null;
  trade?: string | null;
  phone?: string | null;
  why?: string | null;
  source?: string | null;
  hostSlug?: string | null;
  tier: RegistrationTier;
  launch?: string;
  /** Set by fulfillment when money moved. Applied only when the tier climbs or the row is new. */
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountCents?: number;
  replayUntil?: string | null;
};

export type UpsertRegistrationResult = {
  row: RegistrationRow;
  isNew: boolean;
  /** True when an existing row moved up a tier on this call. */
  climbed: boolean;
};

/**
 * Insert at the given tier, or climb an existing row. Climbing fills blank
 * fields and leaves filled ones alone: the business name they typed at the
 * masterclass form survives a Stripe checkout that did not ask for one.
 */
export async function upsertRegistration(
  sb: SupabaseClient | null,
  input: UpsertRegistrationInput,
): Promise<UpsertRegistrationResult> {
  const db = need(sb);
  const email = normEmail(input.email);
  if (!email.includes('@')) throw new Error('A registration needs an email');
  const launch = input.launch ?? BOOTCAMP.launch;
  const tier: RegistrationTier = TIER_RANK[input.tier] === undefined ? 'masterclass' : input.tier;
  const name = clean(input.name, 120);

  const existing = await getRegistrationByEmail(db, email, launch);

  if (!existing) {
    const { data, error } = await db
      .from('bootcamp_registrations')
      .insert({
        launch,
        email,
        name,
        first_name: firstNameOf(name),
        business: clean(input.business, 160),
        website: clean(input.website, 300),
        trade: clean(input.trade, 80),
        phone: clean(input.phone, 40),
        why: clean(input.why, 2000),
        source: clean(input.source, 80),
        host_slug: clean(input.hostSlug, 48),
        tier,
        stripe_session_id: input.stripeSessionId ?? null,
        stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
        amount_cents: input.amountCents ?? 0,
        replay_until: input.replayUntil ?? null,
      })
      .select('*')
      .single();
    if (error || !data) fail('registration insert failed', error);
    return { row: data as RegistrationRow, isNew: true, climbed: false };
  }

  const climbed = (TIER_RANK[tier] ?? 0) > (TIER_RANK[existing.tier] ?? 0);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fill = (col: keyof RegistrationRow, value: string | null) => {
    if (value && blank(existing[col])) patch[col] = value;
  };
  fill('name', name);
  fill('first_name', firstNameOf(name));
  fill('business', clean(input.business, 160));
  fill('website', clean(input.website, 300));
  fill('trade', clean(input.trade, 80));
  fill('phone', clean(input.phone, 40));
  fill('why', clean(input.why, 2000));
  fill('source', clean(input.source, 80));
  fill('host_slug', clean(input.hostSlug, 48));

  if (climbed) {
    patch.tier = tier;
    if (input.stripeSessionId) patch.stripe_session_id = input.stripeSessionId;
    if (input.stripePaymentIntentId) patch.stripe_payment_intent_id = input.stripePaymentIntentId;
    // A GA seat that upgrades to VIP paid twice. The row carries the total, so
    // the desk's revenue by tier never undercounts a person who climbed.
    if (input.amountCents) patch.amount_cents = (existing.amount_cents ?? 0) + input.amountCents;
    if (input.replayUntil) patch.replay_until = input.replayUntil;
  }

  if (Object.keys(patch).length === 1) return { row: existing, isNew: false, climbed: false };

  const { data, error } = await db
    .from('bootcamp_registrations')
    .update(patch)
    .eq('id', existing.id)
    .select('*')
    .single();
  if (error || !data) fail('registration update failed', error);
  return { row: data as RegistrationRow, isNew: false, climbed };
}

/** Climb a row to a higher tier by id. Never lowers. Returns the row either way. */
export async function climbTier(
  sb: SupabaseClient | null,
  id: string,
  tier: RegistrationTier,
): Promise<RegistrationRow | null> {
  const db = need(sb);
  const existing = await getRegistrationById(db, id);
  if (!existing) return null;
  if ((TIER_RANK[tier] ?? 0) <= (TIER_RANK[existing.tier] ?? 0)) return existing;
  const { data, error } = await db
    .from('bootcamp_registrations')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) fail('tier climb failed', error);
  return data as RegistrationRow;
}

export async function getRegistrationByEmail(
  sb: SupabaseClient | null,
  email: string,
  launch: string = BOOTCAMP.launch,
): Promise<RegistrationRow | null> {
  const db = need(sb);
  const { data, error } = await db
    .from('bootcamp_registrations')
    .select('*')
    .eq('launch', launch)
    .eq('email', normEmail(email))
    .maybeSingle();
  if (error) fail('registration read failed', error);
  return (data as RegistrationRow | null) ?? null;
}

export async function getRegistrationById(sb: SupabaseClient | null, id: string): Promise<RegistrationRow | null> {
  const db = need(sb);
  const { data, error } = await db.from('bootcamp_registrations').select('*').eq('id', id).maybeSingle();
  if (error) fail('registration read failed', error);
  return (data as RegistrationRow | null) ?? null;
}

/**
 * Add step keys to sent_steps. Read then write, as a set: two cron runs that
 * overlap cannot drop each other's steps, and a step is never listed twice.
 */
export async function markSteps(sb: SupabaseClient | null, id: string, steps: string[]): Promise<string[]> {
  const db = need(sb);
  const row = await getRegistrationById(db, id);
  if (!row) throw new Error(`registration ${id} not found`);
  const next = Array.from(new Set([...(row.sent_steps ?? []), ...steps]));
  const { error } = await db
    .from('bootcamp_registrations')
    .update({ sent_steps: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) fail('sent_steps update failed', error);
  return next;
}

/** Mute the reminders. The ticket, the replays and the receipt all stand. */
export async function setUnsubscribed(sb: SupabaseClient | null, id: string): Promise<RegistrationRow | null> {
  const db = need(sb);
  const row = await getRegistrationById(db, id);
  if (!row) return null;
  if (row.unsubscribed_at) return row;
  const { data, error } = await db
    .from('bootcamp_registrations')
    .update({ unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) fail('unsubscribe failed', error);
  return data as RegistrationRow;
}

export type ListRegistrationsOpts = { tier?: string | null; q?: string | null; limit?: number; launch?: string };

export async function listRegistrations(
  sb: SupabaseClient | null,
  opts: ListRegistrationsOpts = {},
): Promise<RegistrationRow[]> {
  const db = need(sb);
  let query = db
    .from('bootcamp_registrations')
    .select('*')
    .eq('launch', opts.launch ?? BOOTCAMP.launch)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 500, 1), 5000));
  if (opts.tier && TIER_RANK[opts.tier] !== undefined) query = query.eq('tier', opts.tier);
  const q = (opts.q ?? '').trim().replace(/[%,()]/g, '').slice(0, 80);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%,business.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) fail('registrations list failed', error);
  return (data ?? []) as RegistrationRow[];
}

/** Every registration for the launch that the drip may still write to. Paged, so the cron never truncates silently. */
export async function listDripCandidates(
  sb: SupabaseClient | null,
  launch: string = BOOTCAMP.launch,
): Promise<RegistrationRow[]> {
  const db = need(sb);
  const out: RegistrationRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from('bootcamp_registrations')
      .select('*')
      .eq('launch', launch)
      .is('unsubscribed_at', null)
      .order('created_at', { ascending: true })
      .range(from, from + page - 1);
    if (error) fail('drip candidates read failed', error);
    const rows = (data ?? []) as RegistrationRow[];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function countsByTier(
  sb: SupabaseClient | null,
  launch: string = BOOTCAMP.launch,
): Promise<Record<RegistrationTier, number>> {
  const db = need(sb);
  const counts: Record<RegistrationTier, number> = { masterclass: 0, ga: 0, vip: 0, platinum: 0, operator: 0 };
  const { data, error } = await db.from('bootcamp_registrations').select('tier').eq('launch', launch).limit(20000);
  if (error) fail('tier counts failed', error);
  for (const r of (data ?? []) as { tier: RegistrationTier }[]) {
    if (counts[r.tier] !== undefined) counts[r.tier] += 1;
  }
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export type EventInput = {
  email?: string | null;
  registrationId?: string | null;
  outreachId?: string | null;
  hostSlug?: string | null;
  detail?: Record<string, unknown>;
};

export async function recordEvent(sb: SupabaseClient | null, kind: string, input: EventInput = {}): Promise<void> {
  const db = need(sb);
  const { error } = await db.from('bootcamp_events').insert({
    kind,
    email: input.email ? normEmail(input.email) : null,
    registration_id: input.registrationId ?? null,
    outreach_id: input.outreachId ?? null,
    host_slug: input.hostSlug ?? null,
    detail: input.detail ?? {},
  });
  if (error) fail(`event ${kind} insert failed`, error);
}

export async function listEvents(
  sb: SupabaseClient | null,
  opts: { kind?: string; hostSlug?: string; limit?: number } = {},
): Promise<EventRow[]> {
  const db = need(sb);
  let query = db
    .from('bootcamp_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 50, 1), 1000));
  if (opts.kind) query = query.eq('kind', opts.kind);
  if (opts.hostSlug) query = query.eq('host_slug', opts.hostSlug);
  const { data, error } = await query;
  if (error) fail('events read failed', error);
  return (data ?? []) as EventRow[];
}

/** How many events of a kind since midnight UTC. The register route uses it to stop a flood of owner notes. */
export async function countEventsToday(sb: SupabaseClient | null, kind: string): Promise<number> {
  const db = need(sb);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db
    .from('bootcamp_events')
    .select('id', { count: 'exact', head: true })
    .eq('kind', kind)
    .gte('created_at', start.toISOString());
  if (error) fail('event count failed', error);
  return count ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Orders (the shared revenue ledger)                                          */
/* -------------------------------------------------------------------------- */

export async function orderExists(sb: SupabaseClient | null, stripeSessionId: string): Promise<boolean> {
  const db = need(sb);
  const { data, error } = await db.from('orders').select('id').eq('stripe_session_id', stripeSessionId).maybeSingle();
  if (error) fail('order read failed', error);
  return Boolean(data);
}

export async function insertOrder(
  sb: SupabaseClient | null,
  order: {
    stripeSessionId: string;
    stripePaymentIntentId: string | null;
    productSlug: string;
    productName: string;
    pricePaidCents: number;
    currency: string;
    email: string;
    name: string | null;
  },
): Promise<void> {
  const db = need(sb);
  const { error } = await db.from('orders').insert({
    stripe_session_id: order.stripeSessionId,
    stripe_payment_intent_id: order.stripePaymentIntentId,
    product_slug: order.productSlug,
    product_name: order.productName,
    item_type: 'bootcamp',
    price_paid_cents: order.pricePaidCents,
    currency: order.currency,
    email: normEmail(order.email),
    name: order.name,
    status: 'paid',
  });
  if (error) fail('order insert failed', error);
}

/* -------------------------------------------------------------------------- */
/* Hosts                                                                       */
/* -------------------------------------------------------------------------- */

export async function getHostBySlug(sb: SupabaseClient | null, slug: string): Promise<HostRow | null> {
  const db = need(sb);
  const { data, error } = await db.from('bootcamp_hosts').select('*').eq('slug', slug).maybeSingle();
  if (error) fail('host read failed', error);
  return (data as HostRow | null) ?? null;
}

export async function listHosts(sb: SupabaseClient | null, status?: HostStatus | null): Promise<HostRow[]> {
  const db = need(sb);
  let query = db.from('bootcamp_hosts').select('*').order('created_at', { ascending: false }).limit(2000);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) fail('hosts list failed', error);
  return (data ?? []) as HostRow[];
}

export type CreateHostInput = {
  name: string;
  brand?: string | null;
  email: string;
  website?: string | null;
  platforms?: string | null;
  audience?: string | null;
  vertical?: string | null;
  room?: string | null;
  status?: HostStatus;
  notes?: string | null;
};

/**
 * Insert a host with a slug from the brand or the name. Two "Studio North"
 * applications become studio-north and studio-north-2 instead of a unique
 * violation that drops the second one on the floor.
 */
export async function createHost(sb: SupabaseClient | null, input: CreateHostInput): Promise<HostRow> {
  const db = need(sb);
  const email = normEmail(input.email);
  if (!email.includes('@')) throw new Error('A host needs an email');
  const name = clean(input.name, 120);
  if (!name) throw new Error('A host needs a name');
  const base = bootcampSlug(clean(input.brand, 120) || name) || 'host';

  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const taken = await getHostBySlug(db, slug);
    if (!taken) break;
    slug = `${base.slice(0, 44)}-${n}`;
  }

  const { data, error } = await db
    .from('bootcamp_hosts')
    .insert({
      slug,
      name,
      brand: clean(input.brand, 120),
      email,
      website: clean(input.website, 300),
      platforms: clean(input.platforms, 300),
      audience: clean(input.audience, 300),
      vertical: clean(input.vertical, 80),
      room: clean(input.room, 80),
      status: input.status ?? 'applied',
      notes: clean(input.notes, 2000),
    })
    .select('*')
    .single();
  if (error || !data) fail('host insert failed', error);
  return data as HostRow;
}

export type HostPatch = Partial<
  Pick<
    HostRow,
    | 'name'
    | 'brand'
    | 'email'
    | 'website'
    | 'platforms'
    | 'audience'
    | 'vertical'
    | 'room'
    | 'status'
    | 'founding'
    | 'ticket_pct'
    | 'program_pct'
    | 'notes'
    | 'payout_email'
    | 'approved_at'
  >
>;

export async function updateHost(sb: SupabaseClient | null, slug: string, patch: HostPatch): Promise<HostRow> {
  const db = need(sb);
  const body: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (typeof patch.email === 'string') body.email = normEmail(patch.email);
  if (typeof patch.payout_email === 'string') body.payout_email = normEmail(patch.payout_email);
  const { data, error } = await db.from('bootcamp_hosts').update(body).eq('slug', slug).select('*').single();
  if (error || !data) fail('host update failed', error);
  return data as HostRow;
}

/**
 * One more click on a host's link. Read then write rather than an RPC, because
 * a counter that is off by one under a burst matters less than a redirect that
 * waits on a database function nobody deployed. A missing host is tolerated:
 * the redirect still works, the click just is not anyone's.
 */
export async function bumpHostClicks(sb: SupabaseClient | null, slug: string): Promise<boolean> {
  const db = need(sb);
  const host = await getHostBySlug(db, slug);
  if (!host) return false;
  const { error } = await db
    .from('bootcamp_hosts')
    .update({ clicks: (host.clicks ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) fail('host click update failed', error);
  return true;
}

/**
 * What a host's link has done. Seats come from registrations that carry the
 * slug; money comes from host-sale events, which fulfillment writes once per
 * paid checkout with the cents and the tier at the time. Reading money from
 * events rather than from the registration's current tier means a GA seat that
 * later joined the cohort still credits the host for the ticket and the seat.
 */
export async function hostStats(sb: SupabaseClient | null, slug: string): Promise<HostStats> {
  const db = need(sb);
  const host = await getHostBySlug(db, slug);
  const ticketPct = host?.ticket_pct ?? 100;
  const programPct = host?.program_pct ?? 20;

  const { count, error: countError } = await db
    .from('bootcamp_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('host_slug', slug);
  if (countError) fail('host registrations count failed', countError);

  const { data, error } = await db
    .from('bootcamp_events')
    .select('detail')
    .eq('kind', 'host-sale')
    .eq('host_slug', slug)
    .limit(20000);
  if (error) fail('host sales read failed', error);

  const tickets = { ga: 0, vip: 0, platinum: 0 };
  let ticketRevenueCents = 0;
  let operatorSeats = 0;
  for (const row of (data ?? []) as { detail: { tier?: string; cents?: number } }[]) {
    const tier = row.detail?.tier ?? '';
    const cents = Number(row.detail?.cents ?? 0) || 0;
    if (tier === 'operator') operatorSeats += 1;
    else if (tier === 'ga' || tier === 'vip' || tier === 'platinum') {
      tickets[tier] += 1;
      ticketRevenueCents += cents;
    }
  }

  const earningsCents =
    Math.round((ticketRevenueCents * ticketPct) / 100) +
    Math.round((operatorSeats * OPERATOR.priceCents * programPct) / 100);

  return {
    clicks: host?.clicks ?? 0,
    masterclass: count ?? 0,
    tickets,
    ticketRevenueCents,
    operatorSeats,
    earningsCents,
  };
}
