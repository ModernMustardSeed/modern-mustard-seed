import { OPEN_STAGES, WON_STAGES, type JobRow } from '@/lib/cc-jobs';

/**
 * WHERE THE WORK COMES FROM.
 *
 * For a builder doing ten or twelve homes a year, almost every one arrives
 * through a person: a realtor who shows land, an architect who needs somebody
 * who can actually build the drawing, a past client whose brother-in-law is
 * moving to the valley. They know this. What they do not know, because nobody
 * has ever added it up, is WHICH people, in order, with the numbers attached.
 *
 * That answer changes a year. It is the difference between advertising by
 * feel and buying three lunches on purpose. So the source column on every job
 * becomes this: who sent what, what it was worth, what is still in play, and
 * who has gone quiet on them.
 *
 * The counting is deliberately plain. A source is whatever a person typed,
 * normalised only for case and for the "Referral, " they may or may not have
 * put in front of it. No model sorts these into categories, because a category
 * a machine guessed is a lunch bought with the wrong person.
 */

export type SourceRow = {
  /** As typed, in its most common spelling. */
  name: string;
  /** Realtor, architect, past client, website, and so on, when it can be told from the words. */
  kind: 'website' | 'referral' | 'repeat' | 'other';
  jobs: number;
  won: number;
  lost: number;
  open: number;
  wonValueCents: number;
  openValueCents: number;
  /** When they last sent something. The quiet ones are the point. */
  lastAt: string | null;
  lastName: string | null;
};

const stripLead = (s: string) => s.replace(/^\s*(referral|referred by|intro(duction)? from)\s*[:,-]?\s*/i, '').trim();

function kindOf(raw: string): SourceRow['kind'] {
  const s = raw.toLowerCase();
  if (/website|web site|online|google|form|chat|search/.test(s)) return 'website';
  if (/past client|repeat|previous|former client/.test(s)) return 'repeat';
  if (/referr|intro|sent by|recommend/.test(s)) return 'referral';
  return 'other';
}

/**
 * Group the board by who sent it.
 *
 * Ranked by what has actually been signed, then by what is in play, because a
 * relationship that produced one contract outranks one that produced four
 * conversations, and both outrank one that produced nothing but noise.
 */
export function sources(jobs: JobRow[]): SourceRow[] {
  const by = new Map<string, SourceRow & { spellings: Map<string, number> }>();

  for (const job of jobs) {
    const raw = (job.source ?? '').trim();
    if (!raw) continue;
    const bare = stripLead(raw) || raw;
    const key = bare.toLowerCase();

    const row =
      by.get(key) ??
      ({
        name: bare,
        kind: kindOf(raw),
        jobs: 0,
        won: 0,
        lost: 0,
        open: 0,
        wonValueCents: 0,
        openValueCents: 0,
        lastAt: null,
        lastName: null,
        spellings: new Map<string, number>(),
      } as SourceRow & { spellings: Map<string, number> });

    row.jobs += 1;
    row.spellings.set(bare, (row.spellings.get(bare) ?? 0) + 1);
    if (WON_STAGES.includes(job.stage)) {
      row.won += 1;
      row.wonValueCents += job.value_cents ?? 0;
    } else if (job.stage === 'lost') {
      row.lost += 1;
    } else if (OPEN_STAGES.includes(job.stage)) {
      row.open += 1;
      row.openValueCents += job.value_cents ?? 0;
    }
    if (!row.lastAt || job.created_at > row.lastAt) {
      row.lastAt = job.created_at;
      row.lastName = job.name;
    }
    by.set(key, row);
  }

  return [...by.values()]
    .map((r) => {
      // The spelling they use most is the one to show back to them.
      const name = [...r.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? r.name;
      const { spellings, ...rest } = r;
      void spellings;
      return { ...rest, name };
    })
    .sort((a, b) => b.wonValueCents - a.wonValueCents || b.won - a.won || b.openValueCents - a.openValueCents || b.jobs - a.jobs);
}

export type SourceSummary = {
  rows: SourceRow[];
  /** People, not the website. These are the ones a lunch works on. */
  people: SourceRow[];
  /** Sent work before, nothing in the last stretch. The call worth making. */
  quiet: SourceRow[];
  fromPeopleCents: number;
  fromWebsiteCents: number;
};

const DAY = 86_400_000;

export function summariseSources(jobs: JobRow[], quietAfterDays = 240, now = Date.now()): SourceSummary {
  const rows = sources(jobs);
  const people = rows.filter((r) => r.kind !== 'website');
  const quiet = people.filter((r) => r.won > 0 && r.lastAt !== null && now - Date.parse(r.lastAt) > quietAfterDays * DAY);
  return {
    rows,
    people,
    quiet,
    fromPeopleCents: people.reduce((n, r) => n + r.wonValueCents, 0),
    fromWebsiteCents: rows.filter((r) => r.kind === 'website').reduce((n, r) => n + r.wonValueCents, 0),
  };
}
