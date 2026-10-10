'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  CELL_META,
  PLATFORMS,
  PLATFORM_META,
  STATUSES,
  STATUS_META,
  addDays,
  applyFilters,
  buildAgenda,
  buildCoverage,
  coverageSummary,
  dateRange,
  groupDay,
  inBacklogView,
  longDate,
  missingOn,
  rowState,
  type Cell,
  type Day,
  type Filters,
  type Platform,
  type PostGroup,
  type SocialPost,
} from '@/lib/social-calendar';
import CoverageGrid from './CoverageGrid';
import PostDialog, { type DialogTarget } from './PostDialog';
import { ACCENT, Cover, FOCUS, Legend, MONO, PlatformPill, SANS, SHORT_LABEL, SHRIKHAND, StatePill, shortDate } from './ui';

/**
 * THE SOCIAL DESK. Three views of social_posts:
 *
 *   Coverage  days down, platforms across, every cell green, amber or red,
 *             so a missing post on any required platform shows at a glance.
 *   Agenda    day by day, one card per piece of content with a chip per
 *             platform, each chip colored by its own state.
 *   Backlog   missed (unscheduled), undated and failed rows.
 *
 * Captions load on demand in the post dialog, so the first paint stays light.
 * Studio edition: paper ground, ink rules, DM Sans set tight, one Shrikhand
 * accent on the mustard highlighter, mono labels.
 */

type View = 'coverage' | 'agenda' | 'backlog';
const VIEWS: { key: View; label: string }[] = [
  { key: 'coverage', label: 'Coverage' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'backlog', label: 'Backlog' },
];

type Props = { rows: SocialPost[]; today: string; loadError: string };

/** The dialog points at row ids, so a save shows through without reopening. */
type OpenState = { ids: string[]; index: number; heading?: string; nonce: number };

export default function SocialCalendar({ rows: initial, today, loadError }: Props) {
  const [rows, setRows] = useState(initial);
  const [view, setView] = useState<View>('coverage');
  const [filters, setFilters] = useState<Filters>({});
  const [needsActionOnly, setNeedsActionOnly] = useState(false);
  const [range, setRange] = useState<'next' | 'last'>('next');
  const [open, setOpen] = useState<OpenState | null>(null);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const seriesList = useMemo(
    () => [...new Set(rows.map((r) => r.series).filter((s): s is string => !!s))].sort(),
    [rows],
  );
  const platformsPresent = useMemo(() => PLATFORMS.filter((p) => rows.some((r) => r.platform === p)), [rows]);
  const filtering = Boolean(filters.platform || filters.series || filters.status);
  const matches = useMemo(() => {
    const keep = new Set(applyFilters(rows, filters).map((r) => r.id));
    return (p: SocialPost) => keep.has(p.id);
  }, [rows, filters]);

  const summary = useMemo(() => coverageSummary(rows, today, 30), [rows, today]);
  const week = useMemo(() => coverageSummary(rows, today, 7), [rows, today]);
  const healthDays = useMemo(() => buildCoverage(rows, dateRange(today, 14)), [rows, today]);
  const gridDays = useMemo(() => {
    if (needsActionOnly) return buildCoverage(rows, dateRange(today, 7));
    if (range === 'last') return buildCoverage(rows, dateRange(addDays(today, -7), 7)).reverse();
    return buildCoverage(rows, dateRange(today, 30));
  }, [rows, today, range, needsActionOnly]);
  const backlog = useMemo(
    () =>
      applyFilters(rows.filter(inBacklogView), filters).sort(
        (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id),
      ),
    [rows, filters],
  );
  const backlogTotal = useMemo(() => rows.filter(inBacklogView).length, [rows]);

  const replace = (row: SocialPost) => setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));
  const openPosts = (posts: SocialPost[], index: number, heading?: string) =>
    setOpen({ ids: posts.map((p) => p.id), index, heading, nonce: Date.now() });
  const openCell = (cell: Cell) =>
    openPosts(cell.posts, 0, `${PLATFORM_META[cell.platform].label}${cell.posts.length > 1 ? `, ${cell.posts.length} posts` : ''}`);

  const target: DialogTarget | null = open
    ? { posts: open.ids.map((id) => byId.get(id)).filter((p): p is SocialPost => !!p), index: open.index, heading: open.heading }
    : null;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = VIEWS.findIndex((v) => v.key === view);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % VIEWS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + VIEWS.length) % VIEWS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = VIEWS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setView(VIEWS[next].key);
    document.getElementById(`social-tab-${VIEWS[next].key}`)?.focus();
  };

  const t = longDate(today);
  const pct = Math.round((summary.queued / summary.target) * 100);

  return (
    <div className="min-h-screen bg-[#fcfaf3] text-[#141210]" style={SANS}>
      <AdminHeader active="social-calendar" title="Social" />
      <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 sm:py-10">
        <header className="space-y-3">
          <p className={`${MONO} text-[#0f4c47]`}>The social calendar · Mountain Time</p>
          <h1 className="text-[2.1rem] font-bold leading-[1.02] tracking-[-0.045em] text-[#141210] sm:text-5xl">
            Seven platforms, <em style={ACCENT}>every day</em>.
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#4a4339]">
            YouTube Shorts, TikTok, Instagram, Facebook, X, LinkedIn and Pinterest need a post every day. Green is queued on the platform, amber is made but not queued, red is a day with nothing going out.
          </p>
        </header>

        {loadError && (
          <div role="alert" className="rounded-[3px] border border-[#141210] bg-[#fde7e4] px-4 py-3 text-sm text-[#141210]">
            <strong className="font-bold">The calendar did not load.</strong> {loadError}
          </div>
        )}

        <section aria-label="Coverage for the next 30 days" className="grid border-l border-t border-[#141210] sm:grid-cols-[1.6fr,1fr,1fr]">
          <div className="border-b border-r border-[#141210] bg-[#f5b700] p-4 sm:p-5">
            <p className="text-[17px] font-bold leading-snug tracking-[-0.03em] text-[#141210] sm:text-[19px]">
              <span className="mr-1 text-4xl leading-none sm:text-5xl" style={SHRIKHAND}>
                {summary.queued}
              </span>{' '}
              of {summary.target} posts for the next 30 days are queued on the platform.
            </p>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full border border-[#141210] bg-[#fcfaf3]" role="img" aria-label={`${pct} percent queued`}>
              <span style={{ width: `${(summary.queued / summary.target) * 100}%`, background: CELL_META.green.ring }} />
              <span style={{ width: `${(summary.planned / summary.target) * 100}%`, background: CELL_META.amber.ring }} />
              <span style={{ width: `${(summary.empty / summary.target) * 100}%`, background: CELL_META.red.ring }} />
            </div>
            <p className="mt-2 text-[13px] text-[#141210]">
              {summary.planned} planned and waiting to be queued. <strong className="font-bold">{summary.empty} empty.</strong>
            </p>
          </div>
          <Stat label="Empty in the next 7 days" value={week.empty} note={`of ${week.target} required slots`} tone={week.empty > 0 ? 'red' : 'green'} />
          <Stat label="Backlog" value={backlogTotal} note="missed, undated or failed" tone={backlogTotal > 0 ? 'amber' : 'green'} />
        </section>

        <div className="space-y-4">
          <div role="tablist" aria-label="Social views" className="flex border-b-2 border-[#141210]">
            {VIEWS.map((v) => {
              const selected = view === v.key;
              return (
                <button
                  key={v.key}
                  id={`social-tab-${v.key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`social-panel-${v.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setView(v.key)}
                  onKeyDown={onTabKey}
                  className={`-mb-[2px] rounded-t-[3px] border-2 px-3 py-2 text-[15px] font-bold tracking-[-0.02em] sm:px-5 sm:text-base ${FOCUS} ${
                    selected ? 'border-[#141210] border-b-[#fcfaf3] bg-[#fcfaf3] text-[#141210]' : 'border-transparent text-[#4a4339] hover:text-[#141210]'
                  }`}
                >
                  {v.label}
                  {v.key === 'backlog' && backlogTotal > 0 && (
                    <span className="ml-1.5 rounded-full border border-[#141210] bg-[#fde7a6] px-1.5 font-mono text-[10px] text-[#141210]">{backlogTotal}</span>
                  )}
                </button>
              );
            })}
          </div>

          <section aria-label="Filters" className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              aria-pressed={needsActionOnly}
              onClick={() => setNeedsActionOnly((v) => !v)}
              className={`${MONO} rounded-[3px] border-2 px-3 py-2 text-[11px] ${FOCUS} ${
                needsActionOnly ? 'border-[#141210] bg-[#141210] text-[#fcfaf3]' : 'border-[#b42318] bg-[#fbd3cd] text-[#6b1209] hover:bg-[#f8bfb6]'
              }`}
            >
              Needs action{needsActionOnly ? ': on' : ''} · {week.planned + week.empty}
            </button>
            <FilterSelect
              label="Series"
              value={filters.series ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, series: v || undefined }))}
              options={seriesList.map((s) => ({ value: s, label: s }))}
            />
            <FilterSelect
              label="Status"
              value={filters.status ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, status: v || undefined }))}
              options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            />
            <FilterSelect
              label="Platform"
              value={filters.platform ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, platform: v || undefined }))}
              options={platformsPresent.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
            />
            {(filtering || needsActionOnly) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({});
                  setNeedsActionOnly(false);
                }}
                className={`${MONO} rounded-[3px] border border-[#141210] bg-transparent px-3 py-2 text-[#141210] hover:bg-[#141210] hover:text-[#fcfaf3] ${FOCUS}`}
              >
                Clear
              </button>
            )}
          </section>
        </div>

        {rows.length === 0 && !loadError ? (
          <div className="rounded-[3px] border border-[#141210] bg-[#e8ecd0] p-6 text-[#141210]">
            <p className="text-lg font-bold tracking-[-0.03em]">Nothing is on the calendar yet.</p>
            <p className="mt-2 text-sm text-[#4a4339]">
              Load a calendar file from the site repo with{' '}
              <code className="border border-[#141210]/20 bg-white px-1.5 py-0.5 font-mono text-xs">node scripts/social-calendar-import.mjs &lt;calendar.json&gt;</code>
            </p>
          </div>
        ) : (
          <>
            {view === 'coverage' && (
              <section id="social-panel-coverage" role="tabpanel" aria-labelledby="social-tab-coverage" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Legend />
                  {needsActionOnly ? (
                    <p className={`${MONO} text-[10px] text-[#141210]`}>Next 7 days, amber and red only</p>
                  ) : (
                    <div role="group" aria-label="Days shown" className="flex overflow-hidden rounded-[3px] border border-[#141210]">
                      {(
                        [
                          ['next', 'Next 30 days'],
                          ['last', 'Last 7 days'],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={range === k}
                          onClick={() => setRange(k)}
                          className={`${MONO} px-3 py-1.5 text-[10px] ${FOCUS} ${range === k ? 'bg-[#141210] text-[#fcfaf3]' : 'bg-white text-[#141210] hover:bg-[#efe9da]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <CoverageGrid
                  days={gridDays}
                  healthDays={healthDays}
                  today={today}
                  matches={matches}
                  needsActionOnly={needsActionOnly}
                  onOpen={openCell}
                />
                <p className="text-[12px] text-[#4a4339]">
                  Tap a cell for the post, its caption and its live link. A number in the corner means two or more posts that day. LinkedIn counts the MMS page; LinkedIn, Sarah and IG, Sarah are bonus columns.
                </p>
              </section>
            )}

            {view === 'agenda' && (
              <section id="social-panel-agenda" role="tabpanel" aria-labelledby="social-tab-agenda">
                <AgendaView rows={rows} filters={filters} needsActionOnly={needsActionOnly} today={today} onOpen={openPosts} />
              </section>
            )}

            {view === 'backlog' && (
              <section id="social-panel-backlog" role="tabpanel" aria-labelledby="social-tab-backlog" className="space-y-3">
                <p className="text-sm text-[#4a4339]">
                  Missed or refused posts, rows with no date, and anything that failed. Give each one a new slot in calendar.json and rerun the import, or mark it here.
                </p>
                {backlog.length === 0 ? (
                  <p className="rounded-[3px] border border-dashed border-[#141210] px-4 py-6 text-center text-sm text-[#4a4339]">
                    {filtering ? 'Nothing in the backlog matches these filters.' : 'The backlog is clear.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#141210]/20 rounded-[3px] border border-[#141210] bg-white">
                    {backlog.map((p, i) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => openPosts(backlog, i, 'Backlog')}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-[#141210] hover:bg-[#fcfaf3] sm:px-4 ${FOCUS}`}
                        >
                          <Thumb post={p} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <PlatformPill platform={p.platform} />
                              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: p.status === 'failed' ? '#b42318' : '#4a4339' }}>
                                {STATUS_META[p.status].label}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#0f4c47]">
                                {p.date ? shortDate(p.date) : 'No date'}
                                {p.time_mt ? ` · ${p.time_mt}` : ''}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-[15px] font-bold tracking-[-0.02em]">{p.title || p.id}</span>
                            {p.note && <span className="block truncate text-[12px] text-[#4a4339]">{p.note}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}

        <p className={`${MONO} pt-4 text-[#4a4339]`}>
          Today is {t.weekday}, {t.month} {t.day} in Kalispell.
        </p>
      </main>

      {open && target && target.posts.length > 0 && (
        <PostDialog key={open.nonce} target={target} onClose={() => setOpen(null)} onSaved={replace} />
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number; note: string; tone: 'green' | 'amber' | 'red' }) {
  const m = CELL_META[tone];
  return (
    <div className="border-b border-r border-[#141210] bg-[#fcfaf3] p-4 sm:p-5">
      <p className={`${MONO} text-[10px] text-[#141210]`}>{label}</p>
      <p className="mt-1 text-4xl leading-none sm:text-5xl" style={{ ...SHRIKHAND, color: m.fg }}>
        {value}
      </p>
      <p className="mt-1 text-[12px] text-[#4a4339]">{note}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1 sm:flex-none">
      <span className={`${MONO} text-[10px] text-[#4a4339]`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-[3px] border border-[#141210] bg-white px-3 py-2 text-sm text-[#141210] ${FOCUS}`}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Thumb({ post, size = 'sm' }: { post: SocialPost; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-24 w-[54px]' : 'h-14 w-8';
  return post.cover_url ? (
    <Cover
      src={post.cover_url}
      width={size === 'md' ? 54 : 32}
      height={size === 'md' ? 96 : 56}
      className={`${cls} shrink-0 rounded-[3px] border border-[#141210]`}
    />
  ) : (
    <span aria-hidden="true" className={`${cls} block shrink-0 rounded-[3px] border border-dashed border-[#141210]/40 bg-[#e8ecd0]`} />
  );
}

/**
 * The agenda: today pinned, the days ahead, the last seven folded away. Each
 * day lists its required platforms with nothing going out, then one card per
 * piece of content. Needs action narrows it to the next seven days and the
 * cards with a platform still waiting to be queued.
 */
function AgendaView({
  rows,
  filters,
  needsActionOnly,
  today,
  onOpen,
}: {
  rows: SocialPost[];
  filters: Filters;
  needsActionOnly: boolean;
  today: string;
  onOpen: (posts: SocialPost[], index: number, heading?: string) => void;
}) {
  const shown = useMemo(() => buildAgenda(applyFilters(rows, filters), today), [rows, filters, today]);
  const weekEnd = addDays(today, 6);
  const upcoming = needsActionOnly ? shown.upcoming.filter((d) => d.date <= weekEnd) : shown.upcoming;
  const days: Day[] = [shown.today, ...upcoming];
  const filtering = Boolean(filters.platform || filters.series || filters.status);

  return (
    <div className="space-y-9">
      {days.map((d) => (
        <AgendaDay
          key={d.date}
          day={d}
          isToday={d.date === today}
          missing={d.date >= today ? missingOn(rows, d.date) : []}
          needsActionOnly={needsActionOnly}
          emptyNote={filtering ? 'Nothing matches this day.' : 'Nothing goes out this day.'}
          onOpen={onOpen}
        />
      ))}
      {needsActionOnly &&
        dateRange(today, 7)
          .filter((date) => date !== today && !upcoming.some((d) => d.date === date))
          .map((date) => (
            <AgendaDay
              key={date}
              day={{ date, posts: [] }}
              missing={missingOn(rows, date)}
              needsActionOnly
              emptyNote="Nothing goes out this day."
              onOpen={onOpen}
            />
          ))}
      {!needsActionOnly && shown.past.length > 0 && (
        <details className="group rounded-[3px] border border-[#141210] bg-white">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[#141210] ${FOCUS}`}>
            <span className="text-xl font-bold tracking-[-0.04em]">Last 7 days</span>
            <span className={`${MONO} text-[#4a4339]`}>
              {shown.past.reduce((n, d) => n + d.posts.length, 0)} posts
              <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-180">
                ▾
              </span>
            </span>
          </summary>
          <div className="space-y-8 border-t border-[#141210] p-4">
            {shown.past.map((d) => (
              <AgendaDay key={d.date} day={d} missing={[]} needsActionOnly={false} onOpen={onOpen} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function AgendaDay({
  day,
  isToday,
  missing,
  needsActionOnly,
  emptyNote,
  onOpen,
}: {
  day: Day;
  isToday?: boolean;
  missing: Platform[];
  needsActionOnly: boolean;
  emptyNote?: string;
  onOpen: (posts: SocialPost[], index: number, heading?: string) => void;
}) {
  const d = longDate(day.date);
  const allGroups = groupDay(day.posts);
  const groups = needsActionOnly ? allGroups.filter((g) => g.posts.some((p) => rowState(p) !== 'green')) : allGroups;
  const headingId = `day-${day.date}`;
  const queued = day.posts.filter((p) => rowState(p) === 'green').length;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="flex flex-wrap items-end gap-x-4 gap-y-1 border-b-2 border-[#141210] pb-2 text-[#141210]">
        <span className="text-6xl leading-[0.85] sm:text-7xl" style={SHRIKHAND}>
          {d.day}
        </span>
        <span className="flex flex-col">
          {isToday && (
            <span className={`${MONO} mb-1 w-fit rounded-[3px] border border-[#141210] bg-[#f5b700] px-2 py-0.5 text-[10px] text-[#141210]`}>Today</span>
          )}
          <span className="text-2xl font-bold leading-none tracking-[-0.045em] sm:text-3xl">{d.weekday}</span>
          <span className="text-sm text-[#4a4339]">
            {d.month} {d.year}
          </span>
        </span>
        <span className={`${MONO} ml-auto text-[#4a4339]`}>
          {day.posts.length} {day.posts.length === 1 ? 'post' : 'posts'}, {queued} queued
        </span>
      </h2>

      {missing.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-[3px] border-2 border-[#b42318] bg-[#fbd3cd] px-3 py-2 text-[13px] text-[#6b1209]">
          <span className={`${MONO} mr-1 text-[10px] font-bold text-[#6b1209]`}>Nothing on</span>
          {missing.map((p) => (
            <span key={p} className="rounded-[3px] border border-[#b42318] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b1209]">
              {SHORT_LABEL[p]}
            </span>
          ))}
        </p>
      )}

      {groups.length === 0 ? (
        <p className="rounded-[3px] border border-dashed border-[#141210]/50 px-4 py-5 text-sm text-[#4a4339]">
          {needsActionOnly && allGroups.length > 0 ? 'Everything made for this day is queued.' : emptyNote ?? 'Nothing this day.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <GroupCard key={g.key} group={g} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  );
}

function GroupCard({ group, onOpen }: { group: PostGroup; onOpen: (posts: SocialPost[], index: number, heading?: string) => void }) {
  const lead = group.posts.find((p) => p.cover_url) ?? group.posts[0];
  const states = group.posts.map(rowState);
  const best = states.includes('green') ? (states.every((s) => s === 'green') ? 'green' : 'amber') : states.includes('amber') ? 'amber' : 'red';
  const notes = [...new Set(group.posts.map((p) => p.note).filter((n): n is string => !!n))];
  return (
    <li className="rounded-[3px] border border-[#141210] bg-white text-[#141210]">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="w-12 shrink-0 sm:w-14">
          <p className="font-mono text-sm font-bold tabular-nums text-[#141210]">{group.time || 'Any'}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#4a4339]">MT</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(group.posts, Math.max(0, group.posts.indexOf(lead)), group.series ?? undefined)}
          className={`shrink-0 self-start rounded-[3px] ${FOCUS}`}
          aria-label={`Open ${group.title ?? 'this post'}`}
        >
          <Thumb post={lead} size="md" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {group.series && <span className={`${MONO} text-[10px] text-[#0f4c47]`}>{group.series}</span>}
            {lead.kind && <span className={`${MONO} text-[10px] text-[#4a4339]`}>· {lead.kind}</span>}
            <span className="ml-auto">
              <StatePill state={best} />
            </span>
          </div>
          <p className="break-words text-[16px] font-bold leading-snug tracking-[-0.03em] text-[#141210] sm:text-[17px]">
            {group.title || group.posts[0].id}
          </p>
          <ul aria-label="Platforms" className="flex flex-wrap gap-1.5">
            {group.posts.map((p, i) => {
              const m = CELL_META[rowState(p)];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(group.posts, i, group.series ?? undefined)}
                    aria-label={`${PLATFORM_META[p.platform].label}: ${m.label}, ${STATUS_META[p.status].label}. Open caption`}
                    className={`inline-flex items-center gap-1 rounded-[3px] border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] hover:shadow-[2px_2px_0_0_#141210] ${FOCUS}`}
                    style={{ background: m.bg, color: m.fg, borderColor: m.ring }}
                  >
                    {PLATFORM_META[p.platform].label}
                    {p.time_mt && p.time_mt !== group.time ? <span className="font-normal opacity-80">{p.time_mt}</span> : null}
                    {p.status === 'posted' && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {notes.map((n) => (
            <p key={n} className="break-words border-l-2 border-[#f5b700] pl-2 text-[13px] leading-snug text-[#141210]">
              <span className={`${MONO} mr-1.5 text-[10px] text-[#4a4339]`}>Note</span>
              {n}
            </p>
          ))}
        </div>
      </div>
    </li>
  );
}
