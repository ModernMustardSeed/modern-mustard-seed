/**
 * DEDUPE. The rule is simple and absolute: one business, one outreach record.
 *
 * Sourcing the same metro twice, importing a CSV that overlaps the dial floor,
 * and Mr. Mustard forging a suite for a company already in the pipeline all have
 * to converge on the SAME row. Four independent keys are written on every write
 * (domain, email, phone, normalized name + geography) and a candidate matching
 * ANY of them is a duplicate.
 *
 * Nothing here guesses. A blank key never matches a blank key: two businesses
 * with no website are not the same business.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/* ─────────────────────────────── the keys ───────────────────────────────── */

const LEGAL_SUFFIX =
  /\b(llc|l\.l\.c|inc|incorporated|corp|corporation|co|company|ltd|limited|pllc|lp|llp|pc|dba)\b/g;
const TRADE_NOISE =
  /\b(heating|cooling|air|conditioning|hvac|plumbing|plumbers?|roofing|roofers?|services?|service|contractors?|contracting|solutions?|and|the|of|your|专)\b/g;

/**
 * Normalized business name. Strips legal suffixes and the trade words that
 * every company in the vertical shares, so "Bob's Plumbing Services LLC" and
 * "Bobs Plumbing" collapse, while "Bob's Plumbing" and "Bill's Plumbing" do not.
 */
export function nameKey(name: string | null | undefined, city?: string | null, state?: string | null): string {
  const base = String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    // Apostrophes are DELETED, not spaced: "Bob's Plumbing" and "Bobs Plumbing"
    // are one business, and spacing the apostrophe leaves "bob s" against "bobs".
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(LEGAL_SUFFIX, ' ')
    .replace(TRADE_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';
  // Geography is part of identity: two "Anderson" plumbers in two states are two
  // businesses. State only, not city, because directories disagree about which
  // suburb a metro business "is in".
  const geo = String(state || '').trim().toUpperCase().slice(0, 2);
  return geo ? `${base}|${geo}` : base;
}

/** Registrable-ish host, minus www and the scheme. Blank for anything unparseable. */
export function domainKey(website: string | null | undefined): string {
  const raw = String(website || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    // A free host is not an identity: a hundred businesses share wixsite.com.
    if (FREE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return '';
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

const FREE_HOSTS = [
  'wixsite.com', 'weebly.com', 'squarespace.com', 'godaddysites.com', 'business.site',
  'facebook.com', 'wordpress.com', 'blogspot.com', 'myshopify.com', 'yelp.com',
  'linktr.ee', 'sites.google.com', 'square.site', 'godaddy.com', 'webs.com',
];

/** Digits only, US country code dropped. Blank unless it is a real 10-digit number. */
export function phoneDigits(phone: string | null | undefined): string {
  const d = String(phone || '').replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? ten : '';
}

/** Lowercased trimmed address. Gmail dot/plus tricks are NOT normalized away:
 *  business inboxes are not gmail, and collapsing them would merge real people. */
export function emailKey(email: string | null | undefined): string {
  const e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : '';
}

export type DedupeKeys = {
  name_key: string | null;
  domain_key: string | null;
  phone_digits: string | null;
  email_key: string | null;
};

export function keysFor(input: {
  business_name?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
}): DedupeKeys {
  return {
    name_key: nameKey(input.business_name, input.city, input.state) || null,
    domain_key: domainKey(input.website) || null,
    phone_digits: phoneDigits(input.phone) || null,
    email_key: emailKey(input.email) || null,
  };
}

/* ───────────────────────────── the index ────────────────────────────────── */

/**
 * Every business we already know about, from every door it could have come
 * through, loaded once into memory. A sourcing run checks thousands of
 * candidates; one query per candidate would be thousands of round trips.
 */
export type DedupeIndex = {
  names: Set<string>;
  domains: Set<string>;
  phones: Set<string>;
  emails: Set<string>;
  /** Addresses that must never be mailed again, whatever else matches. */
  suppressed: Set<string>;
  /** Existing rows keyed for lookup, so an "update in place" is possible. */
  idByKey: Map<string, string>;
  size: number;
};

async function page<T>(
  db: SupabaseClient,
  table: string,
  cols: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`dedupe: reading ${table} failed (${error.message})`);
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

/**
 * Build the index from every table that can hold a business we have already
 * touched: the outbound CRM, the rep tracker, the harvest table, the inbound
 * lead inbox, the client book, and both suppression lists.
 */
export async function buildDedupeIndex(db: SupabaseClient): Promise<DedupeIndex> {
  const idx: DedupeIndex = {
    names: new Set(),
    domains: new Set(),
    phones: new Set(),
    emails: new Set(),
    suppressed: new Set(),
    idByKey: new Map(),
    size: 0,
  };

  const add = (keys: DedupeKeys, id?: string) => {
    if (keys.name_key) { idx.names.add(keys.name_key); if (id) idx.idByKey.set(`n:${keys.name_key}`, id); }
    if (keys.domain_key) { idx.domains.add(keys.domain_key); if (id) idx.idByKey.set(`d:${keys.domain_key}`, id); }
    if (keys.phone_digits) { idx.phones.add(keys.phone_digits); if (id) idx.idByKey.set(`p:${keys.phone_digits}`, id); }
    if (keys.email_key) { idx.emails.add(keys.email_key); if (id) idx.idByKey.set(`e:${keys.email_key}`, id); }
    idx.size++;
  };

  type OL = { id: string; business_name: string; city: string | null; state: string | null; website: string | null; phone: string | null; email: string | null };
  for (const r of await page<OL>(db, 'outbound_leads', 'id,business_name,city,state,website,phone,email')) {
    add(keysFor(r), r.id);
  }

  type RP = { business: string | null; city: string | null; website: string | null; phone: string | null; email: string | null };
  for (const r of await page<RP>(db, 'rep_prospects', 'business,city,website,phone,email')) {
    add(keysFor({ business_name: r.business, city: r.city, website: r.website, phone: r.phone, email: r.email }));
  }

  type HP = { name: string | null; website: string | null; phone: string | null; email: string | null; address: string | null };
  for (const r of await page<HP>(db, 'harvest_prospects', 'name,website,phone,email,address')) {
    add(keysFor({ business_name: r.name, website: r.website, phone: r.phone, email: r.email }));
  }

  type LD = { business_name: string | null; company: string | null; email: string | null; phone: string | null };
  for (const r of await page<LD>(db, 'leads', 'business_name,company,email,phone')) {
    add(keysFor({ business_name: r.business_name || r.company, email: r.email, phone: r.phone }));
  }

  type CL = { name: string | null; email: string | null; company: string | null };
  const { data: clients } = await db.from('clients').select('name,email,company');
  for (const r of (clients ?? []) as CL[]) {
    add(keysFor({ business_name: r.company || r.name, email: r.email }));
    if (emailKey(r.email)) idx.suppressed.add(emailKey(r.email));
  }

  // Both suppression lists. An opt-out is permanent and outranks everything.
  const { data: optOuts } = await db.from('suppression').select('contact');
  for (const r of (optOuts ?? []) as { contact: string }[]) {
    const k = emailKey(r.contact);
    if (k) idx.suppressed.add(k);
  }
  const { data: bounces } = await db.from('email_suppressions').select('email,resolved');
  for (const r of (bounces ?? []) as { email: string; resolved: boolean }[]) {
    if (r.resolved) continue;
    const k = emailKey(r.email);
    if (k) idx.suppressed.add(k);
  }

  return idx;
}

export type DedupeVerdict =
  | { duplicate: false }
  | { duplicate: true; on: 'domain' | 'phone' | 'email' | 'name'; existingId: string | null }
  | { duplicate: true; on: 'suppressed'; existingId: null };

/** Check a candidate. Order matters: the strongest identity wins the label. */
export function checkDuplicate(idx: DedupeIndex, keys: DedupeKeys): DedupeVerdict {
  if (keys.email_key && idx.suppressed.has(keys.email_key)) {
    return { duplicate: true, on: 'suppressed', existingId: null };
  }
  if (keys.domain_key && idx.domains.has(keys.domain_key)) {
    return { duplicate: true, on: 'domain', existingId: idx.idByKey.get(`d:${keys.domain_key}`) ?? null };
  }
  if (keys.email_key && idx.emails.has(keys.email_key)) {
    return { duplicate: true, on: 'email', existingId: idx.idByKey.get(`e:${keys.email_key}`) ?? null };
  }
  if (keys.phone_digits && idx.phones.has(keys.phone_digits)) {
    return { duplicate: true, on: 'phone', existingId: idx.idByKey.get(`p:${keys.phone_digits}`) ?? null };
  }
  if (keys.name_key && idx.names.has(keys.name_key)) {
    return { duplicate: true, on: 'name', existingId: idx.idByKey.get(`n:${keys.name_key}`) ?? null };
  }
  return { duplicate: false };
}

/** Claim a candidate so the rest of THIS run cannot insert it twice either. */
export function claim(idx: DedupeIndex, keys: DedupeKeys, id?: string): void {
  if (keys.name_key) { idx.names.add(keys.name_key); if (id) idx.idByKey.set(`n:${keys.name_key}`, id); }
  if (keys.domain_key) { idx.domains.add(keys.domain_key); if (id) idx.idByKey.set(`d:${keys.domain_key}`, id); }
  if (keys.phone_digits) { idx.phones.add(keys.phone_digits); if (id) idx.idByKey.set(`p:${keys.phone_digits}`, id); }
  if (keys.email_key) { idx.emails.add(keys.email_key); if (id) idx.idByKey.set(`e:${keys.email_key}`, id); }
  idx.size++;
}
