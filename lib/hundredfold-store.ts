/**
 * Storage for HUNDREDFOLD. Members, interviews, the systems we build them, the
 * gates they clear, and the sessions we hold.
 *
 * Best-effort everywhere a public surface reads it (a missing Supabase must
 * never take the landing page down), strict everywhere a member's own data is
 * written.
 */

import { getSupabase } from './supabase';
import { HUNDREDFOLD, type MemberStatus, type SystemStatus } from './hundredfold';
import type { RoadmapReport } from './roadmap-shape';
import type { BuiltOffer, PlannedGate, PlannedSystem } from './hundredfold-synthesis';
import type { InterviewChannel, Turn } from './hundredfold-interview';

export type Member = {
  id: string;
  email: string;
  name: string | null;
  business_name: string | null;
  host: string | null;
  phone: string | null;
  status: MemberStatus;
  roadmap_slug: string | null;
  deep_roadmap: RoadmapReport | null;
  offer: BuiltOffer | null;
  setup_cents: number | null;
  monthly_cents: number | null;
  price_locked_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  started_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Interview = {
  id: string;
  member_id: string | null;
  email: string | null;
  business_name: string | null;
  url: string | null;
  channel: InterviewChannel;
  status: 'open' | 'complete' | 'abandoned';
  transcript: Turn[];
  answers: Record<string, string>;
  call_id: string | null;
  summary: string | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
};

export type SystemRow = {
  id: string;
  member_id: string;
  name: string;
  window_no: number | null;
  kind: string | null;
  summary: string | null;
  status: SystemStatus;
  url: string | null;
  gives_back: string | null;
  created_at: string;
  live_at: string | null;

  /* What the factory actually made (088 + 089). */
  assets: unknown[] | null;
  brief: string | null;
  approved_at: string | null;
  approved_by: string | null;
  spend_cents: number | null;
  error: string | null;
  /** The authored structure behind a PDF, so a revision edits it rather than rewriting it. */
  doc: unknown | null;
  /** Bumped on every build and every revision; `hundredfold_versions` holds the history. */
  version: number | null;
  /** A deployable page or tool: one self-contained document, served at public_slug. */
  artifact_html: string | null;
  public_slug: string | null;
  published_at: string | null;
  engine: string | null;
  built_at: string | null;
};

export type GateRow = {
  id: string;
  member_id: string;
  window_no: number;
  kind: 'move' | 'gate';
  label: string;
  target: string | null;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  sort: number;
};

export type SessionRow = {
  id: string;
  member_id: string;
  held_at: string;
  window_no: number | null;
  title: string | null;
  notes: string | null;
  recording_url: string | null;
  actions: { text: string; done?: boolean }[];
};

const normalize = (email: string) => email.trim().toLowerCase();

/* -------------------------------------------------------------------------- */
/* Members                                                                     */
/* -------------------------------------------------------------------------- */

export async function upsertMember(input: {
  email: string;
  name?: string | null;
  business_name?: string | null;
  host?: string | null;
  phone?: string | null;
  roadmap_slug?: string | null;
  status?: MemberStatus;
}): Promise<Member | null> {
  const client = getSupabase();
  if (!client) return null;
  const email = normalize(input.email);

  const existing = await getMemberByEmail(email);
  if (existing) {
    // Never downgrade a status by re-applying. Someone who is already active and
    // runs another roadmap must not be dropped back to 'applicant'.
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ['name', 'business_name', 'host', 'phone', 'roadmap_slug'] as const) {
      if (input[k] && !existing[k]) patch[k] = input[k];
    }
    if (input.status && existing.status === 'applicant') patch.status = input.status;
    const { data, error } = await client
      .from('hundredfold_members')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) {
      console.error('hundredfold-store: member update failed', error);
      return existing;
    }
    return data as Member;
  }

  const { data, error } = await client
    .from('hundredfold_members')
    .insert({
      email,
      name: input.name ?? null,
      business_name: input.business_name ?? null,
      host: input.host ?? null,
      phone: input.phone ?? null,
      roadmap_slug: input.roadmap_slug ?? null,
      status: input.status ?? 'applicant',
      setup_cents: HUNDREDFOLD.setupCents,
      monthly_cents: HUNDREDFOLD.monthlyCents,
    })
    .select('*')
    .single();
  if (error) {
    console.error('hundredfold-store: member insert failed', error);
    return null;
  }
  return data as Member;
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client
    .from('hundredfold_members')
    .select('*')
    .eq('email', normalize(email))
    .maybeSingle();
  return (data as Member) ?? null;
}

export async function getMemberById(id: string): Promise<Member | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.from('hundredfold_members').select('*').eq('id', id).maybeSingle();
  return (data as Member) ?? null;
}

export async function listMembers(): Promise<Member[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client
    .from('hundredfold_members')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  return (data as Member[]) ?? [];
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('hundredfold_members')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('hundredfold-store: member patch failed', error);
  return !error;
}

/**
 * How many seats are actually taken. The landing page says this out loud, so it
 * fails toward FULL: if the count cannot be read, we do not advertise openings
 * we might not have.
 */
export async function activeMemberCount(): Promise<number | null> {
  const client = getSupabase();
  if (!client) return null;
  const { count, error } = await client
    .from('hundredfold_members')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'offered']);
  if (error) return null;
  return count ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Interviews                                                                  */
/* -------------------------------------------------------------------------- */

export async function createInterview(input: {
  member_id?: string | null;
  email?: string | null;
  business_name?: string | null;
  url?: string | null;
  channel: InterviewChannel;
}): Promise<Interview | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('hundredfold_interviews')
    .insert({
      member_id: input.member_id ?? null,
      email: input.email ? normalize(input.email) : null,
      business_name: input.business_name ?? null,
      url: input.url ?? null,
      channel: input.channel,
    })
    .select('*')
    .single();
  if (error) {
    console.error('hundredfold-store: interview insert failed', error);
    return null;
  }
  return data as Interview;
}

export async function getInterview(id: string): Promise<Interview | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.from('hundredfold_interviews').select('*').eq('id', id).maybeSingle();
  return (data as Interview) ?? null;
}

export async function listInterviews(memberId?: string): Promise<Interview[]> {
  const client = getSupabase();
  if (!client) return [];
  let q = client
    .from('hundredfold_interviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (memberId) q = q.eq('member_id', memberId);
  const { data } = await q;
  return (data as Interview[]) ?? [];
}

/**
 * Append turns to a live interview.
 *
 * Read-modify-write rather than an array append in SQL, because the typed path
 * writes one turn at a time from a single client and the voice path writes the
 * whole transcript at the end. Neither has concurrent writers on one row.
 */
export async function appendTurns(id: string, turns: Turn[]): Promise<Turn[] | null> {
  const client = getSupabase();
  if (!client) return null;
  const current = await getInterview(id);
  if (!current) return null;
  const transcript = [...(current.transcript ?? []), ...turns];
  const { error } = await client.from('hundredfold_interviews').update({ transcript }).eq('id', id);
  if (error) {
    console.error('hundredfold-store: transcript append failed', error);
    return null;
  }
  return transcript;
}

export async function saveInterviewProgress(
  id: string,
  patch: Partial<Pick<Interview, 'transcript' | 'answers' | 'call_id' | 'summary' | 'duration_seconds' | 'status'>>
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('hundredfold_interviews').update(patch).eq('id', id);
  if (error) console.error('hundredfold-store: interview patch failed', error);
  return !error;
}

export async function completeInterview(
  id: string,
  patch: { transcript?: Turn[]; answers?: Record<string, string>; summary?: string; duration_seconds?: number }
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('hundredfold_interviews')
    .update({ ...patch, status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('hundredfold-store: interview complete failed', error);
  return !error;
}

/* -------------------------------------------------------------------------- */
/* The build plan                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Write the synthesis onto the member: the deep roadmap, the built offer, the
 * systems we will build, and the gates they will clear.
 *
 * Gates and systems are REPLACED wholesale, but only the not-yet-done gates:
 * a re-synthesis after a mid-program interview must never uncheck work the
 * member already finished.
 */
export async function saveSynthesis(
  memberId: string,
  input: {
    roadmap: RoadmapReport;
    offer: BuiltOffer;
    systems: PlannedSystem[];
    gates: PlannedGate[];
  }
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const ok = await updateMember(memberId, {
    deep_roadmap: input.roadmap,
    offer: input.offer,
  } as Partial<Member>);
  if (!ok) return false;

  await client.from('hundredfold_gates').delete().eq('member_id', memberId).eq('done', false);
  await client.from('hundredfold_systems').delete().eq('member_id', memberId).eq('status', 'proposed');

  const done = await listGates(memberId);
  const doneLabels = new Set(done.filter((g) => g.done).map((g) => g.label.toLowerCase()));

  const gateRows = input.gates
    .filter((g) => !doneLabels.has(g.label.toLowerCase()))
    .map((g, i) => ({
      member_id: memberId,
      window_no: g.window_no,
      kind: g.kind,
      label: g.label,
      target: g.target,
      sort: g.window_no * 100 + (g.kind === 'gate' ? 90 : i),
    }));
  if (gateRows.length) {
    const { error } = await client.from('hundredfold_gates').insert(gateRows);
    if (error) console.error('hundredfold-store: gate insert failed', error);
  }

  const systemRows = input.systems.map((s) => ({
    member_id: memberId,
    name: s.name,
    window_no: s.window_no,
    kind: s.kind,
    summary: s.summary,
    gives_back: s.gives_back,
    status: 'proposed',
  }));
  if (systemRows.length) {
    const { error } = await client.from('hundredfold_systems').insert(systemRows);
    if (error) console.error('hundredfold-store: system insert failed', error);
  }

  return true;
}

export async function listGates(memberId: string): Promise<GateRow[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client
    .from('hundredfold_gates')
    .select('*')
    .eq('member_id', memberId)
    .order('sort', { ascending: true });
  return (data as GateRow[]) ?? [];
}

export async function setGateDone(id: string, done: boolean, by: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('hundredfold_gates')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? by : null })
    .eq('id', id);
  return !error;
}

export async function listSystems(memberId: string): Promise<SystemRow[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client
    .from('hundredfold_systems')
    .select('*')
    .eq('member_id', memberId)
    .order('window_no', { ascending: true });
  return (data as SystemRow[]) ?? [];
}

export async function updateSystem(id: string, patch: Partial<SystemRow>): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('hundredfold_systems')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function listSessions(memberId: string): Promise<SessionRow[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client
    .from('hundredfold_sessions')
    .select('*')
    .eq('member_id', memberId)
    .order('held_at', { ascending: false });
  return (data as SessionRow[]) ?? [];
}
