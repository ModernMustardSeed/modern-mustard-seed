'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * The Roadmap Desk.
 *
 * Two jobs. First, every roadmap a visitor runs is a qualified lead with their
 * business already diagnosed, so this is a pipeline view: who ran one, what
 * their constraint is, and whether they left an email. Second, Sarah can run one
 * on any prospect before a call and walk in already knowing their bottleneck.
 */

type Row = {
  id: string;
  slug: string;
  url: string;
  host: string;
  business_name: string | null;
  scale_score: number | null;
  stage: string | null;
  headline: string | null;
  constraint_type: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  source: string;
  featured: boolean;
  views: number;
  created_at: string;
};

const CONSTRAINT_COLOR: Record<string, string> = {
  leads: 'bg-[#E0301E]/12 text-[#C4160B] border-[#C4160B]/40',
  sales: 'bg-[#1E50C8]/10 text-[#1E50C8] border-[#1E50C8]/40',
  delivery: 'bg-[#F5B700]/25 text-[#8f6600] border-[#8f6600]/40',
  cash: 'bg-[#2F7D32]/12 text-[#2F7D32] border-[#2F7D32]/40',
  offer: 'bg-[#161616]/8 text-[#161616] border-[#161616]/35',
  owner: 'bg-[#7A3E9D]/12 text-[#6B2E8C] border-[#6B2E8C]/40',
};

const FIELDS = [
  { key: 'revenue', label: 'Revenue', placeholder: 'about $400K' },
  { key: 'team_size', label: 'Team size', placeholder: 'owner plus 3' },
  { key: 'main_offer', label: 'Main offer', placeholder: 'kitchen remodels' },
  { key: 'price_point', label: 'Price point', placeholder: '$12K average job' },
  { key: 'biggest_headache', label: 'What is stuck', placeholder: 'quotes plenty, closes few' },
  { key: 'goal', label: '12 month goal', placeholder: 'double without more Saturdays' },
] as const;

export default function RoadmapsDesk() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [featured, setFeatured] = useState(false);
  const [context, setContext] = useState<Record<string, string>>({});
  const [showContext, setShowContext] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roadmaps');
      const data = await res.json();
      if (data.ok) setRows(data.rows as Row[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.host, r.business_name, r.email, r.name, r.headline, r.constraint_type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const leads = rows.filter((r) => r.email).length;
    const week = rows.filter(
      (r) => Date.now() - new Date(r.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const avg = rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.scale_score ?? 0), 0) / rows.length)
      : 0;
    return { total: rows.length, leads, week, avg };
  }, [rows]);

  const run = async () => {
    if (!url.trim() || running) return;
    setRunning(true);
    setError(null);
    setNote('Reading the site and writing the roadmap. This takes up to two minutes.');
    try {
      const res = await fetch('/api/admin/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          slug: slug.trim() || undefined,
          featured,
          seed: Boolean(slug.trim()),
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Roadmap failed');
      setNote(`Done. /scaling-roadmap/r/${data.slug}`);
      setUrl('');
      setSlug('');
      setContext({});
      await load();
    } catch (err) {
      setNote(null);
      setError(err instanceof Error ? err.message : 'Roadmap failed');
    } finally {
      setRunning(false);
    }
  };

  const toggleFeatured = async (row: Row) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, featured: !r.featured } : r)));
    await fetch(`/api/admin/roadmaps/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !row.featured }),
    });
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete the roadmap for ${row.host}? This cannot be undone.`)) return;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    await fetch(`/api/admin/roadmaps/${row.id}`, { method: 'DELETE' });
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="roadmaps" title="Roadmap Desk" />

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
        <header className="mb-8">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-3">
            Roadmap Desk
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
            The Hundredfold Roadmap
          </h1>
          <p className="mt-2 text-[#161616]/70 font-body text-sm md:text-base max-w-2xl leading-relaxed">
            Every run is a lead with their bottleneck already named. Run one on a prospect before a call
            and you walk in knowing what is capping them.{' '}
            <Link href="/scaling-roadmap" target="_blank" className="text-[#1E50C8] font-semibold hover:text-[#161616]">
              Open the public tool
            </Link>
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Roadmaps run', value: stats.total },
            { label: 'Left an email', value: stats.leads },
            { label: 'Last 7 days', value: stats.week },
            { label: 'Average score', value: stats.avg },
          ].map((s) => (
            <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
              <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/55 mb-2">
                {s.label}
              </span>
              <span className="font-display text-3xl font-black">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Run one */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 md:p-7 mb-8">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
            Run a roadmap
          </span>
          <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="prospect.com"
              disabled={running}
              className="border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none disabled:opacity-50"
            />
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Fixed slug (ours only)"
              disabled={running}
              className="border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={run}
              disabled={running || !url.trim()}
              className="px-6 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              {running ? 'Building…' : 'Build it'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-xs font-body text-[#161616]/75">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#161616]"
              />
              Feature it on the public page
            </label>
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60 hover:text-[#161616]"
            >
              {showContext ? '− Context' : '+ Add context'}
            </button>
          </div>

          {showContext && (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <label key={f.key}>
                  <span className="block text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/55 mb-1.5">
                    {f.label}
                  </span>
                  <input
                    type="text"
                    value={context[f.key] ?? ''}
                    onChange={(e) => setContext((c) => ({ ...c, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border-2 border-[#161616]/25 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:border-[#161616]"
                  />
                </label>
              ))}
            </div>
          )}

          {note && <p className="mt-4 text-sm font-body text-[#1E50C8] font-semibold">{note}</p>}
          {error && <p className="mt-4 text-sm font-body text-[#C4160B] font-semibold">{error}</p>}
        </div>

        {/* List */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host, business, email"
            className="border-2 border-[#161616] rounded-lg px-4 py-2.5 font-body text-sm w-full sm:w-80 focus:outline-none"
          />
          <button
            type="button"
            onClick={load}
            className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60 hover:text-[#161616]"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-[#161616] text-[#FBF6EA]">
                  {['Business', 'Score', 'Stage', 'Constraint', 'Contact', 'Ran', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] uppercase tracking-[0.28em] font-mono font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-body text-[#161616]/50">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-body text-[#161616]/50">
                      No roadmaps yet. Run one above.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-[#161616]/10 align-top hover:bg-[#FFFDF6]">
                    <td className="px-4 py-4 max-w-[280px]">
                      <Link
                        href={`/scaling-roadmap/r/${r.slug}`}
                        target="_blank"
                        className="font-sans font-extrabold text-sm text-[#161616] hover:text-[#1E50C8] block truncate"
                      >
                        {r.business_name || r.host}
                      </Link>
                      <span className="block text-[10px] font-mono text-[#161616]/45 truncate">{r.host}</span>
                      {r.headline && (
                        <span className="block mt-1 text-xs font-body italic text-[#161616]/60 line-clamp-2">
                          {r.headline}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-display text-xl font-black">{r.scale_score ?? '–'}</td>
                    <td className="px-4 py-4 text-xs font-mono uppercase tracking-[0.15em] text-[#161616]/70">
                      {r.stage ?? '–'}
                    </td>
                    <td className="px-4 py-4">
                      {r.constraint_type && (
                        <span
                          className={`inline-block px-2.5 py-1 rounded border-2 text-[9px] uppercase tracking-[0.18em] font-mono font-bold ${
                            CONSTRAINT_COLOR[r.constraint_type] ?? 'bg-white text-[#161616] border-[#161616]/30'
                          }`}
                        >
                          {r.constraint_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs font-body">
                      {r.email ? (
                        <>
                          <a href={`mailto:${r.email}`} className="text-[#1E50C8] font-semibold hover:underline break-all">
                            {r.email}
                          </a>
                          {r.name && <span className="block text-[#161616]/60">{r.name}</span>}
                          {r.phone && <span className="block text-[#161616]/60 font-mono">{r.phone}</span>}
                        </>
                      ) : (
                        <span className="text-[#161616]/35">anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[11px] font-mono text-[#161616]/55 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="block text-[#161616]/35">
                        {r.source} · {r.views} views
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(r)}
                        title={r.featured ? 'Unfeature' : 'Feature on the public page'}
                        className={`text-lg leading-none px-1.5 ${r.featured ? 'text-[#F5B700]' : 'text-[#161616]/20 hover:text-[#161616]/50'}`}
                        style={r.featured ? { WebkitTextStroke: '1px #161616' } : undefined}
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        title="Delete"
                        className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/35 hover:text-[#C4160B] px-1.5"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
