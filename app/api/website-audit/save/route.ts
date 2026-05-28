import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

type SaveBody = {
  url?: string;
  email?: string;
  name?: string;
  overallScore?: number;
  letterGrade?: string;
  headline?: string;
  topThreeFixes?: { title: string; why: string; how: string }[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveBody;
    const email = (body.email ?? '').trim();
    const url = (body.url ?? '').trim();
    const name = (body.name ?? '').trim() || 'Site owner';
    const score = typeof body.overallScore === 'number' ? body.overallScore : null;
    const grade = (body.letterGrade ?? '').trim() || null;
    const headline = (body.headline ?? '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Provide your email.' }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: 'Audit URL missing.' }, { status: 400 });
    }

    await insertLead({
      type: 'audit',
      name,
      email,
      audit_url: url,
      audit_score: score,
      message: headline,
      source: 'website-audit',
      notes: grade ? `Grade: ${grade}` : null,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const fields = [
        { label: 'Audited URL', value: url },
        ...(score !== null ? [{ label: 'Score', value: `${score}/100` }] : []),
        ...(grade ? [{ label: 'Grade', value: grade }] : []),
        { label: 'Source', value: 'Website Audit' },
      ];

      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: email,
        subject: `Website audit lead: ${url}`,
        html: leadNotification({
          type: 'AI Audit',
          name,
          email,
          fields,
          message: headline,
          suggestedAction: 'Reply with the build queue link if the score is below 80',
        }),
      });

      const fixesHtml = (body.topThreeFixes ?? [])
        .map(
          (f, i) =>
            `<p style="margin:14px 0 4px;font-size:15px;color:#F5F0E8;font-weight:600">${i + 1}. ${f.title}</p>
<p style="margin:0 0 4px;font-size:14px;color:#F5F0E8B0">${f.why}</p>
<p style="margin:0;font-size:14px;color:#F5F0E8B0"><em>How:</em> ${f.how}</p>`
        )
        .join('');

      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `Your website audit${score !== null ? `: ${score}/100, ${grade ?? ''}` : ''}`.trim(),
        html: clientEmail({
          preheader: 'Your saved website audit. Top three fixes inside.',
          eyebrow: 'Website Audit',
          greeting: `Your audit of ${url}`,
          body: `${score !== null ? `<p style="margin:0 0 8px;font-size:18px"><strong>${score}/100${grade ? ` (${grade})` : ''}</strong></p>` : ''}
${headline ? `<p style="margin:0 0 18px;font-style:italic">${headline}</p>` : ''}
<p>Here are the three highest-leverage things to fix first:</p>
${fixesHtml || '<p>See the full report at modernmustardseed.com/website-audit.</p>'}
<p style="margin-top:22px">Want us to build the A version for you?</p>`,
          cta: { label: 'See the engagements', url: 'https://modernmustardseed.com/work-with-us' },
          secondary: {
            label: 'Book a discovery call',
            url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054',
          },
          signature: 'Sarah',
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('website-audit save error', err);
    return NextResponse.json(
      { error: 'Could not save. Try again, or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
