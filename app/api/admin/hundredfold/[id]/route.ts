import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import {
  getMemberById,
  listGates,
  listInterviews,
  listSessions,
  listSystems,
  setGateDone,
  updateMember,
  updateSystem,
} from '@/lib/hundredfold-store';
import { interviewCoverage } from '@/lib/hundredfold-interview';
import type { MemberStatus, SystemStatus } from '@/lib/hundredfold';
import { MEMBER_STATUSES, SYSTEM_STATUSES } from '@/lib/hundredfold';

export const runtime = 'nodejs';

/** Everything about one member, for the desk. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) return NextResponse.json({ ok: false, error: 'no such member' }, { status: 404 });

  const [interviews, gates, systems, sessions] = await Promise.all([
    listInterviews(id),
    listGates(id),
    listSystems(id),
    listSessions(id),
  ]);

  const latest = interviews.find((i) => i.status === 'complete') ?? interviews[0] ?? null;

  return NextResponse.json({
    ok: true,
    member,
    interviews,
    gates,
    systems,
    sessions,
    coverage: latest ? interviewCoverage(latest.answers ?? {}) : null,
  });
}

/**
 * Everything the desk can change about a member, in one route.
 *
 * `action` keeps gate toggles and system status changes out of the member patch
 * path, so a stray field can never rewrite someone's roadmap by accident.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: {
    action?: 'member' | 'gate' | 'system';
    status?: string;
    notes?: string;
    gateId?: string;
    done?: boolean;
    systemId?: string;
    systemStatus?: string;
    url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  if (body.action === 'gate' && body.gateId) {
    const ok = await setGateDone(body.gateId, body.done === true, user.email);
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  }

  if (body.action === 'system' && body.systemId) {
    if (body.systemStatus && !SYSTEM_STATUSES.includes(body.systemStatus as SystemStatus)) {
      return NextResponse.json({ ok: false, error: 'bad status' }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (body.systemStatus) {
      patch.status = body.systemStatus;
      if (body.systemStatus === 'live') patch.live_at = new Date().toISOString();
    }
    if (typeof body.url === 'string') patch.url = body.url.trim() || null;
    const ok = await updateSystem(body.systemId, patch);
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status) {
    if (!MEMBER_STATUSES.includes(body.status as MemberStatus)) {
      return NextResponse.json({ ok: false, error: 'bad status' }, { status: 400 });
    }
    patch.status = body.status;
    // Starting the clock is what turns an offer into a member, so it is stamped
    // here rather than left to whoever remembers to set a date.
    if (body.status === 'active') patch.started_at = new Date().toISOString();
  }
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: 'nothing to change' }, { status: 400 });
  }

  const ok = await updateMember(id, patch);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
