'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Drawer, Label, Skeleton, cx, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * WHO IS THIS, AND WHAT DO WE KNOW.
 *
 * The phone rings, the name is half familiar, and somebody has nine seconds
 * before they have to say something. This is those nine seconds: the facts at
 * the top in one line each, then everything that has ever passed between this
 * business and this person, newest first, in one column.
 *
 * It is assembled, never written. Every line is a row from somewhere: an
 * enquiry, an email, a call somebody logged, a stage that moved. Nothing here
 * is summarised by a model, because the one place a business cannot afford a
 * plausible sentence is the thirty seconds before it speaks to a customer.
 */

export type Who = { name?: string | null; email?: string | null; phone?: string | null };

type Dossier = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  facts: string[];
  jobs: Array<{ id: string; name: string; stage: string; value_cents: number | null }>;
  timeline: Array<{ kind: string; at: string | null; title: string; body: string | null; room: string }>;
};

const money = (cents: number | null) => (cents == null ? '' : cents >= 100_000_000 ? `$${(cents / 100_000_000).toFixed(1)}M` : `$${Math.round(cents / 100 / 1000)}k`);

export default function Person({ who, onClose, go }: { who: Who | null; onClose: () => void; go?: (room: string) => void }) {
  const [card, setCard] = useState<Dossier | null | undefined>(undefined);

  useEffect(() => {
    if (!who) return;
    setCard(undefined);
    void (async () => {
      const q = new URLSearchParams({ who: '1' });
      if (who.email) q.set('email', who.email);
      if (who.phone) q.set('phone', who.phone);
      if (who.name) q.set('name', who.name);
      try {
        const r = await fetch(`/api/cc/find?${q.toString()}`, { cache: 'no-store' });
        const j = (await r.json()) as { person: Dossier | null };
        setCard(j.person);
      } catch {
        setCard(null);
      }
    })();
  }, [who]);

  return (
    <Drawer open={Boolean(who)} onClose={onClose} title={card?.name ?? who?.name ?? 'Who is this'}>
      {card === undefined ? (
        <Skeleton rows={6} />
      ) : card === null ? (
        <p className="text-[13.5px] text-[var(--cc-muted)]">Nothing is on file for them yet.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {card.phone && (
              <Button kind="primary" href={`tel:${card.phone.replace(/[^\d+]/g, '')}`}>
                <Icon name="phone" size={14} /> {card.phone}
              </Button>
            )}
            {card.email && (
              <Button href={`mailto:${card.email}`}>
                <Icon name="mail" size={14} /> {card.email}
              </Button>
            )}
          </div>

          {(card.company || card.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {card.company && <span className="text-[13.5px] font-semibold">{card.company}</span>}
              {card.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}

          {card.facts.length > 0 && (
            <div className="rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
              <ul className="space-y-1 text-[13.5px]">
                {card.facts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {card.jobs.length > 0 && (
            <div>
              <span className="mb-2 block"><Label>On the board</Label></span>
              <ul className="space-y-2">
                {card.jobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">{j.name}</span>
                      <span className="text-[12px] text-[var(--cc-muted)]">{j.stage}</span>
                    </span>
                    <span className="flex-none font-mono text-[12px] tabular-nums">{money(j.value_cents)}</span>
                  </li>
                ))}
              </ul>
              {go && (
                <div className="mt-2">
                  <Button onClick={() => go('jobs')}>Open the board</Button>
                </div>
              )}
            </div>
          )}

          <div>
            <span className="mb-2 block"><Label>Everything, newest first</Label></span>
            {card.timeline.length === 0 ? (
              <p className="text-[13px] text-[var(--cc-muted)]">Nothing has passed between you yet.</p>
            ) : (
              <ul className="space-y-2">
                {card.timeline.map((t, i) => (
                  <li key={i} className="rounded-lg border border-[var(--cc-line)] px-3 py-2">
                    <p className="flex flex-wrap items-baseline gap-2 text-[12px] text-[var(--cc-muted)]">
                      <span className="font-mono uppercase tracking-[0.14em]">{t.kind}</span>
                      <span>{when(t.at)}</span>
                    </p>
                    <p className={cx('mt-0.5 text-[13.5px]', t.body ? 'font-semibold' : '')}>{t.title}</p>
                    {t.body && <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-[var(--cc-muted)]">{t.body.slice(0, 400)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[12px] text-[var(--cc-muted)]">Every line here is a row from your own desk. Nothing on this card was written by a machine.</p>
        </div>
      )}
    </Drawer>
  );
}
