'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Two cards on the portal home page.
 *   PostingTile: the door into the Daily Posting calendar, for clients on it.
 *   LeadsCard: every lead their own site sent, and the answer to "where do
 *   our leads come from": the last thirty days by door, by starting point,
 *   by page. Read only. No status lives here for anyone to set.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';

export function PostingTile() {
  return (
    <Link href="/portal/posting" className={`group block ${CARD} p-5 mb-8 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">Daily Posting</span>
          <h3 className="font-sans font-bold text-[#161616] leading-tight">Drop a photo, and it goes out everywhere tomorrow</h3>
          <p className="text-[#161616]/70 font-body text-sm mt-2 leading-snug">Your calendar, every caption, and where each post went. No photo, and the feed still posts every day.</p>
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
  created_at: string;
};
type Tally = Array<{ key: string; count: number }>;
type Summary = { days: number; total: number; bySource: Tally; byLand: Tally; byPage: Tally; byTown: Tally };

const DOOR: Record<string, string> = { contact: 'Contact form', intake: 'Project form', refer: 'Refer a friend', chat: 'Website chat', questionnaire: 'Questionnaire' };

export function LeadsCard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/api/portal/leads')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { leads?: Lead[]; summary?: Summary } | null) => {
        setLeads(j?.leads ?? []);
        setSummary(j?.summary ?? null);
      })
      .catch(() => setLeads([]));
  }, []);

  if (!leads || leads.length === 0) return null;
  const shown = showAll ? leads : leads.slice(0, 8);

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">Your leads</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Where they come from</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">Every person who reached out through your website, and the door they used. The last {summary?.days ?? 30} days: {summary?.total ?? 0} {summary?.total === 1 ? 'lead' : 'leads'}.</p>

      {summary && summary.total > 0 && (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <TallyBox title="By door" rows={summary.bySource.map((r) => ({ ...r, key: DOOR[r.key] ?? r.key }))} />
          <TallyBox title="By starting point" rows={summary.byLand} />
          <TallyBox title="By page" rows={summary.byPage.map((r) => ({ ...r, key: r.key.replace(/^https?:\/\/[^/]+/, '') || '/' }))} />
        </div>
      )}

      <ul className="divide-y divide-[#161616]/10">
        {shown.map((l) => {
          const doors = (l.sources?.length ? l.sources : [l.source]).map((s) => DOOR[s] ?? s);
          const isOpen = open === l.id;
          return (
            <li key={l.id} className="py-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} className="w-full text-left flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans font-bold text-[#161616] text-sm">
                    {l.name ?? 'No name given'}
                    {l.town && <span className="font-normal text-[#161616]/60"> · {l.town}</span>}
                  </p>
                  <p className="font-body text-xs text-[#161616]/60 truncate">
                    {doors.join(' → ')}{l.project_type ? ` · ${l.project_type}` : ''}{l.land ? ` · ${l.land}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[#161616]/50">{new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </button>
              {isOpen && (
                <div className="mt-2 rounded-xl bg-[#FBF6EA] border-2 border-[#161616]/15 px-4 py-3 font-body text-sm text-[#161616]/80 space-y-1">
                  {l.phone && <p><span className="opacity-60">Phone</span> <a href={`tel:${l.phone}`} className="text-[#C4380C] font-semibold">{l.phone}</a></p>}
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
