/**
 * THE OFFICE'S STATE MACHINE, WRITTEN ONCE.
 *
 * The admin routes (Sarah pressing Go, Stop, Approve) and the workstation
 * worker (a task finishing, Sower proposing a plan in chat) move the same
 * missions through the same states. If each side kept its own copy of "what
 * happens when a task finishes", the two would drift the first time either was
 * touched. So both import this file: Next through `@/lib/office/engine`, the
 * worker straight off disk with Node's type stripping.
 *
 * No runtime imports, for that reason. The client arrives as a parameter.
 *
 * Every transition is a CONDITIONAL update (`.eq('status', <from>)`) and only
 * the caller whose update returned a row does the follow-on work. Two lanes
 * finishing sibling tasks in the same second both call advanceMission; only
 * one of them gets to queue the next task, and a mission is debriefed once.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type Db = SupabaseClient;

export type OfficeSettings = {
  /** Proposed missions start without waiting for Go. */
  autoGo: boolean;
  /** Builder may merge to master (production) without asking first. */
  autoShip: boolean;
};

export const DEFAULT_SETTINGS: OfficeSettings = { autoGo: false, autoShip: false };
export const SETTINGS_KEY = 'office_settings';
export const HEALTH_KEY = 'office_worker_health';
export const CHIEF_KEY = 'office_chief';

export type PlanTask = { key?: string; agent: string; title: string; brief: string; after?: string[] };
export type MissionPlan = {
  title: string;
  goal: string;
  summary?: string;
  metric?: { label?: string; unit?: string; target?: number };
  due?: string;
  tasks: PlanTask[];
};

const WORKERS = new Set(['scout', 'rep', 'maker', 'herald', 'builder', 'ledger']);
const TERMINAL = new Set(['done', 'failed', 'stopped']);

export async function getSettings(sb: Db): Promise<OfficeSettings> {
  const { data } = await sb.from('app_state').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<OfficeSettings>) ?? {}) };
}

export async function setSettings(sb: Db, patch: Partial<OfficeSettings>): Promise<OfficeSettings> {
  const next = { ...(await getSettings(sb)), ...patch };
  await sb.from('app_state').upsert({ key: SETTINGS_KEY, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return next;
}

export async function logEvent(
  sb: Db,
  e: { agent: string; text: string; kind?: string; mission_id?: string | null; task_id?: string | null },
): Promise<void> {
  try {
    await sb.from('office_events').insert({
      agent: e.agent,
      text: e.text.slice(0, 400),
      kind: e.kind ?? 'action',
      mission_id: e.mission_id ?? null,
      task_id: e.task_id ?? null,
    });
  } catch {
    /* the feed is a window, never a reason for the work to fail */
  }
}

export async function enqueue(sb: Db, kind: 'chief' | 'debrief' | 'task' | 'resume', refId: string | null, payload: Record<string, unknown> = {}) {
  const { data, error } = await sb.from('office_jobs').insert({ kind, ref_id: refId, payload }).select('id').single();
  if (error) throw new Error(`could not queue ${kind}: ${error.message}`);
  return data.id as string;
}

/**
 * Turn Sower's plan into rows. Tasks name their prerequisites by the plan's own
 * keys ("t1"), which become real ids here. An unknown agent is refused rather
 * than silently reassigned: a plan that hands code to the Rep is a bad plan,
 * and Sarah should see Sower get it wrong, not a quiet fix.
 */
export async function createMission(sb: Db, plan: MissionPlan, settings: OfficeSettings) {
  const tasks = (plan.tasks ?? []).filter((t) => t && t.title && t.brief);
  if (!plan.title || !plan.goal || !tasks.length) throw new Error('a mission needs a title, a goal and at least one task');
  const bad = tasks.find((t) => !WORKERS.has(String(t.agent).toLowerCase()));
  if (bad) throw new Error(`no desk called "${bad.agent}" on the floor`);

  const due = plan.due && /^\d{4}-\d{2}-\d{2}$/.test(plan.due) ? plan.due : null;
  const { data: mission, error } = await sb
    .from('office_missions')
    .insert({
      title: plan.title.slice(0, 140),
      goal: plan.goal.slice(0, 600),
      summary: plan.summary?.slice(0, 4000) ?? null,
      metric_label: plan.metric?.label ?? null,
      metric_unit: plan.metric?.unit ?? null,
      metric_target: typeof plan.metric?.target === 'number' ? plan.metric.target : null,
      due_on: due,
    })
    .select()
    .single();
  if (error) throw new Error(`could not open the mission: ${error.message}`);

  const ids = tasks.map(() => crypto.randomUUID());
  const byKey = new Map<string, string>();
  tasks.forEach((t, i) => byKey.set(t.key || `t${i + 1}`, ids[i]));

  const rows = tasks.map((t, i) => ({
    id: ids[i],
    mission_id: mission.id,
    position: i,
    agent: String(t.agent).toLowerCase(),
    title: t.title.slice(0, 200),
    brief: t.brief.slice(0, 8000),
    depends_on: (t.after ?? []).map((k) => byKey.get(k)).filter((x): x is string => Boolean(x) && x !== ids[i]),
  }));
  const { error: tErr } = await sb.from('office_tasks').insert(rows);
  if (tErr) {
    await sb.from('office_missions').delete().eq('id', mission.id);
    throw new Error(`could not lay out the tasks: ${tErr.message}`);
  }

  await logEvent(sb, { agent: 'sower', kind: 'mission', mission_id: mission.id, text: `Proposed: ${mission.title}` });
  if (settings.autoGo) await startMission(sb, mission.id);
  return mission as { id: string; title: string };
}

export async function startMission(sb: Db, missionId: string): Promise<boolean> {
  const { data } = await sb
    .from('office_missions')
    .update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', missionId)
    .eq('status', 'proposed')
    .select('id, title');
  if (!data?.length) return false;
  await logEvent(sb, { agent: 'sower', kind: 'mission', mission_id: missionId, text: `Go: ${data[0].title}` });
  await advanceMission(sb, missionId);
  return true;
}

/**
 * Queue every task whose prerequisites are settled, and close the mission when
 * nothing is left. A failed prerequisite still counts as settled: the task
 * after it runs anyway and is told what failed, because a mission that stalls
 * silently on one broken step is worse than one that routes around it.
 */
export async function advanceMission(sb: Db, missionId: string): Promise<void> {
  const { data: mission } = await sb.from('office_missions').select('id, status, title').eq('id', missionId).maybeSingle();
  if (!mission || mission.status !== 'running') return;

  const { data: tasks } = await sb.from('office_tasks').select('id, status, depends_on, agent, title').eq('mission_id', missionId);
  const list = tasks ?? [];
  const statusOf = new Map(list.map((t) => [t.id, t.status as string]));

  for (const t of list) {
    if (t.status !== 'blocked') continue;
    const ready = (t.depends_on as string[]).every((d) => TERMINAL.has(statusOf.get(d) ?? 'done'));
    if (!ready) continue;
    const { data: moved } = await sb
      .from('office_tasks')
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', t.id)
      .eq('status', 'blocked')
      .select('id');
    if (moved?.length) {
      await enqueue(sb, 'task', t.id);
      statusOf.set(t.id, 'queued');
      await logEvent(sb, { agent: t.agent, kind: 'queued', mission_id: missionId, task_id: t.id, text: `Up next: ${t.title}` });
    }
  }

  const all = [...statusOf.values()];
  if (all.length && all.every((s) => TERMINAL.has(s))) {
    const allFailed = all.every((s) => s !== 'done');
    const { data: closed } = await sb
      .from('office_missions')
      .update({ status: allFailed ? 'failed' : 'done', finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', missionId)
      .eq('status', 'running')
      .select('id');
    if (closed?.length) {
      await logEvent(sb, { agent: 'sower', kind: 'mission', mission_id: missionId, text: `${allFailed ? 'Failed' : 'Finished'}: ${mission.title}` });
      await enqueue(sb, 'debrief', missionId);
    }
  }
}

export async function stopMission(sb: Db, missionId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await sb
    .from('office_missions')
    .update({ status: 'stopped', finished_at: now, updated_at: now })
    .eq('id', missionId)
    .in('status', ['proposed', 'running'])
    .select('id, title');
  if (!data?.length) return false;
  // Running tasks flip to stopped too; the worker watches for that and kills
  // the process tree within fifteen seconds.
  await sb
    .from('office_tasks')
    .update({ status: 'stopped', finished_at: now, updated_at: now })
    .eq('mission_id', missionId)
    .in('status', ['blocked', 'queued', 'running', 'waiting']);
  const { data: tasks } = await sb.from('office_tasks').select('id').eq('mission_id', missionId);
  const ids = (tasks ?? []).map((t) => t.id);
  if (ids.length) {
    await sb.from('office_jobs').update({ status: 'cancelled', finished_at: now }).in('ref_id', ids).eq('status', 'queued');
  }
  await sb.from('office_approvals').update({ status: 'declined', answer_note: 'Mission stopped.', decided_at: now, delivered: true }).eq('mission_id', missionId).eq('status', 'pending');
  await logEvent(sb, { agent: 'sower', kind: 'mission', mission_id: missionId, text: `Stopped: ${data[0].title}` });
  return true;
}

/**
 * Sarah's yes or no. If the agent that asked has already ended its turn and is
 * parked in `waiting`, it is resumed in its own session with the answer. If it
 * is still mid-run, the worker delivers the answer when that run ends.
 */
export async function decideApproval(sb: Db, approvalId: string, approve: boolean, note?: string): Promise<boolean> {
  const { data } = await sb
    .from('office_approvals')
    .update({ status: approve ? 'approved' : 'declined', answer_note: note?.slice(0, 2000) || null, decided_at: new Date().toISOString() })
    .eq('id', approvalId)
    .eq('status', 'pending')
    .select('id, task_id, mission_id, agent, question');
  const row = data?.[0];
  if (!row) return false;
  await logEvent(sb, {
    agent: 'sower',
    kind: 'approval',
    mission_id: row.mission_id,
    task_id: row.task_id,
    text: `${approve ? 'Approved' : 'Declined'}: ${row.question}`,
  });
  if (row.task_id) await resumeIfParked(sb, row.task_id);
  return true;
}

export async function resumeIfParked(sb: Db, taskId: string): Promise<void> {
  const { count } = await sb.from('office_approvals').select('id', { count: 'exact', head: true }).eq('task_id', taskId).eq('status', 'pending');
  if ((count ?? 0) > 0) return;
  const { data: moved } = await sb
    .from('office_tasks')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('status', 'waiting')
    .select('id');
  if (moved?.length) await enqueue(sb, 'resume', taskId);
}
