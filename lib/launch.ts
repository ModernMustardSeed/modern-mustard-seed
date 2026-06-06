/**
 * Launch countdown from a date-only target (YYYY-MM-DD). Shared by the client
 * portal, the admin projects board, and the contact profile so the wording is
 * identical everywhere.
 */
export type Countdown = { days: number; label: string; short: string; past: boolean; date: string };

export function launchCountdown(target?: string | null): Countdown | null {
  if (!target) return null;
  const t = new Date(`${target}T00:00:00`);
  if (isNaN(t.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((t.getTime() - today.getTime()) / 86400000);
  const date = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (days > 1) return { days, label: `Launches in ${days} days`, short: `${days}d`, past: false, date };
  if (days === 1) return { days, label: 'Launches tomorrow', short: '1d', past: false, date };
  if (days === 0) return { days, label: 'Launches today', short: 'today', past: false, date };
  return { days, label: `Launch date passed (${date})`, short: `${Math.abs(days)}d ago`, past: true, date };
}
