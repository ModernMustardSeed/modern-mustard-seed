'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditRequest } from '@/lib/audit-requests';

/**
 * REQUESTED AUDITS, on the Audit Desk.
 *
 * Every Online Presence Audit somebody asked for on /presence-audit waits here.
 * The job per card is three moves: open their Google listing, type what it
 * shows, press Run. The run grades all three pillars and emails the requester
 * the report, so there is no separate send step to forget.
 *
 * The listing facts are typed by hand on purpose. A serverless function cannot
 * read Google Maps, and Sarah already has the listing open. Leaving "Found their
 * listing" unticked is a real answer: the profile and review pillars are then
 * withheld from the score rather than counted as zero.
 */

type View = 'open' | 'done';

const inp =
  'w-full rounded-lg border-2 border-[#161616] bg-white px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] disabled:bg-[#161616]/5 disabled:text-[#161616]/40';
const lbl = 'block font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#161616]/55 mb-1';

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Waiting on you', cls: 'bg-[#F5B700] text-[#161616]' },
  running: { label: 'Running', cls: 'bg-[#1E50C8] text-white' },
  grading: { label: 'Website still grading', cls: 'bg-[#FFDD55] text-[#161616]' },
  failed: { label: 'Needs a look', cls: 'bg-[#E0301E] text-white' },
  sent: { label: 'Sent', cls: 'bg-[#1E7A3C] text-white' },
  declined: { label: 'Declined', cls: 'bg-[#161616]/15 text-[#161616]' },
};

function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function host(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function listingSearch(r: AuditRequest): string {
  if (r.google_url) return r.google_url;
  const q = [r.business_name, r.town].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

type Draft = {
  business_name: string;
  website: string;
  google_url: string;
  listing_seen: boolean;
  rating: string;
  review_count: string;
  listing_phone: string;
  listing_address: string;
  hours_published: boolean;
  open_24_7: boolean;
  emergency_service: boolean;
};

function draftOf(r: AuditRequest): Draft {
  return {
    business_name: r.business_name,
    website: r.website ?? '',
    google_url: r.google_url ?? '',
    listing_seen: r.listing_seen,
    rating: r.rating === null ? '' : String(r.rating),
    review_count: r.review_count === null ? '' : String(r.review_count),
    listing_phone: r.listing_phone ?? '',
    listing_address: r.listing_address ?? '',
    hours_published: r.hours_published,
    open_24_7: r.open_24_7,
    emergency_service: r.emergency_service,
  };
}

function RequestCard({ initial, onChange }: { initial: AuditRequest; onChange: (r: AuditRequest) => void }) {
  const [r, setR] = useState(initial);
  const [d, setD] = useState<Draft>(() => draftOf(initial));
  const [busy, setBusy] = useState<'' | 'run' | 'save' | 'send' | 'decline'>('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const status = STATUS[r.status] ?? STATUS.new;
  const done = r.status === 'sent' || r.status === 'declined';

  const call = async (path: string, method: 'POST' | 'PATCH', body?: unknown) => {
    const res = await fetch(`/api/admin/audit/requests/${r.id}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error((data && data.error) || `Failed (${res.status}).`);
    return data;
  };

  const apply = (next: AuditRequest | null | undefined) => {
    if (!next) return;
    setR(next);
    onChange(next);
  };

  const run = async () => {
    setBusy('run');
    setMsg(null);
    setR((x) => ({ ...x, status: 'running' }));
    try {
      const data = await call('/run', 'POST', d);
      apply(data.request);
      const o = data.outcome;
      if (o?.state === 'sent') setMsg({ tone: 'ok', text: `Scored ${o.score} (${o.letter}). Emailed to ${r.email}.` });
      else if (o?.state === 'grading') setMsg({ tone: 'warn', text: o.message });
      else if (o?.state === 'ready-not-sent') setMsg({ tone: 'err', text: `Graded ${o.score} and filed, but the email did not go: ${o.error}` });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Run failed.' });
      setR((x) => ({ ...x, status: 'failed' }));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    setBusy('save');
    setMsg(null);
    try {
      const data = await call('', 'PATCH', d);
      apply(data.request);
      setMsg({ tone: 'ok', text: 'Saved.' });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (next: 'declined' | 'new') => {
    setBusy('decline');
    setMsg(null);
    try {
      const data = await call('', 'PATCH', { status: next });
      apply(data.request);
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Could not update.' });
    } finally {
      setBusy('');
    }
  };

  const resend = async () => {
    setBusy('send');
    setMsg(null);
    try {
      const data = await call('/send', 'POST');
      apply(data.request);
      setMsg({ tone: 'ok', text: `Sent again to ${r.email}.` });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Could not send.' });
    } finally {
      setBusy('');
    }
  };

  const listingOff = !d.listing_seen;

  return (
    <article className="rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616] md:p-6">
      {/* who asked */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-extrabold leading-tight text-[#161616]">{r.business_name}</h3>
            <span className={`rounded-full border-2 border-[#161616] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 font-body text-[13px] text-[#3A3733]">
            {r.name ? `${r.name} · ` : ''}
            <a href={`mailto:${r.email}`} className="font-semibold text-[#1E50C8] hover:underline">
              {r.email}
            </a>
            {r.town ? ` · ${r.town}` : ''}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/45">
            Asked {ago(r.created_at)}
            {r.sent_at ? ` · sent ${ago(r.sent_at)}${r.send_count > 1 ? ` (${r.send_count} times)` : ''}` : ''}
          </p>
        </div>
        {typeof r.score === 'number' && (
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-black leading-none text-[#161616]">{r.score}</span>
            <span className="rounded-md border-2 border-[#161616] bg-[#F5B700] px-2 py-0.5 font-display text-base font-bold italic">{r.letter}</span>
          </div>
        )}
      </div>

      {r.note && (
        <p className="mt-3 rounded-lg border border-[#161616]/15 bg-[#FFFDF6] px-3 py-2 font-body text-[13px] leading-relaxed text-[#3A3733]">
          <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#E0301E]">Their note</span>
          {r.note}
        </p>
      )}

      {r.wants?.length ? (
        <p className="mt-3 rounded-lg border-2 border-[#1E7A3C] bg-[#E9F5EC] px-3 py-2 font-body text-[13px] text-[#14532d]">
          <strong>After reading the report they asked us to build:</strong> {r.wants.join(', ')} ({ago(r.wants_at)})
        </p>
      ) : null}

      {/* the three links Sarah needs open */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={listingSearch(r)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#161616] hover:bg-[#F5B700]"
        >
          {r.google_url ? 'Their Google listing ↗' : 'Find their listing ↗'}
        </a>
        {r.website && (
          <a
            href={r.website}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#161616] hover:bg-[#F5B700]"
          >
            {host(r.website)} ↗
          </a>
        )}
        {r.audit_url && (
          <a
            href={r.audit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border-2 border-[#161616] bg-[#161616] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#F5B700]"
          >
            Their report ↗
          </a>
        )}
      </div>

      {/* the listing, as read */}
      {!done && (
        <div className="mt-5 rounded-xl border-2 border-dashed border-[#161616]/25 bg-[#FBF6EA] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={lbl}>Business name</span>
              <input className={inp} value={d.business_name} onChange={(e) => set('business_name', e.target.value)} />
            </label>
            <label className="block min-w-0">
              <span className={lbl}>Website</span>
              <input className={inp} value={d.website} onChange={(e) => set('website', e.target.value)} placeholder="None given" spellCheck={false} />
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" className="h-4 w-4 accent-[#161616]" checked={d.listing_seen} onChange={(e) => set('listing_seen', e.target.checked)} />
            <span className="font-sans text-[13px] font-bold text-[#161616]">I found their Google listing</span>
          </label>
          <p className="mt-1 font-body text-[12px] text-[#161616]/55">
            {listingOff
              ? 'Unticked, the profile and review pillars are left out of the score, never counted as zero.'
              : 'Type what the listing shows. Each fact is one of the eight profile checks.'}
          </p>

          <fieldset disabled={listingOff} className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="block min-w-0">
              <span className={lbl}>Star rating</span>
              <input className={inp} inputMode="decimal" value={d.rating} onChange={(e) => set('rating', e.target.value)} placeholder="4.8" />
            </label>
            <label className="block min-w-0">
              <span className={lbl}>Review count</span>
              <input className={inp} inputMode="numeric" value={d.review_count} onChange={(e) => set('review_count', e.target.value)} placeholder="212" />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={lbl}>Listing link</span>
              <input className={inp} value={d.google_url} onChange={(e) => set('google_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." spellCheck={false} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={lbl}>Phone on the listing</span>
              <input className={inp} value={d.listing_phone} onChange={(e) => set('listing_phone', e.target.value)} placeholder="Blank if none" />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={lbl}>Address on the listing</span>
              <input className={inp} value={d.listing_address} onChange={(e) => set('listing_address', e.target.value)} placeholder="Blank if hidden or missing" />
            </label>
            <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-4">
              {(
                [
                  ['hours_published', 'A full week of hours'],
                  ['open_24_7', 'Open 24 hours'],
                  ['emergency_service', 'Emergency or after-hours work stated'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#161616]" checked={d[k]} onChange={(e) => set(k, e.target.checked)} />
                  <span className="font-body text-[13px] text-[#161616]">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {msg && (
        <p
          className={`mt-4 rounded-lg border-2 px-3 py-2 font-body text-[13px] ${
            msg.tone === 'ok'
              ? 'border-[#1E7A3C] bg-[#E9F5EC] text-[#14532d]'
              : msg.tone === 'warn'
                ? 'border-[#B87503] bg-[#FFF6DB] text-[#6b4500]'
                : 'border-[#E0301E] bg-[#FDECEA] text-[#8a1c10]'
          }`}
        >
          {msg.text}
        </p>
      )}
      {!msg && r.error && r.status !== 'sent' && (
        <p className="mt-4 rounded-lg border-2 border-[#B87503] bg-[#FFF6DB] px-3 py-2 font-body text-[13px] text-[#6b4500]">{r.error}</p>
      )}

      {/* the moves */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!done && (
          <>
            <button
              onClick={run}
              disabled={!!busy}
              className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-6 py-2.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] disabled:opacity-50"
            >
              {busy === 'run' ? 'Grading, one to three minutes…' : r.status === 'grading' ? 'Run again and send' : 'Run the audit and email it'}
            </button>
            <button
              onClick={save}
              disabled={!!busy}
              className="rounded-lg border-2 border-[#161616] bg-white px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#161616] hover:bg-[#FFF8E6] disabled:opacity-50"
            >
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setStatus('declined')}
              disabled={!!busy}
              className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#161616]/45 hover:text-[#E0301E] disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}
        {r.status === 'sent' && (
          <button
            onClick={resend}
            disabled={!!busy}
            className="rounded-lg border-2 border-[#161616] bg-white px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#161616] hover:bg-[#FFF8E6] disabled:opacity-50"
          >
            {busy === 'send' ? 'Sending…' : 'Send it again'}
          </button>
        )}
        {r.status === 'declined' && (
          <button
            onClick={() => setStatus('new')}
            disabled={!!busy}
            className="rounded-lg border-2 border-[#161616] bg-white px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#161616] hover:bg-[#FFF8E6] disabled:opacity-50"
          >
            Reopen
          </button>
        )}
      </div>
    </article>
  );
}

export default function AuditRequests() {
  const [view, setView] = useState<View>('open');
  const [rows, setRows] = useState<AuditRequest[]>([]);
  const [open, setOpen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (v: View) => {
    try {
      const res = await fetch(`/api/admin/audit/requests?view=${v}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data && data.error) || `Could not load requests (${res.status}).`);
      setError('');
      setRows(data.requests as AuditRequest[]);
      setOpen(Number(data.open) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(view);
  }, [view, load]);

  // A card that moved out of this view (sent, declined, reopened) leaves it on
  // the next load; until then it stays put so the result stays readable.
  const changed = (next: AuditRequest) => setRows((xs) => xs.map((x) => (x.id === next.id ? next : x)));

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">
            Requested on the site
          </span>
          <h2 className="font-display text-2xl font-extrabold text-[#161616]">
            Presence audits waiting {open > 0 && <span className="ml-1 rounded-full bg-[#E0301E] px-2.5 py-0.5 align-middle font-mono text-sm text-white">{open}</span>}
          </h2>
          <p className="mt-1 max-w-2xl font-body text-[13px] text-[#3A3733]">
            Open their listing, type what it shows, press Run. The website is graded live, the report is filed, and they
            get it by email. No drip, no follow-up.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border-2 border-[#161616]">
          {(['open', 'done'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                if (v === view) return;
                setLoading(true);
                setRows([]);
                setView(v);
              }}
              className={`px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.16em] ${
                view === v ? 'bg-[#161616] text-[#F5B700]' : 'bg-white text-[#161616] hover:bg-[#FFF8E6]'
              }`}
            >
              {v === 'open' ? 'Waiting' : 'Sent'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg border-2 border-[#E0301E] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10]">{error}</p>}

      {loading && !rows.length ? (
        <p className="font-body text-sm text-[#161616]/50">Loading…</p>
      ) : !rows.length && !error ? (
        <div className="rounded-2xl border-2 border-dashed border-[#161616]/25 bg-white/60 px-6 py-8 text-center">
          <p className="font-display text-lg italic text-[#161616]">
            {view === 'open' ? 'Nobody is waiting on an audit.' : 'Nothing sent yet.'}
          </p>
          <p className="mt-1 font-body text-[13px] text-[#161616]/55">
            Requests from <a href="/presence-audit" target="_blank" className="font-semibold text-[#1E50C8] hover:underline">/presence-audit</a> land here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((r) => (
            <RequestCard key={r.id} initial={r} onChange={changed} />
          ))}
        </div>
      )}
    </section>
  );
}
