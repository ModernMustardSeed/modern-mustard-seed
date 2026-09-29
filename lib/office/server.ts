import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { getSettings, HEALTH_KEY, type OfficeSettings } from '@/lib/office/engine';

/**
 * Yield is the owner's office. The agents on it can merge to production, post
 * as Sarah and move money, so a staff login gets a 403 here, not a quieter
 * version of the floor.
 */
export async function requireOfficeOwner(): Promise<{ supabase: SupabaseClient } | { error: NextResponse }> {
  const user = await getAdminUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'owner') return { error: NextResponse.json({ error: 'Yield is the owner office.' }, { status: 403 }) };
  const supabase = getSupabase();
  if (!supabase) return { error: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) };
  return { supabase };
}

export type OfficeHealth = {
  up: boolean;
  worker: string | null;
  at: string | null;
  lanes: number;
  running: { job: string; kind: string; agent: string; title: string }[];
  probes: Record<string, string>;
  /** When each engine reopens, if it is at its usage cap right now. */
  caps: { claude: string | null; codex: string | null };
};

export type OfficeState = {
  health: OfficeHealth;
  settings: OfficeSettings;
  thinking: { status: string; last_action: string | null } | null;
  messages: { id: string; role: string; body: string; mission_id: string | null; created_at: string }[];
  missions: Mission[];
  approvals: Approval[];
  deliverables: Deliverable[];
  events: { id: number; agent: string; kind: string; text: string; mission_id: string | null; created_at: string }[];
  lessons: Lesson[];
};

export type Lesson = { id: string; lesson: string; area: string; evidence: string | null; mission_id: string | null; pinned: boolean; created_at: string };

export type Task = {
  id: string;
  mission_id: string;
  position: number;
  agent: string;
  engine: 'claude' | 'codex';
  title: string;
  brief: string;
  status: string;
  last_action: string | null;
  output: string | null;
  error: string | null;
  depends_on: string[];
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};
export type Mission = {
  id: string;
  title: string;
  goal: string;
  summary: string | null;
  metric_label: string | null;
  metric_unit: string | null;
  metric_target: number | null;
  metric_current: number;
  due_on: string | null;
  status: string;
  debrief: string | null;
  created_at: string;
  tasks: Task[];
};
export type Approval = {
  id: string;
  mission_id: string | null;
  task_id: string | null;
  agent: string;
  question: string;
  detail: string | null;
  status: string;
  created_at: string;
};
export type Deliverable = {
  id: string;
  mission_id: string | null;
  agent: string;
  kind: string;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
};

/** A heartbeat older than this means the worker is not on the floor. */
const HEALTH_STALE_MS = 90_000;

export async function loadOfficeState(sb: SupabaseClient, opts: { lite?: boolean } = {}): Promise<OfficeState> {
  const lite = Boolean(opts.lite);
  const lessonRes = lite
    ? { data: [] }
    : await sb.from('office_lessons').select('id, lesson, area, evidence, mission_id, pinned, created_at').eq('active', true).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(40);
  const [healthRes, settings, chiefRes, msgRes, missionRes, approvalRes, delivRes, eventRes] = await Promise.all([
    sb.from('app_state').select('value').eq('key', HEALTH_KEY).maybeSingle(),
    getSettings(sb),
    sb.from('office_jobs').select('status, last_action').in('kind', ['chief', 'debrief']).in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(1),
    sb.from('office_messages').select('id, role, body, mission_id, created_at').order('created_at', { ascending: false }).limit(lite ? 40 : 80),
    sb.from('office_missions').select('*').order('created_at', { ascending: false }).limit(lite ? 6 : 16),
    sb.from('office_approvals').select('id, mission_id, task_id, agent, question, detail, status, created_at').eq('status', 'pending').order('created_at'),
    lite ? Promise.resolve({ data: [] }) : sb.from('office_deliverables').select('*').order('created_at', { ascending: false }).limit(40),
    lite ? Promise.resolve({ data: [] }) : sb.from('office_events').select('id, agent, kind, text, mission_id, created_at').order('created_at', { ascending: false }).limit(80),
  ]);

  const missions = (missionRes.data ?? []) as Omit<Mission, 'tasks'>[];
  const ids = missions.map((m) => m.id);
  const { data: taskRows } = ids.length
    ? await sb
        .from('office_tasks')
        .select('id, mission_id, position, agent, engine, title, brief, status, last_action, output, error, depends_on, started_at, finished_at, updated_at')
        .in('mission_id', ids)
        .order('position')
    : { data: [] };
  const tasksBy = new Map<string, Task[]>();
  for (const t of (taskRows ?? []) as Task[]) {
    const arr = tasksBy.get(t.mission_id) ?? [];
    arr.push(t);
    tasksBy.set(t.mission_id, arr);
  }

  const h = (healthRes.data?.value ?? null) as Partial<OfficeHealth> & { at?: string } | null;
  const up = Boolean(h?.at && Date.now() - new Date(h.at).getTime() < HEALTH_STALE_MS);

  return {
    health: {
      up,
      worker: h?.worker ?? null,
      at: h?.at ?? null,
      lanes: h?.lanes ?? 0,
      running: up ? h?.running ?? [] : [],
      probes: h?.probes ?? {},
      caps: { claude: h?.caps?.claude ?? null, codex: h?.caps?.codex ?? null },
    },
    settings,
    thinking: chiefRes.data?.[0] ?? null,
    messages: ((msgRes.data ?? []) as OfficeState['messages']).reverse(),
    missions: missions.map((m) => ({ ...m, tasks: tasksBy.get(m.id) ?? [] })),
    approvals: (approvalRes.data ?? []) as Approval[],
    deliverables: (delivRes.data ?? []) as Deliverable[],
    events: (eventRes.data ?? []) as OfficeState['events'],
    lessons: (lessonRes.data ?? []) as Lesson[],
  };
}
