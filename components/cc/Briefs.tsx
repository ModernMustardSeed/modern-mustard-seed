'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, cx } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * WHAT THE STANDING WORK DID WHILE THEY WERE OUT.
 *
 * This sits at the top of the first screen because it is the only thing on
 * the board that went first. Everything else waits to be asked; these arrive
 * having read the inquiry, checked the board, and drafted the reply.
 *
 * The rule the whole thing rests on is visible in this component: every action
 * is a button, and the line under the buttons says so out loud. A drafted
 * email goes to their own Drafts folder when they press it, and is sent by
 * them, from their own mail, or never.
 */

type Action =
  | { kind: 'draft_email'; label: string; to: string; subject: string; body: string }
  | { kind: 'call'; label: string; phone: string; jobId?: string; leadId?: string }
  | { kind: 'stage'; label: string; jobId: string; to: string }
  | { kind: 'next_step'; label: string; jobId: string; step: string; inDays: number }
  | { kind: 'add_job'; label: string; leadId: string }
  | { kind: 'open'; label: string; room: string; jobId?: string }
  | { kind: 'review_ask'; label: string; jobId: string }
  | { kind: 'project_page'; label: string; jobId: string }
  | { kind: 'note'; label: string; jobId: string; body: string };

type Brief = {
  id: string;
  kind: 'qualify' | 'quiet' | 'monday' | 'risk' | 'cert' | 'handover' | 'noticed';
  subject_type: string;
  subject_id: string | null;
  title: string;
  body: string;
  actions: Action[];
  created_at: string;
};

const KIND_LABEL: Record<Brief['kind'], string> = { qualify: 'New inquiry', quiet: 'Gone quiet', monday: 'The board', risk: 'Needs you', cert: 'Insurance', handover: 'Finished', noticed: 'I noticed' };

export default function Briefs({ go }: { go: (room: string) => void }) {
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/briefs', { cache: 'no-store' });
      const j = (await r.json()) as { briefs?: Brief[] };
      setBriefs((j.briefs ?? []).map((b) => ({ ...b, actions: Array.isArray(b.actions) ? b.actions : [] })));
    } catch {
      setBriefs([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (brief: Brief, action: Action) => {
    if (action.kind === 'open') {
      go(action.room);
      return;
    }
    setBusy(`${brief.id}:${action.kind}`);
    try {
      const r = await fetch('/api/cc/briefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'act', do: action }) });
      const j = (await r.json()) as { ok?: boolean; said?: string; error?: string };
      setSaid((prev) => ({ ...prev, [brief.id]: { ok: Boolean(j.ok), text: j.ok ? (j.said ?? 'Done.') : (j.error ?? 'That did not work.') } }));
      if (j.ok) void load();
    } catch {
      setSaid((prev) => ({ ...prev, [brief.id]: { ok: false, text: 'That did not work.' } }));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (brief: Brief, status: 'done' | 'dismissed') => {
    setBusy(`${brief.id}:decide`);
    try {
      await fetch('/api/cc/briefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'decide', id: brief.id, status }) });
      setBriefs((prev) => (prev ?? []).filter((b) => b.id !== brief.id));
    } finally {
      setBusy(null);
    }
  };

  if (!briefs || briefs.length === 0) return null;

  return (
    <div className="space-y-3">
      {briefs.map((b) => {
        const answer = said[b.id];
        return (
          <Card key={b.id} className="border-[var(--cc-accent)]/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="live">{KIND_LABEL[b.kind]}</Badge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">Done for you, waiting on your say</span>
                </span>
                <h3 className="mt-2 font-display text-[19px] leading-tight">{b.title}</h3>
              </div>
              <button onClick={() => decide(b, 'dismissed')} disabled={busy !== null} className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)] underline hover:text-[var(--cc-ink)]">
                Not now
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-[var(--cc-ink)]">
              {b.body.split('\n').map((line, i) =>
                line.trim() === '' ? (
                  <div key={i} className="h-1" />
                ) : line.startsWith('- ') ? (
                  <p key={i} className="pl-4 -indent-4">
                    <span className="text-[var(--cc-accent)]">•</span> {line.slice(2)}
                  </p>
                ) : (
                  <p key={i}>{line}</p>
                ),
              )}
            </div>

            {answer && <p className={cx('mt-3 text-[13px]', answer.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{answer.text}</p>}

            {b.actions.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.actions.map((a, i) => {
                    const key = `${b.id}:${a.kind}`;
                    if (a.kind === 'call') {
                      return (
                        <Button key={i} kind="primary" href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} onClick={() => void run(b, a)}>
                          <Icon name="phone" size={14} /> {a.label}
                        </Button>
                      );
                    }
                    return (
                      <Button key={i} kind={i === 0 ? 'primary' : 'quiet'} onClick={() => void run(b, a)} disabled={busy !== null}>
                        {busy === key ? 'Working' : a.label}
                      </Button>
                    );
                  })}
                  <Button kind="ghost" onClick={() => decide(b, 'done')} disabled={busy !== null}>
                    <Icon name="check" size={14} /> Handled
                  </Button>
                </div>
                {b.actions.some((a) => a.kind === 'draft_email') && (
                  <p className="mt-2 text-[12px] text-[var(--cc-muted)]">A drafted message goes to your own drafts folder. Nothing is sent from here.</p>
                )}
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
