import type Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { getStripe } from '@/lib/stripe';
import { WL_LINES } from '@/data/white-label';
import { listClients, updateAgency, updateClient, type Agency, type WlClient } from '@/lib/white-label/store';

/**
 * WHITE LABEL BILLING. One Stripe subscription per agency, invoiced, never
 * auto-charged: `send_invoice` with seven days to pay, so "one invoice a month
 * from us covering every client" is literally true.
 *
 * ── ONE ITEM PER SERVICE, QUANTITY = LIVE CLIENTS ───────────────────────────
 * Stripe allows 20 items on a subscription. An item per client would hit that
 * at an agency's tenth client, so each monthly line is ONE item whose quantity
 * is the number of the agency's live clients carrying it. `syncAgencyBilling`
 * recomputes every quantity from the database, so it is safe to call after
 * any status change and safe to call twice.
 *
 * ── THE FOUNDING LOCK IS STRUCTURAL ─────────────────────────────────────────
 * An existing item keeps the unit price it was created with. Moving a price in
 * data/white-label.ts changes only items created after the move, which is
 * exactly the founding-agency promise.
 *
 * ── SETUP FEES ARE ONE-TIME INVOICE ITEMS ───────────────────────────────────
 * Created once per client per line when the client goes live, recorded in
 * `white_label_clients.stripe_items` under `setup:<slug>` so a re-run never
 * bills twice. They ride on the agency's next invoice.
 */

const productCache = new Map<string, string>();

async function productFor(stripe: Stripe, slug: string, name: string): Promise<string> {
  const hit = productCache.get(slug);
  if (hit) return hit;
  const found = await stripe.products.search({ query: `metadata['wl_line']:'${slug}'`, limit: 1 });
  const id = found.data[0]?.id ?? (await stripe.products.create({ name: `White label: ${name}`, metadata: { wl_line: slug } })).id;
  productCache.set(slug, id);
  return id;
}

async function ensureCustomer(stripe: Stripe, agency: Agency): Promise<string> {
  if (agency.stripe_customer_id) return agency.stripe_customer_id;
  const c = await stripe.customers.create({
    name: agency.name,
    email: agency.email,
    metadata: { white_label_agency: agency.id, slug: agency.slug },
  }, { idempotencyKey: `wl-customer-${agency.id}` });
  await updateAgency(agency.id, { stripe_customer_id: c.id });
  return c.id;
}

export type BillingResult = { ok: true; monthly: number; setupsAdded: number } | { ok: false; error: string };

/** Bill the setups for one client that just went live. Idempotent. */
async function addSetups(stripe: Stripe, customer: string, client: WlClient): Promise<number> {
  const items = { ...(client.stripe_items || {}) };
  let added = 0;
  for (const slug of client.lines) {
    const line = WL_LINES.find((l) => l.slug === slug);
    if (!line || !line.wholesale.setup || items[`setup:${slug}`]) continue;
    const ii = await stripe.invoiceItems.create({
      customer,
      currency: 'usd',
      amount: line.wholesale.setup * 100,
      description: `${line.name} setup: ${client.business}`,
      metadata: { wl_client: client.id, wl_line: slug },
    }, { idempotencyKey: `wl-setup-${client.id}-${slug}` });
    items[`setup:${slug}`] = ii.id;
    added++;
  }
  if (added) {
    await updateClient(client.id, { stripe_items: items });
    client.stripe_items = items;
  }
  return added;
}

/**
 * Bring an agency's subscription in line with its live clients, and bill the
 * setups of `justLive` if given. Never throws: a billing failure is reported
 * to the caller (and from there to Sarah), and the status change it followed
 * still stands.
 */
export async function syncAgencyBilling(agency: Agency, _justLive?: WlClient): Promise<BillingResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: 'Stripe is not configured.' };
  try {
    const live = (await listClients(agency.id)).filter((c) => c.status === 'live');
    const customer = await ensureCustomer(stripe, agency);
    let setupsAdded = 0;
    for (const c of live) setupsAdded += await addSetups(stripe, customer, c);
    const want = new Map<string, number>();
    for (const c of live) for (const slug of c.lines) want.set(slug, (want.get(slug) ?? 0) + 1);

    const monthlyLines = WL_LINES.filter((l) => l.wholesale.monthly > 0);
    let sub: Stripe.Subscription | null = null;
    if (agency.stripe_subscription_id) {
      sub = await stripe.subscriptions.retrieve(agency.stripe_subscription_id);
      if (sub && ['canceled', 'incomplete_expired'].includes(sub.status)) sub = null;
    }

    const existing = new Map<string, Stripe.SubscriptionItem>();
    for (const it of sub?.items.data ?? []) if (it.metadata?.wl_line) existing.set(it.metadata.wl_line, it);

    let monthly = 0;
    const toCreate: Stripe.SubscriptionCreateParams.Item[] = [];
    const toDelete: string[] = [];
    // Pass 1: add and resize. Deletions wait for pass 2, because Stripe refuses
    // to delete a subscription's last item and a new item may be on its way.
    for (const line of monthlyLines) {
      const qty = want.get(line.slug) ?? 0;
      const have = existing.get(line.slug);
      monthly += (have ? (have.price.unit_amount ?? 0) / 100 : line.wholesale.monthly) * qty;
      if (have && qty === 0) {
        toDelete.push(have.id);
      } else if (have && have.quantity !== qty) {
        await stripe.subscriptionItems.update(have.id, { quantity: qty, proration_behavior: 'none' });
      } else if (!have && qty > 0) {
        const item: Stripe.SubscriptionCreateParams.Item = {
          quantity: qty,
          metadata: { wl_line: line.slug },
          price_data: {
            currency: 'usd',
            product: await productFor(stripe, line.slug, line.name),
            unit_amount: line.wholesale.monthly * 100,
            recurring: { interval: 'month' },
          },
        };
        if (sub) await stripe.subscriptionItems.create({ subscription: sub.id, proration_behavior: 'none', ...item });
        else toCreate.push(item);
      }
    }
    // Pass 2: remove what no live client carries, unless nothing is live at all
    // (then the subscription is cancelled below instead).
    const recurringCount = monthlyLines.reduce((sum, l) => sum + (want.get(l.slug) ?? 0), 0);
    if (sub && recurringCount > 0) for (const id of toDelete) await stripe.subscriptionItems.del(id, { proration_behavior: 'none' });

    if (!sub && toCreate.length) {
      sub = await stripe.subscriptions.create({
        customer,
        collection_method: 'send_invoice',
        days_until_due: 7,
        items: toCreate,
        metadata: { white_label_agency: agency.id },
        description: `White label services for ${agency.name}`,
      }, { idempotencyKey: `wl-subscription-${agency.id}-${agency.updated_at || 'initial'}` });
      await updateAgency(agency.id, { stripe_subscription_id: sub.id });
    } else if (sub && recurringCount === 0) {
      // Nothing live: stop the subscription rather than invoice $0 forever.
      await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
      await updateAgency(agency.id, { stripe_subscription_id: null });
    }

    // A one-time build still needs an invoice when no monthly service exists.
    const awaitingInvoice = live.filter((c) => !c.stripe_items['invoice:delivery'] && c.lines.some((slug) => c.stripe_items[`setup:${slug}`]));
    if (recurringCount === 0 && awaitingInvoice.length > 0) {
      const batch = createHash('sha256').update(awaitingInvoice.map((c) => c.id).sort().join(',')).digest('hex').slice(0, 24);
      const invoice = await stripe.invoices.create({ customer, collection_method: 'send_invoice', days_until_due: 7, pending_invoice_items_behavior: 'include', auto_advance: true }, { idempotencyKey: `wl-delivery-invoice-${agency.id}-${batch}` });
      await stripe.invoices.finalizeInvoice(invoice.id, {}, { idempotencyKey: `wl-finalize-${invoice.id}` });
      for (const c of awaitingInvoice) await updateClient(c.id, { stripe_items: { ...c.stripe_items, 'invoice:delivery': invoice.id } });
    } else if (sub && recurringCount > 0) {
      for (const c of awaitingInvoice) await updateClient(c.id, { stripe_items: { ...c.stripe_items, 'invoice:delivery': `subscription:${sub.id}` } });
    }

    return { ok: true, monthly, setupsAdded };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
