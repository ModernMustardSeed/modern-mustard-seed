'use client';

import { useEffect, useState } from 'react';
import { SHELF_EXAMPLES, TESTS, preferredSourceUrl } from '@/data/handbook';

/**
 * THE FINAL WORD, interactive parts.
 *
 * The prose is rendered flat by the server page from data/handbook.ts. These
 * three pieces exist because they have a job the page cannot do flat:
 *
 *   - The Berean check: eight tests a reader ticks against a teaching, an
 *     answer, or a clip. The score and the verdict change as they tick.
 *   - The shelf: the reader's own list of trusted preachers and ministries,
 *     each row carrying Google's one-click "preferred source" deep link.
 *   - Print: the browser's own print dialog, which the print stylesheet on
 *     the page turns into a clean single-column PDF, shelf included.
 *
 * Everything persists in localStorage only. Nothing leaves the device, which
 * is the point of a page that tells people not to type their heart into a
 * free tool.
 */

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  },
};

const btnGold =
  'inline-flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all';
const btnPlain =
  'inline-flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all';

/* ------------------------------------------------------------------ */
/* Print                                                               */
/* ------------------------------------------------------------------ */

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? btnPlain}
      onClick={() => {
        try {
          window.print();
        } catch {
          /* nothing to do */
        }
      }}
    >
      Print or save as PDF
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The Berean check                                                    */
/* ------------------------------------------------------------------ */

const TESTS_KEY = 'berean.tests';

export function BereanCheck() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(store.get<Record<string, boolean>>(TESTS_KEY, {}));
  }, []);

  const n = TESTS.filter((t) => checked[t.id]).length;
  const total = TESTS.length;
  const verdict =
    n === 0
      ? 'Not yet tested'
      : n === total
        ? 'Passes every test. Take it to a person, then act.'
        : `Fails ${total - n}. Set it aside until a person you trust has looked.`;
  const verdictColor = n === total ? 'text-[#1F7A3F]' : n === 0 ? 'text-[#161616]/45' : 'text-[#E0301E]';

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      store.set(TESTS_KEY, next);
      return next;
    });
  };

  const clear = () => {
    setChecked({});
    store.set(TESTS_KEY, {});
  };

  return (
    <div>
      <ol className="grid gap-3">
        {TESTS.map((t, i) => {
          const on = !!checked[t.id];
          return (
            <li key={t.id}>
              <label
                className={`pop-card p-4 md:p-5 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 items-start cursor-pointer transition-colors ${
                  on ? 'bg-[#FFF3C7]' : ''
                }`}
              >
                <input
                  id={t.id}
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(t.id)}
                  className="mt-1 h-5 w-5 accent-[#F5B700] shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-display text-base md:text-lg font-black text-[#161616] leading-snug">
                    <span className="font-mono text-[11px] text-[#E0301E] mr-2 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t.title}
                  </span>
                  <span className="block mt-1 text-[#3a3733] text-sm font-body leading-6">{t.body}</span>
                  <span className="block mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/45">
                    {t.ref}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 pop-card p-4 md:p-5 flex flex-wrap items-center gap-4">
        <span className="font-display font-black text-[#161616] tabular-nums" id="berean-score">
          {n} of {total}
        </span>
        <div className="flex-1 min-w-[160px] h-2.5 rounded-full border-2 border-[#161616] bg-white overflow-hidden">
          <div className="h-full bg-[#F5B700] transition-[width] duration-300" style={{ width: `${(n / total) * 100}%` }} />
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${verdictColor}`} id="berean-verdict">
          {verdict}
        </span>
        <button type="button" onClick={clear} className={`${btnPlain} print:hidden`}>
          Clear and test something else
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The shelf                                                           */
/* ------------------------------------------------------------------ */

const SHELF_KEY = 'berean.shelf';

type ShelfRow = { n: string; d: string; ex?: boolean };

const EXAMPLES: ShelfRow[] = SHELF_EXAMPLES.map((s) => ({ n: s.name, d: s.domain, ex: true }));

function cleanDomain(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

export function Shelf() {
  const [rows, setRows] = useState<ShelfRow[]>(EXAMPLES);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [note, setNote] = useState('Saved on this device');

  useEffect(() => {
    const saved = store.get<ShelfRow[] | null>(SHELF_KEY, null);
    if (saved && saved.length) setRows(saved);
  }, []);

  const save = (next: ShelfRow[]) => {
    setRows(next);
    store.set(SHELF_KEY, next);
    setNote(`${next.length} source${next.length === 1 ? '' : 's'}, saved on this device`);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const d = cleanDomain(domain);
    if (!n || !d || !d.includes('.')) {
      setNote('Enter a name and a domain like gracechurch.org');
      return;
    }
    const next = [{ n, d }, ...rows.filter((r) => !r.ex)];
    setName('');
    setDomain('');
    save(next);
  };

  const remove = (i: number) => save(rows.filter((_, idx) => idx !== i));

  const reset = () => save(EXAMPLES);

  const copy = async () => {
    const text = rows
      .map((r) => `${r.n} : ${cleanDomain(r.d)}  (${preferredSourceUrl(cleanDomain(r.d))})`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setNote(`Copied ${rows.length} source${rows.length === 1 ? '' : 's'}`);
    } catch {
      setNote('Copy blocked here. Select the table and copy by hand.');
    }
  };

  return (
    <div className="pop-card p-5 md:p-7 min-w-0" id="shelf-tool">
      <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
        Trusted sources
      </span>
      <p className="text-[#3a3733] text-sm font-body leading-6 max-w-2xl mb-5">
        Six examples are loaded to show the shape. Replace them with your own. The first row should always be the
        church you belong to.
      </p>

      <form onSubmit={add} autoComplete="off" className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto] mb-5 print:hidden">
        <input
          id="shelf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, e.g. Our church or Pastor's podcast"
          aria-label="Source name"
          required
          className="min-w-0 rounded-lg border-2 border-[#161616]/30 bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:border-[#161616] focus:outline-none"
        />
        <input
          id="shelf-domain"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Domain, e.g. gracechurch.org"
          aria-label="Source domain"
          required
          className="min-w-0 rounded-lg border-2 border-[#161616]/30 bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:border-[#161616] focus:outline-none"
        />
        <button type="submit" className={btnGold}>
          Add to shelf
        </button>
      </form>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-left text-sm" id="shelf-table">
          <thead>
            <tr className="border-b-2 border-[#161616]">
              <th className="py-2 pr-3 text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/50">
                Source
              </th>
              <th className="py-2 pr-3 text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/50">
                Domain
              </th>
              <th className="py-2 text-right text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/50 print:hidden">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-5 font-body italic text-[#161616]/50">
                  Your shelf is empty. Add your church first.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const d = cleanDomain(r.d);
                return (
                  <tr key={`${d}-${i}`} className="border-t border-[#161616]/10 align-middle">
                    <td className="py-2.5 pr-3 font-display font-black text-[#161616] leading-snug">
                      {r.n}
                      {r.ex ? (
                        <span className="ml-2 align-middle font-mono text-[8px] uppercase tracking-[0.12em] text-[#161616]/50 bg-[#161616]/[0.06] rounded-full px-2 py-0.5">
                          example
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[#3a3733] [overflow-wrap:anywhere]">{d}</td>
                    <td className="py-2.5 text-right whitespace-nowrap print:hidden">
                      <a
                        href={preferredSourceUrl(d)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        Prefer in Google
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={`Remove ${r.n}`}
                        className="ml-2 text-[#161616]/45 hover:text-[#E0301E] font-mono text-base leading-none px-2 py-1"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" onClick={copy} className={btnPlain}>
          Copy list as text
        </button>
        <button type="button" onClick={reset} className={btnPlain}>
          Reset to examples
        </button>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616]/50" id="shelf-note">
          {note}
        </span>
      </div>
    </div>
  );
}
