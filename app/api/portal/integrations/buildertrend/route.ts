import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { buildertrendStatus, connectBuildertrend, disconnectBuildertrend } from '@/lib/buildertrend';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE OWNER CONNECTS THEIR OWN CRM. They paste the Lead Contact Form embed
 * from Buildertrend; we prove it against Buildertrend, keep the token
 * encrypted, and from then on every website lead lands in their pipeline.
 * Scoped by the signed-in email. No id in the request, ever.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project || project.crm !== 'buildertrend') return NextResponse.json({ buildertrend: null });
  const status = await buildertrendStatus(sb, session.email);
  const { count: pushed } = await sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', session.email).not('crm_pushed_at', 'is', null);
  const { data: failed } = await sb.from('client_leads').select('id, name, crm_error, created_at').eq('client_email', session.email).is('crm_pushed_at', null).not('crm_error', 'is', null).order('created_at', { ascending: false }).limit(5);
  return NextResponse.json({ buildertrend: { ...status, pushed: pushed ?? 0, failed: failed ?? [] } });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!project || project.crm !== 'buildertrend') return NextResponse.json({ error: 'Buildertrend is not part of this account.' }, { status: 404 });
  let body: { embed?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const res = await connectBuildertrend(sb, session.email, String(body.embed ?? ''), session.email);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      subject: `${project.business} connected Buildertrend (builder ${res.builderId})`,
      text: `${session.email} pasted their Lead Contact Form. Builder id ${res.builderId}. Captcha on the form: ${res.captcha ? 'yes, the hand-off may be refused until Buildertrend turns it off' : 'no'}. Every website lead from now on is pushed in.`,
    });
  } catch {
    /* the connection is saved either way */
  }
  return NextResponse.json({ ok: true, builderId: res.builderId, captcha: res.captcha });
}

export async function DELETE() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  await disconnectBuildertrend(sb, session.email);
  return NextResponse.json({ ok: true });
}
