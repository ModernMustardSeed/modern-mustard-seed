'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THE WHITE LABEL BOOK, on /admin/white-label. The loop, operated:
 *
 *   applications  -> Approve sends the welcome (portal, sheet, demo)
 *   agencies      -> portal link, founding seat, billing sync
 *   client board  -> submitted, building, review (needs a test number; emails
 *                    the agency), live (bills on Stripe, emails the agency)
 *
 * Every side effect lives in the API routes; this only presses the buttons.
 */

type Agency = {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  client_count: string | null;
  sells: string | null;
  status: string;
  founding: boolean;
  stripe_subscription_id: string | null;
  created_at: string;
  portal: string;
  sheet: string | null;
};
type Client = {
  id: string;
  agency_id: string;
  business: string;
  website: string | null;
  city: string | null;
  lines: string[];
  status: string;
  test_number: string | null;
  agency_approved_at: string | null;
  services_text: string | null;
  hours: string | null;
  transfer_number: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  created_at: string;
};

const card = 'bg-white border-2 border-[#161616] rounded-xl';
const chip = 'rounded-full border-2 border-[#161616] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.15em]';
const input = 'rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-2.5 py-1.5 font-body text-sm text-[#161616] outline-none';
const COLUMNS = [
  { key: 'submitted', label: 'Submitted', hint: 'Start the build' },
  { key: 'building', label: 'Building', hint: 'Add the test number, then send to review' },
  { key: 'review', label: 'Agency test call', hint: 'Waiting on their Approve' },
  { key: 'live', label: 'Live', hint: 'Billing on Stripe' },
];

export default function WhiteLabelBook({ lineNames }: { lineNames: Record<string, string> }) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [tests, setTests] = useState<Record<string, string>>({});
  const [add, setAdd] = useState({ name: '', contact_name: '', email: '', website: '', approve: true });

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/white-label/agencies');
    if (!res.ok) {
      setError('Could not read the white label book. Is migration 153 applied?');
      return;
    }
    const data = await res.json();
    setAgencies(data.agencies);
    setClients(data.clients);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (key: string, url: string, method: string, body?: unknown, ok?: string) => {
    setBusy(key);
    setError('');
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'That did not work.');
      if (data.billing && data.billing.ok === false) setError(`Saved, but billing failed: ${data.billing.error}`);
      else if (ok) setNotice(ok);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  const byId = new Map(agencies.map((a) => [a.id, a]));
  const applied = agencies.filter((a) => a.status === 'applied');
  const book = agencies.filter((a) => a.status !== 'applied' && a.status !== 'declined');
  const names = (slugs: string[]) => slugs.map((s) => lineNames[s] ?? s).join(', ');

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <div className={`border-2 border-[#161616] rounded-xl px-4 py-3 font-body text-sm ${error ? 'bg-[#E0301E]/10' : 'bg-[#F5B700]/25'}`}>{error || notice}</div>
      )}

      {/* ─── APPLICATIONS ─── */}
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Applications {applied.length ? `(${applied.length})` : ''}</h2>
          <p className="font-body text-xs text-[#3A3733]">Approve sends the welcome: portal, signed price sheet, demo with their margin.</p>
        </div>
        {applied.length === 0 ? (
          <p className="font-body text-sm text-[#3A3733] mt-3">No applications waiting. They arrive from /white-label/apply.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#161616]/10">
            {applied.map((a) => (
              <li key={a.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{a.name}</p>
                  <p className="font-body text-xs text-[#3A3733]">
                    {[a.contact_name, a.email, a.phone, a.website, a.client_count && `${a.client_count} clients`].filter(Boolean).join(' · ')}
                  </p>
                  {a.sells && <p className="font-body text-sm text-[#3A3733] mt-1">Sells: {a.sells}</p>}
                </div>
                <div className="flex gap-2">
                  <button disabled={!!busy} onClick={() => act(a.id, `/api/admin/white-label/agencies/${a.id}`, 'PATCH', { status: 'approved' }, `${a.name} approved. Welcome email sent.`)} className={`${chip} bg-[#F5B700]`}>
                    {busy === a.id ? 'Approving' : 'Approve'}
                  </button>
                  <button disabled={!!busy} onClick={() => act(a.id, `/api/admin/white-label/agencies/${a.id}`, 'PATCH', { status: 'declined' })} className={`${chip} bg-white`}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── CLIENT BOARD ─── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Client board</h2>
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const rows = clients.filter((c) => c.status === col.key);
            return (
              <div key={col.key} className={`${card} p-3 min-h-[120px]`}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">{col.label} · {rows.length}</p>
                <p className="font-body text-[11px] text-[#3A3733]">{col.hint}</p>
                <div className="mt-3 space-y-3">
                  {rows.map((c) => (
                    <div key={c.id} className="rounded-lg border border-[#161616]/20 bg-[#FBF6EA] p-3">
                      <p className="font-bold text-sm">{c.business}</p>
                      <p className="font-body text-[11px] text-[#3A3733]">{byId.get(c.agency_id)?.name ?? 'Agency'} · {names(c.lines)}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[#3A3733]">Brief</summary>
                        <div className="mt-1 space-y-0.5 font-body text-[11px] text-[#3A3733]">
                          {c.website && <p>Site: {c.website}</p>}
                          {c.city && <p>Town: {c.city}</p>}
                          {c.hours && <p>Hours: {c.hours}</p>}
                          {c.transfer_number && <p>Transfer: {c.transfer_number}</p>}
                          {c.owner_phone && <p>Owner cell: {c.owner_phone}</p>}
                          {c.owner_email && <p>Owner email: {c.owner_email}</p>}
                          {c.services_text && <p className="whitespace-pre-line">{c.services_text}</p>}
                        </div>
                      </details>
                      {col.key === 'submitted' && (
                        <button disabled={!!busy} onClick={() => act(c.id, `/api/admin/white-label/clients/${c.id}`, 'PATCH', { status: 'building' })} className={`${chip} mt-2 bg-white`}>
                          Start building
                        </button>
                      )}
                      {col.key === 'building' && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <input className={`${input} w-36`} placeholder="Test number" value={tests[c.id] ?? c.test_number ?? ''} onChange={(e) => setTests({ ...tests, [c.id]: e.target.value })} />
                          <button
                            disabled={!!busy}
                            onClick={() => act(c.id, `/api/admin/white-label/clients/${c.id}`, 'PATCH', { status: 'review', test_number: tests[c.id] ?? c.test_number ?? '' }, `Test call email sent for ${c.business}.`)}
                            className={`${chip} bg-[#F5B700]`}
                          >
                            Send to test
                          </button>
                        </div>
                      )}
                      {col.key === 'review' && (
                        <div className="mt-2 space-y-1.5">
                          <p className="font-body text-[11px]">{c.agency_approved_at ? 'Agency approved. Point the real number, then go live.' : `Test line ${c.test_number ?? ''}: waiting on the agency.`}</p>
                          <button
                            disabled={!!busy}
                            onClick={() => act(c.id, `/api/admin/white-label/clients/${c.id}`, 'PATCH', { status: 'live' }, `${c.business} is live. Agency emailed, billing updated.`)}
                            className={`${chip} ${c.agency_approved_at ? 'bg-[#F5B700]' : 'bg-white'}`}
                          >
                            Go live
                          </button>
                        </div>
                      )}
                      {col.key === 'live' && (
                        <button disabled={!!busy} onClick={() => act(c.id, `/api/admin/white-label/clients/${c.id}`, 'PATCH', { status: 'paused' })} className={`${chip} mt-2 bg-white`}>
                          Pause
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── AGENCIES ─── */}
      <section className={`${card} p-5`}>
        <h2 className="font-display text-xl font-semibold">Agencies</h2>
        {book.length === 0 ? (
          <p className="font-body text-sm text-[#3A3733] mt-3">No approved agencies yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#161616]/10">
            {book.map((a) => {
              const mine = clients.filter((c) => c.agency_id === a.id);
              return (
                <li key={a.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {a.name} <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3A3733]">{a.status}{a.founding ? ' · founding' : ''}</span>
                    </p>
                    <p className="font-body text-xs text-[#3A3733]">
                      {a.contact_name ?? ''} {a.email} · {mine.filter((c) => c.status === 'live').length} live, {mine.length} total{a.stripe_subscription_id ? ' · billing on' : ''}
                    </p>
                  </div>
                  <a href={a.portal} target="_blank" rel="noopener noreferrer" className={`${chip} bg-white`}>Portal</a>
                  {a.sheet && <a href={a.sheet} target="_blank" rel="noopener noreferrer" className={`${chip} bg-white`}>Sheet</a>}
                  <button disabled={!!busy} onClick={() => act(`bill-${a.id}`, `/api/admin/white-label/agencies/${a.id}/billing`, 'POST', undefined, `Billing synced for ${a.name}.`)} className={`${chip} bg-white`}>
                    {busy === `bill-${a.id}` ? 'Syncing' : 'Sync billing'}
                  </button>
                  <button disabled={!!busy} onClick={() => act(a.id, `/api/admin/white-label/agencies/${a.id}`, 'PATCH', { status: a.status === 'paused' ? 'approved' : 'paused' })} className={`${chip} bg-white`}>
                    {a.status === 'paused' ? 'Unpause' : 'Pause'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end border-t border-[#161616]/10 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act('add', '/api/admin/white-label/agencies', 'POST', add, `${add.name} added${add.approve ? ' and welcomed' : ''}.`).then(() => setAdd({ name: '', contact_name: '', email: '', website: '', approve: true }));
          }}
        >
          <p className="sm:col-span-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Add an agency you met</p>
          <input className={input} required placeholder="Agency" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
          <input className={input} placeholder="Contact" value={add.contact_name} onChange={(e) => setAdd({ ...add, contact_name: e.target.value })} />
          <input className={input} required type="email" placeholder="Email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
          <input className={input} placeholder="Website" value={add.website} onChange={(e) => setAdd({ ...add, website: e.target.value })} />
          <button disabled={!!busy} className={`${chip} bg-[#F5B700]`}>{busy === 'add' ? 'Adding' : 'Add + welcome'}</button>
        </form>
      </section>
    </div>
  );
}
