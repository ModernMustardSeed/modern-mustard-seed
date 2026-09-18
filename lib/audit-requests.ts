/**
 * THE REQUESTED PRESENCE AUDIT.
 *
 * Sarah, 2026-09-18: "I want them to have to put email in and then I will run
 * audit for them in my mms admin and it will email them back once I run it."
 *
 * The flow, end to end:
 *
 *   1. A visitor on /presence-audit leaves an email, a business and a site.
 *      That lands as a row in `audit_requests` (migration 132) and Sarah is told.
 *   2. On the Audit Desk she opens their Google listing, types the handful of
 *      facts it shows (rating, review count, hours and so on), and presses Run.
 *   3. `runRequestedAudit` grades all three pillars with the same engine the demo
 *      suite uses, files the report in `presence_audits`, and emails the
 *      requester the link. One press, and they have it.
 *
 * WHY THE LISTING IS TYPED, NOT SCRAPED. Google Maps is only readable from the
 * workstation's real browser (scripts/maps-detail.mjs), never from a serverless
 * function, and even there the review count comes back empty. Sarah already has
 * the listing open when she runs the audit. Eight facts typed by the person who
 * looked are worth more than eight guessed by a function that could not.
 *
 * WHY NOT outbound_leads. See migration 132: that table feeds the acquisition
 * engine, and somebody who asked us for an audit is not a cold prospect.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPresenceReport, type PresenceAuditReport, type PresenceInput } from '@/lib/presence-audit';
import { auditPreferringWorker } from '@/lib/audit-queue';
import { fetchSiteFacts, type SiteFacts } from '@/lib/site-facts';
import type { WebsiteAuditReport } from '@/lib/website-audit';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { PRESENCE } from '@/data/presence-audit-page';

export type AuditRequestStatus = 'new' | 'running' | 'grading' | 'sent' | 'failed' | 'declined';

export type AuditRequest = {
  id: string;
  email: string;
  name: string | null;
  business_name: string;
  website: string | null;
  town: string | null;
  google_url: string | null;
  note: string | null;
  listing_seen: boolean;
  rating: number | null;
  review_count: number | null;
  listing_phone: string | null;
  listing_address: string | null;
  hours_published: boolean;
  open_24_7: boolean;
  emergency_service: boolean;
  trade: string | null;
  status: AuditRequestStatus;
  presence_audit_id: string | null;
  audit_url: string | null;
  score: number | null;
  letter: string | null;
  error: string | null;
  run_at: string | null;
  sent_at: string | null;
  send_count: number;
  wants: string[] | null;
  wants_at: string | null;
  source: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
};

/** The listing facts the desk may edit before a run. Nothing else is writable from there. */
export const LISTING_FIELDS = [
  'listing_seen',
  'rating',
  'review_count',
  'listing_phone',
  'listing_address',
  'hours_published',
  'open_24_7',
  'emergency_service',
  'trade',
  'google_url',
  'website',
  'business_name',
] as const;

/** The listing fields out of a desk request body, typed and trimmed. */
export function cleanListing(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));
  for (const k of LISTING_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    switch (k) {
      case 'listing_seen':
      case 'hours_published':
      case 'open_24_7':
      case 'emergency_service':
        out[k] = Boolean(v);
        break;
      case 'rating': {
        const n = num(v);
        out[k] = n === null || !Number.isFinite(n) ? null : Math.max(0, Math.min(5, Math.round(n * 10) / 10));
        break;
      }
      case 'review_count': {
        const n = num(v);
        out[k] = n === null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n));
        break;
      }
      case 'website':
        out[k] = v ? normalizeWebsite(String(v)) : null;
        break;
      case 'google_url': {
        const s = String(v ?? '').trim();
        out[k] = /^https?:\/\//i.test(s) ? s.slice(0, 600) : null;
        break;
      }
      case 'business_name': {
        const s = String(v ?? '').trim().slice(0, 160);
        if (s) out[k] = s;
        break;
      }
      default: {
        const s = String(v ?? '').trim().slice(0, 300);
        out[k] = s || null;
      }
    }
  }
  return out;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** `example.com` or `https://www.example.com/x` to a URL the grader can open. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return String(url);
  }
}

/**
 * The request, in the pure shape the scorer reads.
 *
 * "Hours published" is one checkbox on the desk because that is what the check
 * is: a week of hours on the listing or not. It becomes seven listed days here
 * so the scorer, which counts days, reads it the way it reads a harvested lead.
 */
export function inputFromRequest(r: AuditRequest, facts: SiteFacts | null): PresenceInput {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return {
    business_name: r.business_name,
    website: r.website,
    phone: r.listing_seen ? r.listing_phone : null,
    address: r.listing_seen ? r.listing_address : null,
    city: r.town,
    state: null,
    rating: r.listing_seen && r.rating !== null ? Number(r.rating) : null,
    review_count: r.listing_seen && r.review_count !== null ? Number(r.review_count) : null,
    hours: r.listing_seen && r.hours_published ? Object.fromEntries(days.map((d) => [d, 'listed'])) : null,
    open_24_7: r.listing_seen ? r.open_24_7 : null,
    emergency_service: r.listing_seen ? r.emergency_service : null,
    trade: r.trade,
    source_urls: r.google_url ? [r.google_url] : null,
    listing_seen: r.listing_seen,
    site_facts: facts,
  };
}

export type RunOutcome =
  | { ok: true; state: 'sent'; auditId: string; auditUrl: string; score: number; letter: string }
  | { ok: true; state: 'ready-not-sent'; auditId: string; auditUrl: string; score: number; letter: string; error: string }
  | { ok: true; state: 'grading'; message: string }
  | { ok: false; status: number; error: string };

/**
 * Run the audit for one request, file it, and email it.
 *
 * THE WEBSITE GRADE IS NEVER SKIPPED TO SAVE TIME. When the workstation grader
 * has not answered inside the wait, the request goes to `grading` and nothing is
 * emailed: a report with the biggest pillar missing is not the report they asked
 * for. The job keeps running and pressing Run again collects it, because the
 * model call collects any answer to the same site from the last fifteen minutes
 * (lib/llm.ts, `collectWithinMs`). A site that genuinely cannot be opened is a
 * finding, not a wait, and the report says so.
 */
export async function runRequestedAudit(
  sb: SupabaseClient,
  request: AuditRequest,
  opts: { waitMs?: number } = {},
): Promise<RunOutcome> {
  await sb.from('audit_requests').update({ status: 'running', error: null, run_at: new Date().toISOString() }).eq('id', request.id);

  let facts: SiteFacts | null = null;
  let report: WebsiteAuditReport | null = null;

  if (request.website) {
    // A grade the workstation already finished for this request, or is still
    // writing, from an earlier press of Run. Collect the one and wait on the
    // other rather than queueing the same site twice.
    const { data: prior } = await sb
      .from('audit_jobs')
      .select('status, report')
      .eq('source_table', 'audit_requests')
      .eq('source_id', request.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prior?.status === 'queued' || prior?.status === 'running') {
      const message = 'The website grade is still being written on the workstation. Press Run again in a few minutes and it will pick the finished grade up and send.';
      await sb.from('audit_requests').update({ status: 'grading', error: message }).eq('id', request.id);
      return { ok: true, state: 'grading', message };
    }
    if (prior?.status === 'done' && prior.report) report = prior.report as WebsiteAuditReport;

    // The same, on the model queue the grade usually runs on when the audit
    // worker is asleep. Keyed on the request id rather than on the fifteen
    // minute collect window in lib/llm.ts, so a grade that finished while
    // Sarah was away is still collected when she comes back and presses Run.
    // Measured 2026-09-18: a press 15.5 minutes after the grade landed missed
    // that window and paid for a second grade of the same site.
    if (!report) {
      const { data: job } = await sb
        .from('llm_jobs')
        .select('status, result_json')
        .eq('source_table', 'audit_requests')
        .eq('source_id', request.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (job?.status === 'queued' || job?.status === 'running') {
        const message = 'The website grade is still being written. Press Run again in a few minutes and it will pick the finished grade up and send.';
        await sb.from('audit_requests').update({ status: 'grading', error: message }).eq('id', request.id);
        return { ok: true, state: 'grading', message };
      }
      const graded = job?.status === 'done' ? (job.result_json as WebsiteAuditReport | null) : null;
      if (graded && typeof graded.overall_score === 'number') report = graded;
    }

    facts = await fetchSiteFacts(request.website, { timeoutMs: 8000, maxPages: 3 }).catch(() => null);
  }

  if (request.website && !report) {
    const outcome = await auditPreferringWorker(sb, {
      url: request.website,
      sourceTable: 'audit_requests',
      sourceId: request.id,
      waitMs: opts.waitMs ?? 170_000,
      facts,
    });

    if (outcome.kind === 'report') {
      report = outcome.report;
    } else if (outcome.kind === 'queued' || (outcome.kind === 'error' && outcome.status === 503)) {
      const message = 'The website grade is still being written. Press Run again in a few minutes and it will pick the finished grade up and send.';
      await sb.from('audit_requests').update({ status: 'grading', error: message }).eq('id', request.id);
      return { ok: true, state: 'grading', message };
    }
    // Any other error is a verdict on the site (it would not load), and the
    // website pillar reports that honestly rather than the whole audit dying.
  }

  const built = buildPresenceReport(inputFromRequest(request, facts), report);

  const { data: row, error } = await sb
    .from('presence_audits')
    .insert({
      lead_id: null,
      business_name: built.business_name,
      website: built.website,
      score: built.overall_score,
      letter: built.letter_grade,
      report: built,
      status: 'ready',
    })
    .select('id')
    .single();
  if (error || !row) {
    const msg = error?.message ?? 'Could not save the audit.';
    await sb.from('audit_requests').update({ status: 'failed', error: msg }).eq('id', request.id);
    return { ok: false, status: 500, error: msg };
  }

  const auditId = String(row.id);
  const auditUrl = `${SITE.url}/demo/audit/${auditId}`;
  await sb
    .from('audit_requests')
    .update({
      presence_audit_id: auditId,
      audit_url: auditUrl,
      score: built.overall_score,
      letter: built.letter_grade,
    })
    .eq('id', request.id);

  const sent = await sendRequestedAudit(sb, { ...request, presence_audit_id: auditId, audit_url: auditUrl }, built);
  if (!sent.ok) {
    return { ok: true, state: 'ready-not-sent', auditId, auditUrl, score: built.overall_score, letter: built.letter_grade, error: sent.error };
  }
  return { ok: true, state: 'sent', auditId, auditUrl, score: built.overall_score, letter: built.letter_grade };
}

/**
 * Email the finished report to the person who asked for it, and record that it
 * went. Used by the run and by the desk's Send again button.
 */
export async function sendRequestedAudit(
  sb: SupabaseClient,
  request: AuditRequest,
  report: PresenceAuditReport,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!request.audit_url) return { ok: false, error: 'There is no finished audit to send yet.' };

  const res = await sendViaResend({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: request.email,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `Your Online Presence Audit, ${request.business_name}`,
    html: presenceAuditReadyEmail({ request, report }),
  });

  if (!res.ok) {
    await sb.from('audit_requests').update({ status: 'failed', error: `Graded, but the email did not go: ${res.error}` }).eq('id', request.id);
    return { ok: false, error: res.error };
  }

  await sb
    .from('audit_requests')
    .update({ status: 'sent', error: null, sent_at: new Date().toISOString(), send_count: (request.send_count ?? 0) + 1 })
    .eq('id', request.id);
  return { ok: true };
}

/* ─────────────────────────────── the email ─────────────────────────────── */

const DOT = (score: number, unknown: boolean) =>
  unknown ? '#8A8378' : score >= 80 ? '#1E7A3C' : score >= 60 ? '#B87503' : '#C4160B';

/**
 * The "it is ready" email.
 *
 * It carries the verdict and the three pillar scores and then sends them to the
 * page for the rest, the same way the roadmap email does: a full report does
 * not survive Gmail's clipping, and the page is where the receipts live.
 */
export function presenceAuditReadyEmail({ request, report }: { request: AuditRequest; report: PresenceAuditReport }): string {
  const first = (request.name ?? '').trim().split(/\s+/)[0] || '';
  const rows = report.pillars
    .map((pl) => {
      const color = DOT(pl.score, pl.unknown);
      const value = pl.unknown ? 'not scored' : `${pl.score} / 100 &middot; ${escape(pl.letter)}`;
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #EAE3D2;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#161616">
          <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${color};margin-right:10px;vertical-align:middle"></span>${escape(pl.label)}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #EAE3D2;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${color};white-space:nowrap">${value}</td>
      </tr>`;
    })
    .join('');

  const scoreCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF8E1" style="background:#FFF8E1;border:2px solid #161616;border-radius:14px;margin:6px 0 22px">
    <tr><td style="padding:22px 22px 8px">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#C4160B">${escape(request.business_name)}</div>
      <div style="font-family:Georgia,serif;font-size:44px;line-height:1.1;font-weight:700;color:#161616;margin-top:6px">${report.overall_score}<span style="font-size:18px;color:#8A8378"> / 100</span>
        <span style="display:inline-block;margin-left:8px;padding:2px 10px;border:2px solid #161616;border-radius:8px;background:#F5B700;font-size:20px;vertical-align:middle">${escape(report.letter_grade)}</span></div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.45;color:#161616;margin-top:10px">${escape(report.headline)}</div>
    </td></tr>
    <tr><td style="padding:6px 22px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
  </table>`;

  const topFix = report.top_fixes[0];
  const body =
    p(`Your Online Presence Audit is finished. I graded ${escape(hostOf(request.website) || request.business_name)} the way a customer meets you: the website, the Google profile, and the reviews.`) +
    scoreCard +
    (topFix
      ? p(`<strong>Where I would start:</strong> ${escape(topFix.title)}. ${escape(topFix.why)}`)
      : '') +
    p('The full report has every check, what it is worth, the ranked fixes, and where each number came from, so you can verify all of it yourself. It is yours to keep, and plenty of people take the list and do the work themselves.') +
    p('If you want to talk any of it through, just reply to this email.');

  return clientEmail({
    preheader: `${request.business_name} scored ${report.overall_score} out of 100. The full report is ready.`,
    eyebrow: 'The Online Presence Audit',
    greeting: first ? `Hi ${escape(first)},` : 'Hi there,',
    body,
    cta: { label: 'Open my full audit', url: request.audit_url ?? `${SITE.url}/presence-audit` },
  });
}

/** What the visitor is told the moment they ask, so the wait is not a silence. */
export function presenceAuditReceivedEmail(request: Pick<AuditRequest, 'name' | 'business_name' | 'website'>): string {
  const first = (request.name ?? '').trim().split(/\s+/)[0] || '';
  const site = hostOf(request.website);
  return clientEmail({
    preheader: 'Your audit is in the queue. I run each one myself and email it when it is done.',
    eyebrow: 'The Online Presence Audit',
    greeting: first ? `Hi ${escape(first)},` : 'Hi there,',
    body:
      p(`Your audit request for <strong>${escape(request.business_name)}</strong>${site ? ` (${escape(site)})` : ''} is in.`) +
      p('I run each one myself rather than letting a machine guess at it. I open your Google listing, read your reviews, and grade your website against seven categories, then email you the whole report with the fixes ranked.') +
      p(`Expect it ${PRESENCE.turnaround}. If there is something specific you want me to look at, reply to this email and tell me.`),
  });
}
