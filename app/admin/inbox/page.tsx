'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

type Folder = 'inbox' | 'sent';

type ListItem = {
  id: string;
  folder: Folder;
  direction: string;
  from_addr: string | null;
  from_name: string | null;
  to_addrs: string | null;
  subject: string | null;
  snippet: string | null;
  is_read: boolean;
  starred: boolean;
  has_attachments: boolean;
  prospect_id: string | null;
  occurred_at: string;
};
type FullEmail = ListItem & {
  body_text: string | null;
  body_html: string | null;
  cc_addrs: string | null;
  message_id: string | null;
};
type MailboxInfo = { address: string; name: string } | null;
type Compose = { to: string; cc: string; subject: string; text: string; inReplyTo?: string; references?: string };

const CARD = 'rounded-xl border-2 border-[#161616]';
const BTN = 'rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2 text-[12px] font-sans font-bold uppercase tracking-[0.12em] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform';
const BTN_GO = BTN.replace('bg-white', 'bg-[#F5B700]');

export default function InboxPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mailbox, setMailbox] = useState<MailboxInfo>(null);
  const [note, setNote] = useState<string>('');
  const [folder, setFolder] = useState<Folder>('inbox');
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<FullEmail | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [sending, setSending] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/mail?folder=${folder}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      const j = await r.json();
      setConfigured(j.configured ?? false);
      setMailbox(j.mailbox ?? null);
      setNote(j.note ?? '');
      setItems(j.items ?? []);
      setUnread(j.unread ?? 0);
    } catch {
      setItems([]);
      setConfigured(false);
    }
  }, [folder, q]);
  useEffect(() => { load(); }, [load]);

  const openEmail = async (id: string) => {
    const r = await fetch(`/api/admin/mail/${id}`);
    if (!r.ok) return;
    const j = await r.json();
    setOpen(j.email);
    setItems((prev) => prev?.map((it) => (it.id === id ? { ...it, is_read: true } : it)) ?? prev);
  };

  const sync = async () => {
    setSyncing(true);
    try { await fetch('/api/admin/mail/sync', { method: 'POST' }); await load(); }
    finally { setSyncing(false); }
  };

  const send = async () => {
    if (!compose) return;
    setSending(true);
    try {
      const r = await fetch('/api/admin/mail/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || 'Send failed'); return; }
      setCompose(null);
      if (folder === 'sent') load();
    } finally { setSending(false); }
  };

  // Focus the compose body once it has mounted, cursor at the very top so a
  // reply is typed ABOVE the quoted original (setTimeout waits out React's render).
  const focusCompose = () => {
    setTimeout(() => {
      const el = composeRef.current;
      if (el) { el.focus(); el.setSelectionRange(0, 0); }
    }, 0);
  };

  const openCompose = (c: Compose) => { setCompose(c); focusCompose(); };

  const startReply = (e: FullEmail) => {
    openCompose({
      to: e.from_addr || '',
      cc: '',
      subject: /^re:/i.test(e.subject || '') ? (e.subject || '') : `Re: ${e.subject || ''}`,
      text: `\n\n---\nOn ${new Date(e.occurred_at).toLocaleString()}, ${e.from_name || e.from_addr} wrote:\n${(e.body_text || '').split('\n').map((l) => `> ${l}`).join('\n')}`,
      inReplyTo: e.message_id || undefined,
      references: e.message_id || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="inbox" title="Inbox" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-3xl font-bold text-[#161616]">Mail</h2>
            {mailbox && (
              <span className="text-[11px] font-mono font-bold text-[#161616]/60 bg-[#FFF3CC] border-2 border-[#161616] rounded-full px-3 py-1">
                {mailbox.address}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className={`${CARD} flex overflow-hidden`}>
              {(['inbox', 'sent'] as Folder[]).map((f) => (
                <button key={f} onClick={() => { setFolder(f); setOpen(null); }}
                  className={`px-4 py-2 text-[12px] font-sans font-bold uppercase tracking-[0.12em] ${folder === f ? 'bg-[#161616] text-white' : 'bg-white text-[#161616]'}`}>
                  {f}{f === 'inbox' && unread > 0 ? ` (${unread})` : ''}
                </button>
              ))}
            </div>
            <button onClick={sync} disabled={syncing || !configured} className={BTN}>{syncing ? 'Syncing…' : 'Refresh mail'}</button>
            <button onClick={() => openCompose({ to: '', cc: '', subject: '', text: '' })} disabled={!configured} className={BTN_GO}>Compose</button>
          </div>
        </div>

        {configured === false ? (
          <div className={`${CARD} bg-white p-6 shadow-[4px_4px_0_0_#161616] max-w-2xl`}>
            <h3 className="font-sans font-bold text-lg text-[#161616] mb-1">Team mail is not wired yet</h3>
            <p className="text-[#3A3733] font-body text-sm">{note || 'Add the MAILBOXES env var (each teammate’s Zoho app password) to turn on the in-admin mailbox.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
            {/* List */}
            <div className={`${CARD} bg-white shadow-[4px_4px_0_0_#161616] overflow-hidden`}>
              <div className="p-3 border-b-2 border-[#161616]">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail…"
                  className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
              </div>
              <div className="max-h-[70vh] overflow-y-auto divide-y divide-[#161616]/10">
                {items === null ? (
                  <p className="p-4 text-[#161616]/50 italic text-sm">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="p-4 text-[#161616]/50 italic text-sm">Nothing here yet. Hit Refresh mail to pull the latest.</p>
                ) : items.map((it) => {
                  const who = folder === 'sent' ? (it.to_addrs || '') : (it.from_name || it.from_addr || '');
                  const active = open?.id === it.id;
                  return (
                    <button key={it.id} onClick={() => openEmail(it.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${active ? 'bg-[#FFF3CC]' : it.is_read ? 'bg-white hover:bg-[#FFF8E6]' : 'bg-[#FFF8E6] hover:bg-[#FFF3CC]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[14px] text-[#161616] ${it.is_read ? 'font-sans' : 'font-sans font-bold'}`}>{who || '(unknown)'}</span>
                        <span className="shrink-0 text-[10px] text-[#161616]/45 font-mono">{new Date(it.occurred_at).toLocaleDateString()}</span>
                      </div>
                      <p className={`truncate text-[13px] mt-0.5 ${it.is_read ? 'text-[#161616]/75' : 'text-[#161616] font-semibold'}`}>{it.subject || '(no subject)'}</p>
                      <p className="truncate text-[12px] text-[#3A3733]/70 font-body">{it.snippet}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {!it.is_read && <span className="text-[8px] uppercase tracking-wider text-white bg-[#E0301E] rounded-full px-1.5 py-0.5">new</span>}
                        {it.prospect_id && <span className="text-[8px] uppercase tracking-wider text-[#161616] bg-[#F5B700] border border-[#161616] rounded-full px-1.5 py-0.5">lead</span>}
                        {it.has_attachments && <span className="text-[10px] text-[#161616]/40">📎</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reading pane */}
            <div className={`${CARD} bg-white shadow-[4px_4px_0_0_#161616] min-h-[50vh] p-5 md:p-6`}>
              {!open ? (
                <div className="h-full flex items-center justify-center text-[#161616]/40 font-body italic">Select a message to read it.</div>
              ) : (
                <article>
                  <h3 className="font-display text-2xl font-bold text-[#161616] mb-2">{open.subject || '(no subject)'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#161616]/60 font-mono border-b-2 border-[#161616]/10 pb-3 mb-4">
                    <span><b className="text-[#161616]">From:</b> {open.from_name ? `${open.from_name} <${open.from_addr}>` : open.from_addr}</span>
                    <span><b className="text-[#161616]">To:</b> {open.to_addrs}</span>
                    <span>{new Date(open.occurred_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => startReply(open)} className={BTN_GO}>Reply</button>
                    {open.prospect_id && <a href={`/admin/prospects?focus=${open.prospect_id}`} className={BTN}>Open lead</a>}
                  </div>
                  {open.body_html ? (
                    <div className="prose prose-sm max-w-none text-[#161616]" dangerouslySetInnerHTML={{ __html: sanitize(open.body_html) }} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-body text-[14px] leading-relaxed text-[#161616]">{open.body_text}</pre>
                  )}
                </article>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Compose / reply overlay (modal-safe: capped height, pinned header, scrolling body) */}
      {compose && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={() => !sending && setCompose(null)}>
          <div className={`${CARD} bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[6px_6px_0_0_#161616]`} onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b-2 border-[#161616] px-5 py-3">
              <h3 className="font-display text-xl font-bold text-[#161616]">{compose.inReplyTo ? 'Reply' : 'New message'}</h3>
              <button onClick={() => !sending && setCompose(null)} className="text-[#161616]/50 hover:text-[#161616] text-xl">×</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {mailbox && <p className="text-[11px] font-mono text-[#161616]/50">From: {mailbox.name} &lt;{mailbox.address}&gt;</p>}
              <input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="To"
                className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
              <input value={compose.cc} onChange={(e) => setCompose({ ...compose, cc: e.target.value })} placeholder="Cc (optional)"
                className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
              <input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Subject"
                className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
              <textarea ref={composeRef} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} rows={12} placeholder="Write your message…"
                className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            </div>
            <div className="shrink-0 flex items-center justify-end gap-2 border-t-2 border-[#161616] px-5 py-3">
              <button onClick={() => setCompose(null)} disabled={sending} className={BTN}>Cancel</button>
              <button onClick={send} disabled={sending || !compose.to || !compose.text} className={BTN_GO}>{sending ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimal HTML allowlist for rendering email bodies (strip scripts/styles/iframes). */
function sanitize(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
