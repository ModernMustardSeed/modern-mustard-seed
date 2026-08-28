import type { SupabaseClient } from '@supabase/supabase-js';
import type { OutboundLead } from '@/lib/outbound';
import { leadTrade } from '@/lib/outbound-demo';
import { RANDOM_TEMPLATE, TEMPLATE_LINE, isTemplateKey, pickSiteTemplate } from '@/lib/site-templates.mjs';

/**
 * RESOLVE THE TEMPLATE CHOICE AT QUEUE TIME (2026-08-24, Sarah's picker).
 *
 * The cockpit sends one of: a template key ("pick this one"), "random", or
 * nothing. Nothing means random, because Sarah's default is that the studio
 * rotates and she overrides when she wants a specific look. Random is resolved
 * HERE, before the row is queued, so the key is on the row, in the brief, and
 * on the lead before any engine touches it: the admin shows what the site will
 * wear, the worker and the serverless failsafe build the same thing, and the
 * next Random for this lead or this trade in this town knows what to avoid.
 */
export async function resolveSiteTemplate(
  sb: SupabaseClient,
  lead: OutboundLead,
  requested: unknown,
): Promise<{ key: string; how: 'chosen' | 'random' }> {
  const asked = typeof requested === 'string' ? requested.trim().toLowerCase() : '';
  if (asked && asked !== RANDOM_TEMPLATE && isTemplateKey(asked)) return { key: asked, how: 'chosen' };

  const exclude: string[] = [];
  if (lead.site_template) exclude.push(lead.site_template);

  // Never the same template on two businesses in the same trade in the same town:
  // they will see each other's. Best effort; a missing column or a slow query
  // costs a little variety, never a build.
  try {
    if (lead.city) {
      const { data } = await sb
        .from('outbound_leads')
        .select('site_template')
        .eq('niche', lead.niche)
        .ilike('city', lead.city)
        .eq('site_demo_status', 'ready')
        .not('site_template', 'is', null)
        .neq('id', lead.id)
        .limit(50);
      for (const r of data ?? []) if (typeof r.site_template === 'string') exclude.push(r.site_template);
    }
  } catch { /* variety degrades, nothing breaks */ }

  return { key: pickSiteTemplate({ trade: leadTrade(lead), exclude }), how: 'random' };
}

/** The brief line the engines parse. */
export function templateBriefLine(key: string): string {
  return `${TEMPLATE_LINE} ${key}\n`;
}

/**
 * Write the chosen key on the row and the lead. Separate from the queue insert
 * on purpose: the brief line is what the engines read, the column is what the
 * admin reads, and a column that is not applied yet must never cost a build.
 */
export async function rememberTemplate(sb: SupabaseClient, siteId: string, leadId: string, key: string): Promise<void> {
  try {
    await sb.from('outbound_demo_sites').update({ site_template: key }).eq('id', siteId);
    await sb.from('outbound_leads').update({ site_template: key }).eq('id', leadId);
  } catch { /* migration 107 not applied yet; the brief still carries the key */ }
}
