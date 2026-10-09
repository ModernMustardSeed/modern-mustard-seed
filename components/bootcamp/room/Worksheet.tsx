'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WORKSHEET_ANSWER_MAX, buildBrief, worksheetProgress, worksheetQuestions } from '@/data/bootcamp-worksheet';
import { ErrorNote, inputCls } from '@/components/bootcamp/ui';

/**
 * The Idea Director worksheet, in the room. Saves itself two seconds after
 * the typing stops and again when a field loses focus, shows when it last
 * saved, and builds the brief live at the bottom with a copy button. If a
 * save fails the answers stay on the page and the next keystroke retries.
 */

type Props = {
  id: string;
  k: string;
  initial: Record<string, string>;
  savedAt: string | null;
  who: { name: string | null; business: string | null };
};

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const fmtSaved = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(iso));

export default function Worksheet({ id, k, initial, savedAt, who }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [state, setState] = useState<SaveState>(savedAt ? 'saved' : 'idle');
  const [lastSaved, setLastSaved] = useState<string | null>(savedAt);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  }, [answers]);

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    setState('saving');
    try {
      const res = await fetch('/api/bootcamp/room/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, k, answers: latest.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; savedAt?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState('error');
        setError(data.error || 'Not saved yet.');
        return;
      }
      setLastSaved(data.savedAt ?? new Date().toISOString());
      setError('');
      setState('saved');
    } catch {
      setState('error');
      setError('Not saved: we could not reach the server. Your answers are still here.');
    }
  }, [id, k]);

  const change = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value.slice(0, WORKSHEET_ANSWER_MAX) }));
    setState('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), 2000);
  };

  // Never lose the last keystrokes to a closed tab.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state === 'dirty' || state === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  const done = worksheetProgress(answers);
  const brief = buildBrief(answers, who);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const status =
    state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Typing…' : state === 'saved' && lastSaved ? `Saved ${fmtSaved(lastSaved)}` : state === 'error' ? 'Not saved' : 'Saves as you type';

  return (
    <div>
      <div className="sticky top-20 z-10 mb-6 flex items-center justify-between gap-4 rounded-full border-2 border-[#0b3b44] bg-white px-5 py-2.5 shadow-[3px_3px_0_0_#0b3b44]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0b3b44]">
          {done} of {worksheetQuestions.length} answered
        </p>
        <div className="hidden sm:block h-2 flex-1 max-w-[220px] rounded-full bg-[#0b3b44]/10 overflow-hidden" aria-hidden="true">
          <div className="h-full bg-[#f5b700] transition-all" style={{ width: `${(done / worksheetQuestions.length) * 100}%` }} />
        </div>
        <p aria-live="polite" className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${state === 'error' ? 'text-[#c2261a]' : 'text-[#0a7c78]'}`}>
          {status}
        </p>
      </div>

      <ol className="space-y-6">
        {worksheetQuestions.map((q) => {
          const fid = `ws-${q.key}`;
          return (
            <li key={q.key} className="rounded-2xl border-2 border-[#0b3b44] bg-white p-5 sm:p-7 shadow-[4px_4px_0_0_#0b3b44]">
              <div className="flex gap-4">
                <span className="font-display text-3xl font-black text-[#f5b700] leading-none" aria-hidden="true">{q.n}</span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={fid} className="font-display text-lg sm:text-xl font-black text-[#0b3b44] leading-tight block">{q.title}</label>
                  <p id={`${fid}-prompt`} className="font-body text-[14px] text-[#0b3b44]/70 mt-1.5 leading-relaxed">{q.prompt}</p>
                  {q.long ? (
                    <textarea
                      id={fid}
                      rows={4}
                      value={answers[q.key] ?? ''}
                      onChange={(e) => change(q.key, e.target.value)}
                      onBlur={() => state === 'dirty' && void save()}
                      aria-describedby={`${fid}-prompt ${fid}-eg`}
                      className={`${inputCls} mt-3 resize-y leading-relaxed`}
                    />
                  ) : (
                    <input
                      id={fid}
                      type="text"
                      value={answers[q.key] ?? ''}
                      onChange={(e) => change(q.key, e.target.value)}
                      onBlur={() => state === 'dirty' && void save()}
                      aria-describedby={`${fid}-prompt ${fid}-eg`}
                      className={`${inputCls} mt-3`}
                    />
                  )}
                  <p id={`${fid}-eg`} className="font-body text-[12.5px] text-[#0b3b44]/50 mt-2 leading-relaxed">
                    <span className="font-semibold">For example:</span> {q.example}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {state === 'error' && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-10 rounded-2xl border-2 border-[#0b3b44] bg-[#0b3b44] p-5 sm:p-7 text-[#fbf5ea] shadow-[6px_6px_0_0_#f5b700]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#81d8d0]">Your brief</p>
            <p className="font-display text-xl sm:text-2xl font-black mt-1">What your first agent reads on Day 3</p>
          </div>
          <button
            type="button"
            onClick={copyBrief}
            disabled={done === 0}
            className="rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-5 py-2.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0b3b44] shadow-[3px_3px_0_0_#81d8d0] disabled:opacity-50"
          >
            {copied ? 'Copied' : 'Copy the brief'}
          </button>
        </div>
        <pre className="mt-5 whitespace-pre-wrap break-words rounded-xl border-2 border-[#81d8d0]/40 bg-[#06262c] p-4 sm:p-5 font-mono text-[12.5px] leading-relaxed text-[#fbf5ea]/90">
          {done === 0 ? 'Answer the first question and your brief starts writing itself here.' : brief}
        </pre>
      </div>
    </div>
  );
}
