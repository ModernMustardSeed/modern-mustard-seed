/**
 * Delivering a finished roadmap: attach the contact, file the lead, email the
 * owner their copy, and tell Sarah.
 *
 * Extracted out of the old two-step save route because the flow changed on
 * 2026-08-07: the address is now collected BEFORE generation, so delivery is
 * automatic rather than something the visitor has to ask for a second time.
 * The /api/scaling-roadmap/save route still calls this, for anyone who lands on
 * an older cached page.
 */

import { resendClient } from './send-email';
import { roadmapEmail, leadNotification } from './email';
import { insertLead } from './supabase';
import { attachContact, getRoadmapBySlug } from './roadmap-store';
import { OWNER_NOTIFY_TO } from './owner';
import { SITE } from './seo';

export async function deliverRoadmap(input: {
  slug: string;
  email: string;
  name?: string;
  phone?: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const row = await getRoadmapBySlug(input.slug);
  if (!row) return { ok: false, error: 'That roadmap has expired. Run it again.' };

  const report = row.report;
  const reportUrl = `${SITE.url}/scaling-roadmap/r/${row.slug}`;
  const name = (input.name ?? '').trim();
  const phone = (input.phone ?? '').trim();

  await attachContact(input.slug, { email: input.email, name, phone });

  await insertLead({
    type: 'audit',
    name: name || null,
    email: input.email,
    phone: phone || null,
    business_name: report.business_name || row.host,
    audit_url: row.url,
    audit_score: report.scale_score ?? null,
    message: report.headline ?? null,
    industry: report.one_liner ?? null,
    source: 'scaling-roadmap',
    notes: `Stage: ${report.stage}. Constraint: ${report.constraint?.type}. Roadmap: ${reportUrl}`,
  });

  if (!process.env.RESEND_API_KEY) return { ok: true, url: reportUrl };

  const resend = resendClient();

  await resend.emails.send({
    from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: OWNER_NOTIFY_TO,
    replyTo: input.email,
    subject: `Roadmap lead: ${row.host} (${report.stage}, ${report.scale_score}/100)`,
    html: leadNotification({
      type: 'AI Audit',
      name: name || 'Owner',
      email: input.email,
      fields: [
        { label: 'Business', value: report.business_name || row.host },
        { label: 'Site', value: row.url },
        { label: 'Stage', value: String(report.stage) },
        { label: 'Scale score', value: `${report.scale_score}/100` },
        { label: 'Constraint', value: `${report.constraint?.type}: ${report.constraint?.title}` },
        ...(phone ? [{ label: 'Phone', value: phone }] : []),
        { label: 'Roadmap', value: reportUrl },
      ],
      message: report.headline ?? '',
      suggestedAction:
        report.constraint?.type === 'leads'
          ? 'Constraint is leads. Lead with the Talking Website or a voice agent that stops the missed calls.'
          : report.constraint?.type === 'sales'
            ? 'Constraint is sales. Lead with the follow-up engine and the offer rebuild.'
            : report.constraint?.type === 'owner'
              ? 'Constraint is the owner. Lead with HUNDREDFOLD: their whole problem is that everything runs through them.'
              : 'Read the constraint section, then open with that exact sentence.',
    }),
  });

  await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: input.email,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `Your scaling roadmap: ${row.host}`,
    html: roadmapEmail({
      toName: name,
      host: row.host,
      stage: String(report.stage),
      score: report.scale_score ?? 0,
      headline: report.headline ?? '',
      constraintTitle: report.constraint?.title ?? '',
      firstMove: report.constraint?.first_move ?? '',
      nextThree: report.next_three ?? [],
      reportUrl,
    }),
  });

  return { ok: true, url: reportUrl };
}
