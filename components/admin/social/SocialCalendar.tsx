'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  PLATFORMS,
  PLATFORM_META,
  STATUSES,
  STATUS_META,
  applyFilters,
  buildAgenda,
  isUrl,
  longDate,
  type Day,
  type Filters,
  type SocialPost,
  type Status,
} from '@/lib/social-calendar';

/**
 * THE SOCIAL DESK. The day-by-day agenda Sarah reads to know exactly what goes
 * out and where: today pinned, the days ahead, the undated backlog, and the
 * last seven days folded away. Studio edition: paper ground, ink rules, DM Sans
 * set tight, one Shrikhand accent on the mustard highlighter, mono labels.
 * The admin shell is an ink ground with white type, so every surface here
 * names its ink color.
 */

const INK = '#141210';
const SANS: CSSProperties = { fontFamily: 'var(--font-body), system-ui, sans-serif', fontVariationSettings: "'opsz' 14" };
const ACCENT: CSSProperties = {
  fontFamily: 'var(--font-shrikhand), Georgia, serif',
  fontStyle: 'normal',
  fontWeight: 400,
  letterSpacing: '0',
  background: 'linear-gradient(transparent 80%, #f5b700 80%, #f5b700 95%, transparent 95%)',
};
const MONO = 'font-mono text-[11px] uppercase tracking-[0.14em]';

type Props = { rows: SocialPost[]; today: string; loadError: string };

export default function SocialCalendar({ rows: initial, today, loadError }: Props) {
  const [rows, setRows] = useState(initial);
  const [filters, setFilters] = useState<Filters>({});

  const seriesList = useMemo(
    () => [...new Set(rows.map((r) => r.series).filter((s): s is string => !!s))].sort(),
    [rows],
  );
  const platformsPresent = useMemo(() => PLATFORMS.filter((p) => rows.some((r) => r.platform === p)), [rows]);
  const full = useMemo(() => buildAgenda(rows, today), [rows, today]);
  const shown = useMemo(() => buildAgenda(applyFilters(rows, filters), today), [rows, filters, today]);
  const filtering = Boolean(filters.platform || filters.series || filters.status);
  const nothingShown =
    shown.today.posts.length === 0 && shown.upcoming.length === 0 && shown.past.length === 0 && shown.backlog.length === 0;

  const replace = (row: SocialPost) => setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));
  const t = longDate(today);

  return (
    <div className="min-h-screen bg-[#fcfaf3] text-[#141210]" style={SANS}>
      <AdminHeader active="social-calendar" title="Social" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <header className="space-y-3">
          <p className={`${MONO} text-[#0f4c47]`}>The social calendar · Mountain Time</p>
          <h1 className="text-[2.1rem] sm:text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-[#141210]">
            What goes out, <em style={ACCENT}>every day</em>, and where.
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#4a4339]">
            Every post on every account, by day and time. Open a caption to copy it. Mark a post posted with its live link the moment it goes up.
          </p>
        </header>

        {loadError && (
          <div role="alert" className="rounded-[3px] border border-[#141210] bg-[#fde7e4] px-4 py-3 text-sm text-[#141210]">
            <strong className="font-bold">The calendar did not load.</strong> {loadError}
          </div>
        )}

        <section aria-label="Counts" className="grid grid-cols-3 border-t border-l border-[#141210]">
          <Count label="Today" value={full.counts.today} note={`${full.counts.postedToday} posted`} featured />
          <Count label="This week" value={full.counts.week} note="today plus six days" />
          <Count label="Unscheduled" value={full.counts.backlog} note="backlog" />
        </section>

        <section aria-label="Filters" className="flex flex-wrap items-end gap-3 border-y border-[#141210] py-4">
          <FilterSelect
            label="Platform"
            value={filters.platform ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, platform: v || undefined }))}
            options={platformsPresent.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
          />
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
          {filtering && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className={`${MONO} rounded-[3px] border border-[#141210] bg-transparent px-3 py-2 text-[#141210] hover:bg-[#141210] hover:text-[#fcfaf3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]`}
            >
              Clear filters
            </button>
          )}
        </section>

        {rows.length === 0 && !loadError ? (
          <div className="rounded-[3px] border border-[#141210] bg-[#e8ecd0] p-6 text-[#141210]">
            <p className="text-lg font-bold tracking-[-0.03em]">Nothing is on the calendar yet.</p>
            <p className="mt-2 text-sm text-[#4a4339]">
              Load a calendar file from the site repo with{' '}
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 border border-[#141210]/20">node scripts/social-calendar-import.mjs &lt;calendar.json&gt;</code>
            </p>
          </div>
        ) : (
          <>
            {filtering && nothingShown && (
              <p className="rounded-[3px] border border-dashed border-[#141210] px-4 py-6 text-center text-sm text-[#4a4339]">
                Nothing matches these filters.
              </p>
            )}

            <DaySection day={shown.today} isToday onSaved={replace} emptyNote={filtering ? 'Nothing matches today.' : 'Nothing goes out today.'} />

            {shown.backlog.length > 0 && (
              <section aria-labelledby="backlog-h" className="space-y-3 rounded-[3px] border border-[#141210] bg-[#e8ecd0] p-3 sm:p-4">
                <h2 id="backlog-h" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-[#141210] pb-2 text-3xl font-bold tracking-[-0.045em] text-[#141210]">
                  Unscheduled
                  <span className={`${MONO} text-[#4a4339]`}>
                    {shown.backlog.length} {shown.backlog.length === 1 ? 'post needs' : 'posts need'} a slot
                  </span>
                </h2>
                <p className="text-sm text-[#4a4339]">Missed or refused posts and anything with no date. They stay off the days below until they are slotted again.</p>
                <ul className="space-y-3">
                  {shown.backlog.map((p) => (
                    <PostCard key={p.id} post={p} onSaved={replace} showDate />
                  ))}
                </ul>
              </section>
            )}

            {shown.upcoming.map((d) => (
              <DaySection key={d.date} day={d} onSaved={replace} />
            ))}

            {shown.past.length > 0 && (
              <details className="group rounded-[3px] border border-[#141210] bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[#141210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]">
                  <span className="text-xl font-bold tracking-[-0.04em]">Last 7 days</span>
                  <span className={`${MONO} text-[#4a4339]`}>
                    {shown.past.reduce((n, d) => n + d.posts.length, 0)} posts
                    <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="space-y-8 border-t border-[#141210] p-4">
                  {shown.past.map((d) => (
                    <DaySection key={d.date} day={d} onSaved={replace} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        <p className={`${MONO} pt-4 text-[#4a4339]`}>
          Today is {t.weekday}, {t.month} {t.day} in Kalispell.
        </p>
      </main>
    </div>
  );
}

function Count({ label, value, note, featured }: { label: string; value: number; note: string; featured?: boolean }) {
  return (
    <div className={`border-r border-b border-[#141210] p-3 sm:p-5 ${featured ? 'bg-[#f5b700]' : 'bg-[#fcfaf3]'}`}>
      <p className={`${MONO} text-[10px] sm:text-[11px] text-[#141210]`}>{label}</p>
      <p className="mt-1 text-4xl sm:text-5xl leading-none text-[#141210]" style={{ fontFamily: 'var(--font-shrikhand), Georgia, serif' }}>
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
        className="rounded-[3px] border border-[#141210] bg-white px-3 py-2 text-sm text-[#141210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]"
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

function DaySection({
  day,
  isToday,
  onSaved,
  emptyNote,
}: {
  day: Day;
  isToday?: boolean;
  onSaved: (row: SocialPost) => void;
  emptyNote?: string;
}) {
  const d = longDate(day.date);
  const posted = day.posts.filter((p) => p.status === 'posted').length;
  const headingId = `day-${day.date}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="flex flex-wrap items-end gap-x-4 gap-y-1 border-b-2 border-[#141210] pb-2 text-[#141210]">
        <span className="text-6xl sm:text-7xl leading-[0.85]" style={{ fontFamily: 'var(--font-shrikhand), Georgia, serif' }}>
          {d.day}
        </span>
        <span className="flex flex-col">
          {isToday && (
            <span className={`${MONO} mb-1 w-fit rounded-[3px] border border-[#141210] bg-[#f5b700] px-2 py-0.5 text-[10px] text-[#141210]`}>Today</span>
          )}
          <span className="text-2xl sm:text-3xl font-bold leading-none tracking-[-0.045em]">{d.weekday}</span>
          <span className="text-sm text-[#4a4339]">
            {d.month} {d.year}
          </span>
        </span>
        <span className={`${MONO} ml-auto text-[#4a4339]`}>
          {day.posts.length} {day.posts.length === 1 ? 'post' : 'posts'}
          {posted > 0 ? `, ${posted} posted` : ''}
        </span>
      </h2>
      {day.posts.length === 0 ? (
        <p className="rounded-[3px] border border-dashed border-[#141210]/50 px-4 py-5 text-sm text-[#4a4339]">{emptyNote ?? 'Nothing this day.'}</p>
      ) : (
        <ul className="space-y-3">
          {day.posts.map((p) => (
            <PostCard key={p.id} post={p} onSaved={onSaved} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-[3px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
      style={{ background: bg, color: fg, borderColor: INK }}
    >
      {children}
    </span>
  );
}

function shortDate(iso: string): string {
  const d = longDate(iso);
  return `${d.weekday.slice(0, 3)} ${d.month.slice(0, 3)} ${d.day}`;
}

function PostCard({ post, onSaved, showDate }: { post: SocialPost; onSaved: (row: SocialPost) => void; showDate?: boolean }) {
  const plat = PLATFORM_META[post.platform];
  const st = STATUS_META[post.status];
  const live = isUrl(post.ref);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>(post.status);
  const [ref, setRef] = useState(post.ref ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const copy = async () => {
    if (!post.caption) return;
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg({ ok: false, text: 'Copy failed. Select the caption and copy it by hand.' });
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/social/${encodeURIComponent(post.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, ref }),
      });
      const j = (await res.json().catch(() => ({}))) as { row?: SocialPost; error?: string };
      if (!res.ok || !j.row) throw new Error(j.error ?? `Save failed (${res.status}).`);
      onSaved(j.row);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const dirty = status !== post.status || ref.trim() !== (post.ref ?? '');

  return (
    <li className="rounded-[3px] border border-[#141210] bg-white text-[#141210] transition-shadow hover:shadow-[4px_4px_0_0_#141210]">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="w-14 shrink-0 sm:w-16">
          {showDate && (
            <p className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4c47]">{post.date ? shortDate(post.date) : 'No date'}</p>
          )}
          <p className="font-mono text-sm font-bold tabular-nums text-[#141210]">{post.time_mt || 'Any'}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#4a4339]">MT</p>
        </div>
        {post.cover_url ? (
          <a
            href={post.cover_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]"
            aria-label={`Open the cover for ${post.title ?? post.id}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_url}
              alt=""
              loading="lazy"
              width={54}
              height={96}
              className="h-24 w-[54px] rounded-[3px] border border-[#141210] object-cover object-top"
            />
          </a>
        ) : (
          <div aria-hidden="true" className="h-24 w-[54px] shrink-0 rounded-[3px] border border-dashed border-[#141210]/40 bg-[#e8ecd0]" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill bg={plat.bg} fg={plat.fg}>{plat.label}</Pill>
            <Pill bg={st.bg} fg={st.fg}>{st.label}</Pill>
            {post.verified && (
              <span
                title="Verified on the platform"
                className="inline-flex items-center gap-1 rounded-[3px] border border-[#0f4c47] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0f4c47]"
              >
                <span aria-hidden="true">✓</span> Verified
              </span>
            )}
            {post.series && <span className={`${MONO} text-[10px] text-[#0f4c47]`}>{post.series}</span>}
            {post.kind && <span className={`${MONO} text-[10px] text-[#4a4339]`}>· {post.kind}</span>}
          </div>
          <p className="text-[16px] sm:text-[17px] font-bold leading-snug tracking-[-0.03em] text-[#141210] break-words">
            {post.title || post.id}
          </p>
          <p className="text-[13px] text-[#4a4339] break-words">
            {post.account}
            {live && (
              <>
                {post.account ? ' · ' : ''}
                <a
                  href={post.ref!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0f4c47] underline decoration-[#f5b700] decoration-2 underline-offset-2 hover:text-[#141210]"
                >
                  View the live post ↗
                </a>
              </>
            )}
            {!live && post.ref && (
              <span className="font-mono text-[11px] text-[#4a4339]">
                {post.account ? ' · ' : ''}ref {post.ref}
              </span>
            )}
          </p>
          {post.note && (
            <p className="border-l-2 border-[#f5b700] pl-2 text-[13px] leading-snug text-[#141210] break-words">
              <span className={`${MONO} mr-1.5 text-[10px] text-[#4a4339]`}>Note</span>
              {post.note}
            </p>
          )}
        </div>
      </div>

      <details className="group border-t border-[#141210]/20">
        <summary className={`${MONO} flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[10px] text-[#141210] hover:bg-[#fcfaf3] sm:px-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#141210]`}>
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">▸</span>
          {post.caption ? 'Caption and status' : 'Status'}
        </summary>
        <div className="space-y-4 px-3 pb-4 sm:px-4">
          {post.caption ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`${MONO} text-[10px] text-[#4a4339]`}>Caption · {post.caption.length} characters</span>
                <button
                  type="button"
                  onClick={copy}
                  className={`${MONO} rounded-[3px] border border-[#141210] bg-[#f5b700] px-3 py-1.5 text-[10px] text-[#141210] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#141210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210] motion-reduce:transition-none`}
                >
                  {copied ? 'Copied' : 'Copy caption'}
                </button>
              </div>
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-[3px] border border-[#141210]/25 bg-[#fcfaf3] p-3 text-[13px] leading-relaxed text-[#141210]" style={SANS}>
                {post.caption}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-[#4a4339]">No caption on this row.</p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className={`${MONO} text-[10px] text-[#4a4339]`}>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="rounded-[3px] border border-[#141210] bg-white px-2.5 py-2 text-sm text-[#141210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <span className={`${MONO} text-[10px] text-[#4a4339]`}>Live link or post id</span>
              <input
                type="text"
                inputMode="url"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="https://"
                className="rounded-[3px] border border-[#141210] bg-white px-2.5 py-2 text-sm text-[#141210] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className={`${MONO} rounded-[3px] border border-[#141210] bg-[#141210] px-4 py-2.5 text-[10px] text-[#fcfaf3] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b700]`}
            >
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
          {msg && (
            <p role="status" className={`text-sm ${msg.ok ? 'text-[#0f4c47]' : 'text-[#b42318]'}`}>
              {msg.text}
            </p>
          )}
          <p className="font-mono text-[10px] text-[#4a4339] break-all">id {post.id}</p>
        </div>
      </details>
    </li>
  );
}
