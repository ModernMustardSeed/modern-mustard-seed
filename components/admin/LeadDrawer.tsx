'use client';

import { useEffect, useState } from 'react';
import type { LeadRow, LeadStatus } from '@/lib/supabase';

const STATUS_OPTIONS: LeadStatus[] = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];

type Props = {
  lead: LeadRow | null;
  onClose: () => void;
  onUpdate: (lead: LeadRow) => void;
  onDelete: (id: string) => void;
};

export default function LeadDrawer({ lead, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<LeadStatus>('new');

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes ?? '');
      setStatus(lead.status);
    }
  }, [lead]);

  if (!lead) return null;

  const patch = async (update: Partial<Pick<LeadRow, 'status' | 'notes'>>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.lead);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (s: LeadStatus) => {
    setStatus(s);
    await patch({ status: s });
  };

  const saveNotes = async () => {
    await patch({ notes });
  };

  const remove = async () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
    if (res.ok) onDelete(lead.id);
  };

  const fields = [
    { label: 'Phone', value: lead.phone },
    { label: 'Company', value: lead.company },
    { label: 'Business / idea', value: lead.business_name },
    { label: 'Industry', value: lead.industry },
    { label: 'Revenue', value: lead.revenue_range },
    { label: 'Timeline', value: lead.timeline },
    { label: 'Audit URL', value: lead.audit_url },
    { label: 'Audit score', value: lead.audit_score != null ? String(lead.audit_score) : null },
    { label: 'Suggested playbook', value: lead.suggested_playbook },
    { label: 'Source', value: lead.source },
  ].filter((f) => f.value);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-night-900/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-xl bg-[#0f0c08] border-l border-white/[0.06] overflow-y-auto">
        <div className="sticky top-0 bg-[#0f0c08]/95 backdrop-blur-md border-b border-white/[0.06] px-6 py-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-semibold text-mustard-400">
                {lead.type.replace('-', ' ')}
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-white/40 font-mono">
                {new Date(lead.created_at).toLocaleString()}
              </span>
            </div>
            <h2 className="font-sans text-2xl font-semibold text-white tracking-tight">
              {lead.name ?? lead.email}
            </h2>
            <a href={`mailto:${lead.email}`} className="text-mustard-400 text-sm font-body hover:text-mustard-300">
              {lead.email}
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-7">
          {/* Status */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-2.5">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={saving}
                  className={`text-[10px] uppercase tracking-[0.15em] font-mono font-semibold px-3 py-1.5 rounded border transition-all ${
                    status === s
                      ? 'bg-mustard-500/20 text-mustard-200 border-mustard-500/40'
                      : 'bg-white/[0.02] text-white/40 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          {fields.length > 0 && (
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium mb-3">
                Details
              </h3>
              <dl className="space-y-2.5">
                {fields.map((f) => (
                  <div key={f.label} className="grid grid-cols-3 gap-3 text-sm">
                    <dt className="text-white/40 font-mono text-xs uppercase tracking-wider pt-0.5">{f.label}</dt>
                    <dd className="col-span-2 text-white/85 font-body break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Message body */}
          {(lead.message || lead.idea_description) && (
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium mb-3">
                What they wrote
              </h3>
              <div className="glass-card p-5 whitespace-pre-wrap text-white/80 text-sm font-body leading-relaxed">
                {lead.message ?? lead.idea_description}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-2.5">
              Your notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Private notes. What did you reply with? What is the next step?"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 font-body resize-none focus:outline-none focus:border-mustard-500/30"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg px-5 py-2.5 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(255,107,53,0.2)] transition-all"
            >
              {saving ? 'Saving...' : 'Save notes'}
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/[0.05]">
            <a
              href={`mailto:${lead.email}`}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-lg px-5 py-2.5 hover:bg-mustard-500/10 transition-all"
            >
              Reply via email
            </a>
            <button
              onClick={remove}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-medium text-red-400/60 border border-red-500/20 rounded-lg px-5 py-2.5 hover:bg-red-500/10 hover:text-red-300 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
