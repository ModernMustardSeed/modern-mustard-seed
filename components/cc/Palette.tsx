'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Label, cx } from '@/components/cc/ui';
import { Icon, type IconName } from '@/components/cc/icons';
import type { Who } from '@/components/cc/Person';

/**
 * ⌘K, AND IT KNOWS THE WHOLE BUSINESS.
 *
 * It used to hold the rooms and two lists it had loaded into the browser.
 * Searching now happens on the server, across every room at once: the book,
 * the website's enquiries, the board, the mail, the notes on a job, what has
 * been asked of the site, what has gone out. One box, every row.
 *
 * Typing is debounced rather than fired per keystroke, and the rooms still
 * answer instantly from memory, so the box never feels like it is waiting on
 * a network. A result about a person opens their card rather than dumping the
 * searcher in a room to find them again, because the question behind a name
 * typed at speed is almost always "who is this and what do we know".
 */

type Module = { key: string; label: string; blurb: string };

type Hit = {
  kind: 'module' | 'contact' | 'lead' | 'job' | 'mail' | 'post' | 'request' | 'note';
  id: string;
  title: string;
  sub: string;
  snippet?: string | null;
  room?: string;
  who?: Who | null;
};

const ICON: Record<Hit['kind'], IconName> = {
  module: 'overview',
  contact: 'contacts',
  lead: 'leads',
  job: 'board',
  mail: 'mail',
  post: 'marketing',
  request: 'website',
  note: 'note',
};

const WORD: Record<Hit['kind'], string> = {
  module: 'room',
  contact: 'in your book',
  lead: 'enquiry',
  job: 'on the board',
  mail: 'email',
  post: 'post',
  request: 'asked for',
  note: 'note',
};

export default function Palette({
  open,
  onClose,
  modules,
  go,
  onOperator,
  onPerson,
}: {
  open: boolean;
  onClose: () => void;
  modules: Module[];
  go: (k: string) => void;
  onOperator: () => void;
  onPerson: (who: Who) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [looking, setLooking] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setHits([]);
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // One request per pause in typing, not one per letter.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLooking(false);
      return;
    }
    let alive = true;
    setLooking(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cc/find?q=${encodeURIComponent(term)}`, { cache: 'no-store' });
        const j = (await r.json()) as { hits?: Hit[] };
        if (alive) setHits(j.hits ?? []);
      } catch {
        if (alive) setHits([]);
      } finally {
        if (alive) setLooking(false);
      }
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rooms: Hit[] = modules
      .filter((m) => !term || m.label.toLowerCase().includes(term) || m.blurb.toLowerCase().includes(term))
      .map((m) => ({ kind: 'module' as const, id: m.key, title: m.label, sub: m.blurb, room: m.key }));
    return [...rooms.slice(0, term ? 4 : rooms.length), ...hits];
  }, [q, modules, hits]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  if (!open) return null;

  const pick = (hit: Hit) => {
    // A person opens as a person. Everything else opens where it lives.
    if (hit.kind !== 'module' && hit.who && (hit.who.email || hit.who.phone || hit.who.name)) {
      onPerson(hit.who);
      onClose();
      return;
    }
    if (hit.room) go(hit.room);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button className="absolute inset-0 bg-[#0c111d]/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-[var(--cc-line)] bg-white shadow-[0_40px_80px_-30px_rgba(16,24,40,.45)]">
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
            placeholder="A name, a number, a town, anything anyone wrote"
            className="flex-1 bg-transparent text-[15px] text-[var(--cc-ink)] outline-none placeholder:text-[#98a2b3]"
          />
          <button onClick={onOperator} className="hidden flex-none rounded-lg border border-[var(--cc-line)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)] sm:block">
            Ask the Operator
          </button>
        </div>
        <ul className="max-h-[56vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-[13.5px] text-[var(--cc-muted)]">
              {looking ? 'Looking through everything' : q.trim().length >= 2 ? 'Nothing anywhere mentions that.' : 'Type a name, a phone number, a town, or a word from an email.'}
            </li>
          )}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.id}`}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(r)}
                className={cx('flex w-full items-start gap-3 px-4 py-2.5 text-left', i === cursor ? 'bg-[#F4F6F8]' : 'hover:bg-[#FAFBFC]')}
              >
                <span className={cx('mt-0.5 flex-none', r.kind === 'module' ? 'text-[var(--cc-accent)]' : 'text-[var(--cc-muted)]')}>
                  <Icon name={ICON[r.kind]} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.title}</span>
                  <span className="block truncate text-[12.5px] text-[var(--cc-muted)]">{r.sub}</span>
                  {r.snippet && <span className="mt-0.5 block truncate text-[12px] text-[var(--cc-muted)]">{r.snippet}</span>}
                </span>
                <span className="flex-none pt-0.5"><Label>{WORD[r.kind]}</Label></span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-2">
          <Label>Enter opens it, Esc closes</Label>
          <Label>⌘K</Label>
        </div>
      </div>
    </div>
  );
}
