/**
 * THE STANDING ROUTINES, AS THE SITE KNOWS THEM.
 *
 * Mirror of dev/mms/routines/routines.json (the file Task Scheduler runs from on
 * Sarah's laptop). The watchdog cron reads this to know which runs to expect,
 * and the office scoreboard lists routines in this order. When a routine is
 * added, moved or retired there, change it here in the same sitting.
 *
 * Times are Mountain. `minutes` is the runner's timeout, so a run is only
 * overdue once its start time plus its timeout has passed.
 */
export type RoutineDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type Routine = {
  name: string;
  agent: string;
  /** `HH:MM`, Mountain. */
  time: string;
  days: RoutineDay[];
  chrome: boolean;
  minutes: number;
};

/**
 * The first Mountain day the runner posts heartbeats. The watchdog expects
 * nothing before it, so the day this shipped does not read as a day of misses.
 */
export const WATCH_FROM = '2026-10-11';

const WEEKDAYS: RoutineDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const EVERY_DAY: RoutineDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ROUTINES: Routine[] = [
  { name: 'morning-brief', agent: 'chief-of-staff', time: '06:50', days: [...WEEKDAYS, 'Sat'], chrome: false, minutes: 40 },
  { name: 'pipeline', agent: 'pipeline-steward', time: '06:35', days: WEEKDAYS, chrome: false, minutes: 30 },
  { name: 'client-health', agent: 'client-success', time: '06:20', days: ['Mon'], chrome: false, minutes: 45 },
  { name: 'content-draft', agent: 'content-strategist', time: '05:40', days: ['Tue'], chrome: false, minutes: 60 },
  { name: 'ai-visibility', agent: 'geo-engine', time: '05:25', days: ['Wed'], chrome: false, minutes: 60 },
  { name: 'truth-audit', agent: 'truth-auditor', time: '05:10', days: ['Thu'], chrome: false, minutes: 60 },
  { name: 'systems-check', agent: 'systems-auditor', time: '05:55', days: ['Fri'], chrome: false, minutes: 60 },
  { name: 'market-watch', agent: 'competitive-intel', time: '07:10', days: ['Sat'], chrome: false, minutes: 45 },
  { name: 'security-sweep', agent: 'secrets-warden', time: '07:25', days: ['Sun'], chrome: false, minutes: 45 },
  { name: 'social-desk', agent: 'social-producer', time: '09:40', days: EVERY_DAY, chrome: true, minutes: 60 },
];
