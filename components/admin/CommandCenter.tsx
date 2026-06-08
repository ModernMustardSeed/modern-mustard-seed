'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import AdminHeader from './AdminHeader';

/**
 * The owner command center. One screen to run the business: revenue, sales,
 * pipeline, upcoming calls, what needs attention right now, and an AI brief
 * that reads the live numbers and tells Sarah what to do today.
 */

type Overview = {
  generatedAt: string;
  revenue: { month: number; allTime: number; monthCount: number; allTimeCount: number };
  leads: { total: number; byStatus: Record<string, number>; byType: Record<string, number>; new7d: number; new30d: number };
  bookings: { upcoming: Array<{ name: string | null; email: string; whenIso: string; display: string; leadId: string }>; monthCount: number };
  proposals?: { open: number; openValue: number; accepted: number; acceptedValue: number };
  mrr?: { monthly: number; activePlans: number };
  messages?: { newCount: number; items: Array<{ id: string; email: string; name: string | null; body: string; source: string; status: string; created_at: string; proposed_date: string | null }> };
  followups?: Array<{ kind: string; title: string; detail: string; days: number }>;
  attention: Array<{ kind: string; title: string; detail: string; whenIso: string; leadId?: string; severity: 'high' | 'medium' }>;
  recentOrders: Array<{ name: string | null; email: string; product_name: string; price_paid_cents: number; created_at: string }>;
  recentLeads: Array<{ id: string; name: string | null; email: string; type: string; status: string; created_at: string }>;
  revenueSeries: Array<{ month: string; revenue: number }>;
  targets: { revenue: number; leads: number; calls: number } | null;
};

const STATUS_ORDER = ['new', 'replied', 'booked', 'won', 'lost'] as const;
const STATUS_COLOR: Record<string, string> = {
  new: 'bg-mustard-500',
  replied: 'bg-blue-500',
  booked: 'bg-emerald-500',
  won: 'bg-emerald-400',
  lost: 'bg-red-500/70',
};

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Tiny brief renderer: handles ## headers, - bullets, and **bold** inline. */
function renderBrief(text: string) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  return lines.map((raw, i) => {
    const line = raw.trim();
    const inline = (s: string) =>
      s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j} className="text-cream-50 font-semibold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );
    if (line.startsWith('## ')) return <h4 key={i} className="text-cream-50 font-sans font-semibold text-sm mt-3 mb-1">{inline(line.slice(3))}</h4>;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2.5 mb-2">
          <span className="text-gold-light mt-1.5 text-[8px]">●</span>
          <p className="text-white/75 text-[13px] font-body leading-relaxed flex-1">{inline(line.replace(/^[-*]\s/, ''))}</p>
        </div>
      );
    }
    return <p key={i} className="text-white/75 text-[13px] font-body leading-relaxed mb-2">{inline(line)}</p>;
  });
}

export default function CommandCenter() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  const [editTargets, setEditTargets] = useState(false);
  const [tRevenue, setTRevenue] = useState('');
  const [tLeads, setTLeads] = useState('');
  const [tCalls, setTCalls] = useState('');
  const [savingTargets, setSavingTargets] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load');
      } else {
        setData(json);
        if (json.targets) {
          setTRevenue(String(json.targets.revenue || ''));
          setTLeads(String(json.targets.leads || ''));
          setTCalls(String(json.targets.calls || ''));
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const genBrief = useCallback(async (overview: Overview) => {
    setBriefLoading(true);
    try {
      const res = await fetch('/api/admin/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overview }),
      });
      const json = await res.json();
      setBrief(json.brief ?? '');
    } catch {
      setBrief('_Could not load the brief._');
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data && !brief && !briefLoading) genBrief(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const markRequest = async (id: string, status: 'read' | 'done') => {
    try {
      await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      load();
    } catch {
      /* ignore */
    }
  };

  const approveLaunch = async (id: string) => {
    try {
      await fetch(`/api/admin/requests/${id}/approve-launch`, { method: 'POST' });
      load();
    } catch {
      /* ignore */
    }
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const saveTargets = async () => {
    setSavingTargets(true);
    try {
      const res = await fetch('/api/admin/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenue: Number(tRevenue) || 0, leads: Number(tLeads) || 0, calls: Number(tCalls) || 0 }),
      });
      const json = await res.json();
      if (res.ok) {
        setEditTargets(false);
        load();
      } else {
        setError(json.error ?? 'Could not save targets');
      }
    } finally {
      setSavingTargets(false);
    }
  };

  const t = data?.targets;
  const pct = (val: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0);

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="overview" title="Command Center" onRefresh={load} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="glass-card p-5 mb-6 border-red-500/30">
            <p className="text-red-300 text-sm font-body">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-center text-white/40 py-20 font-body italic">Loading the cockpit...</p>
        ) : !data ? (
          <p className="text-center text-white/40 py-20 font-body italic">No data.</p>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
              <div className="glass-card p-5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">Revenue this month</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{money(data.revenue.month)}</div>
                {t && t.revenue > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-mustard-600 to-mustard-400" style={{ width: `${pct(data.revenue.month, t.revenue)}%` }} />
                    </div>
                    <div className="text-[10px] text-white/35 font-mono mt-1.5">{pct(data.revenue.month, t.revenue)}% of {money(t.revenue)} goal</div>
                  </div>
                )}
                <div className="text-[10px] text-white/35 font-mono mt-2">{money(data.revenue.allTime)} all time</div>
              </div>

              <div className="glass-card p-5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">Sales this month</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{data.revenue.monthCount}</div>
                <div className="text-[10px] text-white/35 font-mono mt-2">{data.revenue.allTimeCount} all time</div>
              </div>

              <div className="glass-card p-5 border-emerald-500/20">
                <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-300/70 font-mono font-medium">MRR</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{money(data.mrr?.monthly ?? 0)}</div>
                <div className="text-[10px] text-white/35 font-mono mt-2">{data.mrr?.activePlans ?? 0} active plan{(data.mrr?.activePlans ?? 0) === 1 ? '' : 's'}</div>
              </div>

              <div className="glass-card p-5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">New leads (7d)</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{data.leads.new7d}</div>
                {t && t.leads > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${pct(data.leads.new30d, t.leads)}%` }} />
                    </div>
                    <div className="text-[10px] text-white/35 font-mono mt-1.5">{data.leads.new30d}/{t.leads} this month</div>
                  </div>
                )}
                <div className="text-[10px] text-white/35 font-mono mt-2">{data.leads.total} total in pipeline</div>
              </div>

              <div className="glass-card p-5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">Upcoming calls</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{data.bookings.upcoming.length}</div>
                {t && t.calls > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${pct(data.bookings.monthCount, t.calls)}%` }} />
                    </div>
                    <div className="text-[10px] text-white/35 font-mono mt-1.5">{data.bookings.monthCount}/{t.calls} this month</div>
                  </div>
                )}
                <div className="text-[10px] text-white/35 font-mono mt-2">Wed and Thu slots</div>
              </div>

              <Link href="/admin/proposals" className="glass-card p-5 hover:border-mustard-500/30 transition-colors col-span-2 lg:col-span-1">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">Open proposals</div>
                <div className="font-sans text-3xl font-semibold text-white mt-1.5">{data.proposals?.open ?? 0}</div>
                <div className="text-[10px] text-white/35 font-mono mt-2">
                  {money(data.proposals?.openValue ?? 0)} outstanding
                  {data.proposals?.accepted ? ` · ${money(data.proposals.acceptedValue)} accepted` : ''}
                </div>
              </Link>
            </div>

            {/* Client messages (change requests / notes from portals) */}
            {data.messages && data.messages.items.length > 0 && (
              <div className="glass-card p-5 mb-6 border-mustard-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-2 w-2">
                    {data.messages.newCount > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mustard-400 opacity-70" />}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-mustard-400" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-300 font-mono font-bold">Client messages</span>
                  {data.messages.newCount > 0 && (
                    <span className="text-[9px] font-mono font-bold text-[#080c16] bg-mustard-400 rounded-full px-2 py-0.5">{data.messages.newCount} new</span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {data.messages.items.map((m) => (
                    <div key={m.id} className={`rounded-lg border px-4 py-3 ${m.status === 'new' ? 'bg-mustard-500/[0.06] border-mustard-500/25' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/90 font-sans text-sm font-semibold truncate">{m.name ?? m.email}</span>
                            {m.source === 'chatbot' && <span className="text-[8px] uppercase tracking-[0.15em] font-mono text-white/35 border border-white/10 rounded px-1.5 py-0.5">via Mr. Mustard</span>}
                            <span className="text-white/30 font-mono text-[10px] whitespace-nowrap">{timeAgo(m.created_at)}</span>
                          </div>
                          <p className="text-white/70 font-body text-[13px] leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {m.source === 'launch_date' && m.proposed_date && m.status !== 'done' && (
                            <button
                              onClick={() => approveLaunch(m.id)}
                              className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#080c16] bg-emerald-400 hover:bg-emerald-300 rounded px-2.5 py-1 whitespace-nowrap"
                            >
                              Approve {fmtDate(m.proposed_date)}
                            </button>
                          )}
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your note')}`} className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-mustard-400 hover:text-mustard-300">Reply</a>
                          <button onClick={() => markRequest(m.id, 'done')} className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-white/40 hover:text-emerald-300">Mark done</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up radar */}
            {data.followups && data.followups.length > 0 && (
              <Link
                href="/admin/proposals"
                className="block glass-card p-5 mb-6 border-amber-500/30 hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-mono font-bold">
                    Follow-up radar
                  </span>
                  <span className="text-[9px] text-white/30 font-mono">{data.followups.length} need a nudge</span>
                </div>
                <div className="space-y-2">
                  {data.followups.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-sm font-sans font-semibold text-white/90 truncate">{f.title}</span>
                        <span className="block text-[11px] text-white/45 font-body">{f.detail}</span>
                      </div>
                      <span className="flex-shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-amber-300/80">
                        {f.days}d
                      </span>
                    </div>
                  ))}
                </div>
              </Link>
            )}

            {/* AI brief */}
            <div className="glass-card p-6 mb-6 border-mustard-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-light opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-light" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/90 font-mono font-bold">Your daily brief</span>
                </div>
                <button
                  onClick={() => data && genBrief(data)}
                  disabled={briefLoading}
                  className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 disabled:opacity-40"
                >
                  {briefLoading ? 'Thinking...' : 'Regenerate'}
                </button>
              </div>
              {briefLoading && !brief ? (
                <p className="text-white/40 font-body italic text-sm">Reading your numbers...</p>
              ) : (
                <div className="max-w-none">{renderBrief(brief || 'No brief yet.')}</div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              {/* Needs attention */}
              <div className="lg:col-span-2 glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">Needs attention</span>
                  <span className="text-[10px] text-white/30 font-mono">{data.attention.length} items</span>
                </div>
                {data.attention.length === 0 ? (
                  <p className="text-white/40 font-body italic text-sm py-6 text-center">All clear. Nothing waiting on you.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.attention.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${a.severity === 'high' ? 'bg-red-400' : 'bg-mustard-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white/90 font-body text-sm font-medium truncate">{a.title}</p>
                          <p className="text-white/45 font-body text-xs truncate mt-0.5">{a.detail}</p>
                        </div>
                        <span className="text-white/30 font-mono text-[10px] whitespace-nowrap">{a.kind === 'call' ? 'call' : timeAgo(a.whenIso)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming calls */}
              <div className="glass-card p-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-4">Upcoming calls</span>
                {data.bookings.upcoming.length === 0 ? (
                  <p className="text-white/40 font-body italic text-sm py-6 text-center">No calls booked yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.bookings.upcoming.slice(0, 6).map((b, i) => (
                      <div key={i} className="border-l-2 border-emerald-500/40 pl-3">
                        <p className="text-white/90 font-body text-sm font-medium">{b.name ?? b.email}</p>
                        <p className="text-emerald-300/80 font-mono text-[11px] mt-0.5">{b.display}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              {/* Revenue chart */}
              <div className="lg:col-span-2 glass-card p-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-5">Revenue, last 6 months</span>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.revenueSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: '#0f1422', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                        formatter={(value) => [money(Number(value)), 'Revenue']}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {data.revenueSeries.map((_, i) => (
                          <Cell key={i} fill={i === data.revenueSeries.length - 1 ? '#C8964E' : 'rgba(200,150,78,0.4)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pipeline */}
              <div className="glass-card p-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-5">Pipeline</span>
                <div className="space-y-3">
                  {STATUS_ORDER.map((s) => {
                    const count = data.leads.byStatus[s] ?? 0;
                    const max = Math.max(1, ...STATUS_ORDER.map((x) => data.leads.byStatus[x] ?? 0));
                    return (
                      <div key={s}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 font-body text-xs capitalize">{s}</span>
                          <span className="text-white/80 font-mono text-xs font-semibold">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className={`h-full ${STATUS_COLOR[s]}`} style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent sales */}
              <div className="lg:col-span-2 glass-card p-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-4">Recent sales</span>
                {data.recentOrders.length === 0 ? (
                  <p className="text-white/40 font-body italic text-sm py-6 text-center">No sales recorded yet.</p>
                ) : (
                  <div className="space-y-1">
                    {data.recentOrders.map((o, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-white/85 font-body text-sm truncate">{o.product_name}</p>
                          <p className="text-white/40 font-body text-xs truncate">{o.name ?? o.email}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-emerald-300 font-mono text-sm font-semibold">{money(Math.round(o.price_paid_cents / 100))}</p>
                          <p className="text-white/30 font-mono text-[10px]">{timeAgo(o.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Targets editor */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">Monthly targets</span>
                  {!editTargets && (
                    <button onClick={() => setEditTargets(true)} className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 hover:text-mustard-300">
                      {t ? 'Edit' : 'Set'}
                    </button>
                  )}
                </div>
                {editTargets ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Revenue ($)', val: tRevenue, set: setTRevenue },
                      { label: 'New leads', val: tLeads, set: setTLeads },
                      { label: 'Calls', val: tCalls, set: setTCalls },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono block mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={f.val}
                          onChange={(e) => f.set(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustard-500/40"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveTargets} disabled={savingTargets} className="flex-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-mustard-500/80 hover:bg-mustard-500 rounded-lg disabled:opacity-50">
                        {savingTargets ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditTargets(false)} className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-white/50 hover:text-white/80">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : t ? (
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-white/50 font-body text-sm">Revenue</span><span className="text-white/85 font-mono text-sm">{money(t.revenue)}</span></div>
                    <div className="flex justify-between"><span className="text-white/50 font-body text-sm">New leads</span><span className="text-white/85 font-mono text-sm">{t.leads}</span></div>
                    <div className="flex justify-between"><span className="text-white/50 font-body text-sm">Calls</span><span className="text-white/85 font-mono text-sm">{t.calls}</span></div>
                  </div>
                ) : (
                  <p className="text-white/40 font-body italic text-sm">No targets set. Tap Set to define your monthly goals and track progress.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
