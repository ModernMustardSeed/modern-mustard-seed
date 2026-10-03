import { sendViaResend } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { WL_LINES, usd } from '@/data/white-label';
import { accessKey, wlLinks } from '@/lib/white-label/key';
import { deliveries, emptyDelivery } from '@/lib/white-label/delivery';
import type { Agency, WlClient } from '@/lib/white-label/store';

/**
 * Every email the white label loop sends. All one-to-one and transactional:
 * each answers something the agency or Sarah just did, from Sarah's own
 * address, with no list headers. Nothing here is scheduled or bulk.
 */

const FROM = 'Sarah Scarano <sarah@modernmustardseed.com>';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const first = (name: string | null) => (name || '').trim().split(/\s+/)[0] || 'there';

export function portalUrl(a: Pick<Agency, 'slug'>): string {
  return `${SITE.url}/white-label/hq/${a.slug}?k=${accessKey('portal', a.slug)}`;
}

export function agencyLinks(a: Agency) {
  return wlLinks(SITE.url, { agency: a.name, color: a.color || '#0b3b44', city: '', sample: 'dental' });
}

export function linesLabel(slugs: string[]): string {
  return slugs.map((s) => WL_LINES.find((l) => l.slug === s)?.name ?? s).join(', ');
}

async function send(to: string | string[], subject: string, html: string) {
  const r = await sendViaResend({ from: FROM, to, subject, html, replyTo: 'sarah@modernmustardseed.com' });
  if (!r.ok) console.error('white label mail failed', subject, r.error);
  return r.ok;
}

/* ─── APPLY ───────────────────────────────────────────────────────────── */

export async function mailApplied(a: Agency) {
  const demo = agencyLinks(a).demoPublic;
  await send(
    a.email,
    `Your white label demo, ${a.name}`,
    clientEmail({
      preheader: `A live AI receptionist with ${a.name} on it, ready to show a client.`,
      eyebrow: 'WHITE LABEL',
      greeting: `Hi ${esc(first(a.contact_name))},`,
      body:
        p(`Thank you for applying to the White Label Program. Your demo is already built with ${esc(a.name)} on it: open it, paste one of your clients’ websites into the panel, and call the receptionist. It answers as that client.`) +
        p('I read every application myself. Within one business day you will have your price sheet, your agency portal, and a short note on how your first client goes live.'),
      cta: { label: 'Open your demo', url: demo },
    }),
  );
  await send(
    OWNER_NOTIFY_TO,
    `WHITE LABEL APPLICATION: ${a.name}`,
    clientEmail({
      eyebrow: 'NEW AGENCY',
      greeting: `${esc(a.name)} applied.`,
      body:
        p(`<strong>${esc(a.contact_name || 'No name given')}</strong> · ${esc(a.email)}${a.phone ? ` · ${esc(a.phone)}` : ''}`) +
        p(`${a.website ? `${esc(a.website)}<br>` : ''}Clients: ${esc(a.client_count || 'not given')}<br>Sells today: ${esc(a.sells || 'not given')}`) +
        p('Approve them on the desk and the welcome email with their portal and price sheet goes out on its own.'),
      cta: { label: 'Open the White Label desk', url: `${SITE.url}/admin/white-label` },
      signature: 'The desk',
    }),
  );
}

/* ─── APPROVED ────────────────────────────────────────────────────────── */

export async function mailApproved(a: Agency) {
  const links = agencyLinks(a);
  await send(
    a.email,
    `You are in: ${a.name} on the White Label Program`,
    clientEmail({
      preheader: 'Your portal, your price sheet, and how your first client goes live.',
      eyebrow: 'WELCOME',
      greeting: `Welcome in, ${esc(first(a.contact_name))}.`,
      body:
        p(`${esc(a.name)} is approved. Everything lives in your portal: your price sheet, your demo, your clients and where each one stands.`) +
        p('<strong>Your first client, in three steps.</strong><br>1. Show them the demo using their own website. Agree the result and your retail price.<br>2. Submit the brief in your portal. We confirm the scope and timeline. Phone agents get a test line; websites and systems get a preview.<br>3. Share the client review page, collect feedback, and approve the finished delivery. We launch it, then you bill your client your price.') +
        p(`One invoice a month from us covers every live client. No license fee, no minimum.${a.founding ? ' You are a founding agency, so these wholesale prices are locked for 24 months.' : ''}`) +
        (links.sheet ? p(`Your price sheet: <a href="${links.sheet}">${links.sheet}</a>`) : ''),
      cta: { label: 'Open your portal', url: portalUrl(a) },
      secondary: links.demo ? { label: 'Your demo, with your margin', url: links.demo } : undefined,
    }),
  );
}

/* ─── A CLIENT IS SUBMITTED ───────────────────────────────────────────── */

const VOICE_LINES = ['ai-receptionist', 'phone-and-site-agent'];

export async function mailClientSubmitted(a: Agency, c: WlClient) {
  const voice = c.lines.some((s) => VOICE_LINES.includes(s));
  await send(
    a.email,
    `Got it: ${c.business}`,
    clientEmail({
      eyebrow: 'CLIENT RECEIVED',
      greeting: `${esc(c.business)} is on our board.`,
      body:
        p(
          voice
            ? `We start within one business day: ${esc(linesLabel(c.lines))}. Inside seven days you get a test number to call. Nothing goes live and nothing is billed until you approve it.`
            : `We read the brief and send the scope in writing within one business day: ${esc(linesLabel(c.lines))}. Nothing starts and nothing is billed until you say yes to it.`,
        ) +
        p('If anything changes in the meantime, reply here or add a note in your portal.'),
      cta: { label: 'See it in your portal', url: portalUrl(a) },
    }),
  );
  await send(
    OWNER_NOTIFY_TO,
    `WHITE LABEL CLIENT: ${c.business} for ${a.name}`,
    clientEmail({
      eyebrow: 'BUILD THIS',
      greeting: `${esc(a.name)} sold ${esc(c.business)}.`,
      body:
        p(`<strong>Services:</strong> ${esc(linesLabel(c.lines))}`) +
        p(
          [
            c.website && `Website: ${esc(c.website)}`,
            c.city && `Town: ${esc(c.city)}`,
            c.contact_name && `Owner: ${esc(c.contact_name)}`,
            c.owner_phone && `Owner phone: ${esc(c.owner_phone)}`,
            c.owner_email && `Owner email: ${esc(c.owner_email)}`,
            c.transfer_number && `Transfer calls to: ${esc(c.transfer_number)}`,
            c.hours && `Hours: ${esc(c.hours)}`,
          ]
            .filter(Boolean)
            .join('<br>'),
        ) +
        (c.services_text ? p(`<strong>What they offer and how they book:</strong><br>${esc(c.services_text).replace(/\n/g, '<br>')}`) : ''),
      cta: { label: 'Open the White Label desk', url: `${SITE.url}/admin/white-label` },
      signature: 'The desk',
    }),
  );
}

/* ─── READY FOR THE AGENCY'S TEST CALL ────────────────────────────────── */

export async function mailClientReview(a: Agency, c: WlClient) {
  const delivery = (await deliveries([c.id]))[c.id] ?? emptyDelivery;
  await send(
    a.email,
    `${c.business} is ready for your review`,
    clientEmail({
      eyebrow: 'TEST IT',
      greeting: `Review the work for ${esc(c.business)}.`,
      body:
        p(esc(delivery.summary)) +
        (c.test_number ? p(`Test line: <strong>${esc(c.test_number)}</strong>. Test it as a customer would.`) : '') +
        p('Open your portal to preview the work, share the branded review page with your client, and request changes or approve delivery. We launch after your approval. Changes are included.'),
      cta: { label: 'Approve it in your portal', url: portalUrl(a) },
    }),
  );
}

/* ─── LIVE ────────────────────────────────────────────────────────────── */

export async function mailClientLive(a: Agency, c: WlClient, billing: { ok: boolean; monthly?: number; error?: string }) {
  const lines = c.lines.map((s) => WL_LINES.find((l) => l.slug === s)).filter(Boolean);
  const setup = lines.reduce((n, l) => n + (l!.wholesale.setup || 0), 0);
  const monthly = lines.reduce((n, l) => n + (l!.wholesale.monthly || 0), 0);
  await send(
    a.email,
    `${c.business} is live`,
    clientEmail({
      eyebrow: 'LIVE',
      greeting: `${esc(c.business)} is answering.`,
      body:
        p(`${esc(linesLabel(c.lines))} ${c.lines.length === 1 ? 'is' : 'are'} live for ${esc(c.business)}. Bill them your price whenever you are ready.`) +
        p(`On your next invoice from us: ${setup ? `${usd(setup)} setup, then ` : ''}${monthly ? `${usd(monthly)} a month for this client` : 'nothing monthly for this client'}. Changes stay included.`),
      cta: { label: 'Open your portal', url: portalUrl(a) },
    }),
  );
  if (!billing.ok) {
    await send(
      OWNER_NOTIFY_TO,
      `WHITE LABEL BILLING FAILED: ${a.name} · ${c.business}`,
      clientEmail({
        eyebrow: 'FIX BILLING',
        greeting: 'The client is live, but billing did not update.',
        body: p(`Stripe said: ${esc(billing.error || 'unknown error')}`) + p('Press "Sync billing" on the agency row once it is fixed. It is safe to press twice.'),
        cta: { label: 'Open the White Label desk', url: `${SITE.url}/admin/white-label` },
        signature: 'The desk',
      }),
    );
  }
}

/* ─── THE AGENCY APPROVED ITS TEST CALL ───────────────────────────────── */

export async function mailAgencyApprovedClient(a: Agency, c: WlClient) {
  await send(
    OWNER_NOTIFY_TO,
    `WHITE LABEL: ${a.name} approved ${c.business}`,
    clientEmail({
      eyebrow: 'SWITCH IT ON',
      greeting: `${esc(a.name)} approved ${esc(c.business)}.`,
      body: p('Run the launch checks for the selected services, then mark the delivery Live on the desk. That emails the agency and updates their invoice.'),
      cta: { label: 'Open the White Label desk', url: `${SITE.url}/admin/white-label` },
      signature: 'The desk',
    }),
  );
}
