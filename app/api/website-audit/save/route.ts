import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { auditFollowupEmail, leadNotification } from '@/lib/email';
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
    const firstName = name.split(' ')[0] || 'there';
    const score = typeof body.overallScore === 'number' ? body.overallScore : null;
    const grade = (body.letterGrade ?? '').trim() || null;
    const headline = (body.headline ?? '').trim();
    const fixes = body.topThreeFixes ?? [];

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
      const resend = resendClient();
      const fields = [
        { label: 'Audited URL', value: url },
        ...(score !== null ? [{ label: 'Score', value: `${score}/100` }] : []),
        ...(grade ? [{ label: 'Grade', value: grade }] : []),
        { label: 'Source', value: 'Website Audit' },
      ];

      const recommendation =
        score === null
          ? 'Reply with the engagement link'
          : score < 70
            ? 'Score below 70. Pitch Seed Site ($2.5K-$5K) first.'
            : score < 90
              ? 'Score 70-89. Pitch Full-Service Business Build ($8.5K-$22K).'
              : 'Score 90+. Pitch Fractional AI Partner retainer.';

      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        replyTo: email,
        subject: `Website audit lead: ${url}${score !== null ? ` (${score}/${grade ?? ''})` : ''}`,
        html: leadNotification({
          type: 'AI Audit',
          name,
          email,
          fields,
          message: headline,
          suggestedAction: recommendation,
        }),
      });

      if (score !== null && grade && fixes.length > 0 && headline) {
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `Your website audit: ${score}/100, ${grade}`,
          html: auditFollowupEmail({
            firstName,
            url,
            score,
            grade,
            headline,
            topThreeFixes: fixes,
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('website-audit save error', err);
    return NextResponse.json(
      { error: 'Could not save. Try again or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
