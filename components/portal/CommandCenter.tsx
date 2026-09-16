'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THE COMMAND CENTER CARDS on the portal home page, for clients on a project.
 *   ConversationsCard: what visitors asked the website chat, in their words.
 *   DomainsCard: every domain they own, its job and its renewal date, and
 *   whether their business email is flowing yet.
 *   AccountsCard: the accounts everything runs on, each with its state and
 *   the one thing to do; the Buildertrend hand-off is connected here; and the
 *   words that explain the whole page.
 * Each card renders nothing for a client who is not on a project.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1';
const BTN = 'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';

/* ------------------------------------------------------------------ */
/* Conversations                                                        */
/* ------------------------------------------------------------------ */

type Turn = { role: 'user' | 'assistant'; content: string; at: string };
type Conversation = { id: string; startedAt: string; page: string | null; turns: Turn[]; exchanges: number };

export function ConversationsCard() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/api/portal/conversations')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { conversations?: Conversation[] } | null) => setItems(j?.conversations ?? []))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;
  const shown = showAll ? items : items.slice(0, 6);

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Website chat</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">What people asked</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        Every conversation a visitor had with the chat on your website in the last 30 days, in their own words, with the page they were on. {items.length} {items.length === 1 ? 'conversation' : 'conversations'}.
      </p>
      <ul className="divide-y divide-[#161616]/10">
        {shown.map((c) => {
          const isOpen = open === c.id;
          const first = c.turns.find((t) => t.role === 'user')?.content ?? c.turns[0].content;
          return (
            <li key={c.id} className="py-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className="w-full text-left flex items-start gap-3">
                <span className="shrink-0 mt-0.5 h-7 w-7 rounded-lg border-2 border-[#161616] bg-[#FBF6EA] flex items-center justify-center font-mono text-[11px] font-extrabold text-[#161616]">{c.exchanges}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans font-bold text-[#161616] text-sm truncate">{first}</span>
                  <span className="block font-body text-xs text-[#161616]/60 truncate">
                    {new Date(c.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {c.page ? ` · on ${c.page}` : ''}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="mt-2 ml-10 rounded-xl bg-[#FBF6EA] border-2 border-[#161616]/15 px-4 py-3 space-y-2">
                  {c.turns.map((t, i) => (
                    <p key={i} className={`font-body text-sm whitespace-pre-line ${t.role === 'user' ? 'text-[#161616] font-semibold' : 'text-[#161616]/80'}`}>
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60 mr-2">{t.role === 'user' ? 'Visitor' : 'Chat'}</span>
                      {t.content}
                    </p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > 6 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
          {showAll ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Domains and email                                                    */
/* ------------------------------------------------------------------ */

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
  mailProvider: string;
};
type EmailState = { domain: string; registered: boolean; mx: string | null; provider: string } | null;

const ROLE_WORD: Record<Domain['role'], string> = { primary: 'The website', email: 'Your email', forward: 'Forwards to the website', held: 'Held for its own day' };
const MAIL_WORD: Record<string, string> = { google: 'Google Workspace', zoho: 'Zoho', microsoft: 'Microsoft 365', webexpress: 'Web Express', forwarding: 'registrar forwarding', none: 'no mail', other: 'another mail host' };

function expiryPill(d: Domain) {
  if (d.status === 'released') return <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold text-[#C4160B]">Not registered</span>;
  if (d.status === 'expired') return <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold text-[#C4160B]">Expired</span>;
  if (d.days == null) return <span className="font-mono text-[10px] text-[#161616]/40">Checking</span>;
  const cls = d.days <= 45 ? 'bg-[#F5B700] border-[#161616]' : 'bg-white border-[#161616]/30';
  return (
    <span className={`inline-block rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-bold text-[#161616] ${cls}`} title={`Renews ${d.expires_on}`}>
      {d.days <= 45 ? `${d.days} days` : new Date(d.expires_on!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
    </span>
  );
}

export function DomainsCard() {
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [email, setEmail] = useState<EmailState>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHeld, setShowHeld] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/domains');
      const j = (r.ok ? await r.json() : null) as { domains?: Domain[]; email?: EmailState; checkedAt?: string | null } | null;
      setDomains(j?.domains ?? []);
      setEmail(j?.email ?? null);
      setCheckedAt(j?.checkedAt ?? null);
    } catch {
      setDomains([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setBusy(true);
    try {
      await fetch('/api/portal/domains', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!domains || domains.length === 0) return null;
  const working = domains.filter((d) => d.role !== 'held');
  const held = domains.filter((d) => d.role === 'held');
  const soon = domains.filter((d) => d.days != null && d.days <= 45).length;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Domains and email</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Every name you own</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        {domains.length} domains, registered to Built Right in Montana LLC. We carry the renewals and re-read the registry every Monday.
        {soon > 0 ? <> <strong className="text-[#161616]">{soon} renew{soon === 1 ? 's' : ''} inside 45 days.</strong></> : ' Nothing renews inside 45 days.'}
      </p>

      {email && (
        <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-bold mb-1">Your business email</p>
          <p className="font-sans font-bold text-[#161616] text-sm">
            shan@{email.domain}
            <span className={`ml-2 inline-block rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-bold ${email.provider === 'google' ? 'bg-[#F5B700] border-[#161616] text-[#161616]' : 'bg-white border-[#161616]/30 text-[#161616]/70'}`}>
              {email.provider === 'google' ? 'Mail flowing to Google' : email.registered ? 'Domain is yours, mail not set up yet' : 'Domain not registered yet'}
            </span>
          </p>
          <p className="font-body text-xs text-[#161616]/65 mt-1">
            {email.provider === 'google'
              ? 'Google Workspace is receiving mail for this domain. Sign in at mail.google.com with your new address.'
              : email.registered
                ? 'Next: create the Google Workspace account at workspace.google.com with this domain. Sarah then adds the records and verifies it, and mail starts flowing.'
                : 'Sarah is registering it. The moment it is yours, this line changes.'}
          </p>
        </div>
      )}

      <ul className="divide-y divide-[#161616]/10">
        {working.map((d) => (
          <li key={d.id} className="py-2.5 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-[#161616] truncate">{d.domain}</p>
              <p className="font-body text-xs text-[#161616]/60">
                {ROLE_WORD[d.role]}
                {d.registrar ? ` · ${d.registrar}` : ''}
                {d.mx ? ` · mail at ${MAIL_WORD[d.mailProvider] ?? d.mailProvider}` : ''}
                {d.notes ? ` · ${d.notes}` : ''}
              </p>
            </div>
            <div className="shrink-0 mt-0.5">{expiryPill(d)}</div>
          </li>
        ))}
      </ul>
      {held.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowHeld((v) => !v)} className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
            {showHeld ? 'Hide' : 'Show'} the {held.length} held for later
          </button>
          {showHeld && (
            <ul className="divide-y divide-[#161616]/10 mt-2">
              {held.map((d) => (
                <li key={d.id} className="py-2 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-[#161616] truncate">{d.domain}</p>
                    <p className="font-body text-xs text-[#161616]/60">{d.registrar ? `${d.registrar}` : ''}{d.mx ? ` · mail at ${MAIL_WORD[d.mailProvider] ?? d.mailProvider}` : ''}{d.notes ? ` · ${d.notes}` : ''}</p>
                  </div>
                  <div className="shrink-0 mt-0.5">{expiryPill(d)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void refresh()} className={`${BTN} bg-white`}>
          {busy ? 'Reading the registry' : 'Re-check now'}
        </button>
        {checkedAt && <span className="font-mono text-[10px] text-[#161616]/50">Last read {new Date(checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts, Buildertrend, and the words                                */
/* ------------------------------------------------------------------ */

type AccountLine = { key: string; label: string; state: 'connected' | 'waiting' | 'manual' | 'error'; detail: string; action: string | null; href: string | null };
type GuideSection = { title: string; lines: string[] };
type CommandCenter = { business: string; accounts: AccountLine[]; guide: GuideSection[] };
type Bt = { connected: boolean; builderId: number | null; captcha: boolean; error: string | null; pushed: number; failed: Array<{ id: string; name: string | null; crm_error: string; created_at: string }> } | null;

const STATE_PILL: Record<AccountLine['state'], { word: string; cls: string }> = {
  connected: { word: 'Connected', cls: 'bg-[#F5B700] border-[#161616] text-[#161616]' },
  waiting: { word: 'Waiting on you', cls: 'bg-white border-[#161616]/30 text-[#161616]/70' },
  manual: { word: 'By hand', cls: 'bg-white border-[#161616]/30 text-[#161616]/70' },
  error: { word: 'Needs a look', cls: 'bg-white border-[#C4160B] text-[#C4160B]' },
};

export function AccountsCard() {
  const [cc, setCc] = useState<CommandCenter | null | undefined>(undefined);
  const [bt, setBt] = useState<Bt>(null);
  const [embed, setEmbed] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState<number | null>(0);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/portal/command-center'), fetch('/api/portal/integrations/buildertrend')]);
      const ja = (a.ok ? await a.json() : null) as { commandCenter?: CommandCenter | null } | null;
      const jb = (b.ok ? await b.json() : null) as { buildertrend?: Bt } | null;
      setCc(ja?.commandCenter ?? null);
      setBt(jb?.buildertrend ?? null);
    } catch {
      setCc(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const r = await fetch('/api/portal/integrations/buildertrend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ embed }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; builderId?: number; captcha?: boolean };
      if (!r.ok || !j.ok) {
        setErr(j.error ?? 'That did not go through.');
        return;
      }
      setEmbed('');
      setNote(j.captcha ? `Connected as builder ${j.builderId}. One thing: your form has a captcha turned on, so ask Buildertrend support to turn it off for the Lead Contact Form.` : `Connected as builder ${j.builderId}. Every website lead now lands in your pipeline.`);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch('/api/portal/integrations/buildertrend', { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (cc === undefined || cc === null) return null;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Your accounts</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">What everything runs on</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">Each account, whether it is connected, and the one thing to do if it is not. We hold a revocable key for each, never a password.</p>

      <ul className="divide-y divide-[#161616]/10 mb-5">
        {cc.accounts.map((a) => {
          const pill = STATE_PILL[a.state];
          return (
            <li key={a.key} className="py-2.5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-sans font-bold text-[#161616] text-sm">{a.label}</p>
                <p className="font-body text-xs text-[#161616]/65">{a.detail}</p>
                {a.action && a.href && (
                  <a href={a.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
                    {a.action} ↗
                  </a>
                )}
              </div>
              <span className={`shrink-0 mt-0.5 inline-block rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-bold ${pill.cls}`}>{pill.word}</span>
            </li>
          );
        })}
      </ul>

      {bt && (
        <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3 mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-bold mb-1">Buildertrend hand-off</p>
          {bt.connected ? (
            <>
              <p className="font-body text-sm text-[#161616]/80">
                Connected as builder {bt.builderId}. {bt.pushed} {bt.pushed === 1 ? 'lead' : 'leads'} handed to your pipeline so far.
                {bt.captcha ? ' Your form has a captcha on, which can make Buildertrend refuse the hand-off; ask their support to turn it off for the Lead Contact Form.' : ''}
              </p>
              {bt.failed.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {bt.failed.map((f) => (
                    <li key={f.id} className="font-body text-xs text-[#C4160B]">
                      {f.name ?? 'A lead'} on {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {f.crm_error}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" disabled={busy} onClick={() => void disconnect()} className={`${BTN} bg-white mt-3`}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <p className="font-body text-sm text-[#161616]/80 mb-2">
                In Buildertrend go to Sales, then Lead Opportunities, then Lead Contact Form, then Installation Instructions. Copy the whole embed code and paste it here. That is all; from then on every website lead becomes a Lead Opportunity in your pipeline.
              </p>
              <textarea
                value={embed}
                onChange={(e) => setEmbed(e.target.value)}
                rows={3}
                placeholder='<iframe id="btIframe" src="https://buildertrend.net/leads/contactforms/ContactFormFrame.aspx?builderID=..."'
                className="w-full rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 font-mono text-xs text-[#161616] focus:border-[#161616] outline-none"
              />
              <div className="mt-2 flex items-center gap-3">
                <button type="button" disabled={busy || embed.trim().length < 20} onClick={() => void connect()} className={`${BTN} bg-[#F5B700]`}>
                  {busy ? 'Checking with Buildertrend' : 'Connect Buildertrend'}
                </button>
              </div>
            </>
          )}
          {err && <p className="mt-2 font-body text-xs text-[#C4160B]">{err}</p>}
          {note && <p className="mt-2 font-body text-xs text-emerald-800">{note}</p>}
        </div>
      )}

      <div className="border-t-2 border-[#161616]/10 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-bold mb-2">How your Command Center works</p>
        <ul className="divide-y divide-[#161616]/10">
          {cc.guide.map((g, i) => (
            <li key={g.title} className="py-2">
              <button type="button" onClick={() => setGuideOpen(guideOpen === i ? null : i)} className="w-full text-left font-sans font-bold text-[#161616] text-sm flex items-center justify-between">
                {g.title}
                <span className="font-mono text-[10px] text-[#161616]/50">{guideOpen === i ? 'Hide' : 'Read'}</span>
              </button>
              {guideOpen === i && (
                <div className="mt-1 space-y-1.5">
                  {g.lines.map((l, k) => (
                    <p key={k} className="font-body text-sm text-[#161616]/80">{l}</p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
