'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THREE MORE COMMAND CENTER CARDS.
 *   TodayCard: what matters right now, computed from their own records.
 *   CampaignsCard: QR codes for signs and ads, with scans and leads per code.
 *   MailCard: their inbox sorted, with a drafted reply waiting; nothing sends
 *   without their click.
 * Each renders nothing for a client who is not on a project.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1';
const BTN = 'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const LINK = 'text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]';
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none';

/* ------------------------------------------------------------------ */
/* Today                                                                */
/* ------------------------------------------------------------------ */

type TodayItem = { kind: string; text: string; weight: number };
type Today = { business: string; date: string; items: TodayItem[] };

const KIND_MARK: Record<string, string> = { leads: 'bg-[#F5B700]', mail: 'bg-[#F5B700]', domains: 'bg-white', posts: 'bg-white', chat: 'bg-white', setup: 'bg-white', scans: 'bg-white', quiet: 'bg-emerald-100' };

export function TodayCard() {
  const [today, setToday] = useState<Today | null | undefined>(undefined);
  useEffect(() => {
    fetch('/api/portal/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { today?: Today | null } | null) => setToday(j?.today ?? null))
      .catch(() => setToday(null));
  }, []);
  if (!today) return null;
  return (
    <section className={`${CARD} p-6 mb-8 bg-[#FBF6EA]`}>
      <span className={EYEBROW}>Today</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-3">{today.date}</h3>
      <ul className="space-y-2">
        {today.items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`shrink-0 mt-1.5 h-3 w-3 rounded-full border-2 border-[#161616] ${KIND_MARK[it.kind] ?? 'bg-white'}`} />
            <p className="font-body text-sm text-[#161616]">{it.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-[10px] text-[#161616]/50">Read from your own records just now. Ask the guide in the corner for anything else.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Signs and ads                                                        */
/* ------------------------------------------------------------------ */

type Campaign = { id: string; code: string; label: string; medium: string; path: string; scans: number; leads: number; created_at: string; url: string; scansThisWeek: number };
const MEDIUM_WORD: Record<string, string> = { sign: 'Yard sign', jobsite: 'Jobsite sign', truck: 'Truck or trailer', card: 'Business card', print: 'Flyer or brochure', ad: 'Ad', mail: 'Mailer', other: 'Other' };

export function CampaignsCard() {
  const [items, setItems] = useState<Campaign[] | null | undefined>(undefined);
  const [pages, setPages] = useState<Array<{ path: string; label: string; group: string }>>([{ path: '/', label: 'Home page', group: 'Pages' }]);
  const [base, setBase] = useState('');
  const [label, setLabel] = useState('');
  const [medium, setMedium] = useState('sign');
  const [path, setPath] = useState('/');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/campaigns');
      const j = (r.ok ? await r.json() : null) as { campaigns?: Campaign[] | null; pages?: Array<{ path: string; label: string; group: string }>; base?: string } | null;
      setItems(j?.campaigns ?? null);
      if (j?.pages) setPages(j.pages);
      if (j?.base) setBase(j.base);
    } catch {
      setItems(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/portal/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, medium, path }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; campaign?: Campaign };
      if (!r.ok || !j.ok) {
        setErr(j.error ?? 'That did not go through.');
        return;
      }
      setLabel('');
      await load();
      if (j.campaign) setOpen(j.campaign.code);
    } finally {
      setBusy(false);
    }
  };
  const retire = async (code: string) => {
    setBusy(true);
    try {
      await fetch(`/api/portal/campaigns?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (items === undefined || items === null) return null;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Signs and ads</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">A QR code that knows it was scanned</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        One code per sign, truck, card or ad. Each scan is counted, and a lead that follows carries the sign&apos;s name. Codes point at {base.replace(/^https?:\/\//, '')} and never change, so a sign printed today works for years.
      </p>

      <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3 mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-bold mb-2">Make one</p>
        <div className="grid sm:grid-cols-3 gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bigfork yard sign" className={INPUT} maxLength={80} />
          <select value={medium} onChange={(e) => setMedium(e.target.value)} className={INPUT}>
            {Object.entries(MEDIUM_WORD).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={path} onChange={(e) => setPath(e.target.value)} className={INPUT}>
            {[...new Set(pages.map((p) => p.group))].map((g) => (
              <optgroup key={g} label={g}>
                {pages.filter((p) => p.group === g).map((p) => (
                  <option key={p.path} value={p.path}>{p.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" disabled={busy || label.trim().length < 2} onClick={() => void create()} className={`${BTN} bg-[#F5B700]`}>
            {busy ? 'Making it' : 'Make the code'}
          </button>
          {err && <span className="font-body text-xs text-[#C4160B]">{err}</span>}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="font-body text-sm text-[#161616]/60">No codes yet. The first one takes ten seconds.</p>
      ) : (
        <ul className="divide-y divide-[#161616]/10">
          {items.map((c) => {
            const isOpen = open === c.code;
            return (
              <li key={c.id} className="py-3">
                <button type="button" onClick={() => setOpen(isOpen ? null : c.code)} className="w-full text-left flex items-start gap-3">
                  <img src={`/api/portal/campaigns/qr?code=${encodeURIComponent(c.code)}&size=200`} alt={`QR code for ${c.label}`} width={44} height={44} className="shrink-0 rounded-md border-2 border-[#161616]/20 bg-white" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans font-bold text-[#161616] text-sm truncate">{c.label} <span className="font-normal text-[#161616]/60">· {MEDIUM_WORD[c.medium] ?? c.medium}</span></span>
                    <span className="block font-body text-xs text-[#161616]/60 truncate">{c.scans} {c.scans === 1 ? 'scan' : 'scans'} all time · {c.scansThisWeek} this week · {c.leads} {c.leads === 1 ? 'lead' : 'leads'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-2 ml-14 rounded-xl bg-[#FBF6EA] border-2 border-[#161616]/15 px-4 py-3">
                    <div className="flex flex-wrap items-start gap-4">
                      <img src={`/api/portal/campaigns/qr?code=${encodeURIComponent(c.code)}&size=400`} alt={`QR code for ${c.label}`} width={160} height={160} className="rounded-lg border-2 border-[#161616] bg-white" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-mono text-xs text-[#161616]/80 break-all">{c.url}</p>
                        <p className="font-body text-xs text-[#161616]/65">PNG for a sign shop, SVG for a printer. Either scans from across a driveway.</p>
                        <div className="flex flex-wrap gap-2">
                          <a href={`/api/portal/campaigns/qr?code=${encodeURIComponent(c.code)}&format=png&size=1200`} download={`qr-${c.code}.png`} className={`${BTN} bg-[#F5B700] inline-block`}>Download PNG</a>
                          <a href={`/api/portal/campaigns/qr?code=${encodeURIComponent(c.code)}&format=svg`} download={`qr-${c.code}.svg`} className={`${BTN} bg-white inline-block`}>Download SVG</a>
                          <button type="button" disabled={busy} onClick={() => void retire(c.code)} className={LINK}>Retire this code</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mail                                                                 */
/* ------------------------------------------------------------------ */

type MailItem = { id: string; from_addr: string | null; from_name: string | null; subject: string | null; snippet: string | null; body_text: string | null; received_at: string; category: string | null; summary: string | null; needs_reply: boolean | null; draft: string | null; status: string; replied_at: string | null };
type MailStatus = { connected: boolean; address: string | null; lastSyncAt: string | null; error: string | null };
type Mail = { status: MailStatus; items: MailItem[]; counts: Record<string, number> };

const CATEGORY_WORD: Record<string, string> = { lead: 'New inquiry', customer: 'Customer', vendor: 'Sub or supplier', money: 'Money', newsletter: 'Newsletter', notification: 'Notification', spam: 'Junk', other: 'Other', sorting: 'Sorting' };
const CAT_PILL: Record<string, string> = { lead: 'bg-[#F5B700] border-[#161616]', customer: 'bg-[#F5B700]/50 border-[#161616]', vendor: 'bg-white border-[#161616]', money: 'bg-white border-[#161616]', newsletter: 'bg-white border-[#161616]/30 text-[#161616]/60', notification: 'bg-white border-[#161616]/30 text-[#161616]/60', other: 'bg-white border-[#161616]/30', sorting: 'bg-white border-[#161616]/20 text-[#161616]/50' };

export function MailCard() {
  const [mail, setMail] = useState<Mail | null | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>('all');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/mail');
      const j = (r.ok ? await r.json() : null) as { mail?: Mail | null } | null;
      setMail(j?.mail ?? null);
    } catch {
      setMail(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}, key = action) => {
    setBusy(key);
    setErr(null);
    setNote(null);
    try {
      const r = await fetch('/api/portal/mail', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; fetched?: number };
      if (!r.ok || j.ok === false) {
        setErr(j.error ?? 'That did not go through.');
        return false;
      }
      if (action === 'connect') setNote(`Connected. ${j.fetched ?? 0} messages read; sorting takes a few minutes.`);
      if (action === 'send') setNote('Sent from your address.');
      if (action === 'draft') setNote('Saved to your Gmail drafts.');
      await load();
      return true;
    } finally {
      setBusy(null);
    }
  };

  if (mail === undefined || mail === null) return null;
  const s = mail.status;

  if (!s.connected) {
    return (
      <section className={`${CARD} p-6 mb-8`}>
        <span className={EYEBROW}>Your mail</span>
        <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Sorted, with a reply waiting</h3>
        <p className="text-[#161616]/65 font-body text-sm mb-4">
          Connect your inbox once and it is read twice an hour: new inquiries, customers, subs and suppliers, money, newsletters, notifications. Anything that needs an answer gets a draft in your voice. Nothing is sent, moved or deleted without your click.
        </p>
        <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3">
          <p className="font-body text-sm text-[#161616]/80 mb-2">
            In your Google account: turn on 2-Step Verification, then open Security, App passwords, name it &quot;Mail&quot;, and copy the 16 letters Google shows you. Paste them here with the address. This is not your normal password and you can revoke it any time.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="builtbyshan@gmail.com" type="email" autoComplete="off" className={INPUT} />
            <input value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="abcd efgh ijkl mnop" type="password" autoComplete="off" className={INPUT} />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" disabled={busy === 'connect' || !address || appPassword.replace(/\s/g, '').length < 12} onClick={() => void act('connect', { address, appPassword })} className={`${BTN} bg-[#F5B700]`}>
              {busy === 'connect' ? 'Checking with Google' : 'Connect my mailbox'}
            </button>
            {err && <span className="font-body text-xs text-[#C4160B]">{err}</span>}
          </div>
        </div>
      </section>
    );
  }

  const live = mail.items.filter((m) => (showDone ? true : m.status === 'new')).filter((m) => (filter === 'all' ? true : filter === 'reply' ? m.needs_reply && m.status === 'new' : (m.category ?? 'sorting') === filter));
  const needReply = mail.items.filter((m) => m.status === 'new' && m.needs_reply).length;
  const cats = Object.entries(mail.counts).sort((a, b) => b[1] - a[1]);

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Your mail</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">
        {needReply ? `${needReply} ${needReply === 1 ? 'reply' : 'replies'} waiting on you` : 'Nothing waiting on a reply'}
      </h3>
      <p className="text-[#161616]/65 font-body text-sm mb-3">
        {s.address}, last read {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'just now'}. {s.error ? <span className="text-[#C4160B]">Last read failed: {s.error}</span> : 'Read again twice an hour.'}
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={() => setFilter('all')} className={`${BTN} ${filter === 'all' ? 'bg-[#F5B700]' : 'bg-white'}`}>All new</button>
        <button type="button" onClick={() => setFilter('reply')} className={`${BTN} ${filter === 'reply' ? 'bg-[#F5B700]' : 'bg-white'}`}>Needs reply {needReply ? `(${needReply})` : ''}</button>
        {cats.map(([k, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`${BTN} ${filter === k ? 'bg-[#F5B700]' : 'bg-white'}`}>
            {CATEGORY_WORD[k] ?? k} ({n})
          </button>
        ))}
        <button type="button" disabled={busy === 'sync'} onClick={() => void act('sync')} className={LINK}>{busy === 'sync' ? 'Reading' : 'Read now'}</button>
      </div>
      {note && <p className="mb-2 font-body text-xs text-emerald-800">{note}</p>}
      {err && <p className="mb-2 font-body text-xs text-[#C4160B]">{err}</p>}

      {live.length === 0 ? (
        <p className="font-body text-sm text-[#161616]/60">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-[#161616]/10">
          {live.slice(0, 40).map((m) => {
            const isOpen = open === m.id;
            const cat = m.category ?? 'sorting';
            const draft = drafts[m.id] ?? m.draft ?? '';
            return (
              <li key={m.id} className={`py-3 ${m.status !== 'new' ? 'opacity-60' : ''}`}>
                <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} className="w-full text-left flex items-start gap-3">
                  <span className={`shrink-0 mt-0.5 inline-block rounded-md border-2 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#161616] ${CAT_PILL[cat] ?? CAT_PILL.other}`}>{CATEGORY_WORD[cat] ?? cat}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans font-bold text-[#161616] text-sm truncate">
                      {m.from_name ?? m.from_addr ?? 'Unknown'} <span className="font-normal text-[#161616]/60">· {m.subject}</span>
                      {m.needs_reply && m.status === 'new' && <span className="ml-2 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#C4160B]">Reply ready</span>}
                      {m.status === 'replied' && <span className="ml-2 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-800">Replied</span>}
                    </span>
                    <span className="block font-body text-xs text-[#161616]/60 truncate">{m.summary ?? m.snippet}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[#161616]/50 mt-1">{new Date(m.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </button>
                {isOpen && (
                  <div className="mt-2 rounded-xl bg-[#FBF6EA] border-2 border-[#161616]/15 px-4 py-3 space-y-3">
                    <p className="font-body text-xs text-[#161616]/60">{m.from_addr}</p>
                    <p className="font-body text-sm text-[#161616]/80 whitespace-pre-line max-h-64 overflow-y-auto">{m.body_text || m.snippet}</p>
                    {m.status === 'new' && m.category && (
                      <div className="border-t-2 border-[#161616]/10 pt-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C4160B] font-bold mb-1">{m.needs_reply ? 'Your reply, drafted. Change anything.' : 'No reply needed. Write one if you want.'}</p>
                        <textarea value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))} rows={6} className={`${INPUT} font-body`} />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button type="button" disabled={busy !== null || !draft.trim()} onClick={() => void act('send', { id: m.id, text: draft }, `send-${m.id}`)} className={`${BTN} bg-[#F5B700]`}>
                            {busy === `send-${m.id}` ? 'Sending' : 'Send from my address'}
                          </button>
                          <button type="button" disabled={busy !== null || !draft.trim()} onClick={() => void act('draft', { id: m.id, text: draft }, `draft-${m.id}`)} className={`${BTN} bg-white`}>
                            {busy === `draft-${m.id}` ? 'Saving' : 'Save to Gmail drafts'}
                          </button>
                          <button type="button" disabled={busy !== null} onClick={() => void act('done', { id: m.id })} className={LINK}>Done, no reply</button>
                        </div>
                      </div>
                    )}
                    {m.status === 'new' && !m.category && <p className="font-body text-xs text-[#161616]/50">Being sorted. Back in a few minutes.</p>}
                    {m.status !== 'new' && (
                      <button type="button" disabled={busy !== null} onClick={() => void act('reopen', { id: m.id })} className={LINK}>Put it back</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-4">
        <button type="button" onClick={() => setShowDone((v) => !v)} className={LINK}>{showDone ? 'Hide handled' : 'Show handled'}</button>
        <button type="button" disabled={busy !== null} onClick={() => void act('disconnect')} className={`${LINK} text-[#161616]/50`}>Disconnect mailbox</button>
      </div>
    </section>
  );
}
