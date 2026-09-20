'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * WHAT THIS RUNS ON. Every account, whether it is connected, and the one
 * thing to do where it is not. We hold a revocable key for each, never a
 * password, and the disconnect button is on the same screen as the connect
 * button, which is the only honest way to show it.
 */

type Integration = { provider: string; account_email: string | null; account_name: string | null; status: string; error: string | null; scopes: string[] };
type Domain = { domain: string; expires_on: string | null; status: string; role?: string | null; registrar?: string | null };

export default function Accounts({ session }: { session: Session }) {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [available, setAvailable] = useState(false);
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [i, d] = await Promise.all([fetch('/api/portal/integrations', { cache: 'no-store' }), fetch('/api/portal/domains', { cache: 'no-store' })]);
      const ij = (await i.json()) as { integrations: Integration[]; available: boolean };
      const dj = (await d.json()) as { domains: Domain[] };
      setIntegrations(ij.integrations ?? []);
      setAvailable(Boolean(ij.available));
      setDomains(dj.domains ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const google = (integrations ?? []).find((i) => i.provider === 'google' && i.status === 'connected');

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

  const rows = [
    {
      key: 'google',
      name: 'Google Business Profile',
      state: google ? 'on' : 'off',
      detail: google ? `Connected as ${google.account_email ?? 'your Google account'}. Reviews, hours and posts are handled from here.` : 'Sign in with the Google account that manages your profile. We hold a key you can revoke any time, never your password.',
      action: google ? null : available ? { label: 'Connect Google', href: '/api/oauth/google/start' } : null,
      blocked: !google && !available ? 'Connecting is not switched on yet. Nothing for you to do.' : null,
    },
    {
      key: 'mail',
      name: 'Mailbox',
      state: session.state.mailConnected ? 'on' : 'off',
      detail: session.state.mailConnected ? 'Read twice an hour, sorted, with replies drafted. Nothing sends without your click.' : 'Connect it in the Inbox with an app password. Two minutes, once.',
      action: session.state.mailConnected ? null : { label: 'Open the Inbox', href: '#inbox' },
      blocked: null,
    },
    ...(session.state.crm === 'buildertrend'
      ? [
          {
            key: 'crm',
            name: 'Buildertrend',
            state: session.state.crmConnected ? (session.state.crmCaptcha ? 'warn' : 'on') : 'off',
            detail: session.state.crmConnected
              ? session.state.crmCaptcha
                ? 'Connected, but Buildertrend runs a hidden captcha on their contact form and refuses a lead sent from anywhere but their own page. Ask their support to exempt your Lead Contact Form. Until then every lead is here and in your inbox.'
                : 'Connected. Every website lead becomes a Lead Opportunity in your pipeline.'
              : 'Paste your Lead Contact Form embed and every website lead lands in your pipeline.',
            action: { label: 'Open Buildertrend', href: 'https://buildertrend.net' },
            blocked: null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <Card pad={false}>
        <div className="px-5 py-4 border-b border-[var(--cc-line)]">
          <h3 className="font-display text-[19px]">Connections</h3>
          <p className="mt-1 text-[13px] text-[var(--cc-muted)]">A key we hold, never a password. Revoke any of them whenever you like.</p>
        </div>
        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The connections did not load.</ErrorNote></div>
        ) : !integrations ? (
          <div className="p-5"><Skeleton rows={3} /></div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {rows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[15px] font-semibold">
                    {r.name}
                    {r.state === 'on' ? <Badge tone="good">Connected</Badge> : r.state === 'warn' ? <Badge tone="warn">Needs a look</Badge> : <Badge>Not connected</Badge>}
                  </p>
                  <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-[var(--cc-muted)]">{r.detail}</p>
                  {r.blocked && <p className="mt-1 text-[12.5px] text-[var(--cc-muted)]">{r.blocked}</p>}
                </div>
                <div className="flex flex-none items-center gap-2">
                  {r.action && <Button href={r.action.href}>{r.action.label}</Button>}
                  {r.key === 'google' && google && (
                    <Button
                      onClick={async () => {
                        await fetch('/api/portal/integrations', { method: 'DELETE' });
                        void load();
                      }}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHead title="Ask for a change" hint="It goes straight to Sarah. Changes to what we built are included, always." />
          {sent ? (
            <div className="rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-[13.5px] text-[#067647]">
              Sent. Sarah has it, and you will hear back today.
              <button className="ml-2 underline" onClick={() => setSent(false)}>Send another</button>
            </div>
          ) : (
            <>
              <textarea className={cx(inputCls, 'min-h-[120px] resize-y leading-relaxed')} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Swap the photo at the top of the Whitefish page for the one of the lake house at dusk." />
              <div className="mt-3">
                <Button kind="primary" onClick={ask} disabled={busy || message.trim().length < 4}>{busy ? 'Sending' : 'Send to Sarah'}</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <CardHead title="This account" />
        <dl className="grid sm:grid-cols-3 gap-3 text-[14px]">
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
        <p className="mt-3 text-[12.5px] text-[var(--cc-muted)]">Signing out here does not sign you out of your portal. They are two doors.</p>
      </Card>
    </div>
  );
}
