'use client';

import { useState, FormEvent } from 'react';
import type { LeadRow, LeadType, LeadStatus } from '@/lib/supabase';

// Simple "add a lead by hand" modal for the admin pipeline. For referrals,
// walk-ins, and phone calls that never hit a public form. Posts to
// /api/admin/leads and hands the created row back to the dashboard.

const TYPES: { value: LeadType; label: string }[] = [
  { value: 'contact', label: 'Contact' },
  { value: 'build-queue', label: 'Build Queue' },
  { value: 'audit', label: 'AI Audit' },
  { value: 'newsletter', label: 'Newsletter' },
];
const STATUSES: LeadStatus[] = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];

const inp =
  'w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2.5 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

export default function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: LeadRow) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'contact' as LeadType,
    business_name: '',
    status: 'new' as LeadStatus,
    message: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.lead) {
        onCreated(data.lead as LeadRow);
      } else {
        setError(data.error ?? 'Could not add the lead.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-[#161616]/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#161616]/10 px-6 py-4">
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
            New lead
          </span>
          <button
            onClick={onClose}
            className="text-[#161616]/45 hover:text-[#161616] text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name">
              <input value={form.name} onChange={set('name')} placeholder="Jane Builder" className={inp} />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="jane@business.com"
                className={inp}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} placeholder="(406) 555-0142" className={inp} />
            </Field>
            <Field label="Business / company">
              <input
                value={form.business_name}
                onChange={set('business_name')}
                placeholder="Rios Heating & Air"
                className={inp}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={set('type')} className={inp}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inp}>
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-white">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Note / context">
            <textarea
              value={form.message}
              onChange={set('message')}
              rows={3}
              placeholder="How you met them, what they need, where they are now."
              className={`${inp} resize-none`}
            />
          </Field>

          {error && <p className="text-[#E0301E] text-sm font-body">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-[#161616]/55 hover:text-[#161616] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.email.trim()}
              className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all rounded-lg disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? 'Adding...' : 'Add lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
