import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { getPlannerVertical } from '@/data/ads';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

/**
 * Lead capture for the /ads Ad Budget Planner. Takes the visitor's email plus
 * their planner inputs (industry, daily budget, average job value), records
 * the lead, emails them their plan, and pings Sarah with a hot-lead note.
 * Estimates only, never promises: the copy stays claim-safe.
 */
export async function POST(req: Request) {
  let payload: {
    email?: unknown;
    vertical?: unknown;
    dailyBudget?: unknown;
    jobValue?: unknown;
    company?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email || !email.includes('@') || email.length > 200) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const vertical = getPlannerVertical(typeof payload.vertical === 'string' ? payload.vertical : 'other');
  const dailyBudget = Math.min(200, Math.max(5, Number(payload.dailyBudget) || 15));
  const jobValue = Math.min(50000, Math.max(10, Number(payload.jobValue) || vertical.defaultJobUsd));

  const monthly = dailyBudget * 30;
  const leadsLow = Math.max(1, Math.floor(monthly / vertical.cplHigh));
  const leadsHigh = Math.max(leadsLow, Math.round(monthly / vertical.cplLow));
  const closedLow = Math.max(1, Math.round(leadsLow / 3));
  const closedHigh = Math.max(closedLow, Math.round(leadsHigh / 3));
  const breakEvenJobs = Math.max(1, Math.ceil((monthly + 297) / jobValue));

  try {
    await insertLead({
      type: 'contact',
      email,
      industry: vertical.label,
      source: 'ads-planner',
      notes: `[ads plan] $${dailyBudget}/day, avg job $${jobValue}, est ${leadsLow}-${leadsHigh} leads/mo`,
    });
  } catch (e) {
    console.error('ads plan insertLead', e);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = resendClient();
    const firstName = email.split('@')[0];
    const planRows = `
      <p><strong>Your starting plan (${vertical.label.toLowerCase()}):</strong></p>
      <p>
        Daily budget: <strong>$${dailyBudget}/day</strong> (about $${monthly.toLocaleString()}/mo to Meta, on your card, never marked up)<br>
        Typical cost per lead in your trade: <strong>$${vertical.cplLow} to $${vertical.cplHigh}</strong><br>
        Estimated inquiries at that budget: <strong>${leadsLow} to ${leadsHigh} a month</strong><br>
        If you close 1 in 3: <strong>${closedLow} to ${closedHigh} new customers a month</strong><br>
        At $${jobValue.toLocaleString()} per customer, covering the ads plus our $297 management takes about <strong>${breakEvenJobs} ${breakEvenJobs === 1 ? 'job' : 'jobs'}</strong>.
      </p>
      <p>These are honest planning ranges from typical local lead campaigns, not promises. Your market, offer, and season all move the numbers, which is exactly what weekly management is for.</p>`;

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your ad plan (and the number to start with)',
        html: clientEmail({
          preheader: `$${dailyBudget}/day is your starting number. Here is what it should bring back.`,
          eyebrow: 'MUSTARD BROADCAST',
          greeting: `${firstName}, here is your plan.`,
          body: `${planRows}<p>When you are ready, we produce your commercial, launch this exact plan in your own ad account, and manage it every week. You answer the phone.</p>`,
          cta: { label: 'See the packages', url: `${SITE.url}/ads#packages` },
          signature: 'Sarah',
        }),
      });
    } catch (e) {
      console.error('ads plan client email', e);
    }

    try {
      await resend.emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `AD PLAN lead: ${email} (${vertical.label})`,
        html: clientEmail({
          preheader: 'Someone ran the Ad Budget Planner on /ads.',
          eyebrow: 'BROADCAST LEAD',
          greeting: 'A planner lead landed.',
          body: `<p><strong>${email}</strong> planned ${vertical.label.toLowerCase()} ads at <strong>$${dailyBudget}/day</strong> (avg job $${jobValue.toLocaleString()}).</p><p>They were emailed their plan with a CTA to the packages. A same-day personal reply usually closes these.</p>`,
          signature: 'The Broadcast Desk',
        }),
      });
    } catch (e) {
      console.error('ads plan owner email', e);
    }
  }

  return NextResponse.json({ ok: true });
}
