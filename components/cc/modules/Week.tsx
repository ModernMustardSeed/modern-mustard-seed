'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Card, CardHead, ErrorNote, Field, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import type { WeekReport } from '@/lib/cc-week';

/**
 * THE WEEK. The page that gets forwarded. Seven days of what the website and
 * the desk did, beside the seven days before, and every line opens the room
 * where those rows can be counted by hand.
 *
 * It reads like a letter, not a dashboard, because the person it gets
 * forwarded to has never seen this app. Sending it is a button: a person
 * types the addresses and presses send. Nothing here goes out on a schedule.
 */

export default function Week({ session, go }: { session: Session; go: (k: string) => void }) {
  const [week, setWeek] = useState<WeekReport | null>(null);
  const [error, setError] = useState(false);
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/cc/week', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { week: WeekReport; sendTo: string | null };
      setWeek(j.week);
      setTo((prev) => prev || j.sendTo || '');
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/cc/week', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: to.split(/[\s,;]+/).filter(Boolean), note }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; sent?: string[]; failed?: Array<{ to: string; error: string }> };
      if (!r.ok || !j.ok) setResult({ ok: false, text: j.error ?? 'Nothing went out.' });
      else setResult({ ok: true, text: `Sent to ${(j.sent ?? []).join(', ')}.${j.failed?.length ? ` Did not reach ${j.failed.map((f) => f.to).join(', ')}.` : ''}` });
    } catch {
      setResult({ ok: false, text: 'Nothing went out. Check your signal and try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorNote onRetry={load}>The week could not be counted just now.</ErrorNote>;
  if (!week)
    return (
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2"><Skeleton rows={7} /></Card>
        <Card><Skeleton rows={4} /></Card>
      </div>
    );

  const quiet = week.lines.every((l) => !l.value);

  return (
    <div className="grid lg:grid-cols-3 gap-5 items-start">
      <Card pad={false} className="lg:col-span-2 overflow-hidden print:border-0 print:shadow-none">
        <div className="border-b border-[var(--cc-line)] px-5 sm:px-8 pt-7 pb-6" style={{ backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--cc-accent) 7%, white), white)' }}>
          <Label>{session.brand.business} · {week.range}</Label>
          <h2 className="mt-3 font-display text-[26px] sm:text-[32px] leading-[1.15] tracking-[-0.01em]">{week.headline}</h2>
          {quiet && <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cc-muted)]">A quiet week on the counters. Everything under Kept running is still held for you, and the next lead lands on the first screen the moment it is sent.</p>}
        </div>

        <ul className="divide-y divide-[var(--cc-line)]">
          {week.lines.map((l) => {
            const canOpen = session.modules[l.room] !== false;
            const delta = l.value != null && l.before != null ? l.value - l.before : null;
            return (
              <li key={l.key}>
                <button onClick={() => canOpen && go(l.room)} disabled={!canOpen} className="group flex w-full items-center gap-4 px-5 sm:px-8 py-4 text-left enabled:hover:bg-[#FAFBFC]">
                  <span className="w-[64px] flex-none text-right text-[30px] font-semibold leading-none tabular-nums">{l.value ?? <span className="text-[13px] font-medium text-[var(--cc-muted)]">Not read</span>}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium leading-snug">{l.label}</span>
                    <span className="block text-[12.5px] tabular-nums text-[var(--cc-muted)]">
                      {l.note ?? (l.before == null ? '' : `${l.before} the week before${delta ? `, ${delta > 0 ? `${delta} more` : `${Math.abs(delta)} fewer`} this week` : ''}`)}
                    </span>
                  </span>
                  {canOpen && <span className="flex-none text-[12px] font-semibold text-[var(--cc-muted)] opacity-0 transition group-hover:opacity-100 max-md:hidden">Count them</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {week.people.length > 0 && (
          <div className="border-t border-[var(--cc-line)] px-5 sm:px-8 py-5">
            <Label>Who reached out</Label>
            <ul className="mt-2.5 space-y-2">
              {week.people.map((p, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px]">
                  <span className="font-semibold">{p.name}</span>
                  {p.detail && <span className="text-[var(--cc-muted)]">{p.detail}</span>}
                  <Badge tone={p.called ? 'good' : 'warn'}>{p.called ? 'Called' : 'Waiting on a call'}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {week.standing.length > 0 && (
          <div className="border-t border-[var(--cc-line)] bg-[#FAFBFC] px-5 sm:px-8 py-5">
            <Label>Kept running</Label>
            <dl className="mt-2.5 grid sm:grid-cols-3 gap-x-6 gap-y-3">
              {week.standing.map((s) => (
                <div key={s.label} className="min-w-0">
                  <dd className="truncate text-[17px] font-semibold tabular-nums">{s.value}</dd>
                  <dt className="text-[12.5px] text-[var(--cc-muted)]">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}

        <p className="border-t border-[var(--cc-line)] px-5 sm:px-8 py-4 text-[12.5px] leading-relaxed text-[var(--cc-muted)]">
          Every number on this page was counted from your own records a moment ago. None is estimated, projected or rounded.
        </p>
      </Card>

      <div className="space-y-5 print:hidden">
        <Card>
          <CardHead title="Send this week" hint="To yourself, a partner, a spouse. It arrives as a plain, readable email with these same numbers." />
          <div className="space-y-3">
            <Field label="Send to" hint="Up to five addresses, separated by commas.">
              <input className={cx(inputCls, 'max-sm:text-[16px]')} value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" inputMode="email" autoCapitalize="none" />
            </Field>
            <Field label="A line from you" hint="Optional. It goes above the numbers.">
              <textarea className={cx(inputCls, 'min-h-[72px] resize-y max-sm:text-[16px]')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Look what the site did this week." />
            </Field>
            {result && <p className={cx('text-[13px]', result.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{result.text}</p>}
            <Button kind="primary" full onClick={send} disabled={busy || !to.trim()}>
              <Icon name="send" size={15} /> {busy ? 'Sending' : 'Send it'}
            </Button>
          </div>
        </Card>
        <Card>
          <CardHead title="On paper" hint="For the binder, or the Monday meeting." />
          <Button full onClick={() => window.print()}>Print this week</Button>
        </Card>
      </div>
    </div>
  );
}
