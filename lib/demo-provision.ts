/**
 * TURN A DEMO BUYER INTO A CLIENT.
 *
 * The demo funnel used to end at the money. A buyer was written to demo_orders,
 * their lead was flipped to `won`, two emails went out, and that was the entire
 * delivery system. They never became a `client` and never got a `project`, and
 * the portal renders a client's PROJECTS. So a paying customer who signed in at
 * /portal landed on the guest empty state. There was no portal, no place to send
 * us their logo, no revision count, no thread. Sarah's inbox was the system of
 * record, which does not survive an ad budget.
 *
 * This is the handoff that was missing. It runs once, when the order is paid, and
 * it is idempotent: a Stripe retry, a dashboard resend, or a double-click must not
 * mint a second project or a second revision budget.
 *
 * Everything here is best-effort by design. A provisioning hiccup must never fail
 * the webhook, because Stripe would retry the whole thing and the money path is
 * already done. We log loudly and move on; the admin screen shows any order whose
 * project never appeared.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_PRODUCTS, DEMO_BUNDLE, type DemoProductKey } from './demo-order';
import { SITE } from './seo';

/** The offer's promise: two free edits before it goes live. */
export const DEMO_REVISIONS_INCLUDED = 2;

export type DemoOrderRow = {
  id: string;
  outbound_lead_id: string | null;
  business_name: string | null;
  products: unknown;
  email: string | null;
  name: string | null;
  phone: string | null;
  project_id?: string | null;
};

export type Provisioned = { ok: true; clientEmail: string; projectId: string; created: boolean } | { ok: false; error: string };

function productKeys(products: unknown): string[] {
  return Array.isArray(products) ? (products as string[]) : [];
}

/** What we owe them, in their words, as portal milestones. */
function milestonesFor(keys: string[]): Array<{ title: string; detail: string; done: boolean }> {
  const ms: Array<{ title: string; detail: string; done: boolean }> = [
    { title: 'Tell us about your business', detail: 'Your logo, photos, hours, and the details only you know. This is the one thing we need from you.', done: false },
  ];
  const has = (k: DemoProductKey) => keys.includes(k) || keys.includes('bundle');

  if (has('site')) {
    ms.push({ title: 'Your website, built for real', detail: 'We take the demo you toured and rebuild it around your real brand, photos, and offers.', done: false });
    ms.push({ title: 'Your two free edits', detail: 'You review it and tell us what to change. Twice, before it goes live, included.', done: false });
    ms.push({ title: 'Live on your domain', detail: 'We put it on your own web address and keep it running.', done: false });
  }
  if (has('voice')) {
    ms.push({ title: 'Your receptionist goes live', detail: 'The voice from your demo, answering your real number around the clock.', done: false });
  }
  // The command center rides free with every order (a website and a receptionist
  // both need a back office), so it is always part of the build, never gated.
  ms.push({ title: 'Your command center, included free', detail: 'Wired to your real calls and transcripts, your website traffic, customers, and reviews.', done: false });
  return ms;
}

function projectNameFor(business: string | null, keys: string[]): string {
  const who = (business || 'New client').trim();
  if (keys.includes('bundle')) return `${who}: the whole system`;
  const names = keys.map((k) => DEMO_PRODUCTS[k as DemoProductKey]?.name).filter(Boolean);
  return names.length ? `${who}: ${names.join(' + ')}` : `${who} build`;
}

function summaryFor(keys: string[]): string {
  if (keys.includes('bundle')) return DEMO_BUNDLE.blurb;
  const blurbs = keys.map((k) => DEMO_PRODUCTS[k as DemoProductKey]?.blurb).filter(Boolean);
  return blurbs.join(' ');
}

/**
 * Promote a PAID demo order into a client + project so the buyer has a portal.
 *
 * Idempotency is anchored on demo_orders.project_id: if it is already set, we
 * return that project untouched. The revision budget is set ONLY on insert, so a
 * replay can never top it back up after they have spent an edit.
 */
export async function provisionDemoOrder(sb: SupabaseClient, order: DemoOrderRow): Promise<Provisioned> {
  const email = (order.email ?? '').toLowerCase().trim();
  if (!email) return { ok: false, error: 'the order has no email; cannot open a portal for nobody' };

  const keys = productKeys(order.products);

  // Already provisioned? Say so and change nothing.
  if (order.project_id) {
    return { ok: true, clientEmail: email, projectId: order.project_id, created: false };
  }

  // 1. The client. Tenancy in this app is by email (see 003_client_portal.sql), so
  //    this row is what makes the portal recognize them at all.
  try {
    await sb.from('clients').upsert(
      {
        email,
        name: order.name || null,
        company: order.business_name || null,
        status: 'active',
        welcome_note: `Welcome aboard. Everything for ${order.business_name || 'your build'} lives here: your progress, your edits, and a direct line to me. No email tag.`,
      },
      { onConflict: 'email' },
    );
  } catch (err) {
    console.error('demo-provision: client upsert failed', err);
  }

  // 2. Guard against a project we already made for this exact order, in case a
  //    replay raced us before project_id was written back.
  const { data: prior } = await sb
    .from('projects')
    .select('id')
    .eq('demo_order_id', order.id)
    .limit(1)
    .maybeSingle();
  if (prior?.id) {
    await sb.from('demo_orders').update({ project_id: prior.id, client_email: email }).eq('id', order.id);
    return { ok: true, clientEmail: email, projectId: prior.id, created: false };
  }

  // 3. Which forged demo are we rebuilding? This is the thread back to the actual
  //    HTML the customer fell in love with, and what the site editor edits.
  let demoSiteId: string | null = null;
  if (order.outbound_lead_id) {
    const { data: lead } = await sb
      .from('outbound_leads')
      .select('site_demo_id')
      .eq('id', order.outbound_lead_id)
      .maybeSingle();
    demoSiteId = (lead?.site_demo_id as string | null) ?? null;
  }

  // 4. The project. revisions_included is set HERE and only here.
  const { data: proj, error: projErr } = await sb
    .from('projects')
    .insert({
      client_email: email,
      name: projectNameFor(order.business_name, keys),
      status: 'discovery',
      summary: summaryFor(keys),
      progress: 5,
      milestones: milestonesFor(keys),
      revisions_included: DEMO_REVISIONS_INCLUDED,
      revisions_used: 0,
      demo_site_id: demoSiteId,
      demo_order_id: order.id,
    })
    .select('id')
    .single();

  if (projErr || !proj) {
    return { ok: false, error: projErr?.message ?? 'project insert returned nothing' };
  }

  await sb.from('demo_orders').update({ project_id: proj.id, client_email: email }).eq('id', order.id);

  // 5. Put their demos in the portal as files, so the first thing they see is the
  //    thing they bought, not an empty shell.
  if (order.outbound_lead_id) {
    const { data: lead } = await sb
      .from('outbound_leads')
      .select('site_demo_url, os_demo_url, demo_url, hub_demo_url')
      .eq('id', order.outbound_lead_id)
      .maybeSingle();
    const files = [
      lead?.site_demo_url ? { label: 'Your website demo (the one you toured)', url: lead.site_demo_url, kind: 'site' } : null,
      lead?.demo_url ? { label: 'Your AI receptionist demo', url: lead.demo_url, kind: 'link' } : null,
      lead?.os_demo_url ? { label: 'Your command center demo', url: lead.os_demo_url, kind: 'link' } : null,
    ].filter(Boolean) as Array<{ label: string; url: string; kind: string }>;
    if (files.length) {
      try {
        await sb.from('client_files').insert(files.map((f) => ({ client_email: email, ...f })));
      } catch (err) {
        console.error('demo-provision: demo files insert failed', err);
      }
    }
  }

  return { ok: true, clientEmail: email, projectId: proj.id, created: true };
}

/**
 * The welcome. Deliberately NOT a 20-minute magic token: this email is the thing
 * they will dig up out of their inbox three weeks from now to find their portal,
 * and an expired link at that moment reads as a broken product. It points at the
 * passwordless door instead, with their address prefilled, so it works forever.
 */
export function portalWelcomeBody(args: { firstName?: string; business?: string | null; intakeUrl: string }): {
  greeting: string;
  body: string;
  cta: { label: string; url: string };
} {
  const who = args.firstName?.trim();
  return {
    greeting: who ? `You are in, ${who}.` : 'You are in.',
    body: `
      <p>Your client portal is open. It is the only place you and I need to talk from here: your build progress, your edits, your files, and a direct line to me all live in one spot.</p>
      <p><strong>One thing to do first:</strong> tell us about ${args.business || 'your business'}. Your logo, your photos, your hours, the details only you know. That form is the first thing waiting for you, and nothing gets built until it is in.</p>
      <p>Then you get <strong>two free edits</strong>. You look at what we built, tell us what to change, twice, before it ever goes live. Both are requested right in the portal and I see them the moment you send them.</p>
      <p>No password to remember. Enter your email at the portal door and it sends you a link.</p>
    `,
    cta: { label: 'Open my portal', url: args.intakeUrl },
  };
}

export const PORTAL_URL = `${SITE.url}/portal`;
