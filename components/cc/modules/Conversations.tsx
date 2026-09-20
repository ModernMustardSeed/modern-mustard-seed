'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, ErrorNote, Label, Skeleton, cx, when } from '@/components/cc/ui';

/**
 * WHAT PEOPLE ASKED THE WEBSITE. The chat answers day and night, and this is
 * the record: their words, the page they were standing on, in full. It is the
 * cheapest market research a builder will ever get, so nothing is summarised
 * away.
 */

type Turn = { role: 'user' | 'assistant'; content: string; at: string };
type Conversation = { id: string; startedAt: string; page: string | null; turns: Turn[]; exchanges: number };

export default function Conversations() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/conversations', { cache: 'no-store' });
      const j = (await r.json()) as { conversations: Conversation[] };
      setItems(j.conversations ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <Card pad={false}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--cc-line)]">
          <div>
            <Label>Last 30 days</Label>
            <p className="mt-1 text-[15px] font-semibold">{items ? `${items.length} ${items.length === 1 ? 'conversation' : 'conversations'}` : 'Reading'}</p>
          </div>
          <Button onClick={load} kind="ghost">Refresh</Button>
        </div>

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The conversations did not load.</ErrorNote></div>
        ) : !items ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : items.length === 0 ? (
          <div className="p-5"><Empty title="No chats in the last 30 days" note="Every conversation on your website lands here, with the page the visitor was on." /></div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {items.map((c) => {
              const first = c.turns.find((t) => t.role === 'user');
              const isOpen = open === c.id;
              return (
                <li key={c.id}>
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="w-full text-left px-5 py-3.5 hover:bg-[#FAFBFC]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-none rounded-md bg-[var(--cc-accent)]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-accent)]">{c.exchanges} {c.exchanges === 1 ? 'turn' : 'turns'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{first?.content ?? 'Conversation'}</span>
                        <span className="block text-[12.5px] text-[var(--cc-muted)]">
                          {when(c.startedAt)}
                          {c.page ? ` · on ${c.page}` : ''}
                        </span>
                      </span>
                      <span className={cx('flex-none text-[var(--cc-muted)] transition', isOpen && 'rotate-180')}>
                        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden><path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="space-y-2.5 bg-[#FAFBFC] px-5 py-4 border-t border-[var(--cc-line)]">
                      {c.turns.map((t, i) => (
                        <div key={i} className={cx('max-w-[86%] rounded-xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap', t.role === 'user' ? 'bg-white border border-[var(--cc-line)]' : 'ml-auto bg-[var(--cc-ink)] text-white')}>
                          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">{t.role === 'user' ? 'Visitor' : 'Your website'}</span>
                          {t.content}
                        </div>
                      ))}
                      {c.page && (
                        <div className="pt-1">
                          <Badge>Page: {c.page}</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
