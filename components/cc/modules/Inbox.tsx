'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Drawer, Empty, ErrorNote, Field, Label, Skeleton, cx, inputCls, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE MAIL DESK. Read twice an hour, sorted into the eight piles a business
 * actually has, with a reply already written where one is needed. Nothing is
 * sent, filed or deleted without a person pressing the button: the draft sits
 * there, editable, until they do. A business with three mailboxes sees all
 * three here, one list, each message marked with the mailbox it came to, and
 * a reply always leaves from that same mailbox.
 */

type MailItem = {
  id: string;
  mailbox: string | null;
  from_addr: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string;
  category: string | null;
  summary: string | null;
  needs_reply: boolean;
  draft: string | null;
  status: string;
};
type Mailbox = { address: string; host: 'gmail' | 'porkbun' | 'zoho'; google?: boolean; connected: boolean; lastSyncAt: string | null; error: string | null };

/** Google's four-colour G, drawn, so the button reads as Google's at a glance. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0 rounded-full bg-white p-[1px]">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.5 5.8c4.4-4 6.8-10 6.8-17.3z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** A Google mailbox whose grant ended: one press puts it back, on the same account. */
function SignInAgain({ address }: { address: string }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[14px]"><span className="font-semibold">{address}</span> stopped letting us read it. Google needs you to sign in again; nothing waiting in it is lost.</p>
        <Button kind="primary" href={`/api/portal/mail/google?back=cc&hint=${encodeURIComponent(address)}`}>
          <GoogleMark /> Sign in again
        </Button>
      </div>
    </Card>
  );
}
type Status = { connected: boolean; address: string | null; lastSyncAt: string | null; error: string | null; mailboxes?: Mailbox[] };
type Payload = { mail: { status: Status; items: MailItem[]; counts: Record<string, number>; categories?: string[] } | null };

export default function Inbox({ refreshPulse }: { refreshPulse: () => void }) {
  const [data, setData] = useState<Payload['mail']>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [pile, setPile] = useState<string>('needs');
  const [open, setOpen] = useState<MailItem | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [connect, setConnect] = useState({ address: '', appPassword: '' });
  const [who, setWho] = useState<string>('all');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/mail', { cache: 'no-store' });
      const j = (await r.json()) as Payload;
      setData(j.mail);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Google hands the owner back with ?mail=...; say what happened once, then tidy the address bar.
  const [arrived, setArrived] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mail = q.get('mail');
    if (!mail) return;
    const address = q.get('address');
    const why = q.get('why');
    setArrived(
      mail === 'connected'
        ? { ok: true, text: `${address ?? 'The mailbox'} is connected. The first read is sorting now.` }
        : mail === 'declined'
          ? { ok: false, text: 'Google was not given the go-ahead, so nothing was connected.' }
          : mail === 'unconfigured'
            ? { ok: false, text: 'Google sign-in is not switched on for this desk yet. Use the mailbox password form below for now.' }
            : { ok: false, text: why ?? 'Google did not finish the sign-in. Try once more.' },
    );
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  }, []);

  const act = async (body: Record<string, unknown>, after?: () => void) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/mail', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || j.error) {
        setNote(j.error ?? 'That did not go through.');
        return;
      }
      after?.();
      void load();
      refreshPulse();
    } catch {
      setNote('That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const mailboxes = data?.status.mailboxes ?? [];
  const many = mailboxes.length > 1;
  const items = (data?.items ?? []).filter((m) => who === 'all' || m.mailbox === who);
  const piles = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const m of items) if (m.status === 'new') byCat.set(m.category ?? 'other', (byCat.get(m.category ?? 'other') ?? 0) + 1);
    return [
      { key: 'needs', label: 'Needs a reply', count: items.filter((m) => m.status === 'new' && m.needs_reply).length },
      { key: 'new', label: 'New', count: items.filter((m) => m.status === 'new').length },
      ...[...byCat.entries()].map(([k, n]) => ({ key: `cat:${k}`, label: k, count: n })),
      { key: 'done', label: 'Done', count: items.filter((m) => m.status === 'done').length },
    ];
  }, [items]);

  const rows = items.filter((m) =>
    pile === 'needs' ? m.status === 'new' && m.needs_reply : pile === 'new' ? m.status === 'new' : pile === 'done' ? m.status === 'done' : m.status === 'new' && (m.category ?? 'other') === pile.replace('cat:', ''),
  );

  // A Gmail address typed into the password form belongs on the Google button.
  const typedGoogle = /@(gmail|googlemail)\.com$/i.test(connect.address.trim());

  const connectForm = (first: boolean) => (
    <Card>
      <CardHead
        title={first ? 'Connect your mailboxes' : 'Add a mailbox'}
        hint="Every mailbox is read twice an hour, sorted into piles, with a reply drafted in the voice of the person it was sent to. Nothing is ever sent without your click."
      />
      {note && <p className="mb-4 text-[13px] text-[#B42318]">{note}</p>}
      <div className="rounded-xl border border-[var(--cc-line)] p-4">
        <p className="text-[14.5px] font-semibold">Gmail or Google Workspace</p>
        <p className="mt-1 text-[13.5px] text-[var(--cc-muted)]">Sign in on Google&apos;s own screen and pick the mailbox. No password ever reaches us, and you can cut us off from your Google account at any time.</p>
        <div className="mt-3">
          <Button kind="primary" href={`/api/portal/mail/google?back=cc${typedGoogle ? `&hint=${encodeURIComponent(connect.address.trim())}` : ''}`}>
            <GoogleMark /> Sign in with Google
          </Button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-[var(--cc-line)] p-4">
        <p className="text-[14.5px] font-semibold">A mailbox on your own domain, hosted on Zoho or Porkbun</p>
        <p className="mt-1 mb-3 text-[13.5px] text-[var(--cc-muted)]">Its address and the password set for that mailbox. On Zoho, first tick IMAP Access in Settings, Mail Accounts.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Address"><input className={inputCls} value={connect.address} onChange={(e) => setConnect({ ...connect, address: e.target.value })} placeholder="you@yourdomain.com" autoComplete="off" /></Field>
          <Field label="Password" hint="Kept encrypted. Change it and we are cut off at once."><input className={inputCls} type="password" value={connect.appPassword} onChange={(e) => setConnect({ ...connect, appPassword: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        {typedGoogle && <p className="mt-3 text-[13px] text-[var(--cc-muted)]">That is a Gmail address. Use Sign in with Google above; it opens on {connect.address.trim()}.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={busy || typedGoogle || !connect.address || !connect.appPassword}
            onClick={() =>
              act({ action: 'connect', ...connect }, () => {
                setConnect({ address: '', appPassword: '' });
                setAdding(false);
              })
            }
          >
            {busy ? 'Connecting' : 'Connect the mailbox'}
          </Button>
        </div>
      </div>
      <p className="mt-4 text-[13px] text-[var(--cc-muted)]">Connect each person&apos;s mailbox once. They all land in this one list.</p>
      {!first && <div className="mt-3"><Button kind="ghost" disabled={busy} onClick={() => setAdding(false)}>Not now</Button></div>}
    </Card>
  );

  const signedOut = mailboxes.filter((b) => b.google && !b.connected);
  const heard = arrived && (
    <p className={cx('text-[13px]', arrived.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{arrived.text}</p>
  );

  if (loaded && data && !data.status.connected) {
    return (
      <div className="space-y-4">
        {heard}
        {signedOut.map((b) => (
          <SignInAgain key={b.address} address={b.address} />
        ))}
        {connectForm(true)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {heard}
      {signedOut.map((b) => (
        <SignInAgain key={b.address} address={b.address} />
      ))}
      {adding && connectForm(false)}
      {many && (
        <div className="flex flex-wrap items-center gap-2">
          {[{ address: 'all' }, ...mailboxes].map((b) => (
            <button
              key={b.address}
              onClick={() => setWho(b.address)}
              className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition', who === b.address ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]')}
            >
              {b.address === 'all' ? 'Every mailbox' : b.address}
            </button>
          ))}
        </div>
      )}
      {mailboxes.filter((b) => b.error && b.connected).map((b) => (
        <p key={b.address} className="text-[13px] text-[#B42318]">{b.address} could not be read on the last pass: {b.error}</p>
      ))}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-[var(--cc-line)]">
          {piles.map((p) => (
            <button
              key={p.key}
              onClick={() => setPile(p.key)}
              className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold capitalize transition', pile === p.key ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]')}
            >
              {p.label} <span className="tabular-nums opacity-70">{p.count}</span>
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            {!many && data?.status.address && <Label>{data.status.address}</Label>}
            <Button kind="ghost" onClick={() => act({ action: 'sync' })} disabled={busy}>Check now</Button>
            {!adding && <Button kind="ghost" onClick={() => { setNote(null); setAdding(true); }} disabled={busy}>Add a mailbox</Button>}
          </span>
        </div>

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The mail desk did not load.</ErrorNote></div>
        ) : !loaded ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><Empty title="Nothing in this pile" note="When something lands that needs you, it shows here with a draft ready." /></div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {rows.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setOpen(m);
                    setDraft(m.draft ?? '');
                    setNote(null);
                  }}
                  className="w-full text-left px-5 py-3.5 hover:bg-[#FAFBFC]"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold">{m.from_name ?? m.from_addr}</p>
                      <p className="truncate text-[13.5px]">{m.subject ?? 'No subject'}</p>
                      <p className="truncate text-[12.5px] text-[var(--cc-muted)]">{m.summary ?? m.snippet ?? ''}</p>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1.5">
                      <span className="text-[12px] text-[var(--cc-muted)] whitespace-nowrap">{when(m.received_at)}</span>
                      {many && m.mailbox && <Badge>{m.mailbox.split('@')[0]}</Badge>}
                      {m.needs_reply && m.status === 'new' && <Badge tone="warn">Needs a reply</Badge>}
                      {m.category && <Badge>{m.category}</Badge>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.subject ?? 'Message'}
        footer={
          open && (
            <div className="flex flex-wrap gap-2">
              <Button kind="primary" disabled={busy || !draft.trim()} onClick={() => act({ action: 'send', id: open.id, text: draft }, () => setOpen(null))}>
                {busy ? 'Sending' : 'Send this reply'}
              </Button>
              <Button disabled={busy} onClick={() => act({ action: 'draft', id: open.id, text: draft })}>Save to drafts</Button>
              <Button disabled={busy} onClick={() => act({ action: 'done', id: open.id }, () => setOpen(null))}>Mark done</Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-4 text-[14px]">
            <div className="rounded-lg border border-[var(--cc-line)] px-4 py-3">
              <p className="font-semibold">{open.from_name ?? open.from_addr}</p>
              <p className="text-[12.5px] text-[var(--cc-muted)]">{open.from_addr} · {when(open.received_at)}{open.mailbox ? ` · to ${open.mailbox}` : ''}</p>
            </div>
            {open.summary && (
              <div>
                <Label>In one line</Label>
                <p className="mt-1.5 rounded-lg bg-[#FAFBFC] border border-[var(--cc-line)] px-4 py-3">{open.summary}</p>
              </div>
            )}
            <div>
              <Label>What they wrote</Label>
              <p className="mt-1.5 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--cc-line)] px-4 py-3 leading-relaxed">{open.body_text || open.snippet || 'No text.'}</p>
            </div>
            <div>
              <Label>Your reply</Label>
              <textarea className={cx(inputCls, 'mt-1.5 min-h-[180px] resize-y leading-relaxed')} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write, or edit the draft. Nothing sends until you press send." />
              <p className="mt-1 text-[12px] text-[var(--cc-muted)]">{open.mailbox ? `Sent from ${open.mailbox}, threaded under theirs.` : 'Sent from your own mailbox, as you.'}</p>
            </div>
            {note && <p className="text-[13px] text-[#B42318]">{note}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
