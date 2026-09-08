import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { listVoiceCalls, listVoiceAgents } from '@/lib/voice-calls';

export const runtime = 'nodejs';

/**
 * A CLIENT'S OWN CALLS.
 *
 * Scoped by the session email and nothing else. There is no agent id or call
 * id in the request: the calls are looked up FROM the signed-in email through
 * voice_agents.client_email, so a client cannot read another client's
 * transcripts by editing a URL. Cost never leaves the server.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [list, agents] = await Promise.all([listVoiceCalls({ clientEmail: session.email, limit: 300 }), listVoiceAgents()]);
  const mine = agents.filter((a) => (a.client_email ?? '').toLowerCase() === session.email.toLowerCase());
  if (!list.ok) return NextResponse.json({ ok: false, rows: [], agents: mine, reason: list.reason });

  const rows = list.rows.map((r) => ({
    id: r.vapi_call_id,
    agentName: r.agent_name,
    direction: r.direction,
    callerNumber: r.caller_number,
    callerName: r.caller_name,
    lineNumber: r.line_number,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    endedReason: r.ended_reason,
    summary: r.summary,
    transcript: r.transcript,
    messages: r.messages,
    recordingUrl: r.recording_url,
    transferred: r.transferred,
    transferredTo: r.transferred_to,
    booked: r.booked,
  }));
  return NextResponse.json({ ok: true, rows, agents: mine.map((a) => ({ name: a.name, business: a.business })) });
}
