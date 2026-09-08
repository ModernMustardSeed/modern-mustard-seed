import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { assignVoiceAgent, listVoiceAgents, listVoiceCalls, syncVoiceCalls, type CallKind } from '@/lib/voice-calls';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE CALL LOG, for the admin.
 *
 * GET  ?client=<email>&kind=<kind>&agent=<assistantId>&sync=0|1|full
 *      Pulls fresh calls from Vapi first (incremental unless sync=full, skipped
 *      on sync=0), then lists. Returns the agent roster and the client book so
 *      the page can assign agents to clients without a second round trip.
 * PATCH { assistantId, clientEmail | null, kind?, business? }
 *      Assigns an agent to a client and re-attributes its calls.
 */

const KINDS: CallKind[] = ['studio', 'demo', 'client', 'partner', 'probe', 'other'];

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const client = (url.searchParams.get('client') ?? '').trim() || null;
  const kindParam = (url.searchParams.get('kind') ?? '').trim();
  const kind = KINDS.includes(kindParam as CallKind) ? (kindParam as CallKind) : null;
  const agent = (url.searchParams.get('agent') ?? '').trim() || null;
  const syncMode = url.searchParams.get('sync') ?? '1';

  let sync: Awaited<ReturnType<typeof syncVoiceCalls>> | null = null;
  if (syncMode !== '0') {
    try {
      sync = await syncVoiceCalls({ full: syncMode === 'full' });
    } catch (err) {
      console.error('voice call sync threw', err);
      sync = { ok: false, pulled: 0, written: 0, reason: 'error' };
    }
  }

  const list = await listVoiceCalls({ clientEmail: client, kind, assistantId: agent, includeProbes: kind === 'probe' });
  if (!list.ok) return NextResponse.json({ ok: false, rows: [], agents: [], clients: [], reason: list.reason, sync });

  const sb = getSupabase();
  const [agents, clientsRes] = await Promise.all([
    listVoiceAgents(),
    sb ? sb.from('clients').select('email,name,company').order('company', { ascending: true }).limit(500) : Promise.resolve({ data: [] }),
  ]);
  const clients = ((clientsRes.data ?? []) as { email: string; name: string | null; company: string | null }[]).map((c) => ({
    email: c.email,
    label: c.company || c.name || c.email,
  }));

  // The lead behind a caller, matched on the last ten digits of the number, so
  // the drawer can open their card and their audit without a second search.
  const leadByPhone = new Map<string, { id: string; name: string | null; email: string | null; company: string | null; audit_url: string | null }>();
  if (sb) {
    const { data: leads } = await sb.from('leads').select('id,name,email,company,phone,audit_url').not('phone', 'is', null).order('created_at', { ascending: false }).limit(2000);
    for (const l of (leads ?? []) as { id: string; name: string | null; email: string | null; company: string | null; phone: string | null; audit_url: string | null }[]) {
      const key = String(l.phone ?? '').replace(/\D/g, '').slice(-10);
      if (key.length === 10 && !leadByPhone.has(key)) leadByPhone.set(key, { id: l.id, name: l.name, email: l.email, company: l.company, audit_url: l.audit_url });
    }
  }
  const rows = list.rows.map((r) => {
    const key = String(r.caller_number ?? '').replace(/\D/g, '').slice(-10);
    return { ...r, lead: key.length === 10 ? leadByPhone.get(key) ?? null : null };
  });

  return NextResponse.json({ ok: true, rows, agents, clients, sync, syncedAt: new Date().toISOString() });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { assistantId?: string; clientEmail?: string | null; kind?: string; business?: string | null }
    | null;
  const assistantId = (body?.assistantId ?? '').trim();
  if (!assistantId) return NextResponse.json({ error: 'assistantId is required' }, { status: 400 });
  const clientEmail = body?.clientEmail ? String(body.clientEmail).trim().toLowerCase() : null;
  if (clientEmail && !clientEmail.includes('@')) return NextResponse.json({ error: 'That is not an email address' }, { status: 400 });
  const kind = body?.kind && KINDS.includes(body.kind as CallKind) ? (body.kind as CallKind) : undefined;
  const res = await assignVoiceAgent({ assistantId, clientEmail, kind, business: body?.business ?? null });
  if (!res.ok) return NextResponse.json({ error: res.error ?? 'Could not save' }, { status: 500 });
  return NextResponse.json({ ok: true, agents: await listVoiceAgents() });
}
