'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Card, CardHead, Field, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';

/**
 * EVERYTHING THIS RUNS ON, in one place. Every account the desk reaches into,
 * whether it is connected, and the one thing to do where it is not. We hold a
 * revocable key for each, never a password, and the disconnect button is on
 * the same screen as the connect button, which is the only honest way to
 * show it.
 *
 * Two readers. The owner sees a plain state and a button they can press
 * themselves. Sarah, looking as the owner, also sees the studio-side pastes
 * (a Page token, an app password, the Buildertrend embed) so wiring a client
 * up is done on this screen and nowhere else.
 */

type Integration = { provider: string; account_email: string | null; account_name: string | null; status: string; error: string | null; scopes: string[] };
type Feed = { provider: string; connected: boolean; status: string; accountName: string | null; error: string | null; manualOnly: boolean; needs: string | null };
type State = 'on' | 'off' | 'warn' | 'manual';

const FEED_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google Business Profile', houzz: 'Houzz' };
const FEED_OPEN: Record<string, string> = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', linkedin: 'https://www.linkedin.com/', x: 'https://x.com/', gbp: 'https://business.google.com/', houzz: 'https://pro.houzz.com/' };

function Dot({ state }: { state: State }) {
  const cls = state === 'on' ? 'bg-[#12B76A]' : state === 'warn' ? 'bg-[#F79009]' : state === 'manual' ? 'bg-[#98A2B3]' : 'bg-[var(--cc-line)]';
  return <span className={cx('inline-block h-2.5 w-2.5 flex-none rounded-full', cls)} aria-hidden="true" />;
}

function StateBadge({ state }: { state: State }) {
  if (state === 'on') return <Badge tone="good">Connected</Badge>;
  if (state === 'warn') return <Badge tone="warn">Needs a look</Badge>;
  if (state === 'manual') return <Badge>By hand</Badge>;
  return <Badge>Not connected</Badge>;
}

/** A small form that posts one action and reports the answer in a sentence. */
function Paste({ fields, submit, label }: { fields: Array<{ key: string; label: string; hint?: string; secret?: boolean }>; submit: (v: Record<string, string>) => Promise<string>; label: string }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="mt-3 rounded-lg border border-dashed border-[var(--cc-line)] bg-[#FAFBFC] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <input className={inputCls} type={f.secret ? 'password' : 'text'} autoComplete="off" value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
      {note && <p className="mt-2 text-[13px] text-[var(--cc-ink)]">{note}</p>}
      <div className="mt-3">
        <Button
          kind="primary"
          disabled={busy || fields.some((f) => !(v[f.key] ?? '').trim())}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            try {
              setNote(await submit(v));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Checking' : label}
        </Button>
      </div>
    </div>
  );
}

export default function Accounts({ session }: { session: Session }) {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [available, setAvailable] = useState(false);
  const [feeds, setFeeds] = useState<Feed[] | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [i, p] = await Promise.all([fetch('/api/portal/integrations', { cache: 'no-store' }), fetch('/api/portal/posting', { cache: 'no-store' })]);
      const ij = (await i.json()) as { integrations: Integration[]; available: boolean };
      const pj = (await p.json()) as { accounts?: Feed[] };
      setIntegrations(ij.integrations ?? []);
      setAvailable(Boolean(ij.available));
      setFeeds(pj.accounts ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const google = (integrations ?? []).find((i) => i.provider === 'google' && i.status === 'connected');
  const preview = session.preview;
  const client = session.email;

  // Studio-side connections are made through the desk route, which only an
  // admin session can reach. The owner never sees these forms.
  const desk = async (action: string, body: Record<string, string>): Promise<string> => {
    const r = await fetch(`/api/admin/posting?client=${encodeURIComponent(client)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; page?: { name: string }; instagram?: { username: string | null } | null; username?: string; fetched?: number; captcha?: boolean };
    if (!r.ok || j.error) return j.error ?? 'That did not take.';
    void load();
    if (action === 'facebook-token') return `Connected ${j.page?.name ?? 'the Page'}${j.instagram ? ` and Instagram @${j.instagram.username ?? ''}` : ''}.`;
    if (action === 'x-tokens') return `Connected @${j.username ?? ''}.`;
    if (action === 'mailbox') return `Connected. ${j.fetched ?? 0} messages read on the first pass.`;
    if (action === 'buildertrend-embed') return j.captcha ? 'Connected, but the form has a captcha on. Leads will be refused until Buildertrend turns it off.' : 'Connected.';
    return 'Done.';
  };

  const own = async (path: string, body: Record<string, string>): Promise<string> => {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; captcha?: boolean };
    if (!r.ok || j.error) return j.error ?? 'That did not take.';
    void load();
    return j.captcha ? 'Connected, but the form has a captcha on. Leads will be refused until Buildertrend turns it off.' : 'Connected.';
  };

  const ask = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/portal/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: message }) });
      if (r.ok) {
        setSent(true);
        setMessage('');
      }
    } finally {
      setBusy(false);
    }
  };

  type Row = { key: string; name: string; state: State; detail: string; open?: string; action?: { label: string; href: string } | null; paste?: React.ReactNode; disconnect?: () => Promise<void> };

  const feed = (p: string) => (feeds ?? []).find((f) => f.provider === p);
  const feedState = (f: Feed | undefined): State => (!f ? 'off' : f.manualOnly ? 'manual' : f.status === 'error' ? 'warn' : f.connected ? 'on' : 'off');

  const rows: Row[] = [
    {
      key: 'mail',
      name: 'Your mailbox',
      state: session.state.mailConnected ? 'on' : 'off',
      detail: session.state.mailConnected
        ? 'Read twice an hour and sorted, with a reply drafted where one is needed. Replies send from this mailbox, as you. Nothing sends without your click.'
        : 'Connect it once with an app password from your Google account and every email is read, sorted and answered in draft from here.',
      open: 'https://mail.google.com/',
      paste: session.state.mailConnected ? undefined : (
        <Paste
          label="Connect the mailbox"
          fields={[
            { key: 'address', label: 'Gmail address' },
            { key: 'appPassword', label: 'App password', secret: true, hint: 'Google account, Security, App passwords. Sixteen letters.' },
          ]}
          submit={(v) => (preview ? desk('mailbox', v) : own('/api/portal/mail', { action: 'connect', ...v }))}
        />
      ),
    },
    ...(session.state.crm === 'buildertrend'
      ? [
          {
            key: 'crm',
            name: 'Buildertrend',
            state: (session.state.crmConnected ? (session.state.crmCaptcha ? 'warn' : 'on') : 'off') as State,
            detail: session.state.crmConnected
              ? session.state.crmCaptcha
                ? 'Connected, and every lead is being refused: Buildertrend runs a captcha on your Lead Contact Form. Turn it off in Buildertrend, or ask their support to exempt the form. Every lead is safe here and in your email meanwhile.'
                : 'Connected. Every website lead becomes a Lead Opportunity in your pipeline the moment it arrives.'
              : 'Paste your Lead Contact Form embed once and every website lead lands in your pipeline.',
            open: 'https://buildertrend.net/app/login',
            paste: session.state.crmConnected ? undefined : (
              <Paste
                label="Connect Buildertrend"
                fields={[{ key: 'embed', label: 'Lead Contact Form embed', hint: 'Buildertrend, Leads, Contact Form, Embed. Paste the whole thing.' }]}
                submit={(v) => (preview ? desk('buildertrend-embed', v) : own('/api/portal/integrations/buildertrend', v))}
              />
            ),
          } satisfies Row,
        ]
      : []),
    {
      key: 'google',
      name: 'Google Business Profile',
      state: google ? 'on' : 'off',
      detail: google
        ? `Connected as ${google.account_email ?? 'your Google account'}. Reviews, hours, photos and posts run from here.`
        : available
          ? 'Sign in once with the Google account that manages your profile. We hold a key you can revoke any time, never a password.'
          : 'Being wired from our side. Nothing for you to do yet.',
      open: FEED_OPEN.gbp,
      action: google || !available ? null : { label: 'Connect Google', href: '/api/oauth/google/start' },
      disconnect: google
        ? async () => {
            await fetch('/api/portal/integrations', { method: 'DELETE' });
            void load();
          }
        : undefined,
    },
    ...(['facebook', 'instagram', 'x', 'linkedin', 'houzz'] as const).map((p): Row => {
      const f = feed(p);
      const st = feedState(f);
      const oauth = p === 'x' ? '/api/oauth/x/start' : p === 'linkedin' ? '/api/oauth/linkedin/start' : null;
      const canOauth = Boolean(oauth) && !f?.needs;
      return {
        key: p,
        name: FEED_LABEL[p],
        state: st,
        detail: f?.manualOnly
          ? 'Houzz has no door for software. Each post goes on the sheet we send, and you post it by hand in a minute.'
          : st === 'on'
            ? `Connected as ${f?.accountName ?? 'your account'}. Posts go out here at the hour this feed rewards.`
            : st === 'warn'
              ? (f?.error ?? 'The connection needs a fresh sign-in.')
              : p === 'instagram'
                ? 'Comes with Facebook. Connect the Facebook Page and the Instagram account linked to it connects too.'
                : canOauth
                  ? 'Sign in once and posts go out here on their own.'
                  : 'Being wired from our side. Nothing for you to do yet.',
        open: FEED_OPEN[p],
        action: st !== 'on' && canOauth && oauth ? { label: `Connect ${FEED_LABEL[p]}`, href: oauth } : null,
        paste:
          preview && st !== 'on' && p === 'facebook' ? (
            <Paste label="Connect the Page" fields={[{ key: 'token', label: 'Page access token', secret: true, hint: 'Graph API Explorer, their Page, a long-lived Page token.' }]} submit={(v) => desk('facebook-token', v)} />
          ) : preview && st !== 'on' && p === 'x' && !canOauth ? (
            <Paste
              label="Connect X"
              fields={[
                { key: 'access', label: 'Access token', secret: true },
                { key: 'refresh', label: 'Refresh token', secret: true, hint: 'From the X developer portal, OAuth 2.0 with offline access.' },
              ]}
              submit={(v) => desk('x-tokens', v)}
            />
          ) : undefined,
        disconnect:
          st === 'on' && !f?.manualOnly
            ? async () => {
                await fetch('/api/portal/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'disconnect', platform: p }) });
                void load();
              }
            : undefined,
      };
    }),
  ];

  const connected = rows.filter((r) => r.state === 'on').length;
  const countable = rows.filter((r) => r.state !== 'manual').length;

  return (
    <div className="space-y-5">
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cc-line)] px-5 py-4">
          <div>
            <h3 className="font-display text-[19px]">Connections</h3>
            <p className="mt-1 text-[13px] text-[var(--cc-muted)]">A key we hold, never a password. Revoke any of them whenever you like.</p>
          </div>
          <Badge tone={connected === countable ? 'good' : 'plain'}>
            {connected} of {countable} connected
          </Badge>
        </div>
        {error ? (
          <div className="p-5 text-[13.5px] text-[var(--cc-muted)]">
            The connections did not load. <button className="underline" onClick={load}>Try again</button>
          </div>
        ) : !integrations || !feeds ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {rows.map((r) => (
              <li key={r.key} className="px-5 py-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1 basis-[280px]">
                    <p className="flex items-center gap-2.5 text-[15px] font-semibold">
                      <Dot state={r.state} />
                      {r.name}
                      <StateBadge state={r.state} />
                    </p>
                    <p className="mt-1.5 max-w-2xl pl-5 text-[13.5px] leading-relaxed text-[var(--cc-muted)]">{r.detail}</p>
                  </div>
                  <div className="flex flex-none flex-wrap items-center gap-2">
                    {r.action && <Button kind="primary" href={r.action.href}>{r.action.label}</Button>}
                    {r.open && <Button href={r.open}>Open {r.name.replace(/^Your /, '')}</Button>}
                    {r.disconnect && <Button kind="ghost" onClick={r.disconnect}>Disconnect</Button>}
                  </div>
                </div>
                {r.paste && <div className="pl-5">{r.paste}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="Ask for a change" hint="It goes straight to Sarah. Changes to what we built are included, always." />
          {sent ? (
            <div className="rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-[13.5px] text-[#067647]">
              Sent. Sarah has it, and you will hear back today.
              <button className="ml-2 underline" onClick={() => setSent(false)}>Send another</button>
            </div>
          ) : (
            <>
              <textarea id="cc-ask-change" className={cx(inputCls, 'min-h-[120px] resize-y leading-relaxed')} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Swap the photo at the top of the Whitefish page for the one I sent Tuesday." />
              <div className="mt-3">
                <Button kind="primary" onClick={ask} disabled={busy || message.trim().length < 4}>{busy ? 'Sending' : 'Send to Sarah'}</Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHead title="This account" />
          <dl className="grid gap-3 text-[14px]">
            <div className="rounded-lg border border-[var(--cc-line)] px-4 py-3">
              <dt><Label>Signed in as</Label></dt>
              <dd className="mt-1 break-words">{session.email}</dd>
            </div>
            <div className="rounded-lg border border-[var(--cc-line)] px-4 py-3">
              <dt><Label>Business</Label></dt>
              <dd className="mt-1">{session.brand.business}</dd>
            </div>
            <div className="rounded-lg border border-[var(--cc-line)] px-4 py-3">
              <dt><Label>Website</Label></dt>
              <dd className="mt-1">
                <a href={session.brand.siteUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--cc-accent)] hover:underline">
                  {session.brand.siteUrl.replace('https://', '')}
                </a>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12.5px] text-[var(--cc-muted)]">One sign-in opens this and your project portal. Signing out here signs you out of both.</p>
        </Card>
      </div>
    </div>
  );
}
