import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification, p, callout } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

const REVENUE_LABELS: Record<string, string> = {
  'pre-revenue': 'Just getting started',
  'under-100k': 'Under $100K',
  '100k-500k': '$100K to $500K',
  '500k-1m': '$500K to $1M',
  '1m-plus': '$1M+',
};

const TIMELINE_LABELS: Record<string, string> = {
  'this-quarter': 'This quarter',
  'next-quarter': 'Next quarter',
  exploring: 'Exploring',
};

function pickPlaybook(desc: string): { slug: string; title: string; hook: string } {
  const t = (desc ?? '').toLowerCase();
  if (t.includes('voice') || t.includes('phone') || t.includes('call')) {
    return {
      slug: '14-day-voice-agent',
      title: 'The 14-Day Voice Agent Playbook',
      hook: 'Every step we run to ship a production voice agent in 14 days.',
    };
  }
  if (t.includes('price') || t.includes('billing') || t.includes('stripe') || t.includes('subscription')) {
    return {
      slug: 'byok-pricing',
      title: 'The BYOK Pricing Playbook',
      hook: 'When subscription, metered, or BYOK pricing wins for AI products.',
    };
  }
  if (t.includes('industry') || t.includes('real estate') || t.includes('tool') || t.includes('niche')) {
    return {
      slug: 'specialty-ai-tool',
      title: 'The Specialty AI Tool Playbook',
      hook: 'Find the $3K friction in any industry and build the $99 alternative.',
    };
  }
  if (t.includes('scope') || t.includes('plan') || t.includes('roadmap')) {
    return {
      slug: 'scope-an-ai-project',
      title: 'How to Scope an AI Project in 90 Minutes',
      hook: 'The exact 90-minute scoping conversation we run before every build.',
    };
  }
  return {
    slug: '30-day-app-build',
    title: 'The 30-Day App Build Playbook',
    hook: 'Week-by-week breakdown of how we ship apps in 30 days.',
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = await req.json();
    const { name, email, businessName, ideaDescription, revenueRange, timeline } = body as Record<string, string>;

    if (!name || !email || !businessName || !ideaDescription || !revenueRange || !timeline) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const firstName = name.split(' ')[0];
    const revenueLabel = REVENUE_LABELS[revenueRange] ?? revenueRange;
    const timelineLabel = TIMELINE_LABELS[timeline] ?? timeline;
    const playbook = pickPlaybook(ideaDescription);

    await insertLead({
      type: 'build-queue',
      name,
      email,
      business_name: businessName,
      idea_description: ideaDescription,
      revenue_range: revenueLabel,
      timeline: timelineLabel,
      suggested_playbook: playbook.title,
    });

    await resend.emails.send({
      from: 'Build Queue <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Build Queue: ${businessName} (${timelineLabel})`,
      html: leadNotification({
        type: 'Build Queue',
        name,
        email,
        fields: [
          { label: 'Business / idea', value: businessName },
          { label: 'Revenue', value: revenueLabel },
          { label: 'Timeline', value: timelineLabel },
          { label: 'Suggested playbook', value: playbook.title },
        ],
        message: ideaDescription,
        suggestedAction: 'Reply within 3 business days',
      }),
    });

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `You're on the list, ${firstName}`,
      html: clientEmail({
        preheader: 'I read every entry personally. Reply within 3 business days.',
        greeting: `${firstName},`,
        body:
          p(`Got your Build Queue entry for <strong>${businessName}</strong>. I read every one personally.`) +
          p('Here is what happens next:') +
          `<ol style="margin:0 0 18px;padding-left:22px;color:#1a1410;line-height:1.75">
            <li style="margin-bottom:10px"><strong>Within 3 business days</strong>, I will email you back: a fit-check, a request for a quick call, or an honest "not the right match and here is why."</li>
            <li style="margin-bottom:10px">If we are a fit, the next step is a 30-minute scoping call. You leave that call with a fixed scope, fixed timeline, and a fixed quote. No decks.</li>
            <li>If we are not a fit, I will point you somewhere useful. That part matters too.</li>
          </ol>` +
          p('While you wait, the playbook I would point you at first based on what you submitted:') +
          callout({
            label: 'Recommended reading',
            title: playbook.title,
            body: playbook.hook,
            href: `https://modernmustardseed.com/playbooks/${playbook.slug}`,
            cta: 'Read the playbook',
          }) +
          p('If your situation is urgent and you would rather skip the queue, the calendar is open below.'),
        cta: { label: 'Book a discovery call', url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054' },
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Build queue submission error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
