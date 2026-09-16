import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A DOMAIN IS A LEASE. Every name a client owns has a registrar, an expiry
 * and a job, and the day one lapses the website or the email goes with it.
 * The registry answers all of that publicly over RDAP, so nothing here needs
 * a login: read the registry, read the nameservers and mail records, keep
 * the answer on the row, and warn while there is still time to renew.
 */

export type DomainRow = {
  id: string;
  client_email: string;
  domain: string;
  role: 'primary' | 'email' | 'forward' | 'held';
  registrar: string | null;
  expires_on: string | null;
  forwards_to: string | null;
  mx: string | null;
  status: 'active' | 'transferring' | 'expired' | 'released';
  notes: string | null;
  checked_at: string | null;
};

export type RegistryFacts = { registrar: string | null; expiresOn: string | null; locked: boolean | null; found: boolean };

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ModernMustardSeed/1.0)', accept: 'application/rdap+json, application/json' };

function rdapBase(domain: string): string {
  const tld = domain.split('.').pop() ?? 'com';
  if (tld === 'us') return 'https://rdap.nic.us/domain/';
  if (tld === 'com' || tld === 'net') return 'https://rdap.verisign.com/com/v1/domain/';
  return 'https://rdap.org/domain/';
}

/** Registrar, expiry and transfer lock from the registry. */
export async function readRegistry(domain: string): Promise<RegistryFacts> {
  try {
    const r = await fetch(rdapBase(domain) + domain, { headers: UA, signal: AbortSignal.timeout(12_000) });
    if (r.status === 404) return { registrar: null, expiresOn: null, locked: null, found: false };
    if (!r.ok) return { registrar: null, expiresOn: null, locked: null, found: true };
    const j = (await r.json()) as { entities?: Array<{ roles?: string[]; vcardArray?: unknown[]; handle?: string }>; events?: Array<{ eventAction: string; eventDate: string }>; status?: string[] };
    const reg = (j.entities ?? []).find((e) => (e.roles ?? []).includes('registrar'));
    const vcard = (reg?.vcardArray?.[1] as Array<[string, unknown, unknown, string]> | undefined) ?? [];
    const fn = vcard.find((x) => x[0] === 'fn')?.[3] ?? reg?.handle ?? null;
    const exp = (j.events ?? []).find((e) => e.eventAction === 'expiration')?.eventDate ?? null;
    const locked = j.status ? j.status.some((s) => /transfer prohibited/i.test(s)) : null;
    return { registrar: fn ? String(fn).replace(/,?\s*(Inc|LLC)\.?$/i, '') : null, expiresOn: exp ? exp.slice(0, 10) : null, locked, found: true };
  } catch {
    return { registrar: null, expiresOn: null, locked: null, found: true };
  }
}

/** The mail exchangers a domain publishes, in one line, or null when there are none. */
export async function readMx(domain: string): Promise<string | null> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: AbortSignal.timeout(8_000) });
    const j = (await r.json()) as { Answer?: Array<{ data: string }> };
    const hosts = (j.Answer ?? []).map((a) => a.data.replace(/^\d+\s+/, '').replace(/\.$/, '').toLowerCase()).sort();
    return hosts.length ? hosts.join(', ') : null;
  } catch {
    return null;
  }
}

export async function readNs(domain: string): Promise<string[]> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`, { signal: AbortSignal.timeout(8_000) });
    const j = (await r.json()) as { Answer?: Array<{ data: string }> };
    return (j.Answer ?? []).map((a) => a.data.replace(/\.$/, '').toLowerCase());
  } catch {
    return [];
  }
}

/** Where the mail for a domain goes, in a word a person recognises. */
export function mailProvider(mx: string | null): 'google' | 'zoho' | 'microsoft' | 'webexpress' | 'forwarding' | 'none' | 'other' {
  if (!mx) return 'none';
  if (/google|googlemail/.test(mx)) return 'google';
  if (/zoho/.test(mx)) return 'zoho';
  if (/outlook|office365/.test(mx)) return 'microsoft';
  if (/websiteexpress|webexpress/.test(mx)) return 'webexpress';
  if (/registrar-servers|eforward|forwardemail|improvmx/.test(mx)) return 'forwarding';
  return 'other';
}

export function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

/** Re-read the registry and DNS for every domain a client owns and store it. */
export async function refreshDomains(sb: SupabaseClient, clientEmail: string): Promise<{ checked: number; rows: DomainRow[] }> {
  const { data } = await sb.from('client_domains').select('*').eq('client_email', clientEmail).order('domain');
  const rows = (data ?? []) as DomainRow[];
  let checked = 0;
  for (const row of rows) {
    const [reg, mx] = await Promise.all([readRegistry(row.domain), readMx(row.domain)]);
    const patch: Partial<DomainRow> & { checked_at: string; updated_at: string } = { checked_at: new Date().toISOString(), updated_at: new Date().toISOString(), mx };
    if (reg.registrar) patch.registrar = reg.registrar;
    if (reg.expiresOn) patch.expires_on = reg.expiresOn;
    if (!reg.found) patch.status = 'released';
    else if (reg.expiresOn && daysUntil(reg.expiresOn)! < 0) patch.status = 'expired';
    else if (row.status === 'expired' || row.status === 'released') patch.status = 'active';
    await sb.from('client_domains').update(patch).eq('id', row.id);
    Object.assign(row, patch);
    checked++;
  }
  return { checked, rows };
}
