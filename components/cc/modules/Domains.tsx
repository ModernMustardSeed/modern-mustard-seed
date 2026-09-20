'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Label, Skeleton, Stat, cx, when } from '@/components/cc/ui';

/**
 * EVERY NAME THEY OWN, and who is holding it.
 *
 * A domain is a lease, and the two things an owner actually needs to know are
 * when it lapses and who can move it. Both are read from the public registry,
 * never typed by hand, so this screen cannot drift from the truth.
 *
 * The holder line matters more than it looks. While a name sits at the old
 * marketing company's registrar, they control it. Once it is with us it is
 * held for the client, transferable to them on a day's notice, and the
 * renewal is ours to carry.
 *
 * Sarah 2026-09-20: nothing has been transferred yet. All 21 names are
 * unlocked and their auth codes are in hand, and the move is on hold by her
 * decision, so this screen tells the truth by saying Namecheap, through Web
 * Express. Two dates decide when that stops being free to ignore:
 * innovativedesignbuild.us renews 2026-10-20, and five .com names renew
 * 2026-12-31.
 */

type Domain = {
  id: string;
  domain: string;
  role: 'primary' | 'email' | 'forward' | 'held';
  registrar: string | null;
  expires_on: string | null;
  forwards_to: string | null;
  mx: string | null;
  status: 'active' | 'transferring' | 'expired' | 'released';
  notes: string | null;
  days: number | null;
  mailProvider?: string | null;
};

const ROLE: Record<Domain['role'], string> = {
  primary: 'The website',
  email: 'Your email',
  forward: 'Forwards to the website',
  held: 'Held so nobody else takes it',
};

/** Who is holding the lease, in words an owner can act on. */
function holder(d: Domain): { label: string; tone: 'good' | 'warn' | 'plain'; ours: boolean } {
  if (d.status === 'transferring') return { label: 'Moving to us', tone: 'warn', ours: false };
  if (d.status === 'released') return { label: 'Not registered', tone: 'plain', ours: false };
  const r = (d.registrar ?? '').toLowerCase();
  if (r.includes('porkbun')) return { label: 'Held by us, for you', tone: 'good', ours: true };
  if (!r) return { label: 'Unknown', tone: 'plain', ours: false };
  return { label: `${d.registrar}, through Web Express`, tone: 'plain', ours: false };
}

export default function Domains() {
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/domains', { cache: 'no-store' });
      const j = (await r.json()) as { domains: Domain[]; checkedAt: string | null };
      setDomains(j.domains ?? []);
      setCheckedAt(j.checkedAt);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recheck = async () => {
    setBusy(true);
    try {
      await fetch('/api/portal/domains', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const live = (domains ?? []).filter((d) => d.status !== 'released');
    return {
      total: live.length,
      ours: live.filter((d) => holder(d).ours).length,
      moving: live.filter((d) => d.status === 'transferring').length,
      soon: live.filter((d) => d.days != null && d.days <= 45).length,
    };
  }, [domains]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat value={counts.total} label="Names you own" />
        <Stat value={counts.ours} label="Held by us, for you" tone={counts.ours ? 'live' : 'plain'} />
        <Stat value={counts.moving} label="Moving to us" tone={counts.moving ? 'warn' : 'plain'} />
        <Stat value={counts.soon} label="Renew inside 45 days" tone={counts.soon ? 'warn' : 'plain'} />
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--cc-line)]">
          <div>
            <h3 className="font-display text-[19px]">Your names</h3>
            <p className="mt-1 text-[13px] text-[var(--cc-muted)]">
              Read from the public registry{checkedAt ? `, last ${when(checkedAt)}` : ''}. Moving a name to us does not move your website: the site only moves the day we change the nameservers, and that is a separate, deliberate step.
            </p>
          </div>
          <Button onClick={recheck} disabled={busy}>{busy ? 'Reading' : 'Re-read the registry'}</Button>
        </div>

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The registry did not answer.</ErrorNote></div>
        ) : !domains ? (
          <div className="p-5"><Skeleton rows={6} /></div>
        ) : domains.length === 0 ? (
          <div className="p-5"><Empty title="No names on file yet" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--cc-line)] bg-[#FAFBFC]">
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">Name</th>
                  <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] hidden md:table-cell">Job</th>
                  <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">Held by</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] text-right">Renews</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => {
                  const h = holder(d);
                  const urgent = d.days != null && d.days <= 45 && d.status === 'active';
                  return (
                    <tr key={d.id} className="border-b border-[var(--cc-line)] last:border-0 hover:bg-[#FAFBFC]">
                      <td className="px-5 py-3 align-top">
                        <span className="block font-semibold">{d.domain}</span>
                        {d.mailProvider && <span className="block text-[12.5px] text-[var(--cc-muted)]">Mail: {d.mailProvider}</span>}
                      </td>
                      <td className="px-3 py-3 align-top hidden md:table-cell text-[13.5px] text-[var(--cc-muted)]">{ROLE[d.role]}</td>
                      <td className="px-3 py-3 align-top">
                        <Badge tone={h.tone}>{h.label}</Badge>
                      </td>
                      <td className={cx('px-5 py-3 align-top text-right whitespace-nowrap', urgent ? 'text-[#B54708] font-semibold' : 'text-[var(--cc-muted)]')}>
                        {d.status === 'released' ? '—' : d.expires_on ? new Date(d.expires_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        {urgent && d.days != null && <span className="block text-[12px] font-normal">{d.days} days</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHead title="What holding them means" />
        <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--cc-muted)]">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--cc-accent)]" />
            <span>They stay your names. Held in our registrar account on your behalf, and moved into an account of your own whenever you ask.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--cc-accent)]" />
            <span>We carry the renewals and re-read the registry every week, so a name cannot lapse quietly while everyone assumes someone else was watching.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--cc-accent)]" />
            <span><Label>Nothing about your website or your email changes when a name moves registrar.</Label></span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
