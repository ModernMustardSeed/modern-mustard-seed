/**
 * Save the post-purchase customization intake for a demo order and hand the
 * details to Sarah (email + the lead's cockpit thread). Keyed by hubId + the
 * Stripe session id, both unguessable; only pending/paid orders accept intake.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

const FIELD_LABELS: Record<string, string> = {
  hours: 'Business hours',
  services: 'What they sell or do',
  greeting: 'Phone greeting',
  domain: 'Website domain',
  brand: 'Look and feel',
  contact: 'Best contact',
  notes: 'Anything else',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  let body: { hubId?: string; sessionId?: string; answers?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const hubId = (body.hubId || '').trim();
  const sessionId = (body.sessionId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(hubId) || !sessionId || sessionId.length > 100) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Only known fields, hard length caps: this lands in email + the cockpit.
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.answers || {})) {
    if (FIELD_LABELS[k] && typeof v === 'string' && v.trim()) answers[k] = v.trim().slice(0, 1500);
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const { data: order } = await supabase
    .from('demo_orders')
    .select('id, outbound_lead_id, business_name, products, status')
    .eq('hub_demo_id', hubId)
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'unknown_order' }, { status: 404 });
  if (order.status === 'canceled') return NextResponse.json({ error: 'order_canceled' }, { status: 409 });

  const { error: upErr } = await supabase
    .from('demo_orders')
    .update({
      intake: answers,
      intake_at: new Date().toISOString(),
      ...(order.status === 'paid' || order.status === 'pending' ? { status: 'intake_done' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  if (upErr) {
    console.error('demo-order intake save failed:', upErr.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  const lines = Object.entries(answers)
    .map(([k, v]) => `<p><strong>${FIELD_LABELS[k]}:</strong> ${esc(v)}</p>`)
    .join('');

  if (order.outbound_lead_id) {
    try {
      await supabase.from('messages').insert({
        outbound_lead_id: order.outbound_lead_id,
        direction: 'inbound',
        channel: 'note',
        subject: 'Demo order intake (customization details)',
        body: Object.entries(answers).map(([k, v]) => `${FIELD_LABELS[k]}: ${v}`).join('\n'),
        snippet: 'Customization intake received',
      });
    } catch (err) {
      console.error('demo-order intake thread note failed', err);
    }
  }

  if (process.env.RESEND_API_KEY && lines) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `INTAKE IN: ${order.business_name || 'demo order'} (${Array.isArray(order.products) ? (order.products as string[]).join(', ') : ''})`,
        html: clientEmail({
          preheader: 'Customization details for a paid demo order.',
          eyebrow: 'DEMO ORDER INTAKE',
          greeting: `${order.business_name || 'A buyer'} filled in their details.`,
          body: `${lines}<p>The 7-day release clock is running. Everything is also on the lead's thread in the cockpit.</p>`,
          signature: 'The Demo Hub',
        }),
      });
    } catch (err) {
      console.error('demo-order intake email failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
