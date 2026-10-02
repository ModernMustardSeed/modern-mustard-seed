export const WORKER_COMMAND = 'npm run acq:worker';

export type WorkerStatus = {
  state: 'working' | 'waiting' | 'stalled' | 'absent';
  headline: string;
  detail: string;
  command: string | null;
};

/**
 * IS ANYTHING ACTUALLY LISTENING?
 *
 * The failure this exists to stop: the button queues a row, no worker is
 * running on Sarah's machine, and the screen reports "idle" because there is
 * no run in progress. Idle and abandoned look identical from the database, and
 * a run sat untouched for thirty eight minutes before anybody noticed.
 *
 * A worker stamps heartbeat_at when it claims a run and every market after. So
 * a queued run with no heartbeat is not idle, it is unattended, and this says
 * so in the words that fix it.
 */
export function workerStatus(runs: { status: string; heartbeat_at: string | null; created_at: string }[], now = Date.now()): WorkerStatus {
  const live = runs.filter((r) => r.status === 'running' || r.status === 'queued');
  if (!live.length) {
    return { state: 'waiting', headline: 'Nothing queued', detail: 'Start a run and the worker will pick it up.', command: null };
  }

  const beats = live.map((r) => (r.heartbeat_at ? now - Date.parse(r.heartbeat_at) : null));
  const freshest = beats.filter((b): b is number => b !== null).sort((a, b) => a - b)[0];

  // Two minutes of silence from a claimed run means the process died. The
  // worker beats once per market and a slow market takes well under that.
  if (freshest !== undefined && freshest < 120_000) {
    return { state: 'working', headline: 'Worker running', detail: `Last heartbeat ${Math.round(freshest / 1000)}s ago.`, command: null };
  }

  const oldest = Math.max(...live.map((r) => now - Date.parse(r.created_at)));
  const mins = Math.max(1, Math.round(oldest / 60_000));

  if (freshest === undefined) {
    return {
      state: 'absent',
      headline: 'No worker is running',
      detail: `${live.length} run${live.length === 1 ? '' : 's'} queued, the oldest for ${mins} minutes, and nothing has claimed ${live.length === 1 ? 'it' : 'them'}. Sourcing drives a real browser, so it runs on your machine, not on Vercel. Open a terminal in the repo and start it.`,
      command: WORKER_COMMAND,
    };
  }

  return {
    state: 'stalled',
    headline: 'Worker stopped mid-run',
    detail: `A run was claimed but has not reported for ${Math.round(freshest / 60_000)} minutes. The worker probably crashed or the terminal was closed. Starting it again resumes from where it stopped.`,
    command: WORKER_COMMAND,
  };
}
