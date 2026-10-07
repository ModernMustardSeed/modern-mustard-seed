import type { Resend } from 'resend';
import { resendClient } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { checkSpokenEmail, spokenEmailInstruction } from '@/lib/spoken-email';
import { noDashes, noDashesTitle } from '@/lib/no-dashes';

/**
 * Mr. Mustard's outbound mail: the send_email tool on a live call, and the
 * follow-ups he works from his inbox after it (lib/mustard-inbox.ts). One
 * path, so the link catalog, the address check and the dash ban hold for
 * both. Moved out of app/api/voice/route.ts, which may only export handlers.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resend's SDK returns {error} instead of throwing. Surface every failure,
 * and retry once on a rate-limit (Resend allows ~2 req/sec, and a booking
 * fires two emails back to back, so the second can 429).
 */
export async function sendLoud(
  resend: Resend,
  label: string,
  payload: Parameters<Resend['emails']['send']>[0]
): Promise<{ ok: boolean; id?: string; error?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload);
      if (!error) {
        console.log(`voice email sent [${label}]`, data?.id);
        return { ok: true, id: data?.id };
      }
      const msg = JSON.stringify(error);
      const rateLimited = /rate.?limit|too many|429/i.test(msg);
      if (rateLimited && attempt === 0) {
        console.warn(`voice email rate-limited [${label}], retrying`);
        await sleep(700);
        continue;
      }
      console.error(`voice email FAILED [${label}]`, msg);
      return { ok: false, error: msg };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 0) {
        await sleep(700);
        continue;
      }
      console.error(`voice email THREW [${label}]`, msg);
      return { ok: false, error: msg };
    }
  }
  return { ok: false, error: 'exhausted retries' };
}

/* ───────── send_email: Mr. Mustard sends a link or note, on the call ───────── */

const SITE_ROOT = 'https://modernmustardseed.com';

/**
 * The ONLY links Mr. Mustard may email. He picks by key, never by inventing a
 * URL, so a spoken "send me the voice agents page" can never turn into a 404 or
 * a made-up address. `ref: true` links get the partner's own referral code
 * appended when the send happens on the partner desk (so a partner who says
 * "email me my store link" gets a link that pays them).
 */
export type CatalogEntry = { label: string; url: string; ref?: boolean; admin?: boolean };
export const RESOURCE_CATALOG: Record<string, CatalogEntry> = {
  book: { label: 'Book a call with Sarah', url: `${SITE_ROOT}/book`, ref: true },
  'discovery-call': { label: 'Book a discovery call with Sarah', url: `${SITE_ROOT}/book`, ref: true },
  'website-audit': { label: 'Run your free website audit', url: `${SITE_ROOT}/website-audit` },
  'bottleneck-breaker': { label: 'Find your #1 bottleneck (free 60-second scan)', url: `${SITE_ROOT}/audit` },
  audit: { label: 'Find your #1 bottleneck (free scan)', url: `${SITE_ROOT}/audit` },
  'voice-agents': { label: 'voice agents that answer your phone', url: `${SITE_ROOT}/voice-agents` },
  'demo-agent': { label: 'Build your own voice agent', url: `${SITE_ROOT}/voice-agents/build`, ref: true },
  /* ⚠️ DEPRECATED ALIAS, AND IT IS LOAD BEARING UNTIL VAPI IS PUSHED.
   * Mr. Mustard's LIVE send_email tool description still lists 'sidekick'
   * as a valid key, and the catalog silently drops anything it does not
   * recognise. Deleting this line before pushing the updated description
   * makes him send a key that resolves to nothing, so the caller gets an
   * email with no link in it and nobody finds out. Delete it AFTER
   * `node scripts/setup-vapi-mustard.mjs --update <id>` has run. */
  sidekick: { label: 'Build your own voice agent', url: `${SITE_ROOT}/voice-agents/build`, ref: true },
  store: { label: 'The playbook and course store', url: `${SITE_ROOT}/store`, ref: true },
  work: { label: 'See the work', url: `${SITE_ROOT}/work` },
  'work-with-us': { label: 'Ways to work with us', url: `${SITE_ROOT}/work-with-us` },
  portal: { label: 'Sign in to your client portal', url: `${SITE_ROOT}/portal/login` },
  'partner-hub': { label: 'Your partner dashboard', url: `${SITE_ROOT}/partners/hq` },
  partners: { label: 'The partner program', url: `${SITE_ROOT}/partners` },
  home: { label: 'Modern Mustard Seed', url: SITE_ROOT },
  // ── PAY LINKS ──────────────────────────────────────────────────────────────
  // A caller who says "just send me the bill" gets a real one. Each opens a live
  // Stripe Checkout for that exact product, priced from lib/demo-order.ts by
  // app/pay/[slug]/route.ts, so what he says out loud and what they are charged
  // can never disagree. Added 2026-08-17 (Sarah): "he needs to be able to email
  // payment links and the actual product so they can just pay for it if they
  // want to." `ref: true` so a partner still earns on a link they caused.
  'pay-talking-website': { label: 'Start The Talking Website (secure checkout)', url: `${SITE_ROOT}/pay/talking-website`, ref: true },
  // The page rungs (2026-09-08): same checkout, bigger site, priced by lib/demo-order.ts SITE_RUNGS.
  'pay-talking-website-20': { label: 'Start The Talking Website, 20 pages and up (secure checkout)', url: `${SITE_ROOT}/pay/talking-website-20`, ref: true },
  'pay-talking-website-50': { label: 'Start The Talking Website, 50 pages and up (secure checkout)', url: `${SITE_ROOT}/pay/talking-website-50`, ref: true },
  'pay-voice-agent': { label: 'Start your Voice Agent (secure checkout)', url: `${SITE_ROOT}/pay/voice-agent`, ref: true },
  'pay-website': { label: 'Start your website (secure checkout)', url: `${SITE_ROOT}/pay/website`, ref: true },
  'pay-website-20': { label: 'Start your website, 20 pages and up (secure checkout)', url: `${SITE_ROOT}/pay/website-20`, ref: true },
  'pay-website-50': { label: 'Start your website, 50 pages and up (secure checkout)', url: `${SITE_ROOT}/pay/website-50`, ref: true },
  'pay-command-center': { label: 'Start your Business Command Center (secure checkout)', url: `${SITE_ROOT}/pay/command-center`, ref: true },
  // Admin-desk-only deep links (auth-gated routes; useless to anyone not signed
  // into admin, so they are dropped on non-admin calls). Paths mirror the admin
  // nav in components/admin/AdminHeader.tsx.
  'admin-outbound': { label: 'The dial floor (Outbound)', url: `${SITE_ROOT}/admin/outbound`, admin: true },
  'admin-acquisition': { label: 'The Acquisition Command Center', url: `${SITE_ROOT}/admin/acquisition`, admin: true },
  'admin-pipeline': { label: 'The pipeline (every lead)', url: `${SITE_ROOT}/admin/leads`, admin: true },
  'admin-partner-hub': { label: 'Partner Hub', url: `${SITE_ROOT}/admin/hq`, admin: true },
  'admin-delivery': { label: 'The delivery board', url: `${SITE_ROOT}/admin/delivery`, admin: true },
  'admin-proposals': { label: 'Proposals', url: `${SITE_ROOT}/admin/proposals`, admin: true },
  'admin-campaigns': { label: 'Campaigns', url: `${SITE_ROOT}/admin/campaigns`, admin: true },
  'admin-inbox': { label: 'The team inbox', url: `${SITE_ROOT}/admin/inbox`, admin: true },
  'admin-calendar': { label: 'The calendar', url: `${SITE_ROOT}/admin/calendar`, admin: true },
  'admin-academy': { label: 'The Academy (onboarding)', url: `${SITE_ROOT}/admin/onboarding`, admin: true },
  'admin-audit': { label: 'The Audit Desk', url: `${SITE_ROOT}/admin/audit`, admin: true },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * send_email: the caller asked Mr. Mustard to send them a link or a short note,
 * and he can now actually do it, live on the call.
 *
 * Recipient rules:
 *   - Internal desk calls (admin / client / partner) carry the signed-in
 *     person's authenticated email in the call metadata, so "email that to me"
 *     just works without re-asking. A different address may still be dictated.
 *   - Public calls (phone line, web demo) have no authenticated identity, so an
 *     email must be given and confirmed on the call, exactly like a booking.
 *
 * Content is constrained to the curated link catalog plus a short spoken note,
 * sent from Sarah's domain, so this can never become an open spam relay.
 */
export async function sendResourceEmail(
  input: { email?: string; subject?: string; note?: string; links?: string[] },
  ctx: { deskKind: string | null; authedEmail: string | null; lineRefCode?: string | null },
): Promise<string> {
  const to = (input.email || '').trim() || (ctx.authedEmail || '').trim();
  if (!to || !EMAIL_RE.test(to)) {
    return JSON.stringify({
      ok: false,
      error:
        'No good email to send to yet. Ask for the best address, confirm it by spelling it back, then call send_email again.',
    });
  }

  // A shape check passes every plausible mishearing, and a link sent to
  // gmial.com is worse than no link: the caller hangs up believing it arrived.
  // This costs a few milliseconds and fails open on a DNS hiccup.
  const verdict = await checkSpokenEmail(to);
  if (!verdict.ok) {
    return JSON.stringify({ ok: false, error: spokenEmailInstruction(verdict) });
  }

  // Partner desk: stamp their referral code onto any ref-eligible link so a
  // partner who emails themselves the store or booking link earns on it.
  let refCode: string | null = null;
  if (ctx.deskKind === 'partner' && ctx.authedEmail) {
    try {
      const aff = await getAffiliateByEmail(ctx.authedEmail);
      if (aff && aff.status === 'approved' && aff.code) refCode = aff.code;
    } catch {
      /* ref enrichment is best-effort */
    }
  }

  // A partner's line: every link he sends from the call carries their code, so
  // the purchase it leads to pays them the same as a link they shared by hand.
  if (!refCode && ctx.lineRefCode) refCode = ctx.lineRefCode;

  const keys = Array.isArray(input.links) ? input.links : [];
  const resolved = keys
    .map((k) => RESOURCE_CATALOG[String(k || '').trim().toLowerCase()])
    .filter((r): r is CatalogEntry => Boolean(r))
    // Admin deep links only resolve on an admin desk call; dropped everywhere else.
    .filter((r) => !r.admin || ctx.deskKind === 'admin')
    .map((r) => ({ label: r.label, url: refCode && r.ref ? `${r.url}?ref=${refCode}` : r.url }));

  const note = noDashes((input.note || '').trim());
  if (!note && resolved.length === 0) {
    return JSON.stringify({
      ok: false,
      error: 'Nothing to send. Include a short note, one or more links from the known list, or both.',
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return JSON.stringify({
      ok: false,
      error: 'Email is not available right now. Give them sarah@modernmustardseed.com and offer to book a call instead.',
    });
  }

  const primary = resolved[0];
  const rest = resolved.slice(1);
  const restHtml = rest.length
    ? `<div style="margin-top:6px">${rest
        .map((l) => `<p style="margin:0 0 10px"><a href="${l.url}" style="color:#C2261A;font-weight:700;text-decoration:none">${escape(l.label)} &rarr;</a></p>`)
        .join('')}</div>`
    : '';

  // Composed by the model, so the dash ban is enforced here, not requested in the prompt.
  const subject = noDashesTitle((input.subject || '').trim()) || 'A quick note from Mr. Mustard';
  const html = clientEmail({
    preheader: note ? note.slice(0, 120) : 'The link you asked for, from Modern Mustard Seed.',
    greeting: 'Hi there,',
    body:
      (note ? p(escape(note)) : p('Here is what you asked for on our call.')) +
      restHtml +
      p('You can just reply to this email and it reaches Sarah directly.'),
    cta: primary ? { label: primary.label, url: primary.url } : undefined,
  });

  const resend = resendClient();
  const r = await sendLoud(resend, 'mr-mustard-send', {
    from: 'Mr. Mustard at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to,
    replyTo: 'sarah@modernmustardseed.com',
    subject,
    html,
  });

  if (!r.ok) {
    return JSON.stringify({
      ok: false,
      error: 'The send did not go through. Apologize briefly and offer sarah@modernmustardseed.com directly.',
    });
  }
  return JSON.stringify({
    ok: true,
    sentTo: to,
    // ⚠️ The address is echoed back so he SAYS it, anchored, one more time.
    // 2026-08-17: on a live call he read "a as in apple, i as in igloo" back
    // correctly and then wrote `bizyal2023` into this tool, turning an i into an
    // l after the caller had already confirmed it. Nothing on the call could
    // catch that, because the only place the wrong address existed was inside a
    // tool argument nobody spoke out loud. Now he speaks it, and the person who
    // owns the inbox gets one chance to say "that's wrong" while he can still
    // resend.
    instruction: `Sent to ${to}. Say that address back to them ANCHORED, one time, exactly as it went out ("that went to b as in boy, i as in igloo..."), and ask if that is right. If they say it is wrong, take the correction and call send_email again with the fixed address. If it is right, tell them to peek in spam if it is not there in a minute, then ask if there is anything else.`,
  });
}
