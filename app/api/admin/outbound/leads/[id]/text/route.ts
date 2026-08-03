import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { smsHref, toE164, toAscii } from '@/lib/tap-text';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * Tap-to-text for a lead on the dial floor. This route does NOT send anything.
 *
 * GET  -> a written draft plus the `sms:` deep link that opens Messages.
 * POST -> logs on the thread that the text actually went out.
 *
 * Sending happens from the admin's own handset, which is person-to-person and so
 * needs no A2P 10DLC carrier registration. That is the whole point: MMS spent
 * weeks stuck in A2P vetting and retired the Twilio stack on 2026-08-01. See
 * lib/tap-text.ts before reintroducing any provider here.
 *
 * The draft leads with whatever the forge has already built for them, because a
 * link to their own demo is the highest-intent thing we ever send. Priority
 * mirrors the outreach email: the Demo Suite hub first (it holds everything),
 * then the demo website, then the business OS, then the bare voice agent.
 */

/**
 * "Hi Dave," when we know who we are talking to, plain "Hi," when we do not.
 * Never "Hi Bigfoot Flooring," which is how a mail merge greets a company and
 * instantly reads as a blast rather than a person texting.
 */
function greeting(lead: Pick<OutboundLead, 'contact_name'>): string {
  const n = (lead.contact_name ?? '').trim().split(/\s+/)[0];
  return n ? `Hi ${n},` : 'Hi,';
}

function bestLink(lead: OutboundLead): { url: string; noun: string } | null {
  if (lead.hub_demo_url) return { url: lead.hub_demo_url, noun: 'everything I put together' };
  if (lead.site_demo_url && lead.site_demo_status === 'ready') return { url: lead.site_demo_url, noun: 'the website I built' };
  if (lead.os_demo_url) return { url: lead.os_demo_url, noun: 'the command center I set up' };
  if (lead.demo_url) return { url: lead.demo_url, noun: 'the AI receptionist I built' };
  return null;
}

function draftFor(lead: OutboundLead): string {
  const hi = greeting(lead);
  const link = bestLink(lead);
  if (link) {
    return toAscii(
      `${hi} it's Sarah with Modern Mustard Seed. ` +
      `Here is ${link.noun} for ${lead.business_name}: ${link.url} ` +
      `Have a look when you get a second and tell me what you think.`
    );
  }
  return toAscii(
    `${hi} it's Sarah with Modern Mustard Seed. ` +
    `Thanks for the minute on the phone. ` +
    `I can put together a quick look at what this would do for ${lead.business_name} if you want it. ` +
    `Worth a few minutes?`
  );
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const lead = data as OutboundLead;

  const body = draftFor(lead);
  const phone = toE164(lead.phone);

  return NextResponse.json({
    body,
    phone,
    hasPhone: !!phone,
    hasLink: !!bestLink(lead),
    href: smsHref(lead.phone, body),
  });
}

export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  let payload: { body?: string } = {};
  try { payload = await req.json(); } catch { /* validated below */ }
  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Nothing to log.' }, { status: 400 });

  const { data, error } = await guard.supabase
    .from('outbound_leads').select('id,business_name,phone').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const phone = toE164(data.phone);
  if (!phone) return NextResponse.json({ error: 'No usable phone number on this lead.' }, { status: 400 });

  const occurred_at = new Date().toISOString();
  const { error: insErr } = await guard.supabase.from('messages').insert({
    outbound_lead_id: id,
    direction: 'outbound',
    channel: 'sms',
    from_addr: 'Sarah (phone)',
    to_addr: phone,
    subject: null,
    snippet: body.slice(0, 500),
    body: body.slice(0, 20_000),
    read: true,
    occurred_at,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, occurred_at });
}
