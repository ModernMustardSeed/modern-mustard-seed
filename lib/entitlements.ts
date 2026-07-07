import { getSupabase } from './supabase';
import { normalizeEmail } from './client-auth';
import { getAffiliateByEmail } from './affiliate';
import { products } from '@/data/products';

/** Every product an affiliate gets free: the programs, MUSTARD MODE, the Launch Kit, and the playbooks. */
export const ALL_PRODUCT_SLUGS: string[] = ['the-terminal', 'idea-to-spec', 'mustard-mode', 'mustard-mode-builder', 'mustard-launch-kit', ...products.map((p) => p.slug)];

/** MUSTARD MODE entitlement slugs (Player, Builder, Cabinet). Tier logic lives in lib/mustard-mode.ts. */
export const MUSTARD_SLUGS = ['mustard-mode', 'mustard-mode-builder', 'mustard-mode-cabinet'] as const;
export type MustardSlug = (typeof MUSTARD_SLUGS)[number];
export function isMustardSlug(slug: string): slug is MustardSlug {
  return (MUSTARD_SLUGS as readonly string[]).includes(slug);
}

/** MUSTARD LAUNCH entitlement slugs (Kit one-time, Room subscription). Tier logic lives in lib/mustard-launch.ts. */
export const LAUNCH_SLUGS = ['mustard-launch-kit', 'mustard-launch-room'] as const;
export type LaunchSlug = (typeof LAUNCH_SLUGS)[number];
export function isLaunchSlug(slug: string): slug is LaunchSlug {
  return (LAUNCH_SLUGS as readonly string[]).includes(slug);
}

/**
 * Revoke an entitlement (used when a Cabinet subscription is canceled).
 * Returns false on failure so callers can escalate (supabase-js reports
 * errors on the result object, it does not throw).
 */
export async function revokeEntitlement(email: string, slug: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('entitlements').delete().eq('email', normalizeEmail(email)).eq('product_slug', slug);
  if (error) {
    console.error('revokeEntitlement failed', error.message);
    return false;
  }
  return true;
}

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
  const { error } = await client
    .from('entitlements')
    .upsert({ email: normalizeEmail(email), product_slug: slug, source }, { onConflict: 'email,product_slug' });
  if (error) console.error('grantEntitlement failed', slug, error.message);
}

/** Grant free access to every product. Used when an affiliate is approved. */
export async function grantAllProducts(email: string, source = 'affiliate'): Promise<void> {
  await Promise.all(ALL_PRODUCT_SLUGS.map((slug) => grantEntitlement(email, slug, source)));
}

/**
 * Does this email have access to this product?
 *
 * Two ways to be entitled:
 *  1. A direct entitlement row (a buyer, or an affiliate already granted).
 *  2. Being an approved affiliate, who gets free access to everything.
 *
 * Case 2 is a self-heal. The grant at approval time is a one-time write that can
 * be missed (a partner approved before the entitlement system existed, or a
 * transient failure during approval). Rather than depend on that single write,
 * we treat approved-affiliate status as authoritative for free access and
 * backfill the rows on first access, so the next load is a fast direct hit.
 * This guarantees no approved partner ever sees a dead PDF or a course that
 * bounces to the marketing page.
 */
export async function hasEntitlement(email: string, slug: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const normEmail = normalizeEmail(email);

  try {
    const { data } = await client
      .from('entitlements')
      .select('id')
      .eq('email', normEmail)
      .eq('product_slug', slug)
      .maybeSingle();
    if (data) return true;
  } catch {
    /* fall through to the affiliate check */
  }

  // Self-heal: an approved affiliate is entitled to every free product.
  if (ALL_PRODUCT_SLUGS.includes(slug)) {
    try {
      const aff = await getAffiliateByEmail(normEmail);
      if (aff && aff.status === 'approved') {
        // Backfill all rows now (idempotent) so future loads hit the fast path.
        await grantAllProducts(normEmail, 'affiliate');
        return true;
      }
    } catch {
      /* not an affiliate, or lookup failed */
    }
  }

  return false;
}
