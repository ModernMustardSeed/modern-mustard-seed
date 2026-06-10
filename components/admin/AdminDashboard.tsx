'use client';

import { useEffect, useState, useMemo } from 'react';
import LeadDrawer from './LeadDrawer';
import AdminHeader from './AdminHeader';
import type { LeadRow, LeadType, LeadStatus } from '@/lib/supabase';

const TYPE_LABEL: Record<LeadType, string> = {
  'build-queue': 'Build Queue',
  audit: 'AI Audit',
  contact: 'Contact',
  newsletter: 'Newsletter',
};

const TYPE_COLOR: Record<LeadType, string> = {
  'build-queue': 'border-[#161616]/30 text-[#161616] bg-[#F5B700]/20',
  audit: 'border-amber-800/25 text-amber-800 bg-amber-100',
  contact: 'border-emerald-800/25 text-emerald-800 bg-emerald-100',
  newsletter: 'border-[#161616]/20 text-[#161616]/65 bg-[#161616]/[0.06]',
};

const STATUS_OPTIONS: LeadStatus[] = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];
const STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'bg-[#F5B700]/20 text-[#161616] border-[#161616]/30',
  replied: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30',
  booked: 'bg-emerald-100 text-emerald-800 border-emerald-800/25',
  won: 'bg-emerald-200 text-emerald-900 border-emerald-800/30',
  lost: 'bg-red-100 text-[#E0301E] border-[#E0301E]/30',
  archived: 'bg-[#161616]/[0.06] text-[#161616]/45 border-[#161616]/15',
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

  const updateLead = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelected(updated);
  };

  const removeLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="pipeline" title="Pipeline" onRefresh={load} />

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
            <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium">
                {s.label}
              </div>
              <div className="font-sans text-2xl font-semibold text-[#161616] mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-1.5">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Name, email, company, message..."
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeadType | '')}
              className="bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            >
              <option value="" className="bg-white">All types</option>
              <option value="build-queue" className="bg-white">Build Queue</option>
              <option value="audit" className="bg-white">AI Audit</option>
              <option value="contact" className="bg-white">Contact</option>
              <option value="newsletter" className="bg-white">Newsletter</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
              className="bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            >
              <option value="" className="bg-white">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-white">{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Apply
          </button>
        </div>

        {/* List */}
        {error && (
          <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-6">
            <p className="text-[#E0301E] text-sm font-body">{error}</p>
            <p className="text-[#161616]/60 text-xs font-body mt-2">
              If this is the first time loading: run the SQL migration in Supabase. See SETUP.md.
            </p>
          </div>
        )}
        {loading ? (
          <p className="text-center text-[#161616]/45 py-12 font-body italic">Loading...</p>
        ) : leads.length === 0 ? (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-12 text-center">
            <p className="text-[#161616]/60 font-body mb-2">No leads yet.</p>
            <p className="text-[#161616]/45 text-sm font-body">
              The moment someone submits the contact form, joins the build queue, runs an audit, or subscribes, they will land here.
            </p>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#161616]/15">
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">Type</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">Name</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">Email</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">Summary</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">Status</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-medium px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className="border-b border-[#161616]/10 hover:bg-[#161616]/[0.04] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className={`inline-block text-[9px] uppercase tracking-[0.2em] font-mono font-semibold px-2.5 py-1 rounded border ${TYPE_COLOR[l.type]}`}>
                        {TYPE_LABEL[l.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#161616] font-body">{l.name ?? <span className="text-[#161616]/45">—</span>}</td>
                    <td className="px-4 py-3.5 text-[#161616]/60 font-body text-xs">{l.email}</td>
                    <td className="px-4 py-3.5 text-[#161616]/60 font-body text-xs max-w-xs truncate">
                      {l.business_name || l.company || l.message?.slice(0, 80) || l.idea_description?.slice(0, 80) || <span className="text-[#161616]/45">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block text-[9px] uppercase tracking-[0.15em] font-mono font-semibold px-2.5 py-1 rounded border ${STATUS_COLOR[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#161616]/45 font-mono text-xs whitespace-nowrap">
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
