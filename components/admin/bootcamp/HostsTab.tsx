'use client';

import { useState } from 'react';
import { HOSTS } from '@/data/bootcamp';
import { btn, btnGold, btnInk, card, Chip, emptyBox, errorBox, fmtDate, muted, post, usdFromCents, useCopy, type HostLinks, type HostRow } from './shared';

type ApproveResult = { ok: true; host: unknown; links: HostLinks; founding: boolean; emailed: boolean; emailError: string | null };

export default function HostsTab({ hosts, error, onChanged }: { hosts: HostRow[]; error: string; onChanged: () => void }) {
  const [busy, setBusy] = useState('');
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ slug: string; action: 'approve' | 'decline' | 'pause' } | null>(null);
  const [fresh, setFresh] = useState<Record<string, ApproveResult>>({});
  const { copy, labelFor } = useCopy();

  const applied = hosts.filter((h) => h.status === 'applied');
  const approved = hosts.filter((h) => h.status === 'approved' || h.status === 'live' || h.status === 'paused');
  const declined = hosts.filter((h) => h.status === 'declined');
  const foundingSoFar = hosts.filter((h) => h.founding).length;

  const run = async (slug: string, action: 'approve' | 'decline' | 'pause') => {
    setBusy(`${slug}:${action}`);
    setRowError((e) => ({ ...e, [slug]: '' }));
    try {
      const data = await post<ApproveResult>(`/api/admin/bootcamp/hosts/${slug}`, { action });
      if (action === 'approve') setFresh((f) => ({ ...f, [slug]: data }));
      setConfirm(null);
      onChanged();
    } catch (err) {
      setRowError((e) => ({ ...e, [slug]: err instanceof Error ? err.message : 'That action failed.' }));
    } finally {
      setBusy('');
    }
  };

  const linkRow = (name: string, url: string | null, k: string) =>
    url ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 shrink-0 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#3A3733]">{name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-[#0b3b44] underline">
          {url}
        </a>
        <button type="button" onClick={() => copy(url, k)} className={btn}>
          {labelFor(k)}
        </button>
      </div>
    ) : null;

  const who = (h: HostRow) => (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-[#161616]">{h.name}</p>
        {h.brand && <p className="font-body text-sm text-[#3A3733]">{h.brand}</p>}
        {h.founding && <span className="rounded-full border border-[#161616] bg-[#F5B700] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#161616]">Founding</span>}
      </div>
      <p className="font-mono text-[11px] text-[#3A3733]">
        <a href={`mailto:${h.email}`} className="underline">{h.email}</a>
        {h.website && (
          <>
            {' '}&middot;{' '}
            <a href={h.website.startsWith('http') ? h.website : `https://${h.website}`} target="_blank" rel="noopener noreferrer" className="underline">
              {h.website.replace(/^https?:\/\//, '')}
            </a>
          </>
        )}
      </p>
      <p className="font-body text-xs text-[#3A3733] mt-1">
        {[h.vertical, h.room ? `wants the ${h.room} room` : '', h.platforms, h.audience].filter(Boolean).join(' · ')}
      </p>
      {h.notes && <p className="font-body text-xs text-[#3A3733] mt-1 whitespace-pre-line">{h.notes}</p>}
      {rowError[h.slug] && <p className="font-body text-xs text-[#E0301E] mt-1">{rowError[h.slug]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className={errorBox}>{error}</div>}

      {/* Applied */}
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-[#161616]">Applied</h2>
          <p className={muted}>
            {foundingSoFar} of {HOSTS.foundingHosts} founding seats taken. Approving mints their links and sends the welcome from sarah@modernmustardseed.com.
          </p>
        </div>
        {applied.length === 0 ? (
          <div className={`${emptyBox} mt-3`}>No hosts yet. Arm outreach or send the first fifty by hand.</div>
        ) : (
          <ul className="mt-3 divide-y divide-[#161616]/10">
            {applied.map((h) => {
              const c = confirm?.slug === h.slug ? confirm : null;
              return (
                <li key={h.slug} className="py-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    {who(h)}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3A3733] self-center">Applied {fmtDate(h.created_at)}</span>
                      <button type="button" onClick={() => setConfirm({ slug: h.slug, action: 'approve' })} disabled={Boolean(busy)} className={btnGold}>
                        Approve
                      </button>
                      <button type="button" onClick={() => setConfirm({ slug: h.slug, action: 'decline' })} disabled={Boolean(busy)} className={btn}>
                        Decline
                      </button>
                    </div>
                  </div>
                  {c?.action === 'approve' && (
                    <div className="rounded-lg border-2 border-[#161616] bg-[#F5B700]/25 p-4">
                      <p className="font-bold text-sm text-[#161616]">Approve {h.name}?</p>
                      <p className="font-body text-sm text-[#161616] mt-1">
                        Their share link, masterclass link and dashboard get minted, {foundingSoFar < HOSTS.foundingHosts ? 'they become a founding host (same terms on all four 2027 launches), ' : ''}and the approved email goes to {h.email} right now.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={() => run(h.slug, 'approve')} disabled={busy === `${h.slug}:approve`} className={btnGold}>
                          {busy === `${h.slug}:approve` ? 'Approving' : 'Yes, approve and email them'}
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} className={btn}>
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                  {c?.action === 'decline' && (
                    <div className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] p-4">
                      <p className="font-bold text-sm text-[#161616]">Decline {h.name}?</p>
                      <p className="font-body text-sm text-[#161616] mt-1">No email goes out. They move to the declined list and can be approved later.</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={() => run(h.slug, 'decline')} disabled={busy === `${h.slug}:decline`} className={btnInk}>
                          {busy === `${h.slug}:decline` ? 'Declining' : 'Yes, decline'}
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} className={btn}>
                          Keep them
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Approved */}
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-[#161616]">Approved</h2>
          <p className={muted}>Links, clicks, tickets and what they are owed. Hosts keep {HOSTS.ticketPct}% of tickets and {HOSTS.programPct}% of Operator seats.</p>
        </div>
        {approved.length === 0 ? (
          <div className={`${emptyBox} mt-3`}>Nobody approved yet. The first approval lands here with its links.</div>
        ) : (
          <ul className="mt-3 divide-y divide-[#161616]/10">
            {approved.map((h) => {
              const links = fresh[h.slug]?.links || h.links;
              const f = fresh[h.slug];
              const s = h.stats;
              return (
                <li key={h.slug} className="py-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Chip value={h.status} />
                      {who(h)}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 items-center">
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3A3733]">Approved {fmtDate(h.approved_at)}</span>
                      {h.status !== 'paused' ? (
                        <button type="button" onClick={() => run(h.slug, 'pause')} disabled={Boolean(busy)} className={btn}>
                          {busy === `${h.slug}:pause` ? 'Pausing' : 'Pause'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => run(h.slug, 'approve')} disabled={Boolean(busy)} className={btn}>
                          {busy === `${h.slug}:approve` ? 'Resuming' : 'Resume'}
                        </button>
                      )}
                    </div>
                  </div>

                  {f && (
                    <p className={`rounded-lg border-2 border-[#161616] px-3 py-2 font-body text-sm text-[#161616] ${f.emailed ? 'bg-[#0a7c78]/15' : 'bg-[#E0301E]/15'}`}>
                      {f.emailed ? `Approved and emailed. ${f.founding ? 'Founding host.' : ''}` : `Approved, but the email did not go: ${f.emailError || 'unknown error'}. Send them the links below by hand.`}
                    </p>
                  )}

                  <div className="grid sm:grid-cols-5 gap-3">
                    {[
                      ['Clicks', (s?.clicks ?? h.clicks).toLocaleString('en-US')],
                      ['Masterclass', String(s?.masterclass ?? 0)],
                      ['Tickets', String(s ? s.tickets.ga + s.tickets.vip + s.tickets.platinum : 0)],
                      ['Operator seats', String(s?.operatorSeats ?? 0)],
                      ['Owed', usdFromCents(s?.earningsCents ?? 0)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{k}</p>
                        <p className="font-display text-xl font-semibold text-[#161616]">{v}</p>
                      </div>
                    ))}
                  </div>

                  {links ? (
                    <div className="space-y-1.5">
                      {linkRow('Share link', links.share, `${h.slug}-share`)}
                      {linkRow('Masterclass', links.masterclass, `${h.slug}-mc`)}
                      {linkRow('Dashboard', links.dashboard, `${h.slug}-dash`)}
                      {!links.dashboard && <p className="font-body text-xs text-[#E0301E]">No dashboard key: ADMIN_SESSION_SECRET is missing on this server.</p>}
                    </div>
                  ) : (
                    <p className="font-body text-xs text-[#3A3733]">Links appear after a refresh.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {declined.length > 0 && (
        <section className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold text-[#161616]">Declined</h2>
          <ul className="mt-3 divide-y divide-[#161616]/10">
            {declined.map((h) => (
              <li key={h.slug} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {who(h)}
                <button type="button" onClick={() => setConfirm({ slug: h.slug, action: 'approve' })} disabled={Boolean(busy)} className={btn}>
                  Approve after all
                </button>
                {confirm?.slug === h.slug && confirm.action === 'approve' && (
                  <div className="w-full rounded-lg border-2 border-[#161616] bg-[#F5B700]/25 p-4">
                    <p className="font-body text-sm text-[#161616]">Mint their links and email {h.email} now?</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" onClick={() => run(h.slug, 'approve')} disabled={busy === `${h.slug}:approve`} className={btnGold}>
                        {busy === `${h.slug}:approve` ? 'Approving' : 'Yes, approve'}
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={btn}>
                        Not yet
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
