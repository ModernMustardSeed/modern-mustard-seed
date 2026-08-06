'use client';

import { useState } from 'react';
import type { GoliveRunbook, GoliveDoneMark, GoliveGroup, GoliveItem, GoliveWho } from '@/lib/golive';

const WHO_STYLE: Record<string, { bg: string; fg: string }> = {
  You: { bg: '#F5B700', fg: '#161616' },
  Client: { bg: 'rgba(30,80,200,0.12)', fg: '#1E50C8' },
  Claude: { bg: '#ECE5D3', fg: '#161616' },
  Done: { bg: '#ECE5D3', fg: '#161616' },
};

export default function GoliveRunbookView({ runbook }: { runbook: GoliveRunbook }) {
  const [groups, setGroups] = useState<GoliveGroup[]>(runbook.data);
  const [done, setDone] = useState<Record<string, GoliveDoneMark>>(runbook.done);
  const [err, setErr] = useState<string | null>(null);

  async function addStep(group: string, who: GoliveWho, what: string): Promise<boolean> {
    setErr(null);
    try {
      const r = await fetch('/api/admin/golive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: runbook.slug, group, who, what }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'add failed');
      setGroups((gs) => gs.map((g) => (g.name === group ? { ...g, items: [...g.items, j.item] } : g)));
      return true;
    } catch {
      setErr('That step did not save. Try again.');
      return false;
    }
  }

  const isDone = (it: GoliveItem) => it.who === 'Done' || Boolean(done[it.id]);

  async function toggle(it: GoliveItem) {
    if (it.who === 'Done') return;
    const next = !done[it.id];
    const prev = done;
    const optimistic = { ...done };
    if (next) optimistic[it.id] = { at: new Date().toISOString(), by: 'you' };
    else delete optimistic[it.id];
    setDone(optimistic);
    setErr(null);
    try {
      const r = await fetch('/api/admin/golive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: runbook.slug, itemId: it.id, done: next }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'save failed');
      setDone(j.done);
    } catch {
      setDone(prev);
      setErr('That check did not save. Try again.');
    }
  }

  const items = groups.flatMap((g) => g.items);
  const total = items.length;
  const doneCount = items.filter(isDone).length;
  const ready = total > 0 && doneCount === total;

  return (
    <div className="mt-8 space-y-7">
      <div
        className="flex items-center gap-4 border-2 border-[#161616] bg-white p-4 shadow-[4px_4px_0_0_#161616]"
        style={ready ? { background: '#F5B700' } : undefined}
      >
        <div className="h-3 flex-1 border-2 border-[#161616] bg-white p-[2px]">
          <div className="h-full bg-[#F5B700]" style={{ width: `${total ? (doneCount / total) * 100 : 0}%`, background: ready ? '#161616' : '#F5B700' }} />
        </div>
        <span className="font-mono text-xs font-bold">
          {ready ? 'READY TO GO LIVE' : `${doneCount}/${total} Done`}
        </span>
      </div>
      {err && <p className="font-mono text-xs text-[#C4160B]">{err}</p>}

      {groups.map((g) => (
        <div key={g.name} className="border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616]">
          <div className="border-b-2 border-[#161616] bg-[#161616] px-5 py-3">
            <span className="font-display text-lg font-bold text-[#FBF6EA]">{g.name}</span>
            {g.note && <span className="ml-3 font-mono text-[10px] text-[#F5B700]">{g.note}</span>}
          </div>
          <ul className="m-0 list-none p-0">
            {g.items.map((it) => {
              const checked = isDone(it);
              const fixed = it.who === 'Done';
              const chip = WHO_STYLE[it.who] ?? WHO_STYLE.Claude;
              return (
                <li
                  key={it.id}
                  className="flex gap-3.5 border-b border-[#161616]/15 px-5 py-4 last:border-b-0"
                  style={{ opacity: checked ? 0.55 : 1 }}
                >
                  <button
                    type="button"
                    disabled={fixed}
                    onClick={() => toggle(it)}
                    aria-label={checked ? `Mark "${it.what}" not done` : `Mark "${it.what}" done`}
                    className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center border-2 border-[#161616] font-mono text-xs font-bold"
                    style={{
                      background: checked ? '#161616' : 'transparent',
                      color: checked ? '#F5B700' : '#161616',
                      cursor: fixed ? 'default' : 'pointer',
                    }}
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold leading-snug">
                      <span
                        className="mr-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em]"
                        style={{ background: chip.bg, color: chip.fg }}
                      >
                        {it.who}
                      </span>
                      {it.what}
                    </p>
                    {it.how && <p className="mt-1 max-w-[62ch] text-[12.5px] leading-snug text-[#161616]/70">{it.how}</p>}
                    {it.href && (
                      <a
                        href={it.href}
                        target={it.href.startsWith('/') ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        className="mt-1 inline-block font-mono text-[11px] font-bold text-[#1E50C8] underline underline-offset-4"
                      >
                        {it.label ?? it.href} →
                      </a>
                    )}
                    {done[it.id]?.by === 'claude' && (
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wide text-[#8f6600]">
                        Checked off by the agent
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <AddStepRow group={g.name} onAdd={addStep} />
        </div>
      ))}
    </div>
  );
}

function AddStepRow({ group, onAdd }: { group: string; onAdd: (group: string, who: GoliveWho, what: string) => Promise<boolean> }) {
  const [what, setWhat] = useState('');
  const [who, setWho] = useState<GoliveWho>('You');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!what.trim() || busy) return;
    setBusy(true);
    const saved = await onAdd(group, who, what);
    if (saved) setWhat('');
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-[#161616]/15 bg-[#FBF6EA] px-5 py-3">
      <input
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        aria-label={`Add a step to ${group}`}
        placeholder="Add a step…"
        className="min-w-0 flex-1 border-2 border-[#161616] bg-white px-3 py-1.5 text-[13px] text-[#161616] outline-none placeholder:text-[#161616]/40"
      />
      <select
        value={who}
        onChange={(e) => setWho(e.target.value as GoliveWho)}
        aria-label="Who owns this step"
        className="border-2 border-[#161616] bg-white px-2 py-1.5 font-mono text-[11px] uppercase text-[#161616]"
      >
        <option value="You">You</option>
        <option value="Claude">Claude</option>
        <option value="Client">Client</option>
      </select>
      <button
        type="submit"
        disabled={busy || !what.trim()}
        className="border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 font-mono text-[12px] font-bold text-[#161616] disabled:opacity-40"
      >
        {busy ? '…' : '+'}
      </button>
    </form>
  );
}
