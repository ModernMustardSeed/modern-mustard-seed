/**
 * Makes the list mailable.
 *
 * On 2026-08-30 the table held 9,730 leads: 4,418 with a street address and
 * only 194 with a postal code. Nothing without a ZIP can be mailed, so 4,224
 * addressable businesses were sitting behind a missing five digit field.
 *
 * The US Census Bureau's geocoder fills it in. It is free, it needs no key, it
 * is the same data USPS validation is built on, and it tells us when an address
 * does not exist at all, which is worth more than the ZIP: a bad address is a
 * postcard we do not print and postage we do not spend.
 *
 *   npx tsx scripts/mailer/backfill-zip.mts            # dry run, first 25
 *   npx tsx scripts/mailer/backfill-zip.mts --apply
 *   npx tsx scripts/mailer/backfill-zip.mts --apply --limit 5000
 *
 * Every lead it touches ends with mail_address_status set to 'mailable' or
 * 'undeliverable', so the campaign runner never has to guess and never
 * re-geocodes the same row twice.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || (APPLY ? 2000 : 25);
/** The geocoder is a free public service. Three a second is polite and finishes
 *  4,200 rows in about twenty minutes. */
const CONCURRENCY = 3;

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
try {
  for (const line of readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* env from the process */ }

const SUPA = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };

type Lead = {
  id: string;
  business_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

type Geocoded = { zip: string; line1: string; city: string; state: string } | null;

async function geocode(lead: Lead): Promise<Geocoded> {
  const one = [lead.address, lead.city, lead.state].filter(Boolean).join(', ');
  const url = `${CENSUS}?address=${encodeURIComponent(one)}&benchmark=Public_AR_Current&format=json`;

  // The service throws a 502 on roughly one call in twenty under load. That is
  // the service being busy, not the address being bad, and treating it as a
  // verdict would quietly retire good addresses.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok || res.status < 500) break;
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  if (!res || !res.ok) throw new Error(`census ${res?.status ?? 'no response'}`);
  const body = (await res.json()) as {
    result?: { addressMatches?: Array<{ matchedAddress?: string; addressComponents?: Record<string, string> }> };
  };
  const match = body.result?.addressMatches?.[0];
  if (!match?.addressComponents) return null;

  const c = match.addressComponents;
  const zip = (c.zip || '').trim();
  if (!/^\d{5}$/.test(zip)) return null;

  // Rebuild the street line from the components the geocoder standardized, so
  // "4065 n woodlawn blvd" is mailed as "4065 N WOODLAWN BLVD".
  const line1 = [c.fromAddress, c.preQualifier, c.preDirection, c.preType, c.streetName, c.suffixType, c.suffixDirection]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    zip,
    line1: line1 || (lead.address || '').trim(),
    city: (c.city || lead.city || '').trim(),
    state: (c.state || lead.state || '').trim().toUpperCase(),
  };
}

async function fetchBatch(): Promise<Lead[]> {
  const qs = new URLSearchParams({
    select: 'id,business_name,address,city,state,postal_code',
    address: 'not.is.null',
    city: 'not.is.null',
    state: 'not.is.null',
    mail_address_status: 'is.null',
    unsubscribed_at: 'is.null',
    status: 'not.in.(dnc,lost,client,won)',
    order: 'lead_score.desc.nullslast',
    limit: String(LIMIT),
  });
  const res = await fetch(`${SUPA}/rest/v1/outbound_leads?${qs}`, { headers: H });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as Lead[];
}

async function patch(id: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPA}/rest/v1/outbound_leads?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

async function main(): Promise<void> {
  const leads = await fetchBatch();
  console.log(`${leads.length} leads with an address and no verdict yet.${APPLY ? '' : '  DRY RUN (pass --apply)'}\n`);

  let mailable = 0;
  let dead = 0;
  let failed = 0;
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const lead = leads[cursor++];
      if (!lead) return;
      try {
        const hit = await geocode(lead);
        if (hit) {
          mailable++;
          if (APPLY) {
            await patch(lead.id, {
              postal_code: hit.zip,
              address: hit.line1,
              city: hit.city,
              state: hit.state,
              mail_address_status: 'mailable',
            });
          }
          console.log(`  ok   ${hit.zip}  ${hit.line1}, ${hit.city}, ${hit.state}   ${lead.business_name}`);
        } else {
          dead++;
          if (APPLY) await patch(lead.id, { mail_address_status: 'undeliverable' });
          console.log(`  --   no match                                        ${lead.business_name}`);
        }
      } catch (err) {
        // A transport error is NOT a verdict. Leaving mail_address_status null
        // means the next run picks the row up again, where writing
        // 'undeliverable' would silently retire a good address forever.
        failed++;
        console.log(`  err  ${err instanceof Error ? err.message : err}   ${lead.business_name}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nmailable ${mailable}   undeliverable ${dead}   errored ${failed}`);
  if (!APPLY) console.log('Nothing was written. Re-run with --apply.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
