import { getSupabase } from './supabase';
import { normalizeEmail } from './client-auth';
import { products } from '@/data/products';

/** Every product an affiliate gets free: the two programs plus the playbooks. */
export const ALL_PRODUCT_SLUGS: string[] = ['the-terminal', 'idea-to-spec', ...products.map((p) => p.slug)];

/**
 * Program entitlements. A buyer (or approved affiliate) is entitled to a
 * program by email. The gated HQ checks this before serving the live tool or
 * the playbook. The Stripe webhook is the source of truth for purchases.
 */

export type ProgramSlug = 'the-terminal' | 'idea-to-spec';

/** Private storage filenames for each program's gated assets. */
export const PROGRAM_ASSETS: Record<ProgramSlug, { tool: string; pdf: string; toolName: string; playbookName: string; programName: string }> = {
  'the-terminal': {
    tool: 'the-terminal-ops-center.html',
    pdf: 'the-terminal-playbook.pdf',
    toolName: 'The Ops Center',
    playbookName: 'The Terminal Fullstack Playbook',
    programName: 'The Terminal',
  },
  'idea-to-spec': {
    tool: 'idea-to-spec-studio.html',
    pdf: 'idea-to-spec-playbook.pdf',
    toolName: 'The Spec Studio',
    playbookName: 'The Idea to Spec Playbook',
    programName: 'Idea to Spec',
  },
};

export function isProgramSlug(slug: string): slug is ProgramSlug {
  return slug === 'the-terminal' || slug === 'idea-to-spec';
}

/** Grant entitlement (idempotent). Used by the webhook and the affiliate engine. */
export async function grantEntitlement(email: string, slug: string, source = 'purchase'): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    await client
      .from('entitlements')
      .upsert({ email: normalizeEmail(email), product_slug: slug, source }, { onConflict: 'email,product_slug' });
  } catch (err) {
    console.error('grantEntitlement failed', err);
  }
}

/** Grant free access to every product. Used when an affiliate is approved. */
export async function grantAllProducts(email: string, source = 'affiliate'): Promise<void> {
  await Promise.all(ALL_PRODUCT_SLUGS.map((slug) => grantEntitlement(email, slug, source)));
}

/** Does this email have access to this product? */
export async function hasEntitlement(email: string, slug: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data } = await client
      .from('entitlements')
      .select('id')
      .eq('email', normalizeEmail(email))
      .eq('product_slug', slug)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
