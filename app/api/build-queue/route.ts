import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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

// Match the applicant's idea to the most relevant playbook.
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

    // 1. Notify Sarah
    await resend.emails.send({
      from: 'Build Queue <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Build Queue: ${businessName} (${timelineLabel})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
          <h2 style="color:#C8A415">New Build Queue Application</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;width:160px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Business / idea</strong></td><td style="padding:8px 0">${businessName}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Revenue</strong></td><td style="padding:8px 0">${revenueLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Timeline</strong></td><td style="padding:8px 0">${timelineLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Suggested playbook</strong></td><td style="padding:8px 0">${playbook.title}</td></tr>
          </table>
          <h3 style="margin-top:24px;color:#333">What they want built</h3>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;border-left:4px solid #C8A415">
            ${String(ideaDescription).replace(/\n/g, '<br>')}
          </div>
          <p style="color:#888;font-size:12px;margin-top:20px">Auto-reply sent to applicant. They are expecting a personal response within 3 business days.</p>
        </div>
      `,
    });

    // 2. Auto-reply to the applicant
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `You're on the list, ${firstName}`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p>${firstName},</p>
  <p>Got your Build Queue entry for <strong>${businessName}</strong>. I read every one personally.</p>
  <p>Here is what happens next:</p>
  <ol>
    <li><strong>Within 3 business days</strong>, I will email you back with one of three answers: a fit-check, a request for a quick call, or an honest "not the right match and here is why."</li>
    <li>If we are a fit, the next step is a 30-minute scoping call. You leave that call with a fixed scope, fixed timeline, and a fixed quote. No decks.</li>
    <li>If we are not a fit, I will point you somewhere useful. That part matters too.</li>
  </ol>
  <p>While you wait, the playbook I would point you at first based on what you submitted:</p>
  <p style="background:#FFF8E1;border-left:4px solid #C8A415;padding:14px;margin:16px 0">
    <strong style="font-size:16px;color:#333">${playbook.title}</strong><br>
    <span style="color:#555">${playbook.hook}</span><br>
    <a href="https://modernmustardseed.com/playbooks/${playbook.slug}" style="color:#C8A415;font-weight:600">Read it here</a>
  </p>
  <p>If your situation is urgent and you would rather skip the queue, the calendar is open at <a href="https://modernmustardseed.zohobookings.com/#/4764600000000052054" style="color:#C8A415">this link</a>. Otherwise I will be in touch shortly.</p>
  <p>Talk soon.</p>
  <p>Best,<br><strong>Sarah</strong><br>Modern Mustard Seed</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#888">You are getting this because you applied to the Build Queue at modernmustardseed.com.</p>
</body></html>
      `,
    });

    // TODO: when Supabase is wired here, also insert this lead into a `build_queue_leads` table.
    // env var needed: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Build queue submission error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
