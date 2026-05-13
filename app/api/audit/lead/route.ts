import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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

// Pick a playbook based on what the audit captured. Falls back to the
// 30-day app build playbook if industry is unknown.
function pickPlaybook(industry?: string): { slug: string; title: string; hook: string } {
  const i = (industry ?? '').toLowerCase();
  if (i.includes('real estate') || i.includes('investor') || i.includes('agent')) {
    return {
      slug: 'specialty-ai-tool',
      title: 'The Specialty AI Tool Playbook',
      hook:
        'How real estate operators are replacing $3K friction lines with $99 AI tools. With examples from staging, deal analysis, and FSBO listings.',
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

    // 1. Notify Sarah immediately
    await resend.emails.send({
      from: 'AI Audit Leads <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Audit Lead: ${name}${company ? ` (${company})` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
          <h2 style="color:#C8A415">New AI Audit Lead</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;width:160px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:8px 0;color:#666"><strong>Phone</strong></td><td style="padding:8px 0">${phone}</td></tr>` : ''}
            ${company ? `<tr><td style="padding:8px 0;color:#666"><strong>Company</strong></td><td style="padding:8px 0">${company}</td></tr>` : ''}
            ${industry ? `<tr><td style="padding:8px 0;color:#666"><strong>Industry</strong></td><td style="padding:8px 0">${industry}</td></tr>` : ''}
            ${auditUrl ? `<tr><td style="padding:8px 0;color:#666"><strong>URL audited</strong></td><td style="padding:8px 0"><a href="${auditUrl}">${auditUrl}</a></td></tr>` : ''}
            ${typeof score === 'number' ? `<tr><td style="padding:8px 0;color:#666"><strong>Score</strong></td><td style="padding:8px 0">${score}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#666"><strong>Source</strong></td><td style="padding:8px 0">${source ?? 'audit'}</td></tr>
          </table>
          ${summary ? `<h3 style="margin-top:20px;color:#333">Summary</h3><div style="background:#f9f9f9;padding:14px;border-radius:6px;border-left:4px solid #C8A415">${summary}</div>` : ''}
          <p style="color:#888;font-size:12px;margin-top:20px">Three-email drip queued for the applicant. Ping if you want to override.</p>
        </div>
      `,
    });

    // 2. Day 0: immediate confirmation with audit recap
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Your AI Audit is ready',
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p>Hi ${firstName},</p>
  <p>Thanks for running the AI Audit. You should be looking at your readout on the site right now. If you want me to walk you through it personally, the calendar is open at <a href="https://modernmustardseed.zohobookings.com/#/4764600000000052054" style="color:#C8A415">this link</a>.</p>
  <p>Here is what I would do with the audit result over the next week:</p>
  <ol>
    <li>Look at your top three "quick wins." Pick the one with the highest impact and the lowest dependency on anyone else.</li>
    <li>Block 90 minutes this week to scope it. I have a playbook for exactly that conversation, linked in my next email.</li>
    <li>If the scope is more than 30 days of work, that is what we exist to ship. Come back to the <a href="https://modernmustardseed.com/build-queue" style="color:#C8A415">Build Queue</a>.</li>
  </ol>
  <p>Looking forward to seeing what you build.</p>
  <p>Best,<br><strong>Sarah</strong><br>Modern Mustard Seed</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#888">You are getting this because you ran the free AI Audit at modernmustardseed.com.</p>
</body></html>
      `,
      scheduledAt: daysFromNow(0),
    });

    // 3. Day 2: relevant playbook
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${playbook.title} (the one I would read if I were you)`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p>${firstName},</p>
  <p>Following up on your audit. Based on what you submitted, the playbook I would point you at first is this one:</p>
  <p style="background:#FFF8E1;border-left:4px solid #C8A415;padding:14px;margin:16px 0">
    <strong style="font-size:16px;color:#333">${playbook.title}</strong><br>
    <span style="color:#555">${playbook.hook}</span><br>
    <a href="https://modernmustardseed.com/playbooks/${playbook.slug}" style="color:#C8A415;font-weight:600">Read it here</a>
  </p>
  <p>It is the same playbook I run on paying clients. Free to read. Free to run yourself. The whole point of these is to give you the option to build it on your own first.</p>
  <p>If after reading it you would rather have me run it for you, the <a href="https://modernmustardseed.com/build-queue" style="color:#C8A415">Build Queue</a> is the next step.</p>
  <p>Sarah</p>
</body></html>
      `,
      scheduledAt: daysFromNow(2),
    });

    // 4. Day 5: Build Queue invite
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'One last thing on your audit',
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p>${firstName},</p>
  <p>This is the third and last note from me on your audit.</p>
  <p>Most people who run the audit do one of three things in the next month:</p>
  <ol>
    <li>Ship something themselves using the playbook I sent. Best outcome by far.</li>
    <li>Stall. Nothing happens. The audit gets forgotten. Usually shows up as a regret six months later.</li>
    <li>Bring me in. We scope it, fix-price it, and ship it in 30 days.</li>
  </ol>
  <p>If you are in camp three, the <a href="https://modernmustardseed.com/build-queue" style="color:#C8A415"><strong>Build Queue</strong></a> is open. Four slots a quarter. I review every entry personally and reply within 3 business days.</p>
  <p>If you are in camp one, ignore me. Send me a screenshot when it ships. I genuinely want to see it.</p>
  <p>Sarah</p>
</body></html>
      `,
      scheduledAt: daysFromNow(5),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Audit lead drip error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
