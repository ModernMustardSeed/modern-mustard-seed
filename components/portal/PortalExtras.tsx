'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

/**
 * Two cards on the portal home page.
 *   PostingTile: the door into the Daily Posting calendar, for clients on it.
 *   LeadsCard: every lead their own site sent, and the answer to "where do
 *   our leads come from": the last thirty days by door, by priority, by page.
 *   Unhandled first, best priority first. The one thing a person can set here
 *   is "called", and nothing else ever sets it.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';

export function PostingTile() {
  return (
    <Link href="/portal/posting" className={`group block ${CARD} p-5 mb-8 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">Daily Posting</span>
          <h3 className="font-sans font-bold text-[#161616] leading-tight">Say it once, and it goes out shaped for every platform</h3>
          <p className="text-[#161616]/70 font-body text-sm mt-2 leading-snug">Type what you want said, add a photo or ask for a graphic, and see the day it takes, every version, and where it went.</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] group-hover:text-[#161616] transition-colors">Open →</span>
      </div>
    </Link>
  );
}

type Lead = {
  id: string;
  source: string;
  sources: string[] | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  town: string | null;
  project_type: string | null;
  land: string | null;
  message: string | null;
  page: string | null;
  referrer_name: string | null;
  referrer_phone: string | null;
  answers: Array<{ q: string; a: string }> | null;
  priority: number | null;
  sms_consent: boolean | null;
  handled_at: string | null;
  created_at: string;
};
type Tally = Array<{ key: string; count: number }>;
type Summary = { days: number; total: number; waiting: number; bySource: Tally; byLand: Tally; byPriority: Tally; byPage: Tally; byTown: Tally };

const DOOR: Record<string, string> = { contact: 'Contact form', intake: 'Project form', refer: 'Refer a friend', chat: 'Website chat', questionnaire: 'Questionnaire' };
const PRIORITY: Record<string, string> = { '1': 'Land and plans', '2': 'Land, no plans', '3': 'Plans, no land', '4': 'Remodel' };
const BADGE: Record<number, string> = {
  1: 'bg-[#F5B700] border-[#161616] text-[#161616]',
  2: 'bg-[#F5B700]/50 border-[#161616] text-[#161616]',
  3: 'bg-white border-[#161616] text-[#161616]',
  4: 'bg-white border-[#161616]/40 text-[#161616]/70',
};

export function LeadsCard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/leads');
      const j = (r.ok ? await r.json() : null) as { leads?: Lead[]; summary?: Summary } | null;
      setLeads(j?.leads ?? []);
      setSummary(j?.summary ?? null);
    } catch {
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (id: string, handled: boolean) => {
    setBusy(id);
    try {
      await fetch('/api/portal/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, handled }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (!leads || leads.length === 0) return null;
  const shown = showAll ? leads : leads.slice(0, 8);

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">Your leads</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Where they come from</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        Every person who reached out through your website, and the door they used. The last {summary?.days ?? 30} days: {summary?.total ?? 0} {summary?.total === 1 ? 'lead' : 'leads'}
        {summary && summary.waiting > 0 ? <>, <strong className="text-[#161616]">{summary.waiting} waiting on a call</strong></> : ', nobody waiting on a call'}.
      </p>

      {summary && summary.total > 0 && (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <TallyBox title="By door" rows={summary.bySource.map((r) => ({ ...r, key: DOOR[r.key] ?? r.key }))} />
          <TallyBox title="By priority" rows={summary.byPriority.map((r) => ({ ...r, key: PRIORITY[r.key] ? `${r.key}. ${PRIORITY[r.key]}` : r.key }))} />
          <TallyBox title="By page" rows={summary.byPage.map((r) => ({ ...r, key: r.key.replace(/^https?:\/\/[^/]+/, '') || '/' }))} />
        </div>
      )}

      <ul className="divide-y divide-[#161616]/10">
        {shown.map((l) => {
          const doors = (l.sources?.length ? l.sources : [l.source]).map((s) => DOOR[s] ?? s);
          const isOpen = open === l.id;
          const done = Boolean(l.handled_at);
          return (
            <li key={l.id} className={`py-3 ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 h-7 w-7 rounded-lg border-2 flex items-center justify-center font-mono text-[12px] font-extrabold ${l.priority ? BADGE[l.priority] : 'bg-white border-[#161616]/20 text-[#161616]/40'}`} title={l.priority ? PRIORITY[String(l.priority)] : 'Starting point not said'}>
                  {l.priority ?? '·'}
                </span>
                <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-sans font-bold text-[#161616] text-sm">
                    {l.name ?? 'No name given'}
                    {l.town && <span className="font-normal text-[#161616]/60"> · {l.town}</span>}
                    {done && <span className="ml-2 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-800">Called</span>}
                  </p>
                  <p className="font-body text-xs text-[#161616]/60 truncate">
                    {doors.join(' → ')}{l.project_type ? ` · ${l.project_type}` : ''}{l.land ? ` · ${l.land}` : ''}
                  </p>
                </button>
                <span className="shrink-0 font-mono text-[10px] text-[#161616]/50 mt-1">{new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              {isOpen && (
                <div className="mt-2 ml-10 rounded-xl bg-[#FBF6EA] border-2 border-[#161616]/15 px-4 py-3 font-body text-sm text-[#161616]/80 space-y-1">
                  {l.phone && <p><span className="opacity-60">Phone</span> <a href={`tel:${l.phone}`} className="text-[#C4380C] font-semibold">{l.phone}</a>{l.sms_consent ? <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.12em] opacity-60">texts ok</span> : null}</p>}
                  {l.email && <p><span className="opacity-60">Email</span> <a href={`mailto:${l.email}`} className="text-[#C4380C] font-semibold">{l.email}</a></p>}
                  {l.page && <p><span className="opacity-60">From the page</span> {l.page.replace(/^https?:\/\/[^/]+/, '') || '/'}</p>}
                  {l.referrer_name && <p><span className="opacity-60">Referred by</span> {l.referrer_name}{l.referrer_phone ? ` (${l.referrer_phone})` : ''}</p>}
                  {l.message && <p className="whitespace-pre-line"><span className="opacity-60">They said</span> {l.message}</p>}
                  {l.answers && l.answers.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-[#161616]/10">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C4160B] font-bold mb-1">Their questionnaire</p>
                      {l.answers.map((a, i) => (
                        <p key={i} className="mb-1"><span className="opacity-60">{a.q}</span><br />{a.a || <span className="italic opacity-50">blank</span>}</p>
                      ))}
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={busy === l.id}
                      onClick={() => void mark(l.id, !done)}
                      className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform ${done ? 'bg-white' : 'bg-[#F5B700]'}`}
                    >
                      {done ? 'Put back in the list' : 'I called them'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {leads.length > 8 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
          {showAll ? 'Show fewer' : `Show all ${leads.length}`}
        </button>
      )}
    </section>
  );
}

function TallyBox({ title, rows }: { title: string; rows: Tally }) {
  return (
    <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-bold mb-1.5">{title}</p>
      {rows.length === 0 ? (
        <p className="font-body text-xs text-[#161616]/45">Nothing yet</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.slice(0, 5).map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-2 font-body text-xs text-[#161616]/80">
              <span className="truncate">{r.key}</span>
              <span className="font-mono font-bold shrink-0">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Article = { id: string; url: string; title: string | null; published_on: string | null; publisher: string | null; status: string; live_at: string | null; created_at: string };

const STATUS_WORD: Record<string, string> = {
  new: 'With Sarah',
  written: 'Summary written',
  live: 'On your website',
};

/**
 * Carmen writes for Kalispell Montana Hidden Gems every month. Each piece runs
 * under their byline on someone else's domain, so a summary of it belongs on
 * their own blog, carrying the same trade words and town names, with a link to
 * the full article. She pastes the link; we do the rest.
 */
export function ArticlesCard() {
  const [items, setItems] = useState<Article[] | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/articles');
      const j = (r.ok ? await r.json() : null) as { articles?: Article[] } | null;
      setItems(j?.articles ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fetch('/api/portal/articles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; article?: { title?: string | null } };
      if (!r.ok) setError(j.error ?? 'That did not go through.');
      else {
        setNote(j.article?.title ? `Got it: "${j.article.title}". We will write the summary and put it on your website.` : 'Got it. We will write the summary and put it on your website.');
        setUrl('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">Your writing</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Articles on your website</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        When Hidden Gems publishes your next piece, paste the link here. We write a summary in your voice, put it on your blog with a link to the full article, and it starts working for you in search. One paste is all we need.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder="Paste the link to your article"
          className="flex-1 rounded-xl border-2 border-[#161616]/30 bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !url.trim()}
          className="shrink-0 px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform"
        >
          {busy ? 'Adding' : 'Add it'}
        </button>
      </div>
      {note && <p className="mb-3 rounded-xl border-2 border-emerald-800/30 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{note}</p>}
      {error && <p className="mb-3 rounded-xl border-2 border-[#C4160B]/30 bg-red-50 px-4 py-2.5 text-sm font-semibold text-[#C4160B]">{error}</p>}

      <ul className="divide-y divide-[#161616]/10">
        {items.map((a) => (
          <li key={a.id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-sans font-bold text-sm text-[#161616] hover:text-[#C4380C] block">
                {a.title ?? a.url.replace(/^https?:\/\//, '').slice(0, 70)}
              </a>
              <p className="font-body text-xs text-[#161616]/60">
                {a.published_on ? new Date(`${a.published_on}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date not read'}
                {a.publisher ? ` · ${a.publisher}` : ''}
              </p>
            </div>
            <span className={`shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2.5 py-1 rounded-full border ${a.status === 'live' ? 'bg-emerald-100 text-emerald-800 border-emerald-800/25' : 'bg-[#F5B700]/25 text-[#8f6600] border-[#8f6600]/30'}`}>
              {STATUS_WORD[a.status] ?? a.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
