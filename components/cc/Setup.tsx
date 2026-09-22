'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, cx } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import type { Session } from '@/components/cc/Workspace';

/**
 * GETTING STARTED, and then getting out of the way.
 *
 * Software that opens on an empty board teaches nobody anything, and a
 * ten-minute video teaches nobody anything either. So the first week's work
 * is a short list of real steps, each one measured from the account rather
 * than ticked off by hand: a connection is done when the platform says the
 * token works, a list exists when a list exists, the first post is done when
 * a post is on the calendar.
 *
 * It disappears on its own when every step is done, and never comes back. A
 * permanent checklist on a working desk is clutter, and a dismissable one
 * that lies about progress is worse.
 */

type Step = {
  key: string;
  title: string;
  why: string;
  done: boolean;
  /** Where the step is actually done. */
  go?: string;
  label?: string;
  /** What is left, when it is partly done. */
  note?: string;
};

export default function Setup({ session, go }: { session: Session; go: (k: string) => void }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const [conn, lists, posting] = await Promise.all([
        fetch('/api/cc/connections', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/cc/lists', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/portal/posting', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);

      const accounts = (conn.accounts ?? []) as Array<{ provider: string; connected: boolean; manualOnly: boolean }>;
      const byApi = accounts.filter((a) => !a.manualOnly);
      const connected = byApi.filter((a) => a.connected);
      const scheduled = ((posting.posts ?? []) as Array<{ status: string }>).filter((p) => !['skipped'].includes(p.status));
      const listCount = ((lists.lists ?? []) as unknown[]).length;

      setSteps([
        {
          key: 'who',
          title: 'Say who is at the desk',
          why: 'Three of you share this board. A name on a note means a lead can be yours instead of nobody’s.',
          done: Boolean(session.who),
          note: session.who ? `${session.who.name} is at the desk` : undefined,
        },
        {
          key: 'feeds',
          title: 'Connect where you post',
          why: 'A connected feed posts itself at the hour it rewards. An unconnected one still gets its version written, and waits for a person.',
          done: connected.length > 0,
          note: byApi.length ? `${connected.length} of ${byApi.length} connected` : undefined,
          go: 'accounts',
          label: 'Open Connections',
        },
        {
          key: 'mailbox',
          title: 'Connect your mailbox',
          why: 'Your email gets read, sorted, and answered in draft. Nothing sends without your click.',
          done: session.state.mailConnected,
          go: 'accounts',
          label: 'Connect it',
        },
        {
          key: 'post',
          title: 'Put one thing on the calendar',
          why: 'Say it once and read every platform’s version before it is scheduled. That is the whole job on your side.',
          done: scheduled.length > 0,
          note: scheduled.length ? `${scheduled.length} on the calendar` : undefined,
          go: 'marketing',
          label: 'Say something',
        },
        {
          key: 'lists',
          title: 'Name one list',
          why: 'Tag the realtors, save it as a list, and a campaign to them is two clicks from now on.',
          done: listCount > 0,
          note: listCount ? `${listCount} ${listCount === 1 ? 'list' : 'lists'}` : undefined,
          go: 'contacts',
          label: 'Open your book',
        },
      ]);
    } catch {
      setSteps(null);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!steps || hidden) return null;
  const done = steps.filter((s) => s.done).length;
  // Finished is finished. It does not come back and it is not dismissable
  // before then, because the steps left are the reason half of this is quiet.
  if (done === steps.length) return null;

  return (
    <Card className="border-[var(--cc-accent)]/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[19px] leading-tight">Getting set up</h3>
          <p className="mt-1 text-[13px] text-[var(--cc-muted)]">
            Five things, once. Everything else on this board already runs without you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={done ? 'live' : 'plain'}>{done} of {steps.length} done</Badge>
          <button onClick={() => setHidden(true)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)] underline hover:text-[var(--cc-ink)]">
            Later
          </button>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key} className={cx('flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3', s.done ? 'border-[var(--cc-line)] bg-[#FAFBFC]' : 'border-[var(--cc-line)] bg-white')}>
            <span className={cx('mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full', s.done ? 'bg-[#12B76A] text-white' : 'border border-[var(--cc-line)] bg-white')}>
              {s.done && <Icon name="check" size={12} />}
            </span>
            <div className="min-w-0 flex-1 basis-[260px]">
              <p className={cx('text-[14.5px] font-semibold', s.done && 'text-[var(--cc-muted)]')}>{s.title}</p>
              {!s.done && <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cc-muted)]">{s.why}</p>}
              {s.note && <p className="mt-0.5 text-[12.5px] text-[var(--cc-muted)]">{s.note}</p>}
            </div>
            {!s.done && s.go && (
              <Button onClick={() => go(s.go!)}>{s.label ?? 'Open'}</Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
