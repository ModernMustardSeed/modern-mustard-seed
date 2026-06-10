'use client';

import { useEffect, useState } from 'react';

type Section = { key: string; title: string; intro?: string; fields: { key: string; label: string; type: 'text' | 'textarea' | 'url'; placeholder?: string }[] };

/* Getting-started checklist. Hides itself once the core steps are done. */
export function OnboardingChecklist({
  signed,
  depositPaid,
  intakeSubmitted,
  onStartIntake,
}: {
  signed: boolean;
  depositPaid: boolean;
  intakeSubmitted: boolean;
  onStartIntake: () => void;
}) {
  const steps = [
    { label: 'Proposal signed', done: signed, hint: signed ? null : 'Sign from the link in your email.', action: null as null | (() => void), actionLabel: '' },
    { label: 'Deposit paid', done: depositPaid, hint: depositPaid ? null : 'Pay it in the billing card below.', action: null as null | (() => void), actionLabel: '' },
    { label: 'Project intake complete', done: intakeSubmitted, hint: intakeSubmitted ? null : 'Tell us what we need to start.', action: intakeSubmitted ? null : onStartIntake, actionLabel: 'Start intake' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Getting started</span>
        <span className="text-[10px] text-[#161616]/45 font-mono">{doneCount} of {steps.length} done</span>
      </div>
      <div className="space-y-2.5">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${s.done ? 'bg-emerald-600 text-white' : 'border-2 border-[#F5B700] text-transparent'}`}>✓</span>
            <div className="flex-1 min-w-0">
              <p className={`font-body text-sm ${s.done ? 'text-[#161616]/45 line-through' : 'text-[#161616]'}`}>{s.label}</p>
              {!s.done && s.hint && <p className="text-[#161616]/45 font-body text-xs">{s.hint}</p>}
            </div>
            {!s.done && s.action && (
              <button onClick={s.action} className="flex-shrink-0 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-4 py-1.5 shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">
                {s.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Scope-aware onboarding intake. Sections come from the client's proposal. */
export function OnboardingIntake({ onStatus }: { onStatus?: (status: string) => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'loading' | 'in_progress' | 'submitted'>('loading');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/portal/intake')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.sections)) setSections(j.sections);
        if (j?.answers) setAnswers(j.answers);
        const st = j?.status === 'submitted' ? 'submitted' : 'in_progress';
        setStatus(st);
        onStatus?.(st);
      })
      .catch(() => setStatus('in_progress'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  const persist = async (submit: boolean) => {
    if (saving) return;
    setSaving(true);
    setErr('');
    setSavedNote('');
    try {
      const res = await fetch('/api/portal/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, submit }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) setErr((j && j.error) || 'Could not save.');
      else if (submit) {
        setStatus('submitted');
        onStatus?.('submitted');
      } else {
        setSavedNote('Saved. You can finish anytime.');
        setTimeout(() => setSavedNote(''), 3000);
      }
    } catch {
      setErr('Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return null;

  const inputCls = 'w-full bg-white border-2 border-[#161616] rounded-lg px-3.5 py-2.5 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

  return (
    <div id="intake-card" className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Project intake</span>
      {status === 'submitted' ? (
        <p className="text-emerald-700 font-body text-sm mb-4">Submitted, thank you. You can update your answers anytime below.</p>
      ) : (
        <p className="text-[#161616]/60 font-body text-xs mb-5">Answer what you can so we start with everything we need. Save and finish later, or submit when you are done.</p>
      )}

      <div className="space-y-7">
        {sections.map((sec) => (
          <div key={sec.key}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#161616]/60 font-mono font-bold mb-1">{sec.title}</h3>
            {sec.intro && <p className="text-[#161616]/45 font-body text-xs mb-3">{sec.intro}</p>}
            <div className="space-y-3 mt-2">
              {sec.fields.map((f) => (
                <div key={f.key}>
                  <label className="text-[12px] text-[#3A3733] font-body block mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea rows={2} value={answers[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={`${inputCls} resize-y`} />
                  ) : (
                    <input type={f.type === 'url' ? 'url' : 'text'} value={answers[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {err && <p className="text-[#E0301E] text-xs font-body mt-4">{err}</p>}
      {savedNote && <p className="text-emerald-700 text-xs font-body mt-4">{savedNote}</p>}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => persist(true)} disabled={saving} className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
          {saving ? 'Saving…' : status === 'submitted' ? 'Update answers' : 'Submit intake'}
        </button>
        <button onClick={() => persist(false)} disabled={saving} className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/55 hover:text-[#161616] disabled:opacity-50">
          Save for later
        </button>
      </div>
    </div>
  );
}
