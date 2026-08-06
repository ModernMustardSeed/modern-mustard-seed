'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const F =
  'w-full border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2.5 text-[14px] text-[#161616] outline-none placeholder:text-[#161616]/40';
const L = 'block font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#161616]/60 mb-1';

export default function GoliveAddProject() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'ours' | 'client'>('ours');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/golive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.get('title'),
          repo_path: f.get('repo_path'),
          prod_url: f.get('prod_url'),
          kind,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'create failed');
      router.push(`/admin/golive/${j.slug}`);
    } catch {
      setErr('Could not create the runbook. Try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-[#161616] bg-[#F5B700] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wide text-[#161616] shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5"
      >
        + Add A Project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#161616]/70 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add a project"
            className="flex max-h-[90vh] w-full max-w-md flex-col border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b-2 border-[#161616] bg-[#161616] px-5 py-3">
              <span className="font-display text-lg font-bold text-[#FBF6EA]">Add A Project</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="font-mono text-[#FBF6EA]">
                ×
              </button>
            </div>
            <form onSubmit={submit} className="overflow-y-auto p-5">
              <p className="mb-4 text-[13px] leading-snug text-[#161616]/70">
                It starts with the standard go-live checklist. Ask Claude for a deep scan
                and the list becomes verified facts about the repo.
              </p>
              <label className="block">
                <span className={L}>Project Name *</span>
                <input required name="title" className={F} placeholder="Wild Hope Boutique" />
              </label>
              <label className="mt-3 block">
                <span className={L}>Repo Path (Optional)</span>
                <input name="repo_path" className={F} placeholder="~/wild-hope-boutique" />
              </label>
              <label className="mt-3 block">
                <span className={L}>Live URL (Optional)</span>
                <input name="prod_url" className={F} placeholder="https://…" />
              </label>
              <div className="mt-3">
                <span className={L}>Whose Launch Is It?</span>
                <div className="flex gap-2">
                  {(['ours', 'client'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      aria-pressed={kind === k}
                      className="flex-1 border-2 border-[#161616] px-3 py-2 font-mono text-[11px] uppercase tracking-wide"
                      style={{
                        background: kind === k ? '#161616' : 'transparent',
                        color: kind === k ? '#FBF6EA' : '#161616',
                      }}
                    >
                      {k === 'ours' ? 'Ours' : 'Client Build'}
                    </button>
                  ))}
                </div>
              </div>
              {err && <p className="mt-3 font-mono text-xs text-[#C4160B]">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full border-2 border-[#161616] bg-[#F5B700] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wide text-[#161616] shadow-[4px_4px_0_0_#161616]"
              >
                {busy ? 'Creating…' : 'Create The Runbook →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
