'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Drawer, Empty, ErrorNote, Field, Label, Skeleton, cx, inputCls, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE MAIL DESK. Read twice an hour, sorted into the eight piles a business
 * actually has, with a reply already written where one is needed. Nothing is
 * sent, filed or deleted without a person pressing the button: the draft sits
 * there, editable, until they do.
 */

type MailItem = {
  id: string;
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
type Status = { connected: boolean; address: string | null; lastSyncAt: string | null; error: string | null };
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

  const items = data?.items ?? [];
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

  if (loaded && data && !data.status.connected) {
    return (
      <Card>
        <CardHead title="Connect your mailbox" hint="Read twice an hour, sorted into piles, with a reply drafted in your voice. Nothing is ever sent without your click." />
        <ol className="mb-4 space-y-1.5 text-[13.5px] text-[var(--cc-muted)] list-decimal pl-5">
          <li>In your Google account, turn on 2-Step Verification.</li>
          <li>Open Security, then App passwords, and name it &quot;Mail&quot;.</li>
          <li>Paste the 16 letters Google shows you, with the address, below.</li>
        </ol>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Address"><input className={inputCls} value={connect.address} onChange={(e) => setConnect({ ...connect, address: e.target.value })} placeholder="you@yourdomain.com" /></Field>
          <Field label="App password" hint="Not your normal password. Revoke it any time."><input className={inputCls} value={connect.appPassword} onChange={(e) => setConnect({ ...connect, appPassword: e.target.value })} placeholder="abcd efgh ijkl mnop" /></Field>
        </div>
        {note && <p className="mt-3 text-[13px] text-[#B42318]">{note}</p>}
        <div className="mt-4">
          <Button kind="primary" disabled={busy || !connect.address || !connect.appPassword} onClick={() => act({ action: 'connect', ...connect })}>
            {busy ? 'Connecting' : 'Connect the mailbox'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
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
            {data?.status.address && <Label>{data.status.address}</Label>}
            <Button kind="ghost" onClick={() => act({ action: 'sync' })} disabled={busy}>Check now</Button>
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
              <p className="text-[12.5px] text-[var(--cc-muted)]">{open.from_addr} · {when(open.received_at)}</p>
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
              <p className="mt-1 text-[12px] text-[var(--cc-muted)]">Sent from your own mailbox, as you.</p>
            </div>
            {note && <p className="text-[13px] text-[#B42318]">{note}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
