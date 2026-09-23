'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardHead, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * WHAT THE DESK KNOWS ABOUT THIS BUSINESS.
 *
 * Memory nobody can read is a liability. The day it is wrong, nothing tells
 * the owner what it believes, where the belief came from, or how to stop it.
 *
 * So everything it knows is on one screen. A fact they stated is listed
 * plainly. A fact it worked out for itself is a QUESTION, at the top, with the
 * counts underneath it, and it is not used for anything until somebody presses
 * yes. That distinction is the whole reason this screen exists: software that
 * silently adopts its own guesses about a business will act on a wrong one
 * eventually, and nobody will know why.
 */

type Fact = {
  id: string;
  fact: string;
  kind: 'rule' | 'preference' | 'about' | 'person';
  subject: string | null;
  source: 'said' | 'noticed';
  evidence: string | null;
  created_at: string;
};

const KIND_WORD: Record<Fact['kind'], string> = { rule: 'Rule', preference: 'How you like it', about: 'About you', person: 'A person' };

export default function Knows() {
  const [known, setKnown] = useState<Fact[] | null>(null);
  const [proposed, setProposed] = useState<Fact[]>([]);
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/facts', { cache: 'no-store' });
      const j = (await r.json()) as { known?: Fact[]; proposed?: Fact[] };
      setKnown(j.known ?? []);
      setProposed(j.proposed ?? []);
    } catch {
      setKnown([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/cc/facts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json()) as { known?: Fact[]; proposed?: Fact[] };
      if (j.known) setKnown(j.known);
      if (j.proposed) setProposed(j.proposed);
    } finally {
      setBusy(false);
    }
  };

  if (!known) return null;

  return (
    <Card>
      <CardHead
        title="What this desk knows about you"
        hint="Tell it something once and it carries it into every answer. Everything it believes is on this screen, and you can throw any of it out."
      />

      {proposed.length > 0 && (
        <div className="mb-4 space-y-2">
          {proposed.map((f) => (
            <div key={f.id} className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3">
              <p className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.16em] text-[#B54708]">
                <Icon name="spark" size={13} /> I worked this out. Is it right?
              </p>
              <p className="mt-1.5 text-[14px] font-semibold">{f.fact}</p>
              {f.evidence && <p className="mt-0.5 text-[12.5px] text-[#B54708]">{f.evidence}</p>}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button kind="primary" onClick={() => act({ action: 'confirm', id: f.id })} disabled={busy}>Yes, remember that</Button>
                <Button onClick={() => act({ action: 'retire', id: f.id, reason: 'The owner said it is not right' })} disabled={busy}>No, drop it</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {known.length > 0 ? (
        <ul className="space-y-1.5">
          {known.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px]">{f.subject ? <strong>{f.subject}: </strong> : null}{f.fact}</span>
                <span className="mt-0.5 flex items-center gap-2">
                  <Badge>{KIND_WORD[f.kind]}</Badge>
                  {f.source === 'noticed' && <span className="text-[11.5px] text-[var(--cc-muted)]">worked out, and you confirmed it</span>}
                </span>
              </span>
              <button onClick={() => act({ action: 'retire', id: f.id, reason: 'No longer true' })} disabled={busy} className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)] underline hover:text-[var(--cc-ink)]">
                Forget
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-[var(--cc-muted)]">
          Nothing yet. Tell it things like &ldquo;we do not take commercial work&rdquo;, &ldquo;Carmen decides on design&rdquo;, or &ldquo;we will not start a build under 400 thousand&rdquo;, and it will stop asking.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className={cx(inputCls, 'min-w-[240px] flex-1')}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="We do not take commercial work."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && adding.trim().length > 3) {
              void act({ action: 'remember', fact: adding, kind: 'rule' }).then(() => setAdding(''));
            }
          }}
        />
        <Button kind="primary" disabled={busy || adding.trim().length < 4} onClick={() => act({ action: 'remember', fact: adding, kind: 'rule' }).then(() => setAdding(''))}>
          Remember that
        </Button>
      </div>
    </Card>
  );
}
