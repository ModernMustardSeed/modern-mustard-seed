'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, Field, inputCls, ago } from './ui';

/**
 * THE INTEGRATIONS PANEL.
 *
 * Every connection a Factory needs, what it is for, who owns the account, and
 * the exact next action. A red row here always has a button on it: connect,
 * test, or reconnect. A status that tells an operator something is wrong
 * without telling them what to do about it is how a launch stalls for a week.
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

const TONE: Record<IntegrationView['status'], string> = {
  connected: 'pass',
  error: 'fail',
  expired: 'warn',
  disconnected: 'draft',
  not_connected: 'draft',
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
          const { connected, needsCustomer, failed } = json.outcome as { connected: { provider: string }[]; needsCustomer: string[]; failed: { provider: string; detail: string }[] };
          const parts = [
            connected.length ? `Connected ${connected.map((c) => c.provider).join(', ')}.` : '',
            failed.length ? `Could not connect ${failed.map((f) => `${f.provider} (${f.detail})`).join('; ')}.` : '',
            needsCustomer.length ? `Still needs the customer: ${needsCustomer.join(', ')}.` : '',
          ].filter(Boolean);
          setNotice(parts.join(' ') || 'Nothing left for the platform to connect.');
        } else if (json.result) {
          const result = json.result as { ok: boolean; detail: string };
          if (result.ok) setNotice(result.detail);
          else setError(result.detail);
        }
        setSecret('');
        setOpenSecret(null);
        onChange?.();
      } catch {
        setError('That did not work.');
      } finally {
        setBusy(null);
      }
    },
    [factoryId, onChange],
  );

  const platformFixable = views.filter((v) => v.required && v.status !== 'connected' && v.buildable && v.ownership === 'platform');

  return (
    <Card
      title="Integrations"
      right={
        platformFixable.length > 0 ? (
          <Button tone="primary" onClick={() => void act({ action: 'auto_connect' }, 'auto')} disabled={busy !== null}>
            {busy === 'auto' ? 'Connecting…' : `Connect the ${platformFixable.length} we provide`}
          </Button>
        ) : null
      }
    >
      {notice && <p className="mb-3 border-2 border-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 text-sm text-emerald-900">{notice}</p>}
      {error && <p className="mb-3 border-2 border-[#E0301E] bg-[#E0301E]/[0.06] rounded-lg px-3 py-2 text-sm text-[#E0301E]">{error}</p>}

      {loaded && views.length === 0 && <Empty>This blueprint needs no integrations.</Empty>}
      {!loaded && <Empty>Loading.</Empty>}

      <ul className="space-y-3">
        {views.map((v) => (
          <li key={v.provider} className="border-2 border-[#161616]/12 rounded-lg p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-sans font-bold text-[#161616]">{v.name}</h3>
                  <Badge tone={TONE[v.status]}>{LABEL[v.status]}</Badge>
                  {v.required && <Badge tone="test">required</Badge>}
                  <Badge>{v.ownership === 'platform' ? 'we provide it' : 'their account'}</Badge>
                </div>
                <p className="text-sm text-[#161616]/65 mt-0.5">{v.blurb}</p>
                {v.detail && (
                  <p className={`text-sm mt-1 ${v.status === 'connected' ? 'text-emerald-800' : 'text-[#E0301E]'}`}>{v.detail}</p>
                )}
                {v.status !== 'connected' && <p className="text-xs text-[#161616]/55 mt-1">{v.howToConnect}</p>}
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/35 mt-1">
                  {v.lastSuccessAt ? `last worked ${ago(v.lastSuccessAt)}` : 'never connected'}
                  {v.lastErrorAt ? ` · last failed ${ago(v.lastErrorAt)}` : ''}
                </p>
              </div>

              <div className="flex gap-1.5 shrink-0">
                {!v.buildable ? (
                  <Badge tone="proposed">needs development</Badge>
                ) : (
                  <>
                    {v.status === 'connected' && (
                      <Button onClick={() => void act({ action: 'test', provider: v.provider }, v.provider)} disabled={busy !== null}>
                        {busy === v.provider ? 'Testing…' : 'Test'}
                      </Button>
                    )}
                    {v.status !== 'connected' && v.ownership === 'platform' && (
                      <Button tone="primary" onClick={() => void act({ action: 'connect', provider: v.provider, ownership: 'platform' }, v.provider)} disabled={busy !== null}>
                        {busy === v.provider ? 'Connecting…' : v.needsReconnect ? 'Reconnect' : 'Connect'}
                      </Button>
                    )}
                    {v.secretLabel && (
                      <Button onClick={() => setOpenSecret(openSecret === v.provider ? null : v.provider)} disabled={busy !== null}>
                        {v.ownership === 'tenant' && v.status === 'connected' ? 'Replace key' : 'Use their key'}
                      </Button>
                    )}
                    {v.status === 'connected' && (
                      <Button tone="ghost" onClick={() => void act({ action: 'disconnect', provider: v.provider }, v.provider)} disabled={busy !== null}>
                        Disconnect
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {openSecret === v.provider && v.secretLabel && (
              <div className="mt-3 pt-3 border-t border-[#161616]/10 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[16rem]">
                  <Field label={v.secretLabel} hint="Stored encrypted. It is never shown again and never reaches a log.">
                    <input className={inputCls} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
                  </Field>
                </div>
                <Button
                  tone="primary"
                  onClick={() => void act({ action: 'connect', provider: v.provider, ownership: 'tenant', secret }, v.provider)}
                  disabled={busy !== null || secret.trim().length < 8}
                >
                  Save and test
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="text-xs text-[#161616]/50 mt-3">
          {missing.length} required connection{missing.length === 1 ? '' : 's'} still open. Activation stays blocked until every one is green.
        </p>
      )}
    </Card>
  );
}
