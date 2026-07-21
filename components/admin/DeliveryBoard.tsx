'use client';

import { useCallback, useEffect, useState } from 'react';
import MoodboardCanvas from '@/components/moodboard/MoodboardCanvas';
import type { Moodboard as MoodboardPayload } from '@/lib/moodboard-shared';

/**
 * THE DELIVERY BOARD. Everyone who has paid, and what they are waiting on.
 *
 * Nothing in the admin read demo_orders. Not one screen. A buyer paid, an email
 * landed in Sarah's inbox, and from that moment the only record of what they were
 * owed was that email. This is where a paid order becomes a live website: their
 * intake and files, a domain, and the button that puts it on the internet.
 */

type Quote = { domain: string; available: boolean; priceUsd: number | null; renewalUsd: number | null; years: number; buyable: boolean; reason?: string };
type Project = {
  name: string;
  status: string;
  progress: number;
  revisionsIncluded: number;
  revisionsUsed: number;
  hasSite: boolean;
  demoSiteId: string | null;
  domain: string | null;
  domainSource: string | null;
  liveUrl: string | null;
  publishedAt: string | null;
  buildStatus: 'queued' | 'building' | 'ready' | 'failed' | null;
  buildError: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  revealAt: string | null;
  editStatus: 'queued' | 'building' | 'ready' | 'failed' | null;
  editInstruction: string | null;
  editRequestedBy: string | null;
  editRequestedAt: string | null;
  editError: string | null;
  hasDraft: boolean;
  moodboard: MoodboardPayload | null;
  moodboardStatus: 'none' | 'draft' | 'sent' | 'changes' | 'approved';
  moodboardNote: string | null;
  moodboardSentAt: string | null;
  moodboardApprovedAt: string | null;
};
type Row = {
  id: string;
  business: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  products: string[];
  setupCents: number;
  monthlyCents: number;
  status: string;
  createdAt: string;
  intake: Record<string, unknown> | null;
  intakeAt: string | null;
  assetCount: number;
  hasPortal: boolean;
  projectId: string | null;
  project: Project | null;
  openRequests: number;
};

const usd = (c: number) => `$${Math.round(c / 100)}`;

/**
 * An ISO timestamp as a <input type="datetime-local"> value, in Sarah's timezone.
 * The input speaks local wall-clock with no zone, so a naive .toISOString().slice()
 * would silently show a UTC time and she would schedule reveals hours off.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const BTN =
  'px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-transform';
const BTN_QUIET =
  'px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-transform';

/** Copy a DNS record to the clipboard so Sarah can paste it straight to a client. */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="shrink-0 text-[9px] uppercase tracking-[0.12em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] border border-[#1E50C8]/40 rounded px-2 py-1"
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

const LABELS: Record<string, string> = {
  hours: 'Hours', services: 'Services', greeting: 'Phone greeting', domain: 'Domain they want',
  brand: 'Look and feel', contact: 'Best contact', notes: 'Notes', gbp: 'Google Business Profile',
  facebook: 'Facebook', instagram: 'Instagram', audience: 'Their customer', competitors: 'Competitors',
};

export default function DeliveryBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [platformReady, setPlatformReady] = useState(true);
  const [registrantSet, setRegistrantSet] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/delivery');
      const j = await res.json().catch(() => null);
      if (res.ok && Array.isArray(j?.rows)) {
        setRows(j.rows as Row[]);
        setPlatformReady(Boolean(j.platformReady));
        setRegistrantSet(Boolean(j.registrantSet));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A rebuild or a client edit takes minutes. Poll while one is in flight so the board
  // tells the truth without Sarah reloading, and stop the moment nothing is working.
  const building = rows.some(
    (r) =>
      r.project?.buildStatus === 'queued' ||
      r.project?.buildStatus === 'building' ||
      r.project?.editStatus === 'queued' ||
      r.project?.editStatus === 'building',
  );
  useEffect(() => {
    if (!building) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [building, load]);

  return (
    <div className="min-h-screen bg-[#FBF6EA] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Delivery</span>
        <h1 className="font-display text-4xl font-bold text-[#161616] mb-1">Everyone who paid</h1>
        <p className="font-body text-[#161616]/60 mb-6">
          What they bought, what they sent us, and the button that puts them on the internet.
        </p>

        {!platformReady && (
          <div className="mb-6 rounded-xl border-2 border-[#E0301E] bg-[#E0301E]/8 p-4">
            <p className="font-sans text-[12px] uppercase tracking-[0.14em] font-bold text-[#E0301E] mb-1">
              Domains and publishing are switched off
            </p>
            <p className="font-body text-[13.5px] text-[#161616]/75">
              Set <code>VERCEL_TOKEN</code> (an API token from vercel.com/account/tokens, not the CLI login) and{' '}
              <code>VERCEL_TEAM_ID</code> in the Vercel project env. Until then buying a domain and publishing a site
              will refuse rather than half-work.
            </p>
          </div>
        )}

        {loading ? (
          <p className="font-body text-[#161616]/50">Loading…</p>
        ) : rows.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="font-body text-[#161616]/60">Nobody has bought yet. The moment they do, they land here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <DeliveryRow
                key={r.id}
                row={r}
                open={open === r.id}
                onToggle={() => setOpen(open === r.id ? null : r.id)}
                onChanged={load}
                platformReady={platformReady}
                registrantSet={registrantSet}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryRow({
  row, open, onToggle, onChanged, platformReady, registrantSet,
}: { row: Row; open: boolean; onToggle: () => void; onChanged: () => void; platformReady: boolean; registrantSet: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [dns, setDns] = useState<Array<{ type: string; domain: string; value: string }>>([]);
  const [reveal, setReveal] = useState(() => toLocalInput(row.project?.revealAt ?? null));
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState({ address1: '', city: '', state: '', zip: '', phone: '' });
  const [showBoard, setShowBoard] = useState(false);
  const [steer, setSteer] = useState('');

  const p = row.project;

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!row.projectId) return null;
    setBusy(action);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/delivery/${row.projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error ?? 'That did not work.');
        return null;
      }
      return j;
    } catch {
      setErr('Network error.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const doQuote = async () => {
    const j = await act('quote', { domain });
    if (j?.quote) setQuote(j.quote as Quote);
  };

  const doBuy = async () => {
    if (!quote?.buyable) return;
    // No address on file yet: open the one-time form instead of a dead error.
    if (!registrantSet) { setShowAddr(true); return; }
    if (!confirm(`Buy ${quote.domain} for $${quote.priceUsd} and register it to Modern Mustard Seed? This charges the Vercel account now.`)) return;
    const j = await act('buy', { domain: quote.domain });
    if (j?.ok) {
      setMsg(`Bought ${j.domain} for $${j.paidUsd}. It renews automatically, and it is already pointed at their site.`);
      setQuote(null);
      setDomain('');
      onChanged();
    } else if (err === 'needs-registrant') {
      setShowAddr(true);
    }
  };

  const doSaveAddr = async () => {
    const j = await act('save-registrant', addr);
    if (j?.ok) {
      setShowAddr(false);
      setMsg('Business address saved. You can buy domains now.');
      onChanged();
    }
  };

  const doExisting = async () => {
    const j = await act('use-existing', { domain });
    if (j?.ok) {
      setMsg(j.verified ? `${j.domain} is pointed at their site and live.` : `${j.domain} saved. Add the two records below at their domain provider and it goes live automatically.`);
      if (Array.isArray(j.instructions)) setDns(j.instructions);
      onChanged();
    }
  };

  const doSeed = async () => {
    const j = await act('seed');
    if (j?.ok) { setMsg(j.seeded ? 'Their real site now starts from the demo they bought.' : 'It already has a site.'); onChanged(); }
  };

  const doRebuild = async () => {
    if (p?.hasSite && !confirm('Rebuild their site from their intake? This replaces the current draft, including any edits you made here.')) return;
    const j = await act('rebuild');
    if (j?.ok) { setMsg('Queued. The forge is rebuilding their real site from what they sent us. It takes a few minutes.'); onChanged(); }
  };

  const doApprove = async () => {
    const j = await act('approve', reveal ? { revealAt: new Date(reveal).toISOString() } : {});
    if (j?.ok) {
      const when = new Date(j.revealAt as string);
      setMsg(when.getTime() <= Date.now()
        ? 'Approved. It goes live on the next hourly pass.'
        : `Approved. It reveals ${when.toLocaleString()}.`);
      onChanged();
    }
  };

  const doUnapprove = async () => {
    const j = await act('unapprove');
    if (j?.ok) { setMsg('Approval pulled. Nothing will go out.'); onChanged(); }
  };

  const doMoodboardForge = async () => {
    const j = await act('moodboard-forge', steer.trim() ? { steer: steer.trim() } : {});
    if (j?.ok) {
      setMsg('Board forged. Preview it below, then send it when it sings.');
      setShowBoard(true);
      setSteer('');
      onChanged();
    }
  };

  const doMoodboardSend = async () => {
    if (!confirm('Send this direction board to the client? They get an email and it appears in their portal for approval.')) return;
    const j = await act('moodboard-send');
    if (j?.ok) {
      setMsg('Sent. The reveal now waits on their approval.');
      onChanged();
    }
  };

  const doPublish = async () => {
    if (!confirm('Put this site live NOW? The client gets an email saying they are live.')) return;
    const boardPending = p?.moodboardStatus === 'sent' || p?.moodboardStatus === 'changes';
    if (boardPending && !confirm('Their direction board is NOT approved yet. Put the site live anyway?')) return;
    const j = await act('publish', boardPending ? { moodboardOverride: true } : {});
    if (j?.ok) {
      setMsg(`Live at ${j.liveUrl}${j.verified ? '' : ' (domain still needs DNS, see below)'}`);
      if (Array.isArray(j.instructions)) setDns(j.instructions);
      onChanged();
    }
  };

  const doEditApprove = async () => {
    if (!confirm(p?.publishedAt
      ? 'Approve this edit and push it to their LIVE site now? The client gets the launch email.'
      : 'Approve this edit? It becomes their real site, ready to reveal.')) return;
    const j = await act('edit-approve');
    if (j?.ok) {
      setMsg(j.published ? `Approved and live${j.liveUrl ? ` at ${j.liveUrl}` : ''}.` : 'Approved. It is now their real site.');
      onChanged();
    }
  };

  const doEditDiscard = async () => {
    if (!confirm('Throw this edit away? The client gets their free edit back.')) return;
    const j = await act('edit-discard');
    if (j?.ok) { setMsg('Edit discarded. Their free edit was refunded.'); onChanged(); }
  };

  const intake = row.intake ?? {};
  const answers = Object.entries(intake).filter(([k, v]) => k !== 'assets' && typeof v === 'string' && v);
  const assets = Array.isArray((intake as Record<string, unknown>).assets)
    ? ((intake as Record<string, unknown>).assets as Array<{ url: string; name: string; kind: string }>)
    : [];

  return (
    <div className={CARD}>
      <button type="button" onClick={onToggle} className="w-full text-left p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-[#161616]">{row.business || row.name || row.email}</h3>
            <p className="font-mono text-[11px] text-[#161616]/50 mt-0.5">
              {row.products.join(' + ')} · {usd(row.setupCents)} setup + {usd(row.monthlyCents)}/mo · {row.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {!row.hasPortal && <Chip tone="red">No portal opened</Chip>}
            {row.status === 'paid' && <Chip tone="gold">Waiting on their intake</Chip>}
            {row.status === 'intake_done' && <Chip tone="blue">Intake in, build it</Chip>}
            {row.status === 'delivered' && <Chip tone="green">Delivered</Chip>}
            {(p?.buildStatus === 'queued' || p?.buildStatus === 'building') && <Chip tone="blue">Rebuilding</Chip>}
            {p?.buildStatus === 'failed' && <Chip tone="red">Rebuild failed</Chip>}
            {(p?.editStatus === 'queued' || p?.editStatus === 'building') && <Chip tone="blue">Client edit building</Chip>}
            {p?.editStatus === 'ready' && <Chip tone="gold">Client edit to approve</Chip>}
            {p?.editStatus === 'failed' && <Chip tone="red">Client edit failed</Chip>}
            {p?.moodboardStatus === 'draft' && <Chip tone="plain">Board drafted</Chip>}
            {p?.moodboardStatus === 'sent' && <Chip tone="blue">Board with client</Chip>}
            {p?.moodboardStatus === 'changes' && <Chip tone="red">Board changes asked</Chip>}
            {p?.moodboardStatus === 'approved' && <Chip tone="green">Direction approved</Chip>}
            {p?.buildStatus === 'ready' && !p.approvedAt && !p.publishedAt && <Chip tone="gold">Needs your eyes</Chip>}
            {p?.approvedAt && !p.publishedAt && <Chip tone="green">Approved{p.revealAt ? ` for ${new Date(p.revealAt).toLocaleDateString()}` : ''}</Chip>}
            {row.assetCount > 0 && <Chip tone="plain">{row.assetCount} files</Chip>}
            {row.openRequests > 0 && <Chip tone="red">{row.openRequests} open</Chip>}
            {p && <Chip tone="plain">{p.revisionsUsed}/{p.revisionsIncluded} edits</Chip>}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t-2 border-[#161616]/10 pt-5">
          {!row.hasPortal && (
            <p className="font-body text-[13px] text-[#E0301E]">
              This buyer never got a client record, so they have no portal. They paid before the delivery spine
              existed. Their order predates it and needs opening by hand.
            </p>
          )}

          {/* What they told us */}
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">What they told us</h4>
            {row.intakeAt ? (
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {answers.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616]/45">{LABELS[k] ?? k}</dt>
                    <dd className="font-body text-[13.5px] text-[#161616]">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="font-body text-[13px] text-[#161616]/55">Nothing yet. They have not filled in the intake.</p>
            )}
          </div>

          {/* What they sent */}
          {assets.length > 0 && (
            <div>
              <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">
                What they sent ({assets.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {assets.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 font-body text-[12.5px] text-[#161616] hover:-translate-y-0.5 transition-transform"
                  >
                    {a.kind}: {a.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* The direction board: forge it from their intake, preview it, send it
              for the client's signature. The reveal waits on that signature. */}
          {row.hasPortal && (
            <div>
              <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">The Direction</h4>
              {p?.moodboardStatus === 'changes' && p.moodboardNote && (
                <p className="mb-2 rounded-lg border-2 border-[#E0301E]/40 bg-[#FFF1EF] px-3 py-2 font-body text-[13px] text-[#161616]">
                  They asked: &ldquo;{p.moodboardNote}&rdquo;. Re-forge below (their note rides along automatically).
                </p>
              )}
              {p?.moodboardStatus === 'approved' && p.moodboardApprovedAt && (
                <p className="mb-2 font-body text-[13px] text-emerald-700">
                  Direction signed {new Date(p.moodboardApprovedAt).toLocaleDateString()}. Build exactly that.
                </p>
              )}
              <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-3">
                <input
                  type="text"
                  value={steer}
                  onChange={(e) => setSteer(e.target.value)}
                  placeholder="Optional steer for the forge: moodier, more heritage, lean into the lake..."
                  className="w-full rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" onClick={doMoodboardForge} disabled={!!busy || !row.intakeAt} className={`${BTN_QUIET}`}>
                    {busy === 'moodboard-forge' ? 'Forging…' : p?.moodboard ? 'Forge a new cut' : 'Forge the board'}
                  </button>
                  {p?.moodboard && (
                    <button type="button" onClick={() => setShowBoard((v) => !v)} disabled={!!busy} className={`${BTN_QUIET}`}>
                      {showBoard ? 'Hide preview' : 'Preview the board'}
                    </button>
                  )}
                  {p?.moodboard && p.moodboardStatus !== 'approved' && (
                    <button type="button" onClick={doMoodboardSend} disabled={!!busy} className={`${BTN_QUIET} !bg-[#F5B700]`}>
                      {busy === 'moodboard-send' ? 'Sending…' : p.moodboardStatus === 'sent' ? 'Resend to client' : 'Send to client'}
                    </button>
                  )}
                </div>
                {!row.intakeAt && (
                  <p className="mt-2 font-body text-[12px] text-[#161616]/55">Waiting on their intake. The board forges from what they tell us.</p>
                )}
              </div>
              {showBoard && p?.moodboard && (
                <div className="mt-3">
                  <MoodboardCanvas
                    board={p.moodboard}
                    businessName={row.business || row.name || 'Their business'}
                    logoUrl={assets.find((a) => a.kind === 'logo')?.url ?? null}
                    photos={assets.filter((a) => a.kind === 'photo' || a.kind === 'product').map((a) => a.url).slice(0, 4)}
                    approvedAt={p.moodboardApprovedAt}
                  />
                </div>
              )}
            </div>
          )}

          {/* Get them online. Two plain paths: point the domain they already own,
              or buy them a new one. We do the wiring either way. */}
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">Get them online</h4>
            {p?.domain ? (
              <p className="font-body text-[13.5px] text-[#161616] mb-2">
                On <strong>{p.domain}</strong>{' '}
                <span className="text-[#161616]/55">({p.domainSource === 'bought' ? 'we bought it, auto-renews' : 'they own it'})</span>
                {p.publishedAt ? ' · live' : ''}
              </p>
            ) : (
              <p className="font-body text-[13px] text-[#161616]/55 mb-2">
                {typeof intake.domain === 'string' && intake.domain
                  ? `They asked for: ${String(intake.domain)}`
                  : 'No domain yet. Point the one they own, or buy them one.'}
              </p>
            )}

            <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-3">
              <input
                type="text"
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setQuote(null); setDns([]); }}
                placeholder="theirbusiness.com"
                className="w-full rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {/* Path 1: they already own it */}
                <button type="button" onClick={doExisting} disabled={!domain || !!busy || !platformReady} className={`${BTN_QUIET} justify-center text-center`}>
                  {busy === 'use-existing' ? 'Pointing…' : 'They already own this →'}
                </button>
                {/* Path 2: buy it for them */}
                <button type="button" onClick={doQuote} disabled={!domain || !!busy || !platformReady} className={`${BTN_QUIET} justify-center text-center`}>
                  {busy === 'quote' ? 'Checking…' : 'Is it available to buy?'}
                </button>
              </div>
              <p className="font-body text-[11.5px] text-[#161616]/45 mt-2">
                Either way we do the wiring. Point one they own and we hand them the two records to add; buy a new one and it goes live on its own.
              </p>
            </div>

            {quote && (
              <div className="mt-2.5 rounded-lg border-2 border-[#161616]/20 bg-[#FBF6EA] px-3 py-2.5">
                {quote.available ? (
                  quote.buyable ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-body text-[13.5px] text-[#161616]">
                        <strong>{quote.domain}</strong> is free. ${quote.priceUsd} for {quote.years} year
                        {quote.years === 1 ? '' : 's'}
                        {quote.renewalUsd != null && quote.renewalUsd !== quote.priceUsd
                          ? `, then $${quote.renewalUsd}/yr to renew`
                          : ''}
                        .
                      </p>
                      <button type="button" onClick={doBuy} disabled={!!busy} className={BTN}>
                        {busy === 'buy' ? 'Buying…' : registrantSet ? `Buy it for $${quote.priceUsd}` : 'Buy it (add your address first)'}
                      </button>
                    </div>
                  ) : (
                    <p className="font-body text-[13.5px] text-[#161616]/75">{quote.reason}</p>
                  )
                ) : (
                  <p className="font-body text-[13.5px] text-[#161616]/75">Taken. Try another, or point the one they already own.</p>
                )}
              </div>
            )}

            {/* One-time: the MMS mailing address a registrar legally requires. */}
            {showAddr && (
              <div className="mt-2.5 rounded-lg border-2 border-[#F5B700] bg-[#FFF8E6] px-3 py-3">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616] mb-1">One-time: your business mailing address</p>
                <p className="font-body text-[12px] text-[#161616]/65 mb-2.5">A registrar requires a real postal contact. We register domains to Modern Mustard Seed on your clients&rsquo; behalf. Saved once, used for every future domain.</p>
                <input value={addr.address1} onChange={(e) => setAddr((a) => ({ ...a, address1: e.target.value }))} placeholder="Street address" className="w-full rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[13.5px] mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} placeholder="City" className="col-span-1 rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[13.5px]" />
                  <input value={addr.state} onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="ST" maxLength={2} className="col-span-1 rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[13.5px] uppercase" />
                  <input value={addr.zip} onChange={(e) => setAddr((a) => ({ ...a, zip: e.target.value }))} placeholder="ZIP" className="col-span-1 rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-body text-[13.5px]" />
                </div>
                <button type="button" onClick={doSaveAddr} disabled={busy === 'save-registrant' || !addr.address1 || !addr.city || !addr.state || !addr.zip} className={`${BTN} mt-2.5`}>
                  {busy === 'save-registrant' ? 'Saving…' : 'Save address'}
                </button>
              </div>
            )}

            {dns.length > 0 && (
              <div className="mt-2.5 rounded-lg border-2 border-[#1E50C8]/40 bg-blue-50 px-3 py-2.5">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#1E50C8] mb-1.5">
                  Add these at their domain provider (GoDaddy, Namecheap, wherever they bought it)
                </p>
                <div className="space-y-1.5">
                  {dns.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-white border-2 border-[#161616]/15 px-2.5 py-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#1E50C8] shrink-0 w-10">{d.type}</span>
                      <span className="font-mono text-[11.5px] text-[#161616] break-all flex-1 min-w-0">{d.domain} → {d.value}</span>
                      <CopyBtn text={`${d.type}  ${d.domain}  ${d.value}`} />
                    </div>
                  ))}
                </div>
                <p className="font-body text-[11.5px] text-[#161616]/55 mt-1.5">It can take a few minutes to a few hours after they add these. It flips to live on its own.</p>
              </div>
            )}
          </div>

          {/* The site */}
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">Their site</h4>

            {p?.buildStatus === 'queued' && (
              <p className="font-body text-[13px] text-[#1E50C8] mb-2">
                Rebuild queued. The forge picks it up within a minute.
              </p>
            )}
            {p?.buildStatus === 'building' && (
              <p className="font-body text-[13px] text-[#1E50C8] mb-2">
                Building their real site from their intake right now. Usually four to twenty minutes.
              </p>
            )}
            {p?.buildStatus === 'failed' && (
              <p className="font-body text-[13px] text-[#E0301E] mb-2">
                The rebuild failed: {p.buildError ?? 'no reason recorded'}. Rebuild it, or edit the demo by hand.
              </p>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              {!p?.hasSite && (
                <button type="button" onClick={doSeed} disabled={!!busy || !p?.demoSiteId} className={BTN_QUIET}>
                  {busy === 'seed' ? 'Copying…' : 'Start from their demo'}
                </button>
              )}
              {row.intakeAt && (
                <button
                  type="button"
                  onClick={doRebuild}
                  disabled={!!busy || p?.buildStatus === 'queued' || p?.buildStatus === 'building' || Boolean(p?.publishedAt)}
                  className={p?.hasSite ? BTN_QUIET : BTN}
                  title={p?.publishedAt ? 'It is already live. Edit it instead.' : 'Forge their real site from their intake'}
                >
                  {busy === 'rebuild' ? 'Queueing…' : 'Rebuild from their intake'}
                </button>
              )}
              {p?.hasSite && (
                <>
                  <a href={`/admin/delivery/${row.projectId}/edit`} className={`${BTN_QUIET} inline-block no-underline`}>
                    Edit the site
                  </a>
                  <button type="button" onClick={doPublish} disabled={!!busy || !platformReady} className={BTN}>
                    {busy === 'publish' ? 'Publishing…' : p.publishedAt ? 'Publish again' : 'Reveal it now'}
                  </button>
                </>
              )}
              {p?.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="font-body text-[13px] text-[#1E50C8] underline">
                  {p.liveUrl}
                </a>
              )}
            </div>
            {!p?.demoSiteId && !p?.hasSite && !row.intakeAt && (
              <p className="font-body text-[12.5px] text-[#161616]/55 mt-1.5">
                No forged demo is linked to this project, so there is nothing to start from.
              </p>
            )}
          </div>

          {/* A client's auto-applied edit, waiting on a human signature. Nothing an AI
              edited can reach their live site until Sarah approves it here. */}
          {p?.editStatus && (
            <div className="rounded-xl border-2 border-[#161616] bg-[#F5B700]/[0.08] p-4">
              <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">
                Client edit {p.editStatus === 'ready' ? 'ready for you' : p.editStatus === 'failed' ? 'failed' : 'building'}
              </h4>
              {p.editInstruction && (
                <p className="font-body text-[13.5px] text-[#161616] mb-1">
                  <span className="text-[#161616]/55">They asked: </span>&ldquo;{p.editInstruction}&rdquo;
                </p>
              )}
              {p.editRequestedBy && (
                <p className="font-mono text-[11px] text-[#161616]/50 mb-2">
                  from {p.editRequestedBy}
                  {p.editRequestedAt ? ` · ${new Date(p.editRequestedAt).toLocaleString()}` : ''}
                </p>
              )}

              {(p.editStatus === 'queued' || p.editStatus === 'building') && (
                <p className="font-body text-[13px] text-[#1E50C8]">
                  The forge is applying their change to a copy of their site. Usually a few minutes. It will not touch anything live.
                </p>
              )}
              {p.editStatus === 'failed' && (
                <p className="font-body text-[13px] text-[#E0301E]">
                  The edit could not be applied: {p.editError ?? 'no reason recorded'}. Discard it to give them their edit back, or edit the site by hand.
                </p>
              )}
              {p.editStatus === 'ready' && (
                <div className="flex flex-wrap gap-2 items-center mt-1">
                  <a
                    href={`/admin/delivery/${row.projectId}/edit-preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN_QUIET} inline-block no-underline`}
                  >
                    Preview the edit ↗
                  </a>
                  <button type="button" onClick={doEditApprove} disabled={!!busy || (Boolean(p.publishedAt) && !platformReady)} className={BTN}>
                    {busy === 'edit-approve' ? 'Approving…' : p.publishedAt ? 'Approve and push live' : 'Approve'}
                  </button>
                  <button type="button" onClick={doEditDiscard} disabled={!!busy} className={BTN_QUIET}>
                    {busy === 'edit-discard' ? 'Discarding…' : 'Discard'}
                  </button>
                </div>
              )}
              {p.editStatus === 'failed' && (
                <button type="button" onClick={doEditDiscard} disabled={!!busy} className={`${BTN_QUIET} mt-1`}>
                  {busy === 'edit-discard' ? 'Discarding…' : 'Discard and refund'}
                </button>
              )}
            </div>
          )}

          {/* The reveal. A human signs it, and it goes out on the day we chose. */}
          {p?.hasSite && !p.publishedAt && (
            <div>
              <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">The reveal</h4>
              <p className="font-body text-[12.5px] text-[#161616]/60 mb-2">
                Nothing reaches the client until you approve it. Approved sites go live on their date, on the hour.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="datetime-local"
                  value={reveal}
                  onChange={(e) => setReveal(e.target.value)}
                  className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2 font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                />
                <button type="button" onClick={doApprove} disabled={!!busy} className={BTN}>
                  {busy === 'approve' ? 'Saving…' : p.approvedAt ? 'Reschedule' : 'Approve and schedule'}
                </button>
                {p.approvedAt && (
                  <button type="button" onClick={doUnapprove} disabled={!!busy} className={BTN_QUIET}>
                    Pull the approval
                  </button>
                )}
              </div>
              {p.approvedAt ? (
                <p className="font-body text-[13px] text-emerald-700 mt-2">
                  Approved by {p.approvedBy ?? 'admin'}. {p.revealAt ? `Goes live ${new Date(p.revealAt).toLocaleString()}.` : 'No date set, so it goes on the next pass.'}
                </p>
              ) : (
                <p className="font-body text-[13px] text-[#161616]/60 mt-2">
                  Not approved. {p.revealAt ? `Target date is ${new Date(p.revealAt).toLocaleDateString()}, but nothing ships without your approval.` : 'No date yet.'}
                </p>
              )}
            </div>
          )}

          {msg && <p className="font-body text-[13px] text-emerald-700">{msg}</p>}
          {err && <p className="font-body text-[13px] text-[#E0301E]">{err}</p>}
        </div>
      )}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: 'red' | 'gold' | 'blue' | 'green' | 'plain' }) {
  const cls = {
    red: 'text-[#E0301E] border-[#E0301E]/35 bg-[#E0301E]/10',
    gold: 'text-[#161616] border-[#161616]/30 bg-[#F5B700]/25',
    blue: 'text-[#1E50C8] border-[#1E50C8]/30 bg-blue-100',
    green: 'text-emerald-800 border-emerald-800/25 bg-emerald-100',
    plain: 'text-[#161616]/70 border-[#161616]/20 bg-[#FBF6EA]',
  }[tone];
  return (
    <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}
