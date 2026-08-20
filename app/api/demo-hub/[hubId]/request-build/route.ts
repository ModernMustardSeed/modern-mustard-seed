import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { buildSiteBrief, forgeLeadVoiceDemo } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * "Forge it for me now", from the suite page itself (Sarah, 2026-08-20: the
 * outro used to say call Mr. Mustard; a prospect holding one piece should be
 * able to queue the rest on the spot). Public and hub-scoped: knowing a hub's
 * unguessable id is the credential, same trust model as viewing the hub.
 *
 * Queues at most what is actually missing, through the same paths the cockpit
 * uses: outbound_demo_sites for the website (the local forge worker builds
 * it), forgeLeadVoiceDemo for the agent. The suite page renders live off the
 * lead row, so finished pieces appear on their own, and the suite-ready
 * announcement (hooks/suite-ready, film-gated) emails them when the build is
 * done, which is why the email lands on the lead here.
 *
 * Throttled per lead so a refresh-happy visitor cannot stack queue rows.
 */
export async function POST(req: Request, { params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(hubId)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { wants?: unknown; email?: unknown; note?: unknown };
  const wants = Array.isArray(body.wants) ? body.wants.filter((w): w is 'voice' | 'site' => w === 'voice' || w === 'site') : [];
  const email = typeof body.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(body.email.trim()) ? body.email.trim().toLowerCase() : null;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  if (!wants.length) return NextResponse.json({ message: 'Pick at least one thing to forge.' }, { status: 400 });

  const { data: lead } = await sb.from('outbound_leads').select('*').eq('hub_demo_id', hubId).maybeSingle();
  if (!lead) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const l = lead as OutboundLead;

  // One request per lead per 5 minutes. app_state key insert is the lock.
  const key = `hubreq:${l.id}`;
  const { data: prior } = await sb.from('app_state').select('value').eq('key', key).maybeSingle();
  const priorAt = (prior?.value as { at?: string } | null)?.at;
  if (priorAt && Date.now() - new Date(priorAt).getTime() < 5 * 60_000) {
    return NextResponse.json({ message: 'Already queued a minute ago. The forge is on it.' }, { status: 429 });
  }
  await sb.from('app_state').upsert({ key, value: { at: new Date().toISOString() } });

  if (email && !l.email) {
    await sb.from('outbound_leads').update({ email }).eq('id', l.id);
    l.email = email;
  }

  const queued: string[] = [];

  if (wants.includes('voice') && !l.demo_run_id) {
    const voice = await forgeLeadVoiceDemo(sb, l);
    if (voice.ok) queued.push('voice agent');
  }

  const siteMissing = !l.site_demo_id || l.site_demo_status === 'failed';
  if (wants.includes('site') && siteMissing) {
    const { data: row } = await sb
      .from('outbound_demo_sites')
      .insert({ lead_id: l.id, business_name: l.business_name, brief: buildSiteBrief(l, l.demo_url), status: 'queued' })
      .select('id')
      .single();
    if (row) {
      const siteUrl = `${SITE.url}/demo/site/${row.id}`;
      await sb.from('outbound_leads').update({ site_demo_id: row.id, site_demo_url: siteUrl, site_demo_status: 'queued' }).eq('id', l.id);
      queued.push('website');
    }
  }

  // The cockpit inbox hears about it either way: a self-served build request
  // is the hottest signal a suite can send.
  await sb.from('messages').insert({
    outbound_lead_id: l.id,
    direction: 'inbound',
    channel: 'note',
    from_addr: l.email || 'their demo suite',
    to_addr: 'cockpit',
    subject: `Suite request: ${wants.join(' + ')}${queued.length ? '' : ' (already queued or built)'}`,
    snippet: `They asked from their own suite page. Queued: ${queued.join(', ') || 'nothing new'}.${note ? ` Note from them: ${note}` : ''}${email ? ` Email: ${email}` : ''}`,
    read: false,
    occurred_at: new Date().toISOString(),
  }).then(null, () => {});

  return NextResponse.json({ ok: true, queued });
}
