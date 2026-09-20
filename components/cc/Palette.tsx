'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Label, cx } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * ⌘K. Rooms and people in one box. The people are fetched once when the box
 * first opens, from the same two lists the modules read, so a name typed here
 * finds the same row the table would.
 */

type Module = { key: string; label: string; blurb: string };
type Hit = { kind: 'module' | 'lead' | 'contact'; key: string; title: string; sub: string; href?: string; go?: string };

export default function Palette({ open, onClose, modules, go, onOperator }: { open: boolean; onClose: () => void; modules: Module[]; go: (k: string) => void; onOperator: () => void }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Hit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 10);
    if (loaded) return;
    (async () => {
      try {
        const [l, c] = await Promise.all([fetch('/api/portal/leads', { cache: 'no-store' }), fetch('/api/portal/contacts', { cache: 'no-store' })]);
        const lj = (await l.json()) as { leads?: Array<{ id: string; name: string | null; town: string | null; phone: string | null; project_type: string | null }> };
        const cj = (await c.json()) as { contacts?: { people?: Array<{ id: string; name: string | null; company: string | null; phone: string | null; email: string | null }> } };
        const hits: Hit[] = [
          ...(lj.leads ?? []).map((x) => ({ kind: 'lead' as const, key: `lead-${x.id}`, title: x.name ?? 'Someone', sub: [x.town, x.project_type, x.phone].filter(Boolean).join(' · ') || 'Lead', go: 'leads' })),
          ...(cj.contacts?.people ?? []).map((x) => ({ kind: 'contact' as const, key: `contact-${x.id}`, title: x.name ?? 'No name', sub: [x.company, x.phone, x.email].filter(Boolean).join(' · ') || 'Contact', go: 'contacts' })),
        ];
        setPeople(hits);
      } catch {
        /* the rooms still work */
      } finally {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rooms: Hit[] = modules.filter((m) => !term || m.label.toLowerCase().includes(term) || m.blurb.toLowerCase().includes(term)).map((m) => ({ kind: 'module', key: m.key, title: m.label, sub: m.blurb, go: m.key }));
    const found = term.length >= 2 ? people.filter((p) => `${p.title} ${p.sub}`.toLowerCase().includes(term)).slice(0, 8) : [];
    return [...rooms, ...found];
  }, [q, modules, people]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  if (!open) return null;

  const pick = (hit: Hit) => {
    if (hit.go) go(hit.go);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button className="absolute inset-0 bg-[#0c111d]/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--cc-line)] bg-white shadow-[0_40px_80px_-30px_rgba(16,24,40,.45)]">
        <div className="flex items-center gap-3 border-b border-[var(--cc-line)] px-4 py-3">
          <span className="text-[var(--cc-muted)]"><Icon name="search" /></span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === 'Enter' && results[cursor]) {
                e.preventDefault();
                pick(results[cursor]);
              }
            }}
            placeholder="Jump to a room, or find a person"
            className="flex-1 bg-transparent text-[15px] text-[var(--cc-ink)] outline-none placeholder:text-[#98a2b3]"
          />
          <button onClick={onOperator} className="rounded-lg border border-[var(--cc-line)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]">
            Ask the Operator
          </button>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-[13.5px] text-[var(--cc-muted)]">{loaded ? 'Nothing matches that.' : 'Reading your records'}</li>
          )}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(r)}
                className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left', i === cursor ? 'bg-[#F4F6F8]' : 'hover:bg-[#FAFBFC]')}
              >
                <span className={cx('flex-none', r.kind === 'module' ? 'text-[var(--cc-accent)]' : 'text-[var(--cc-muted)]')}>
                  <Icon name={r.kind === 'module' ? 'overview' : r.kind === 'lead' ? 'leads' : 'contacts'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.title}</span>
                  <span className="block truncate text-[12.5px] text-[var(--cc-muted)]">{r.sub}</span>
                </span>
                {r.kind !== 'module' && <span className="flex-none"><Label>{r.kind}</Label></span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-2">
          <Label>Enter to open, Esc to close</Label>
          <Label>⌘K</Label>
        </div>
      </div>
    </div>
  );
}
