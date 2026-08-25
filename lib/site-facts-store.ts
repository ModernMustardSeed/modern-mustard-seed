import type { SupabaseClient } from '@supabase/supabase-js';
import { emailTrusted, fetchSiteFacts, parseSiteFacts, siteFactsFresh, withSiteFactsLine, type SiteFacts } from '@/lib/site-facts';

/**
 * The one way a lead gets its SITE FACTS line.
 *
 * Reads the stored line when it is fresh, reads the live site when it is not,
 * and writes the line back so the next surface never pays for the fetch. Every
 * public surface that prints a claim about a website calls this first: the
 * demo hub, the presence audit, the site brief, the printed game plan.
 *
 * Fail-soft by design. A site that cannot be read comes back `reachable: false`
 * and is stored that way; the consumers treat that as "unknown" and print
 * nothing they cannot back. It never throws and never blocks a suite.
 */
export async function ensureSiteFacts(
  sb: SupabaseClient,
  lead: { id: string; website?: string | null; notes?: string | null },
  opts: { timeoutMs?: number; maxPages?: number; force?: boolean } = {},
): Promise<SiteFacts | null> {
  const stored = parseSiteFacts(lead.notes);
  if (!opts.force && siteFactsFresh(stored)) return stored;
  if (!lead.website) return stored;
  try {
    const facts = await fetchSiteFacts(lead.website, { timeoutMs: opts.timeoutMs, maxPages: opts.maxPages });
    // An unreachable read never overwrites a reachable one: a host that was
    // slow for ten seconds is not evidence that the address left the site.
    if (!facts.reachable && stored?.reachable) return stored;
    const notes = withSiteFactsLine(lead.notes, facts);
    const patch: Record<string, unknown> = { notes };
    // The email the site prints is the email, when the lead has none.
    // Only an address that is plainly theirs: same domain or a free mailbox.
    if (facts.email && !(lead as { email?: string | null }).email && emailTrusted(facts.email, facts.url)) patch.email = facts.email;
    await sb.from('outbound_leads').update(patch).eq('id', lead.id);
    lead.notes = notes;
    return facts;
  } catch (err) {
    console.error('site facts failed, surface ships without them:', err instanceof Error ? err.message : String(err));
    return stored;
  }
}
