'use client';

import { useState } from 'react';
import { PAYOUT_METHODS, payoutMethodLabel } from '@/lib/payout-methods';

/**
 * The "where do we send your money" form on the partner dashboard. Saved to the
 * partner's affiliate row and shown in admin next to Mark paid, so payouts
 * never stall on a text thread. Collapses to a quiet on-file line once saved.
 */
export default function PayoutForm({ method, details }: { method: string | null; details: string | null }) {
  const [saved, setSaved] = useState<{ method: string; details: string } | null>(
    method && details ? { method, details } : null
  );
  const [editing, setEditing] = useState(!saved);
  const [form, setForm] = useState({ method: method ?? '', details: details ?? '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const hint = PAYOUT_METHODS.find((m) => m.value === form.method)?.hint ?? 'Pick a method first';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/partners/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: form.method, details: form.details.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaved({ method: json.method, details: json.details });
        setEditing(false);
        setMsg('');
      } else {
        setMsg(json.error ?? 'Could not save. Try again.');
      }
    } catch {
      setMsg('Could not save (network error). Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (saved && !editing) {
    return (
      <div className="flex items-start justify-between gap-3 bg-[#FFF8E6] border border-[#161616]/20 rounded-xl px-4 py-3">
        <div className="min-w-0">
          <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-700 font-mono font-bold block">Payout info on file</span>
          <p className="text-[#161616] font-body text-sm mt-1 break-words">
            {payoutMethodLabel(saved.method)} · <span className="font-mono">{saved.details}</span>
          </p>
        </div>
        <button
          onClick={() => { setForm({ method: saved.method, details: saved.details }); setEditing(true); }}
          className="shrink-0 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/60 hover:text-[#161616]"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="bg-[#FFF8E6] border border-[#161616]/20 rounded-xl px-4 py-4">
      <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-1">Where do we send your money?</span>
      <p className="text-[#3A3733] font-body text-sm mb-3">Tell us once and every payout goes straight there, no back and forth.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[150px]">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Method</span>
          <select
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            required
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          >
            <option value="" disabled>Pick one</option>
            {PAYOUT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[200px]">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">{hint}</span>
          <input
            value={form.details}
            onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            required
            minLength={3}
            maxLength={300}
            placeholder={hint}
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
        {saved && (
          <button type="button" onClick={() => setEditing(false)} className="pb-2.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/50 hover:text-[#161616]">
            Cancel
          </button>
        )}
      </div>
      {msg && <p className="text-[#E0301E] font-body text-sm mt-3">{msg}</p>}
    </form>
  );
}
