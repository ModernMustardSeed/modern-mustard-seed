'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import LeadDrawer from './LeadDrawer';
import type { LeadRow, LeadType, LeadStatus } from '@/lib/supabase';

const TYPE_LABEL: Record<LeadType, string> = {
  'build-queue': 'Build Queue',
  audit: 'AI Audit',
  contact: 'Contact',
  newsletter: 'Newsletter',
};

const TYPE_COLOR: Record<LeadType, string> = {
  'build-queue': 'border-mustard-500/40 text-mustard-300/90',
  audit: 'border-amber-500/40 text-amber-300/90',
  contact: 'border-emerald-500/40 text-emerald-300/90',
  newsletter: 'border-white/20 text-white/60',
};

const STATUS_OPTIONS: LeadStatus[] = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];
const STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'bg-mustard-500/15 text-mustard-200 border-mustard-500/30',
  replied: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  booked: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  won: 'bg-emerald-500/25 text-emerald-100 border-emerald-500/40',
  lost: 'bg-red-500/10 text-red-200 border-red-500/30',
  archived: 'bg-white/5 text-white/40 border-white/10',
};

export default function AdminDashboard() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState<LeadType | ''>('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LeadRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      if (res.ok) setLeads(data.leads);
      else setError(data.error ?? 'Failed to load leads');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { new: 0, replied: 0, booked: 0, won: 0, total: leads.length };
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const updateLead = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelected(updated);
  };

  const removeLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <header className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#080c16]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium block">
              Modern Mustard Seed
            </span>
            <h1 className="font-sans text-xl font-semibold text-white tracking-tight mt-1">
              Admin
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 px-4 py-2"
            >
              Overview
            </Link>
            <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-300 px-4 py-2">
              Pipeline
            </span>
            <Link
              href="/admin/partners"
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 px-4 py-2"
            >
              Partners
            </Link>
            <button
              onClick={load}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 px-4 py-2"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 px-4 py-2"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total },
            { label: 'New', value: stats.new },
            { label: 'Replied', value: stats.replied },
            { label: 'Booked', value: stats.booked },
            { label: 'Won', value: stats.won },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">
                {s.label}
              </div>
              <div className="font-sans text-2xl font-semibold text-white mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-1.5">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Name, email, company, message..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-mustard-500/40"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeadType | '')}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-mustard-500/40"
            >
              <option value="" className="bg-neutral-900">All types</option>
              <option value="build-queue" className="bg-neutral-900">Build Queue</option>
              <option value="audit" className="bg-neutral-900">AI Audit</option>
              <option value="contact" className="bg-neutral-900">Contact</option>
              <option value="newsletter" className="bg-neutral-900">Newsletter</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-mustard-500/40"
            >
              <option value="" className="bg-neutral-900">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-neutral-900">{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_20px_rgba(255,107,53,0.2)] transition-all"
          >
            Apply
          </button>
        </div>

        {/* List */}
        {error && (
          <div className="glass-card p-5 mb-6 border-red-500/30">
            <p className="text-red-300 text-sm font-body">{error}</p>
            <p className="text-white/40 text-xs font-body mt-2">
              If this is the first time loading: run the SQL migration in Supabase. See SETUP.md.
            </p>
          </div>
        )}
        {loading ? (
          <p className="text-center text-white/40 py-12 font-body italic">Loading...</p>
        ) : leads.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-white/60 font-body mb-2">No leads yet.</p>
            <p className="text-white/30 text-sm font-body">
              The moment someone submits the contact form, joins the build queue, runs an audit, or subscribes, they will land here.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">Type</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">Name</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">Email</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">Summary</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">Status</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className={`inline-block text-[9px] uppercase tracking-[0.2em] font-mono font-semibold px-2.5 py-1 rounded border ${TYPE_COLOR[l.type]}`}>
                        {TYPE_LABEL[l.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-white/90 font-body">{l.name ?? <span className="text-white/30">—</span>}</td>
                    <td className="px-4 py-3.5 text-white/60 font-body text-xs">{l.email}</td>
                    <td className="px-4 py-3.5 text-white/55 font-body text-xs max-w-xs truncate">
                      {l.business_name || l.company || l.message?.slice(0, 80) || l.idea_description?.slice(0, 80) || <span className="text-white/25">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block text-[9px] uppercase tracking-[0.15em] font-mono font-semibold px-2.5 py-1 rounded border ${STATUS_COLOR[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-white/40 font-mono text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} onUpdate={updateLead} onDelete={removeLead} />
    </div>
  );
}
