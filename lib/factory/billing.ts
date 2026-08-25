import type Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { getPlan } from './plans';
import { slugify, type FactoryTenant } from './types';
import { audit } from './audit-log';

/**
 * BILLING TO PROVISIONING. A paid checkout becomes a tenant with entitlements
 * and an open door, with nobody creating a database row by hand.
 *
 * IT USES THE EXISTING BILLING SYSTEM. Stripe is already the source of truth
 * for purchases in this codebase (app/api/store/webhook), `clients` is already
 * the portal identity, and `provisionPurchase` already mints the ownership
 * card. This adds one branch to that pipeline rather than a second billing
 * system with its own idea of who paid.
 *
 * IT DOES NOT SET A PRICE. The plan a purchase lands on comes from the checkout
 * metadata, and what MMS charges comes from Stripe. `factory_plans` carries
 * null prices until Sarah sets canonical Client Factory pricing, and nothing
 * here invents one to fill the gap.
 *
 * WHAT PROVISIONING DOES NOT DO. It does not create a Factory and it does not
 * activate anything. It creates the tenant, seats the buyer, applies the plan
 * limits, and opens the Build. A Factory that appeared fully built the instant
 * a card cleared would be a Factory nobody reviewed.
 */

export type ProvisionResult =
  | { ok: true; tenantId: string; created: boolean }
  | { ok: false; reason: string };

/**
 * Provision a Client Factory tenant from a completed checkout session.
 *
 * Idempotent on the customer email: a replayed webhook, a second checkout from
 * the same buyer, or a retry after a timeout all resolve to the same tenant.
 * An upgrade updates the plan on the existing tenant rather than creating a
 * second one, because a customer with two tenants has two isolated sets of
 * data and can only ever see one of them.
 */
export async function provisionClientFactory(
  session: Stripe.Checkout.Session,
  email: string,
  name: string | null,
): Promise<ProvisionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'Database not configured.' };

  const buyer = email.toLowerCase().trim();
  if (!buyer) return { ok: false, reason: 'No buyer email on the session.' };

  const planCode = (session.metadata?.plan || 'launch').trim();
  const plan = await getPlan(supabase, planCode);
  if (!plan) return { ok: false, reason: `Checkout named an unknown plan "${planCode}".` };

  const company = (session.metadata?.business || '').trim() || name || buyer.split('@')[0];
  const monthlyCents = typeof session.amount_total === 'number' && session.mode === 'subscription' ? session.amount_total : null;
  const setupCents = session.mode === 'payment' ? session.amount_total ?? null : null;

  const { data: existingRow } = await supabase
    .from('factory_tenants')
    .select('*')
    .eq('client_email', buyer)
    .maybeSingle();
  const existing = existingRow as FactoryTenant | null;

  if (existing) {
    const patch: Record<string, unknown> = { plan_code: planCode, status: 'active', updated_at: new Date().toISOString() };
    if (monthlyCents !== null) patch.mrr_cents = monthlyCents;
    if (setupCents !== null) patch.setup_cents = setupCents;
    if (typeof session.customer === 'string') patch.stripe_customer_id = session.customer;
    if (typeof session.subscription === 'string') patch.stripe_subscription_id = session.subscription;

    await supabase.from('factory_tenants').update(patch).eq('id', existing.id);
    await audit(supabase, {
      tenantId: existing.id,
      actor: buyer,
      actorKind: 'system',
      action: 'tenant.plan_changed',
      meta: { plan: planCode, session: session.id },
    });
    return { ok: true, tenantId: existing.id, created: false };
  }

  // A slug collision means two customers with the same company name, which is
  // ordinary. Suffix rather than fail: a purchase must never bounce on naming.
  const base = slugify(company);
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: taken } = await supabase.from('factory_tenants').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${attempt + 2}`;
  }

  const { data, error } = await supabase
    .from('factory_tenants')
    .insert({
      slug,
      name: company,
      client_email: buyer,
      plan_code: planCode,
      kind: 'customer',
      status: 'active',
      mrr_cents: monthlyCents,
      setup_cents: setupCents,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
      notes: `Provisioned from Stripe session ${session.id}.`,
    })
    .select('id')
    .single();
  if (error) return { ok: false, reason: error.message };

  const tenantId = data.id as string;

  // Seat the buyer immediately. A tenant with no members is a customer who paid
  // and cannot sign in, which is the single worst first hour a product can have.
  await supabase.from('factory_tenant_members').insert({ tenant_id: tenantId, email: buyer, name, role: 'owner' });

  await audit(supabase, {
    tenantId,
    actor: buyer,
    actorKind: 'system',
    action: 'tenant.created',
    meta: { plan: planCode, session: session.id, mode: session.mode },
  });

  return { ok: true, tenantId, created: true };
}

/**
 * A cancelled or failed subscription suspends the tenant.
 *
 * SUSPENDED, NEVER DELETED. Their prospects, conversations, CRM and attribution
 * are their business records, not ours to remove because a card expired. A
 * suspended tenant stops sending (the portal guard rejects a non-active tenant,
 * and activation refuses) and everything is still there when they come back.
 */
export async function suspendClientFactory(
  identifiers: { subscriptionId?: string | null; customerId?: string | null; email?: string | null },
  reason: string,
): Promise<{ suspended: number }> {
  const supabase = getSupabase();
  if (!supabase) return { suspended: 0 };

  let query = supabase.from('factory_tenants').select('id').eq('status', 'active');
  if (identifiers.subscriptionId) query = query.eq('stripe_subscription_id', identifiers.subscriptionId);
  else if (identifiers.customerId) query = query.eq('stripe_customer_id', identifiers.customerId);
  else if (identifiers.email) query = query.eq('client_email', identifiers.email.toLowerCase().trim());
  else return { suspended: 0 };

  const { data } = await query;
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (!ids.length) return { suspended: 0 };

  await supabase
    .from('factory_tenants')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .in('id', ids);

  // Stop the machine as well as the billing. A suspended tenant that kept
  // mailing would be spending our money and their reputation for free.
  await supabase
    .from('factories')
    .update({
      status: 'paused',
      outreach_paused: true,
      sourcing_paused: true,
      followup_paused: true,
      pause_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .in('tenant_id', ids)
    .neq('status', 'archived');

  for (const id of ids) {
    await audit(supabase, {
      tenantId: id,
      actorKind: 'system',
      action: 'billing.changed',
      severity: 'warning',
      meta: { reason },
    });
  }
  return { suspended: ids.length };
}
