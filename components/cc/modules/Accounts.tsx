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
type Check = { platform: string; ok: boolean; account: string | null; error: string | null; fix: string | null; at: string };

const FEED_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google Business Profile', houzz: 'Houzz' };
const FEED_OPEN: Record<string, string> = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', linkedin: 'https://www.linkedin.com/', x: 'https://x.com/', gbp: 'https://business.google.com/', houzz: 'https://pro.houzz.com/' };

/**
 * THE EXACT CLICKS. Written down because the alternative is remembering them
 * at 9pm on the day a client asks why nothing posted, and because a step that
 * lives only in somebody's head is a step that gets skipped. These are the
 * studio's own steps: they appear when Sarah is looking as the client, and the
 * owner never sees them, because none of this is the owner's job.
 */
const STEPS: Record<string, { title: string; steps: string[]; where?: { label: string; href: string } }> = {
  facebook: {
    title: 'Getting a Page token',
    where: { label: 'Graph API Explorer', href: 'https://developers.facebook.com/tools/explorer/' },
    steps: [
      'Sign in to Facebook as someone with a Page role on their Page.',
      'Open the Graph API Explorer and pick the Meta app at the top.',
      'Change "User or Page" to Page access token, then pick their Page.',
      'In Permissions tick pages_manage_posts, pages_read_engagement and pages_show_list.',
      'Press Generate Access Token and approve the prompt.',
      'Paste the token below. The Page, and any Instagram account linked to it, both connect from that one paste.',
    ],
  },
  instagram: {
    title: 'Instagram rides on the Page',
    steps: [
      'Instagram has no separate connection. It must be a Business or Creator account and it must be linked to their Facebook Page.',
      'Check the link in Meta Business Suite, Settings, Accounts, Instagram accounts.',
      'Connect the Facebook Page here and Instagram connects with it.',
    ],
  },
  x: {
    title: 'Getting X tokens',
    where: { label: 'X developer portal', href: 'https://developer.x.com/en/portal/dashboard' },
    steps: [
      'The Connect button works as soon as X_OAUTH2_CLIENT_ID and X_OAUTH2_CLIENT_SECRET are on the production environment.',
      'Until then: in the developer portal open the app, User authentication settings, and generate OAuth 2.0 tokens for their account.',
      'Scopes needed: tweet.read, tweet.write, users.read, media.write and offline.access.',
      'offline.access is what gives a refresh token. Without it the connection dies two hours after it is made.',
      'Paste both tokens below.',
    ],
  },
  linkedin: {
    title: 'Getting a company page token',
    where: { label: 'LinkedIn developers', href: 'https://www.linkedin.com/developers/apps' },
    steps: [
      'The Connect button works as soon as LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are on the production environment and Community Management access is granted.',
      'Community Management takes weeks to be granted, so until then a page admin can generate a token in the developer console.',
      'Products needed: Share on LinkedIn and Community Management API. Scopes: w_organization_social and r_organization_social.',
      'The company page id is the number in the page admin URL, for example linkedin.com/company/12345678/admin.',
      'Paste the token and that number below.',
    ],
  },
  gbp: {
    title: 'Google Business Profile',
    steps: [
      'Connect the Google account that manages the profile with the Connect Google button.',
      'Then pick which profile posts go to, if they have more than one.',
      'Posting by API waits on Google approving Business Profile API access for our project. Until then every Google post goes on the hand-post sheet and is posted from inside the profile.',
    ],
  },
  houzz: {
    title: 'Houzz',
    steps: ['Houzz has no posting API at all. Every Houzz post goes on the sheet and takes a minute by hand. There is nothing to connect and nothing that will change that.'],
  },
};

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
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [steps, setSteps] = useState<string | null>(null);

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

  /**
   * Ask the platform itself, right now. A stored green check only means a
   * token was accepted once; this is the only thing that answers "will it
   * post at nine tomorrow". It reads and never posts.
   */
  const check = useCallback(async (platform?: string) => {
    setChecking(platform ?? 'all');
    try {
      const r = await fetch('/api/cc/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'check', platform: platform ?? null }),
      });
      const j = (await r.json()) as { checks?: Check[] };
      if (j.checks?.length) {
        setChecks((prev) => {
          const next = { ...prev };
          for (const c of j.checks ?? []) next[c.platform] = c;
          return next;
        });
      }
      void load();
    } catch {
      /* the row keeps the state it had; nothing is claimed that was not proved */
    } finally {
      setChecking(null);
    }
  }, [load]);

  const google = (integrations ?? []).find((i) => i.provider === 'google' && i.status === 'connected');
  const preview = session.preview;
  const client = session.email;

  // Studio-side connections. The feed pastes go through the Command Center's
  // own route, which gates them on the look pass; the mailbox and Buildertrend
  // still go through the admin desk route that owns those connections. The
  // owner never sees any of these forms.
  const desk = async (action: string, body: Record<string, string>): Promise<string> => {
    const feed = ['facebook-token', 'x-tokens', 'linkedin-token'].includes(action);
    const url = feed ? '/api/cc/connections' : `/api/admin/posting?client=${encodeURIComponent(client)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; page?: { name: string }; instagram?: { username: string | null } | null; username?: string; organization?: string; fetched?: number; captcha?: boolean };
    if (!r.ok || j.error) return j.error ?? 'That did not take.';
    void load();
    if (action === 'facebook-token') {
      void check('facebook');
      return `Connected ${j.page?.name ?? 'the Page'}${j.instagram ? ` and Instagram @${j.instagram.username ?? ''}` : ''}.`;
    }
    if (action === 'x-tokens') {
      void check('x');
      return `Connected @${j.username ?? ''}.`;
    }
    if (action === 'linkedin-token') {
      void check('linkedin');
      return `Connected ${j.organization ?? 'the company page'}.`;
    }
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

  type Row = { key: string; name: string; state: State; detail: string; open?: string; action?: { label: string; href: string } | null; paste?: React.ReactNode; disconnect?: () => Promise<void>; feed?: boolean };

  const feed = (p: string) => (feeds ?? []).find((f) => f.provider === p);
  const feedState = (f: Feed | undefined): State => (!f ? 'off' : f.manualOnly ? 'manual' : f.status === 'error' ? 'warn' : f.connected ? 'on' : 'off');

  const rows: Row[] = [
    {
      key: 'mail',
      name: 'Your mailboxes',
      state: session.state.mailConnected ? 'on' : 'off',
      detail: session.state.mailConnected
        ? 'Every connected mailbox is read twice an hour and sorted, with a reply drafted where one is needed. A reply leaves from the mailbox the message came to. Nothing sends without your click. Add the next mailbox below.'
        : 'Connect each mailbox once and every email is read, sorted and answered in draft from here. A mailbox on your own domain takes its own password; a Gmail address takes an app password from Google.',
      paste: (
        <Paste
          label={session.state.mailConnected ? 'Add a mailbox' : 'Connect a mailbox'}
          fields={[
            { key: 'address', label: 'Email address' },
            { key: 'appPassword', label: 'Password', secret: true, hint: 'Your own domain: the mailbox password. Gmail: Security, App passwords, sixteen letters.' },
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
      key: 'gbp',
      name: 'Google Business Profile',
      feed: true,
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
        feed: true,
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
          ) : preview && st !== 'on' && p === 'linkedin' && !canOauth ? (
            <Paste
              label="Connect the company page"
              fields={[
                { key: 'access', label: 'Access token', secret: true },
                { key: 'organization', label: 'Company page id', hint: 'The number in linkedin.com/company/NUMBER/admin.' },
              ]}
              submit={(v) => desk('linkedin-token', v)}
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={connected === countable ? 'good' : 'plain'}>
              {connected} of {countable} connected
            </Badge>
            {/* A stored green check only says a key was accepted once. This
                asks every platform whether it still works, today, without
                posting anything to a real feed. */}
            <Button onClick={() => check()} disabled={checking !== null}>{checking === 'all' ? 'Checking' : 'Check them all'}</Button>
          </div>
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
                    {/* Their own history, brought home. Only offered where a
                        connection can actually read it back. */}
                    {r.feed && r.state === 'on' && (r.key === 'facebook' || r.key === 'instagram') && (
                      <Button
                        onClick={async () => {
                          setChecking(r.key);
                          try {
                            const res = await fetch('/api/cc/connections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'import-history', platform: r.key }) });
                            const j = (await res.json()) as { ok?: boolean; said?: string; error?: string };
                            setChecks((prev) => ({ ...prev, [r.key]: { platform: r.key, ok: Boolean(j.ok), account: null, error: j.error ?? null, fix: null, at: new Date().toISOString() } }));
                            if (j.said) setChecks((prev) => ({ ...prev, [r.key]: { ...prev[r.key], ok: true, account: j.said ?? null } }));
                          } finally {
                            setChecking(null);
                          }
                        }}
                        disabled={checking !== null}
                        title="Pull everything this account has ever posted into your own archive. Nothing is posted or changed."
                      >
                        {checking === r.key ? 'Bringing it in' : 'Bring the history in'}
                      </Button>
                    )}
                    {r.feed && r.state !== 'manual' && (
                      <Button onClick={() => check(r.key)} disabled={checking !== null} title="Ask the platform whether this connection still works. Nothing is posted.">
                        {checking === r.key ? 'Checking' : 'Check it'}
                      </Button>
                    )}
                    {r.open && <Button href={r.open}>Open {r.name.replace(/^Your /, '')}</Button>}
                    {r.disconnect && <Button kind="ghost" onClick={r.disconnect}>Disconnect</Button>}
                  </div>
                </div>
                {checks[r.key] && (
                  <div className={cx('mt-2 ml-5 rounded-lg border px-3 py-2 text-[13px]', checks[r.key].ok ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]' : 'border-[#FDA29B] bg-[#FFFBFA] text-[#B42318]')}>
                    {checks[r.key].ok
                      ? `Checked just now: posting as ${checks[r.key].account ?? 'this account'}.`
                      : `Checked just now: ${checks[r.key].error}`}
                    {checks[r.key].fix && !checks[r.key].ok && <span className="mt-1 block text-[var(--cc-muted)]">{checks[r.key].fix}</span>}
                  </div>
                )}
                {preview && STEPS[r.key] && (
                  <div className="mt-2 ml-5">
                    <button onClick={() => setSteps(steps === r.key ? null : r.key)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)] underline hover:text-[var(--cc-ink)]">
                      {steps === r.key ? 'Hide the steps' : STEPS[r.key].title}
                    </button>
                    {steps === r.key && (
                      <div className="mt-2 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
                        <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-[var(--cc-ink)]">
                          {STEPS[r.key].steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                        {STEPS[r.key].where && (
                          <div className="mt-3">
                            <Button href={STEPS[r.key].where!.href}>Open the {STEPS[r.key].where!.label}</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
