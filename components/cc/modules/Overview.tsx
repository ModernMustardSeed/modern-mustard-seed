'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Pulse, Session } from '@/components/cc/Workspace';
import { Bars, Button, Card, CardHead, Empty, ErrorNote, Label, Skeleton, Stat, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE FIRST SCREEN. Numbers first, because the owner opens this between two
 * job sites and has ten seconds. Then the brief, which is written from the
 * rows by lib, never by a model, so it cannot flatter anyone. Then the people
 * actually waiting, with the one button that matters next to each.
 */

type TodayItem = { kind: string; text: string; weight: number };
type Lead = { id: string; name: string | null; phone: string | null; email: string | null; town: string | null; project_type: string | null; source: string | null; created_at: string; handled_at: string | null; priority: number | null };

export default function Overview({ session, pulse, go, refreshPulse }: { session: Session; pulse: Pulse | null; go: (k: string) => void; refreshPulse: () => void }) {
  const [today, setToday] = useState<{ date: string; items: TodayItem[] } | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [t, l] = await Promise.all([fetch('/api/portal/today', { cache: 'no-store' }), fetch('/api/portal/leads', { cache: 'no-store' })]);
      const tj = (await t.json()) as { today: { date: string; items: TodayItem[] } | null };
      const lj = (await l.json()) as { leads: Lead[] };
      setToday(tj.today);
      setLeads(lj.leads ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markCalled = async (id: string) => {
    setBusy(id);
    try {
      await fetch('/api/portal/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, handled: true }) });
      setLeads((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, handled_at: new Date().toISOString() } : l)) : prev));
      refreshPulse();
    } finally {
      setBusy(null);
    }
  };

  const waitingLeads = (leads ?? []).filter((l) => !l.handled_at).slice(0, 6);
  const first = session.person ?? session.brand.business;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat value={pulse?.leads.waiting ?? '–'} label="Waiting on a call" tone={pulse?.leads.waiting ? 'live' : 'plain'} onClick={() => go('leads')} />
        <Stat value={pulse?.leads.today ?? '–'} label="New today" onClick={() => go('leads')} />
        <Stat value={pulse?.leads.month ?? '–'} label="Leads, 30 days" onClick={() => go('leads')} />
        <Stat value={pulse?.inbox.needsReply ?? '–'} label="Needs a reply" tone={pulse?.inbox.needsReply ? 'warn' : 'plain'} onClick={() => go('inbox')} />
        <Stat value={pulse?.contacts.total ?? '–'} label="People in the book" onClick={() => go('contacts')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHead title={`Good day, ${first}`} hint={today?.date ?? 'Reading your records'} right={<Button kind="ghost" onClick={() => { void load(); refreshPulse(); }}>Refresh</Button>} />
          {error ? (
            <ErrorNote onRetry={load}>We could not read your records just now.</ErrorNote>
          ) : !today ? (
            <Skeleton rows={3} />
          ) : (
            <ul className="space-y-2.5">
              {today.items.map((item, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
                  <span className="mt-0.5 flex-none text-[var(--cc-accent)]">
                    <Icon name={item.kind === 'leads' ? 'leads' : item.kind === 'mail' ? 'mail' : item.kind === 'posts' ? 'marketing' : item.kind === 'domains' ? 'website' : item.kind === 'setup' ? 'accounts' : 'check'} size={16} />
                  </span>
                  <p className="text-[14px] leading-relaxed text-[var(--cc-ink)]">{item.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Leads by day" hint="The last fourteen days, your time." />
          {pulse ? <Bars data={pulse.leads.days} /> : <Skeleton rows={2} />}
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--cc-line)] px-3 py-2.5">
              <dt><Label>QR scans, 7 days</Label></dt>
              <dd className="mt-1 text-[20px] font-semibold tabular-nums">{pulse?.scans.week ?? '–'}</dd>
            </div>
            <div className="rounded-lg border border-[var(--cc-line)] px-3 py-2.5">
              <dt><Label>Review asks, 30 days</Label></dt>
              <dd className="mt-1 text-[20px] font-semibold tabular-nums">{pulse?.reviews.asked30 ?? '–'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <CardHead
          title="Waiting on you"
          hint="Marked called only when a person calls. Nothing here marks itself."
          right={<Button onClick={() => go('leads')}>Open leads</Button>}
        />
        {!leads ? (
          <Skeleton rows={3} />
        ) : waitingLeads.length === 0 ? (
          <Empty title="Nobody is waiting" note="Every lead that came in has been called. The website, the posting and the domains keep running." />
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {waitingLeads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold truncate">{l.name ?? 'Someone'}</p>
                  <p className="text-[12.5px] text-[var(--cc-muted)] truncate">
                    {[l.town, l.project_type, l.source].filter(Boolean).join(' · ')} {l.created_at ? `· ${when(l.created_at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {l.phone && (
                    <Button href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} title={l.phone}>
                      <Icon name="phone" size={15} /> Call
                    </Button>
                  )}
                  <Button kind="primary" onClick={() => markCalled(l.id)} disabled={busy === l.id}>
                    <Icon name="check" size={15} /> {busy === l.id ? 'Saving' : 'Called'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
