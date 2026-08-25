'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Chip, api, card, btnPrimary, btnGhost, btnDanger, inputCls, labelCls, timeAgo } from '@/components/admin/acquisition/ui';
import RowBuild from '@/components/admin/acquisition/RowBuild';
import type { RowSuite } from '@/components/admin/acquisition/RowBuild';

type Row = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  trade: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  email_status: string | null;
  email_confidence: number | null;
  lead_score: number | null;
  acq_stage: string;
  acq_eligible: boolean;
  acq_ineligible_reason: string | null;
  email_stage: number;
  last_campaign_email_at: string | null;
  consent_status: string | null;
  call_stage: string | null;
  demo_status: string | null;
  demo_emailed_at: string | null;
  suite: RowSuite | null;
  checkout_sent_at: string | null;
  client_status: string | null;
  unsubscribed_at: string | null;
  bounced: boolean;
  is_test: boolean;
  needs_human: string | null;
  source: string | null;
  updated_at: string;
};

const TRADES = ['', 'hvac', 'plumbing', 'roofing', 'other'];
const STAGES = ['', 'prospect', 'emailed', 'consented', 'called', 'demoed', 'forged', 'demo_sent', 'meeting', 'client', 'lost'];
const EMAIL_STATUSES = ['', 'verified', 'likely', 'public', 'risky', 'invalid', 'unknown'];

export default function Prospects() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [q, setQ] = useState('');
  const [trade, setTrade] = useState('');
  const [stage, setStage] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [eligible, setEligible] = useState('');
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState('lead_score');

  const query = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size), sort });
    if (q) p.set('q', q);
    if (trade) p.set('trade', trade);
    if (stage) p.set('stage', stage);
    if (emailStatus) p.set('email_status', emailStatus);
    if (eligible) p.set('eligible', eligible);
    if (all) p.set('all', '1');
    return p;
  }, [page, size, sort, q, trade, stage, emailStatus, eligible, all]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ rows: Row[]; total: number }>(`/api/admin/acquisition/prospects?${query().toString()}`);
      setRows(res.rows);
      setTotal(res.total);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load prospects.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const bulk = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected.size) return;
    if (action === 'suppress' && !window.confirm(`Suppress ${selected.size} prospect${selected.size === 1 ? '' : 's'} permanently? Opt-outs cannot be undone.`)) return;
    setNotice('');
    try {
      const res = await api<{ affected: number }>('/api/admin/acquisition/prospects', {
        method: 'POST',
        body: JSON.stringify({ action, ids: [...selected], ...extra }),
      });
      setNotice(`${action.replace(/-/g, ' ')}: ${res.affected} prospect${res.affected === 1 ? '' : 's'}.`);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    }
  };

  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[110rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav active="prospects" />

        <div className={`${card} p-4 mb-4`}>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className={labelCls}>Search</label>
              <input
                className={inputCls}
                value={q}
                placeholder="Business, email, city, website, phone"
                onChange={(e) => {
                  setPage(0);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select label="Trade" value={trade} options={TRADES} onChange={(v) => { setPage(0); setTrade(v); }} />
            <Select label="Stage" value={stage} options={STAGES} labels={{ forged: 'built' }} onChange={(v) => { setPage(0); setStage(v); }} />
            <Select label="Email" value={emailStatus} options={EMAIL_STATUSES} onChange={(v) => { setPage(0); setEmailStatus(v); }} />
            <Select
              label="Eligible"
              value={eligible}
              options={['', '1', '0']}
              labels={{ '': 'Any', '1': 'Campaign ready', '0': 'Held back' }}
              onChange={(v) => { setPage(0); setEligible(v); }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[#161616]/65">
              <input type="checkbox" checked={all} onChange={(e) => { setPage(0); setAll(e.target.checked); }} className="accent-[#F5B700]" />
              Include prospects outside the campaign
            </label>
            <span className="w-px h-4 bg-[#161616]/15" />
            <Select label="" inline value={sort} options={['lead_score', 'created_at', 'updated_at', 'business_name', 'review_count', 'email_confidence']} onChange={setSort} />
            <span className="ml-auto text-xs font-mono text-[#161616]/65 tabular-nums">{total.toLocaleString()} prospects</span>
            <a className={btnGhost} href={`/api/admin/acquisition/prospects?${query().toString()}&format=csv`}>
              Export CSV
            </a>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-4 rounded-xl border-2 border-[#161616] bg-[#F5B700] p-3 flex flex-wrap items-center gap-2 shadow-[4px_4px_0_0_#161616]">
            <span className="font-oswald text-sm font-bold uppercase tracking-[0.1em]">{selected.size} selected</span>
            <button className={btnGhost} onClick={() => void bulk('assign-campaign')}>Add to campaign</button>
            <button className={btnGhost} onClick={() => void bulk('queue-email')}>Queue next email</button>
            <button className={btnGhost} onClick={() => void bulk('pause')}>Pause</button>
            <button className={btnGhost} onClick={() => void bulk('resume')}>Resume</button>
            <button className={btnGhost} onClick={() => void bulk('mark-test', { value: true })}>Mark as test</button>
            <select
              className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1.5 text-xs font-semibold"
              defaultValue=""
              onChange={(e) => { if (e.target.value) void bulk('set-trade', { value: e.target.value }); e.target.value = ''; }}
            >
              <option value="">Set trade...</option>
              <option value="hvac">HVAC</option>
              <option value="plumbing">Plumbing</option>
              <option value="roofing">Roofing</option>
              <option value="other">Other</option>
            </select>
            <button className={btnDanger} onClick={() => void bulk('suppress', { reason: 'suppressed from the CRM' })}>Suppress</button>
            <button className="ml-auto text-xs underline font-semibold" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#161616] text-left">
                <Th className="w-8">
                  <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} className="accent-[#F5B700]" />
                </Th>
                <Th>Business</Th>
                <Th>Trade</Th>
                <Th>Where</Th>
                <Th>Email</Th>
                <Th className="text-right">Reviews</Th>
                <Th className="text-right">Score</Th>
                <Th>Stage</Th>
                <Th>Journey</Th>
                <Th>Their suite</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[#161616]/60">Loading...</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[#161616]/60">
                    Nothing matches. Try clearing the filters, or run the Lead Finder.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#161616]/10 hover:bg-[#F5B700]/[0.07]">
                  <Td>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-[#F5B700]" />
                  </Td>
                  <Td>
                    <Link href={`/admin/acquisition/prospects/${r.id}`} className="font-semibold hover:underline">
                      {r.business_name}
                    </Link>
                    <div className="text-[11px] text-[#161616]/65 truncate max-w-[22rem]">
                      {r.contact_name ? `${r.contact_name} · ` : ''}
                      {r.email ?? 'no email'}
                    </div>
                  </Td>
                  <Td>{r.trade ? <Chip label={r.trade} /> : <span className="text-[#161616]/65">—</span>}</Td>
                  <Td className="whitespace-nowrap text-[13px] text-[#161616]/70">
                    {r.city ?? '—'}
                    {r.state ? `, ${r.state}` : ''}
                  </Td>
                  <Td>
                    <EmailChip status={r.email_status} confidence={r.email_confidence} />
                  </Td>
                  <Td className="text-right font-mono text-[12px] tabular-nums text-[#161616]/70">
                    {r.review_count?.toLocaleString() ?? '—'}
                    {r.rating ? <span className="text-[#161616]/60"> · {r.rating}</span> : null}
                  </Td>
                  <Td className="text-right">
                    <span className={`font-oswald font-bold tabular-nums ${(r.lead_score ?? 0) >= 70 ? 'text-[#3f5d34]' : (r.lead_score ?? 0) >= 50 ? 'text-[#161616]' : 'text-[#161616]/60'}`}>
                      {r.lead_score ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <Chip label={r.acq_stage.replace(/_/g, ' ')} tone={r.acq_stage === 'client' ? 'good' : r.acq_stage === 'lost' ? 'bad' : 'neutral'} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.is_test && <Chip label="TEST" tone="warn" />}
                      {r.needs_human && <Chip label="NEEDS YOU" tone="hot" title={r.needs_human} />}
                      {r.email_stage > 0 && <Chip label={`E${r.email_stage}`} />}
                      {r.consent_status === 'granted' && <Chip label="consent" tone="good" />}
                      {r.call_stage === 'completed' && <Chip label="talked" tone="good" />}
                      {r.checkout_sent_at && <Chip label="checkout" tone="warn" />}
                      {r.client_status === 'client' && <Chip label="CLIENT" tone="good" />}
                      {r.unsubscribed_at && <Chip label="opted out" tone="bad" />}
                      {r.bounced && <Chip label="bounced" tone="bad" />}
                      {!r.acq_eligible && !r.unsubscribed_at && (
                        <Chip label="held" tone="warn" title={r.acq_ineligible_reason ?? undefined} />
                      )}
                    </div>
                  </Td>
                  <Td>
                    <RowBuild
                      id={r.id}
                      business={r.business_name}
                      email={r.email}
                      suite={r.suite}
                      demoEmailedAt={r.demo_emailed_at}
                      onDone={() => void load()}
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-[11px] font-mono text-[#161616]/60">{timeAgo(r.updated_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button className={btnGhost} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </button>
          <span className="text-xs font-mono text-[#161616]/65">
            Page {page + 1} of {pages}
          </span>
          <button className={btnPrimary} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </main>
    </div>
  );
}

function EmailChip({ status, confidence }: { status: string | null; confidence: number | null }) {
  if (!status) return <span className="text-[#161616]/65">—</span>;
  const tone = status === 'verified' ? 'good' : status === 'likely' || status === 'public' ? 'warn' : status === 'unknown' ? 'neutral' : 'bad';
  return <Chip label={`${status}${confidence ? ` ${confidence}` : ''}`} tone={tone as 'good' | 'warn' | 'bad' | 'neutral'} />;
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] font-oswald font-semibold text-[#161616]/65 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>;
}

function Select({
  label,
  value,
  options,
  onChange,
  labels,
  inline,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  labels?: Record<string, string>;
  inline?: boolean;
}) {
  return (
    <div className={inline ? '' : undefined}>
      {label && <label className={labelCls}>{label}</label>}
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? (o === '' ? 'All' : o.replace(/_/g, ' '))}
          </option>
        ))}
      </select>
    </div>
  );
}
