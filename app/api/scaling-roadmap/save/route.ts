import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { roadmapEmail, leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { attachContact, getRoadmapBySlug } from '@/lib/roadmap-store';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Email capture on a finished roadmap. The roadmap row already exists (the
 * generate route writes it before anyone is asked for anything), so this only
 * attaches the contact, files the lead, and sends two emails: the visitor's copy
 * and Sarah's notification.
 *
 * The report is re-read from storage rather than trusted from the client, so a
 * forged POST cannot put words in Sarah's email.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { slug?: string; email?: string; name?: string; phone?: string };
    const slug = (body.slug ?? '').trim();
    const email = (body.email ?? '').trim();
    const name = (body.name ?? '').trim();
    const phone = (body.phone ?? '').trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Provide a real email address.' }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: 'Roadmap reference missing. Run it again.' }, { status: 400 });
    }

    const row = await getRoadmapBySlug(slug);
    if (!row) {
      return NextResponse.json({ error: 'That roadmap has expired. Run it again.' }, { status: 404 });
    }

    const report = row.report;
    const reportUrl = `${SITE.url}/scaling-roadmap/r/${row.slug}`;

    await attachContact(slug, { email, name, phone });

    await insertLead({
      type: 'audit',
      name: name || null,
      email,
      phone: phone || null,
      business_name: report.business_name || row.host,
      audit_url: row.url,
      audit_score: report.scale_score ?? null,
      message: report.headline ?? null,
      industry: report.one_liner ?? null,
      source: 'scaling-roadmap',
      notes: `Stage: ${report.stage}. Constraint: ${report.constraint?.type}. Roadmap: ${reportUrl}`,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = resendClient();

      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Roadmap lead: ${row.host} (${report.stage}, ${report.scale_score}/100)`,
        html: leadNotification({
          type: 'AI Audit',
          name: name || 'Owner',
          email,
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
                  ? 'Constraint is the owner. Lead with Command Center and taking work off their plate.'
                  : 'Read the constraint section, then open with that exact sentence on the call.',
        }),
      });

      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
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
    }

    return NextResponse.json({ ok: true, url: reportUrl });
  } catch (err) {
    console.error('scaling-roadmap save error', err);
    return NextResponse.json(
      { error: 'Could not send it. Try again or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
