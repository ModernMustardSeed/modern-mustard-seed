'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, Eyebrow, Field, Notice, Skeleton, inputCls, ago } from './ui';

/**
 * THE INTEGRATIONS PANEL.
 *
 * Every connection a Factory needs, what it is for, who owns the account, and
 * the exact next action. A red row here always carries a button: Connect, Test,
 * or Reconnect. A status that tells an operator something is wrong without
 * telling them what to do about it is how a launch stalls for a week.
 *
 * Platform-owned connections take one click, because MMS already runs them.
 * Tenant-owned ones ask for the credential and say plainly why it has to be
 * theirs.
 */

export type IntegrationView = {
  provider: string;
  name: string;
  category: string;
  blurb: string;
  howToConnect: string;
  ownership: 'platform' | 'tenant';
  ownershipOptions: 'platform' | 'tenant' | 'either';
  secretLabel: string | null;
  configFields: Record<string, string>;
  buildable: boolean;
  buildSpec: string | null;
  required: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'expired' | 'not_connected';
  detail: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  needsReconnect: boolean;
};

const LABEL: Record<IntegrationView['status'], string> = {
  connected: 'connected',
  error: 'error',
  expired: 'expired',
  disconnected: 'disconnected',
  not_connected: 'not connected',
};

export default function FactoryIntegrations({ factoryId, onChange }: { factoryId: string; onChange?: () => void }) {
  const [views, setViews] = useState<IntegrationView[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSecret, setOpenSecret] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/factories/${factoryId}/integrations`);
    if (res.ok) {
      const json = await res.json();
      setViews(json.views ?? []);
      setMissing(json.missing ?? []);
    }
    setLoaded(true);
  }, [factoryId]);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(
    async (body: Record<string, unknown>, label: string) => {
      setBusy(label);
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(`/api/admin/factories/${factoryId}/integrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        setViews(json.views ?? []);
        setMissing(json.missing ?? []);
        if (json.outcome) {
          const { connected, needsCustomer, failed } = json.outcome as {
            connected: { provider: string }[]; needsCustomer: string[]; failed: { provider: string; detail: string }[];
          };
          const parts = [
            connected.length ? `Connected ${connected.map((c) => c.provider).join(', ')}.` : '',
            failed.length ? `Could not connect ${failed.map((f) => `${f.provider} (${f.detail})`).join('; ')}.` : '',
            needsCustomer.length ? `Still needs the customer: ${needsCustomer.join(', ')}.` : '',
          ].filter(Boolean);
          const line = parts.join(' ') || 'Nothing left for the platform to connect.';
          if (failed.length) setError(line); else setNotice(line);
        } else if (json.result) {
          const result = json.result as { ok: boolean; detail: string };
          if (result.ok) setNotice(result.detail); else setError(result.detail);
        }
        setSecret('');
        setOpenSecret(null);
        onChange?.();
      } catch {
        setError('That did not work. Try again, or check the provider directly.');
      } finally {
        setBusy(null);
      }
    },
    [factoryId, onChange],
  );

  const platformFixable = views.filter((v) => v.required && v.status !== 'connected' && v.buildable && v.ownership === 'platform');
  const connected = views.filter((v) => v.status === 'connected').length;

  return (
    <Card
      eyebrow="Connections"
      title="Integrations"
      right={
        <>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#5C5850]">
            {connected} of {views.length} connected
          </span>
          {platformFixable.length > 0 && (
            <Button size="sm" tone="primary" onClick={() => void act({ action: 'auto_connect' }, 'auto')} disabled={busy !== null}>
              {busy === 'auto' ? 'Connecting' : `Connect the ${platformFixable.length} we provide`}
            </Button>
          )}
        </>
      }
    >
      {notice && <div className="mb-4"><Notice kind="good">{notice}</Notice></div>}
      {error && <div className="mb-4"><Notice kind="bad">{error}</Notice></div>}

      {!loaded && <Skeleton rows={3} />}
      {loaded && views.length === 0 && (
        <Empty title="Nothing to connect">This blueprint composes no module that needs an outside account.</Empty>
      )}

      <ul className="space-y-3">
        {views.map((v) => {
          const ok = v.status === 'connected';
          return (
            <li
              key={v.provider}
              className={`rounded-xl border-2 p-4 ${ok ? 'border-[#12502B] bg-[#F4FBF6]' : v.required ? 'border-[#8E1007] bg-[#FFF7F6]' : 'border-[#161616]/25 bg-white'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold tracking-tight text-[#161616]">{v.name}</h3>
                    <Badge tone={v.status}>{LABEL[v.status]}</Badge>
                    {v.required && <Badge tone="required">required</Badge>}
                    <Badge tone="draft">{v.ownership === 'platform' ? 'we provide it' : 'their account'}</Badge>
                  </div>
                  <p className="font-body text-[14px] text-[#3A362D] mt-1 leading-snug">{v.blurb}</p>
                  {v.detail && (
                    <p className={`font-body text-[14px] mt-1.5 leading-snug ${ok ? 'text-[#12502B]' : 'text-[#8E1007]'}`}>{v.detail}</p>
                  )}
                  {!ok && <p className="font-body text-[13px] text-[#5C5850] mt-1.5 leading-snug">{v.howToConnect}</p>}
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850] mt-2">
                    {v.lastSuccessAt ? `last worked ${ago(v.lastSuccessAt)}` : 'never connected'}
                    {v.lastErrorAt ? ` · last failed ${ago(v.lastErrorAt)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {!v.buildable ? (
                    <Badge tone="proposed">needs development</Badge>
                  ) : (
                    <>
                      {ok && (
                        <Button size="sm" onClick={() => void act({ action: 'test', provider: v.provider }, v.provider)} disabled={busy !== null}>
                          {busy === v.provider ? 'Testing' : 'Test'}
                        </Button>
                      )}
                      {!ok && v.ownership === 'platform' && (
                        <Button size="sm" tone="primary" onClick={() => void act({ action: 'connect', provider: v.provider, ownership: 'platform' }, v.provider)} disabled={busy !== null}>
                          {busy === v.provider ? 'Connecting' : v.needsReconnect ? 'Reconnect' : 'Connect'}
                        </Button>
                      )}
                      {v.secretLabel && (
                        <Button size="sm" onClick={() => setOpenSecret(openSecret === v.provider ? null : v.provider)} disabled={busy !== null}>
                          {v.ownership === 'tenant' && ok ? 'Replace key' : 'Use their key'}
                        </Button>
                      )}
                      {ok && (
                        <Button size="sm" tone="ghost" onClick={() => void act({ action: 'disconnect', provider: v.provider }, v.provider)} disabled={busy !== null}>
                          Disconnect
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {openSecret === v.provider && v.secretLabel && (
                <div className="mt-4 pt-4 border-t-2 border-[#161616]/12 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[16rem]">
                    <Field label={v.secretLabel} hint="Stored encrypted. It is never shown again, never returned by the API, and never reaches a log.">
                      <input className={inputCls} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} />
                    </Field>
                  </div>
                  <Button
                    tone="primary"
                    onClick={() => void act({ action: 'connect', provider: v.provider, ownership: 'tenant', secret }, v.provider)}
                    disabled={busy !== null || secret.trim().length < 8}
                    title={secret.trim().length < 8 ? 'Paste the key first' : undefined}
                  >
                    Save and test
                  </Button>
                  <Button tone="ghost" onClick={() => { setOpenSecret(null); setSecret(''); }}>Cancel</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {missing.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <Eyebrow>Still open</Eyebrow>
          <p className="font-body text-[13px] text-[#3A362D]">
            {missing.length} required connection{missing.length === 1 ? '' : 's'} left. Activation stays blocked until every one is green.
          </p>
        </div>
      )}
    </Card>
  );
}
