import { getSupabase } from './supabase';

/**
 * Harvest Module 0, inbound capture. When someone submits a URL to the public
 * Website Audit, write a pre-qualified prospect into the Harvest queue
 * (harvest_prospects, source = inbound). The Harvest worker re-runs the full
 * audit, enrichment, AI discoverability, scoring, and routing on it later.
 *
 * Best-effort and self-contained: it writes one row to the shared MMS database
 * and never throws, so the public audit response is never affected. The Harvest
 * engine lives in the standalone harvest repo and reads this same table.
 */

function hostnameOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 120);
  }
}

function normalizeWebsite(url: string): string {
  return (url.startsWith('http') ? url : `https://${url}`).trim();
}

export async function captureHarvestInbound(input: {
  url: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<void> {
  const client = getSupabase();
  if (!client || !input.url) return;

  const website = normalizeWebsite(input.url);
  const contact = input.email ? input.email.toLowerCase().trim() : null;

  try {
    // Dedup on website so repeat submissions do not pile up.
    const { data: existing } = await client
      .from('harvest_prospects')
      .select('id')
      .eq('website', website)
      .maybeSingle();
    if (existing?.id) {
      if (contact) await client.from('harvest_prospects').update({ contact, email: contact }).eq('id', existing.id);
      return;
    }

    await client.from('harvest_prospects').insert({
      name: input.name?.trim() || hostnameOf(input.url),
      website,
      email: contact,
      contact,
      phone: input.phone ?? null,
      source: 'inbound',
      channel_type: 'email',
      status: 'discovered',
      notes: 'Inbound: submitted to the public website audit on modernmustardseed.com.',
    });
  } catch (err) {
    console.error('Harvest inbound capture failed (non-blocking):', err);
  }
}
