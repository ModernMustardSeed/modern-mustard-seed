import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification, p, callout } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

type LeadPayload = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  industry?: string;
  auditUrl?: string;
  source?: string;
  score?: number;
  summary?: string;
};

function daysFromNow(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString();
}

function pickPlaybook(industry?: string): { slug: string; title: string; hook: string } {
  const i = (industry ?? '').toLowerCase();
  if (i.includes('real estate') || i.includes('investor') || i.includes('agent')) {
    return {
      slug: 'specialty-ai-tool',
      title: 'The Specialty AI Tool Playbook',
      hook:
        'How real estate operators are replacing $3K friction lines with $99 AI tools. Examples from staging, deal analysis, and FSBO listings.',
    };
  }
  if (i.includes('saas') || i.includes('founder') || i.includes('startup')) {
    return {
      slug: 'scope-an-ai-project',
      title: 'How to Scope an AI Project in 90 Minutes',
      hook:
        'The exact 90-minute scoping conversation we run before every build. Run it on your own project before anyone writes a line of code.',
    };
  }
  if (i.includes('agency') || i.includes('consult') || i.includes('service')) {
    return {
      slug: 'byok-pricing',
      title: 'The BYOK Pricing Playbook',
      hook:
        'Why most AI products underprice themselves into the ground, and the three pricing models we use across every engagement.',
    };
  }
  return {
    slug: '30-day-app-build',
    title: 'The 30-Day App Build Playbook',
    hook:
      'The exact week-by-week sequence we use to take an app from blank repo to live product in 30 days.',
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = (await req.json()) as LeadPayload;
    const { name, email, phone, company, industry, auditUrl, source, score, summary } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const firstName = name.split(' ')[0];
    const playbook = pickPlaybook(industry);

    await insertLead({
      type: 'audit',
      name,
      email,
      phone: phone ?? null,
      company: company ?? null,
      industry: industry ?? null,
      audit_url: auditUrl ?? null,
      audit_score: typeof score === 'number' ? score : null,
      source: source ?? 'audit',
      suggested_playbook: playbook.title,
      message: summary ?? null,
    });

    await resend.emails.send({
      from: 'AI Audit Leads <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Audit Lead: ${name}${company ? ` (${company})` : ''}`,
      html: leadNotification({
        type: 'AI Audit',
        name,
        email,
        fields: [
          ...(phone ? [{ label: 'Phone', value: phone }] : []),
          ...(company ? [{ label: 'Company', value: company }] : []),
          ...(industry ? [{ label: 'Industry', value: industry }] : []),
          ...(auditUrl ? [{ label: 'URL audited', value: auditUrl, isLink: true }] : []),
          ...(typeof score === 'number' ? [{ label: 'Score', value: String(score) }] : []),
          { label: 'Source', value: source ?? 'audit' },
          { label: 'Suggested playbook', value: playbook.title },
        ],
        message: summary,
        suggestedAction: 'Three-email drip queued automatically. Reply if you want to override.',
      }),
    });

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Your AI Audit is ready',
      html: clientEmail({
        preheader: 'Your readout is on the site. Here is what to do with it.',
        greeting: `Hi ${firstName},`,
        body:
          p('Thanks for running the AI Audit. You should be looking at your readout on the site right now.') +
          p('Here is what I would do with the audit result over the next week:') +
          `<ol style="margin:0 0 18px;padding-left:22px;color:#e9e1cf;line-height:1.75;font-size:16px">
            <li style="margin-bottom:10px">Look at your top three quick wins. Pick the one with the highest impact and the lowest dependency on anyone else.</li>
            <li style="margin-bottom:10px">Block 90 minutes this week to scope it. I have a playbook for exactly that conversation, coming in my next email.</li>
            <li>If the scope is more than 30 days of work, that is what we exist to ship. Come back to the Build Queue when you are ready.</li>
          </ol>` +
          p('If you want me to walk through your audit personally, the calendar is open below.'),
        cta: { label: 'Book a personal walkthrough', url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054' },
        secondary: { label: 'Join the Build Queue', url: 'https://modernmustardseed.com/build-queue' },
      }),
      scheduledAt: daysFromNow(0),
    });

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${playbook.title} (the one I'd read if I were you)`,
      html: clientEmail({
        preheader: 'The playbook I would point you at first based on your audit.',
        greeting: `${firstName},`,
        body:
          p('Following up on your audit. Based on what you submitted, this is the playbook I would point you at first:') +
          callout({
            label: 'Recommended reading',
            title: playbook.title,
            body: playbook.hook,
            href: `https://modernmustardseed.com/playbooks/${playbook.slug}`,
            cta: 'Read the playbook',
          }) +
          p('It is the same playbook I run on paying clients. Free to read. Free to run yourself.') +
          p('If after reading it you would rather have me run it for you, the Build Queue is the next step.'),
        cta: { label: 'Join the Build Queue', url: 'https://modernmustardseed.com/build-queue' },
      }),
      scheduledAt: daysFromNow(2),
    });

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'One last thing on your audit',
      html: clientEmail({
        preheader: 'Third and last note. Three things people typically do next.',
        greeting: `${firstName},`,
        body:
          p('This is the third and last note from me on your audit.') +
          p('Most people who run the audit do one of three things in the next month:') +
          `<ol style="margin:0 0 18px;padding-left:22px;color:#e9e1cf;line-height:1.75;font-size:16px">
            <li style="margin-bottom:10px">Ship something themselves using the playbook I sent. Best outcome by far.</li>
            <li style="margin-bottom:10px">Stall. Nothing happens. The audit gets forgotten. Shows up as a regret six months later.</li>
            <li>Bring me in. We scope it, fix-price it, and ship it in 30 days.</li>
          </ol>` +
          p('If you are in camp three, the Build Queue is open. Four slots a quarter. I review every entry personally and reply within 3 business days.') +
          p('If you are in camp one, ignore me. Send me a screenshot when it ships. I genuinely want to see it.'),
        cta: { label: 'Join the Build Queue', url: 'https://modernmustardseed.com/build-queue' },
      }),
      scheduledAt: daysFromNow(5),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Audit lead drip error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
