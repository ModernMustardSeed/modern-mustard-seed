import { NextRequest, NextResponse } from 'next/server';
import { sendViaResend } from '@/lib/send-email';

/**
 * Launch-list capture for the Eternal Optimist preorder store, which lives on
 * sarahscarano.com and posts here cross-origin. Each signup lands in Sarah's
 * inbox; when The Bindery deploys, the store's LEAD_ENDPOINT moves there and
 * this route can retire. The "company" field is the store's honeypot: filled
 * means bot, so answer ok and send nothing.
 */

const ORIGIN = 'https://sarahscarano.com';

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return cors(NextResponse.json({ ok: false }, { status: 400 }));
  }
  const email = String(body.email || '').trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return cors(NextResponse.json({ ok: false }, { status: 400 }));
  }
  if (body.company) return cors(NextResponse.json({ ok: true }));

  const sent = await sendViaResend({
    from: 'Eternal Optimist <sarah@modernmustardseed.com>',
    to: 'sarah@modernmustardseed.com',
    replyTo: email,
    subject: `Launch list: ${email}`,
    text: [
      `${email} joined the Eternal Optimist launch list.`,
      '',
      `source: ${String(body.source || 'landing')}`,
      `utm_source: ${String(body.medium || 'none')}`,
      `utm_campaign: ${String(body.campaign || 'none')}`,
      'page: sarahscarano.com/eternal-optimist',
    ].join('\n'),
  });
  if (!sent.ok) return cors(NextResponse.json({ ok: false }, { status: 502 }));
  return cors(NextResponse.json({ ok: true }));
}
