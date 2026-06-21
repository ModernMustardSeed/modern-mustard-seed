'use client';

import { useEffect, useState } from 'react';
import type { LeadRow, LeadStatus } from '@/lib/supabase';
import { launchCountdown } from '@/lib/launch';

const STATUS_OPTIONS: LeadStatus[] = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];

type Props = {
  lead: LeadRow | null;
  onClose: () => void;
  onUpdate: (lead: LeadRow) => void;
  onDelete: (id: string) => void;
};

type TimelineEvent = { when: string; label: string; detail?: string; kind: string };

const EVENT_DOT: Record<string, string> = {
  signed: 'bg-[#1E50C8]',
  paid: 'bg-emerald-600',
  project: 'bg-[#F5B700]',
  proposal: 'bg-[#161616]/40',
};

export default function LeadDrawer({ lead, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<LeadStatus>('new');
  const [followUp, setFollowUp] = useState('');
  const [owner, setOwner] = useState('');
  const [intro, setIntro] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [launch, setLaunch] = useState<{ date: string; projectName: string; launched: boolean } | null>(null);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes ?? '');
      setStatus(lead.status);
      setFollowUp(lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : '');
      setOwner(lead.owner ?? '');
      setIntro('idle');
      setEvents([]);
      setLaunch(null);
      if (lead.email) {
        fetch(`/api/admin/timeline?email=${encodeURIComponent(lead.email)}`)
          .then((r) => r.json())
          .then((j) => {
            setEvents(j.events || []);
            setLaunch(j.launch || null);
          })
          .catch(() => setEvents([]));
      }
    }
  }, [lead]);

  const cd = launch ? launchCountdown(launch.date) : null;

  if (!lead) return null;

  const patch = async (update: Partial<Pick<LeadRow, 'status' | 'notes' | 'follow_up_at' | 'owner'>>) => {
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

  const saveFollowUp = (value: string) => {
    setFollowUp(value);
    patch({ follow_up_at: value || null });
  };

  const saveOwner = () => {
    if ((owner.trim() || null) !== (lead.owner ?? null)) patch({ owner: owner.trim() || null });
  };

  const sendIntro = async () => {
    if (intro === 'sending') return;
    if (!confirm(`Send a warm intro email to ${lead.email}?`)) return;
    setIntro('sending');
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/intro`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.lead) {
        onUpdate(data.lead);
        setIntro('sent');
      } else {
        setIntro('error');
      }
    } catch {
      setIntro('error');
    }
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
      <div className="flex-1 bg-[#161616]/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-xl bg-[#FBF6EA] border-l-2 border-[#161616] overflow-y-auto">
        <div className="sticky top-0 bg-[#FBF6EA]/95 backdrop-blur-md border-b-2 border-[#161616] px-6 py-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-semibold text-[#E0301E]">
                {lead.type.replace('-', ' ')}
              </span>
              <span className="text-[#161616]/45 text-xs">·</span>
              <span className="text-xs text-[#161616]/50 font-mono">
                {new Date(lead.created_at).toLocaleString()}
              </span>
            </div>
            <h2 className="font-sans text-2xl font-semibold text-[#161616] tracking-tight">
              {lead.name ?? lead.email}
            </h2>
            <a href={`mailto:${lead.email}`} className="text-[#1E50C8] text-sm font-body hover:text-[#161616]">
              {lead.email}
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-[#161616]/45 hover:text-[#161616] text-xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-7">
          {/* Launch countdown */}
          {cd && (
            <div
              className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
                launch?.launched
                  ? 'border-emerald-800/25 bg-emerald-100'
                  : cd.past
                    ? 'border-[#E0301E]/30 bg-red-100'
                    : 'border-[#F5B700] bg-[#FFF8E6]'
              }`}
            >
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-1">
                  {launch?.launched ? 'Launched' : 'Launch'}
                </span>
                <p className="font-sans font-semibold text-[#161616] text-sm">
                  {launch?.launched ? `${launch.projectName} is live` : cd.label}
                </p>
                <p className="text-[#161616]/60 font-mono text-[11px] mt-0.5">{cd.date}</p>
              </div>
              {!launch?.launched && (
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`font-display text-3xl font-semibold leading-none ${cd.past ? 'text-[#E0301E]' : 'text-[#161616]'}`}>
                    {cd.days < 0 ? Math.abs(cd.days) : cd.days}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono mt-1">
                    {cd.past ? 'days late' : cd.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-2.5">
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
                      ? 'bg-[#F5B700] text-[#161616] border-[#161616]'
                      : 'bg-white text-[#161616]/55 border-[#161616]/20 hover:border-[#161616]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up + owner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-2.5">
                Follow up by
              </label>
              <input
                type="date"
                value={followUp}
                onChange={(e) => saveFollowUp(e.target.value)}
                disabled={saving}
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-2.5">
                Owner
              </label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                onBlur={saveOwner}
                placeholder="Who owns this?"
                disabled={saving}
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
            </div>
          </div>

          {/* Fields */}
          {fields.length > 0 && (
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium mb-3">
                Details
              </h3>
              <dl className="space-y-2.5">
                {fields.map((f) => (
                  <div key={f.label} className="grid grid-cols-3 gap-3 text-sm">
                    <dt className="text-[#161616]/50 font-mono text-xs uppercase tracking-wider pt-0.5">{f.label}</dt>
                    <dd className="col-span-2 text-[#3A3733] font-body break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Message body */}
          {(lead.message || lead.idea_description) && (
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium mb-3">
                What they wrote
              </h3>
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 whitespace-pre-wrap text-[#3A3733] text-sm font-body leading-relaxed">
                {lead.message ?? lead.idea_description}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {events.length > 0 && (
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium mb-3">
                Activity
              </h3>
              <div className="space-y-3 border-l border-[#161616]/15 pl-4">
                {events.map((e, i) => (
                  <div key={i} className="relative">
                    <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${EVENT_DOT[e.kind] ?? 'bg-[#161616]/40'}`} />
                    <p className="text-[#3A3733] font-body text-sm">
                      {e.label}
                      {e.detail ? <span className="text-[#161616]/60"> · {e.detail}</span> : ''}
                    </p>
                    <p className="text-[#161616]/45 font-mono text-[11px]">{new Date(e.when).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-2.5">
              Your notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Private notes. What did you reply with? What is the next step?"
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 font-body resize-none focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg px-5 py-2.5 shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              {saving ? 'Saving...' : 'Save notes'}
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-[#161616]/10">
            <button
              onClick={sendIntro}
              disabled={intro === 'sending' || intro === 'sent'}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg px-5 py-2.5 shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:shadow-[3px_3px_0_0_#161616]"
            >
              {intro === 'sending' ? 'Sending...' : intro === 'sent' ? 'Intro sent ✓' : 'Send intro email'}
            </button>
            <a
              href={`mailto:${lead.email}`}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616] bg-white border-2 border-[#161616] rounded-lg px-5 py-2.5 hover:bg-[#FFF8E6] transition-all"
            >
              Reply manually
            </a>
            <button
              onClick={remove}
              className="text-[11px] uppercase tracking-[0.2em] font-sans font-medium text-[#E0301E] bg-white border-2 border-[#E0301E] rounded-lg px-5 py-2.5 hover:bg-red-50 transition-all"
            >
              Delete
            </button>
          </div>
          {intro === 'error' && (
            <p className="text-[#E0301E] text-xs font-body -mt-3">Could not send the intro email. Try again, or reply manually.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
