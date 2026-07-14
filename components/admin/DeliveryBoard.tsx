'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THE DELIVERY BOARD. Everyone who has paid, and what they are waiting on.
 *
 * Nothing in the admin read demo_orders. Not one screen. A buyer paid, an email
 * landed in Sarah's inbox, and from that moment the only record of what they were
 * owed was that email. This is where a paid order becomes a live website: their
 * intake and files, a domain, and the button that puts it on the internet.
 */

type Quote = { domain: string; available: boolean; priceUsd: number | null; years: number; buyable: boolean; reason?: string };
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
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const BTN =
  'px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-transform';
const BTN_QUIET =
  'px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-transform';

const LABELS: Record<string, string> = {
  hours: 'Hours', services: 'Services', greeting: 'Phone greeting', domain: 'Domain they want',
  brand: 'Look and feel', contact: 'Best contact', notes: 'Notes', gbp: 'Google Business Profile',
  facebook: 'Facebook', instagram: 'Instagram', audience: 'Their customer', competitors: 'Competitors',
};

export default function DeliveryBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [platformReady, setPlatformReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/delivery');
      const j = await res.json().catch(() => null);
      if (res.ok && Array.isArray(j?.rows)) {
        setRows(j.rows as Row[]);
        setPlatformReady(Boolean(j.platformReady));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryRow({
  row, open, onToggle, onChanged, platformReady,
}: { row: Row; open: boolean; onToggle: () => void; onChanged: () => void; platformReady: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [dns, setDns] = useState<Array<{ type: string; domain: string; value: string }>>([]);

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
    if (!confirm(`Buy ${quote.domain} for $${quote.priceUsd}? This charges the Vercel account now.`)) return;
    const j = await act('buy', { domain: quote.domain });
    if (j?.ok) {
      setMsg(`Bought ${j.domain} for $${j.paidUsd}. It renews automatically.`);
      setQuote(null);
      setDomain('');
      onChanged();
    }
  };

  const doExisting = async () => {
    const j = await act('use-existing', { domain });
    if (j?.ok) {
      setMsg(j.verified ? `${j.domain} is pointed at their site.` : `${j.domain} saved. They must add the DNS records below.`);
      if (Array.isArray(j.instructions)) setDns(j.instructions);
      onChanged();
    }
  };

  const doSeed = async () => {
    const j = await act('seed');
    if (j?.ok) { setMsg(j.seeded ? 'Their real site now starts from the demo they bought.' : 'It already has a site.'); onChanged(); }
  };

  const doPublish = async () => {
    if (!confirm('Put this site live? The client gets an email saying they are live.')) return;
    const j = await act('publish');
    if (j?.ok) {
      setMsg(`Live at ${j.liveUrl}${j.verified ? '' : ' (domain still needs DNS, see below)'}`);
      if (Array.isArray(j.instructions)) setDns(j.instructions);
      onChanged();
    }
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

          {/* The domain */}
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">Their domain</h4>
            {p?.domain ? (
              <p className="font-body text-[13.5px] text-[#161616] mb-2">
                <strong>{p.domain}</strong>{' '}
                <span className="text-[#161616]/55">({p.domainSource === 'bought' ? 'we bought it, auto-renews' : 'they own it'})</span>
              </p>
            ) : (
              <p className="font-body text-[13px] text-[#161616]/55 mb-2">
                {typeof intake.domain === 'string' && intake.domain
                  ? `They asked for: ${String(intake.domain)}`
                  : 'No domain yet.'}
              </p>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setQuote(null); }}
                placeholder="theirbusiness.com"
                className="flex-1 min-w-[220px] rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2 font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
              <button type="button" onClick={doQuote} disabled={!domain || !!busy || !platformReady} className={BTN_QUIET}>
                {busy === 'quote' ? 'Checking…' : 'Check it'}
              </button>
              <button type="button" onClick={doExisting} disabled={!domain || !!busy} className={BTN_QUIET}>
                They own it
              </button>
            </div>

            {quote && (
              <div className="mt-2.5 rounded-lg border-2 border-[#161616]/20 bg-[#FBF6EA] px-3 py-2.5">
                {quote.available ? (
                  quote.buyable ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-body text-[13.5px] text-[#161616]">
                        <strong>{quote.domain}</strong> is free. ${quote.priceUsd} for {quote.years} year
                        {quote.years === 1 ? '' : 's'}.
                      </p>
                      <button type="button" onClick={doBuy} disabled={!!busy} className={BTN}>
                        {busy === 'buy' ? 'Buying…' : `Buy it for $${quote.priceUsd}`}
                      </button>
                    </div>
                  ) : (
                    <p className="font-body text-[13.5px] text-[#161616]/75">{quote.reason}</p>
                  )
                ) : (
                  <p className="font-body text-[13.5px] text-[#161616]/75">Taken. Try another.</p>
                )}
              </div>
            )}

            {dns.length > 0 && (
              <div className="mt-2.5 rounded-lg border-2 border-[#1E50C8]/40 bg-blue-50 px-3 py-2.5">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#1E50C8] mb-1">
                  They need to add these records
                </p>
                {dns.map((d, i) => (
                  <p key={i} className="font-mono text-[11.5px] text-[#161616] break-all">
                    {d.type} · {d.domain} · {d.value}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* The site */}
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">Their site</h4>
            <div className="flex flex-wrap gap-2 items-center">
              {!p?.hasSite ? (
                <button type="button" onClick={doSeed} disabled={!!busy || !p?.demoSiteId} className={BTN_QUIET}>
                  {busy === 'seed' ? 'Copying…' : 'Start from their demo'}
                </button>
              ) : (
                <>
                  <a
                    href={`/admin/delivery/${row.projectId}/edit`}
                    className={`${BTN_QUIET} inline-block no-underline`}
                  >
                    Edit the site
                  </a>
                  <button type="button" onClick={doPublish} disabled={!!busy || !platformReady} className={BTN}>
                    {busy === 'publish' ? 'Publishing…' : p.publishedAt ? 'Publish again' : 'Put it live'}
                  </button>
                </>
              )}
              {p?.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="font-body text-[13px] text-[#1E50C8] underline">
                  {p.liveUrl}
                </a>
              )}
            </div>
            {!p?.demoSiteId && !p?.hasSite && (
              <p className="font-body text-[12.5px] text-[#161616]/55 mt-1.5">
                No forged demo is linked to this project, so there is nothing to start from.
              </p>
            )}
          </div>

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
