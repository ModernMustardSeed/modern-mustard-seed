import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { getStripe } from '@/lib/stripe';
import type { Blueprint } from './types';
import { requiredIntegrations } from './modules';
import { audit } from './audit-log';

/**
 * THE CONNECTOR REGISTRY.
 *
 * "Not connected: email_sender, telephony, payments" is a true sentence and a
 * useless one. It does not say what the thing is, who owns the account, what
 * connecting involves, or whether MMS can simply provide it. This file makes
 * every one of those answerable, once, for every tenant that will ever exist.
 *
 * OWNERSHIP IS THE INTERESTING PART. Three of these are things MMS already
 * runs, so a customer connects nothing:
 *
 *   platform  MMS's own account serves the tenant. The customer supplies no
 *             credential. Connecting means proving the platform account works
 *             AND that this tenant's precondition is met, which for email is
 *             "their sending domain is actually verified", not "somebody
 *             ticked a box".
 *   tenant    the customer's own account, because the money or the identity is
 *             theirs. Checkout is the clear case: a prospect paying a customer
 *             must pay THEM, so that connection cannot be ours.
 *   either    works both ways. Defaults to whichever is honest for the tenant.
 *
 * A CHECK IS A REAL REQUEST. Every `check` below calls the provider and reads
 * the answer. A connector that returned `connected` because a row existed would
 * turn preflight from a gate into decoration, and the first anyone would hear
 * of a dead sender is a customer asking why nothing sent.
 *
 * Storage: supabase/migrations/095, uniqueness fixed in 096. Secrets are
 * AES-256-GCM via lib/crypto and are never logged, never returned by an API,
 * and never put in an audit row.
 */

export type ConnectorOwnership = 'platform' | 'tenant' | 'either';
export type ConnectorCategory = 'email' | 'telephony' | 'payments' | 'data' | 'build' | 'crm';

export type CheckContext = {
  supabase: SupabaseClient;
  tenantId: string;
  blueprint: Blueprint | null;
  ownership: 'platform' | 'tenant';
  /** Decrypted, tenant-owned credential. Null for a platform connection. */
  secret: string | null;
  config: Record<string, unknown>;
};

export type CheckResult = {
  ok: boolean;
  detail: string;
  /** Set when the credential was valid and has stopped being valid. Drives RECONNECT. */
  expired?: boolean;
  meta?: Record<string, unknown>;
};

export type Connector = {
  key: string;
  name: string;
  category: ConnectorCategory;
  ownership: ConnectorOwnership;
  blurb: string;
  /** What connecting actually involves, in a sentence a person can act on. */
  howToConnect: string;
  /** Null when nothing is stored (a platform connection). */
  secretLabel: string | null;
  configFields: Record<string, string>;
  status: 'available' | 'proposed';
  buildSpec?: string;
  check: (ctx: CheckContext) => Promise<CheckResult>;
};

const timeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

/** The domain a Factory sends from, off the blueprint. "Dana <d@acme.com>" -> "acme.com". */
export function senderDomainOf(bp: Blueprint | null): string | null {
  if (!bp) return null;
  const declared = bp.compliance.sender_domain?.trim().toLowerCase();
  if (declared) return declared.replace(/^@/, '');
  const from = bp.compliance.sender_from ?? '';
  const match = from.match(/[\w.+-]+@([\w-]+\.[\w.-]+)/);
  return match ? match[1].toLowerCase().replace(/[>\s]+$/, '') : null;
}

/* ──────────────────────────── the connectors ─────────────────────────── */

const emailSender: Connector = {
  key: 'email_sender',
  name: 'Email Sending',
  category: 'email',
  ownership: 'either',
  blurb: 'The account that actually puts the campaign in an inbox.',
  howToConnect:
    'Modern Mustard Seed sends on your behalf. All you do is verify your sending domain once, which proves to Gmail and Yahoo that we are allowed to send as you.',
  secretLabel: 'Resend API key (only if you send from your own account)',
  configFields: { domain: 'Sending domain, if it differs from the address in the blueprint' },
  status: 'available',
  async check(ctx) {
    const apiKey = ctx.ownership === 'tenant' ? ctx.secret : process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, detail: ctx.ownership === 'tenant' ? 'No API key stored for this account.' : 'The platform sending account is not configured (RESEND_API_KEY).' };
    }

    const t = timeout(10_000);
    try {
      const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${apiKey}` }, signal: t.signal });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, expired: true, detail: 'The sending account rejected our credential. It needs reconnecting.' };
      }
      if (!res.ok) return { ok: false, detail: `The sending provider answered ${res.status}.` };

      const body = (await res.json()) as { data?: { name: string; status: string; capabilities?: { sending?: string } }[] };
      const domains = body.data ?? [];
      const want = (ctx.config.domain as string)?.toLowerCase().trim() || senderDomainOf(ctx.blueprint);

      if (!want) {
        return { ok: true, detail: `Sending account reachable, ${domains.length} domain(s). Set a sender address on the blueprint and this will check it.`, meta: { domains: domains.length } };
      }

      const match = domains.find((d) => d.name.toLowerCase() === want);
      if (!match) {
        return { ok: false, detail: `"${want}" is not on the sending account yet. Add it and complete the DNS records, then test again.` };
      }
      if (match.status !== 'verified') {
        return { ok: false, detail: `"${want}" is on the account but its status is "${match.status}". Finish the DNS records before this Factory can send.` };
      }
      if (match.capabilities?.sending && match.capabilities.sending !== 'enabled') {
        return { ok: false, detail: `"${want}" is verified but sending is ${match.capabilities.sending}.` };
      }
      return { ok: true, detail: `Sending as ${want}, domain verified.`, meta: { domain: want } };
    } catch (err) {
      return { ok: false, detail: err instanceof Error && err.name === 'AbortError' ? 'The sending provider did not answer in time.' : 'Could not reach the sending provider.' };
    } finally {
      t.done();
    }
  },
};

const telephony: Connector = {
  key: 'telephony',
  name: 'Voice and Phone',
  category: 'telephony',
  ownership: 'platform',
  blurb: 'The line the AI receptionist demonstration calls out on.',
  howToConnect: 'Modern Mustard Seed provides the numbers and the voice platform. Nothing to connect on your side.',
  secretLabel: null,
  configFields: {},
  status: 'available',
  async check(ctx) {
    const apiKey = ctx.ownership === 'tenant' ? ctx.secret : process.env.VAPI_API_KEY?.trim();
    if (!apiKey) return { ok: false, detail: 'The voice platform is not configured (VAPI_API_KEY).' };

    const t = timeout(10_000);
    try {
      const res = await fetch('https://api.vapi.ai/phone-number', { headers: { Authorization: `Bearer ${apiKey}` }, signal: t.signal });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, expired: true, detail: 'The voice platform rejected our credential. It needs reconnecting.' };
      }
      if (!res.ok) return { ok: false, detail: `The voice platform answered ${res.status}.` };

      const numbers = (await res.json()) as unknown[];
      if (!Array.isArray(numbers) || numbers.length === 0) {
        return { ok: false, detail: 'The voice platform has no phone number provisioned, so no call can be placed.' };
      }
      return { ok: true, detail: `${numbers.length} number(s) available to call out on.`, meta: { numbers: numbers.length } };
    } catch (err) {
      return { ok: false, detail: err instanceof Error && err.name === 'AbortError' ? 'The voice platform did not answer in time.' : 'Could not reach the voice platform.' };
    } finally {
      t.done();
    }
  },
};

const payments: Connector = {
  key: 'payments',
  name: 'Payments',
  category: 'payments',
  ownership: 'either',
  blurb: 'Where a prospect who buys actually pays.',
  howToConnect:
    'This one is yours, not ours. A prospect buying from you must pay YOU, so connect your own Stripe account with a restricted key. Leave it on the platform account only if Modern Mustard Seed is collecting on your behalf.',
  secretLabel: 'Stripe secret key',
  configFields: {},
  status: 'available',
  async check(ctx) {
    if (ctx.ownership === 'tenant') {
      if (!ctx.secret) return { ok: false, detail: 'No Stripe key stored for this account.' };
      const t = timeout(10_000);
      try {
        const res = await fetch('https://api.stripe.com/v1/account', { headers: { Authorization: `Bearer ${ctx.secret}` }, signal: t.signal });
        if (res.status === 401) return { ok: false, expired: true, detail: 'Stripe rejected the stored key. It needs reconnecting.' };
        if (!res.ok) return { ok: false, detail: `Stripe answered ${res.status}.` };
        const account = (await res.json()) as { id: string; charges_enabled?: boolean; business_profile?: { name?: string } };
        if (!account.charges_enabled) return { ok: false, detail: 'That Stripe account cannot take charges yet. Finish onboarding in Stripe first.' };
        return { ok: true, detail: `Connected to ${account.business_profile?.name ?? account.id}.`, meta: { account: account.id } };
      } catch {
        return { ok: false, detail: 'Could not reach Stripe.' };
      } finally {
        t.done();
      }
    }

    const stripe = getStripe();
    if (!stripe) return { ok: false, detail: 'The platform payment account is not configured (STRIPE_SECRET_KEY).' };
    try {
      const account = await stripe.accounts.retrieve();
      if (!account.charges_enabled) return { ok: false, detail: 'The platform payment account cannot take charges.' };
      return { ok: true, detail: `Collecting through ${account.business_profile?.name ?? account.id}.`, meta: { account: account.id } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stripe refused the request.';
      return { ok: false, expired: /api key|authentication/i.test(message), detail: `Stripe: ${message}` };
    }
  },
};

const hunter: Connector = {
  key: 'hunter',
  name: 'Contact Enrichment',
  category: 'data',
  ownership: 'either',
  blurb: 'Finds and verifies a named contact at a company domain.',
  howToConnect: 'Modern Mustard Seed provides this from its own enrichment account. Connect your own key instead if you would rather the credits came off your plan.',
  secretLabel: 'Hunter API key (only if you use your own account)',
  configFields: {},
  status: 'available',
  async check(ctx) {
    const apiKey = ctx.ownership === 'tenant' ? ctx.secret : process.env.HUNTER_API_KEY?.trim();
    if (!apiKey) return { ok: false, detail: 'No enrichment key configured (HUNTER_API_KEY).' };

    const t = timeout(10_000);
    try {
      const res = await fetch(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(apiKey)}`, { signal: t.signal });
      if (res.status === 401) return { ok: false, expired: true, detail: 'The enrichment provider rejected the key. It needs reconnecting.' };
      if (!res.ok) return { ok: false, detail: `The enrichment provider answered ${res.status}.` };
      const body = (await res.json()) as { data?: { requests?: { searches?: { available?: number; used?: number } } } };
      const searches = body.data?.requests?.searches;
      const left = typeof searches?.available === 'number' && typeof searches?.used === 'number' ? searches.available - searches.used : null;
      if (left !== null && left <= 0) return { ok: false, detail: 'The enrichment account is out of credits this month.' };
      return { ok: true, detail: left === null ? 'Enrichment account reachable.' : `${left} enrichment lookups left this month.`, meta: { left } };
    } catch {
      return { ok: false, detail: 'Could not reach the enrichment provider.' };
    } finally {
      t.done();
    }
  },
};

/** Two poll cycles plus slack, matching the outbound cockpit's own threshold. */
const BUILD_DEAD_AFTER_S = 180;

const buildWorker: Connector = {
  key: 'forge_worker',
  name: 'Build Worker',
  category: 'build',
  ownership: 'platform',
  blurb: 'The machine that builds a prospect-specific demo site.',
  howToConnect: 'Modern Mustard Seed runs it. Nothing to connect, but a Factory using demo builds needs it alive when a build is queued.',
  secretLabel: null,
  configFields: {},
  status: 'available',
  async check(ctx) {
    const { data } = await ctx.supabase.from('app_state').select('updated_at').eq('key', 'forge_worker_health').maybeSingle();
    const at = (data as { updated_at: string } | null)?.updated_at;
    if (!at) return { ok: false, detail: 'The build worker has never reported in.' };
    const ageSeconds = Math.round((Date.now() - new Date(at).getTime()) / 1000);
    if (ageSeconds > BUILD_DEAD_AFTER_S) {
      return { ok: false, detail: `The build worker last reported ${Math.round(ageSeconds / 60)} minutes ago, so it is not running. Demo builds will queue until it is back.` };
    }
    return { ok: true, detail: `Build worker alive, last heartbeat ${ageSeconds}s ago.`, meta: { ageSeconds } };
  },
};

const crm: Connector = {
  key: 'crm',
  name: 'External CRM',
  category: 'crm',
  ownership: 'tenant',
  blurb: 'Pulls companies and contacts out of a CRM the customer already runs.',
  howToConnect: 'Not built yet. Every Client Factory ships with its own acquisition CRM, so this is only needed to import an existing one.',
  secretLabel: 'CRM API key',
  configFields: { provider: 'hubspot | pipedrive' },
  status: 'proposed',
  buildSpec: 'OAuth app plus a field-mapping importer per provider, behind the connector interface in this file.',
  async check() {
    return { ok: false, detail: 'This connector is not built yet. Remove the module, or import a CSV instead.' };
  },
};

export const CONNECTORS: Connector[] = [emailSender, telephony, payments, hunter, buildWorker, crm];

const BY_KEY = new Map(CONNECTORS.map((c) => [c.key, c]));

export function getConnector(key: string): Connector | null {
  return BY_KEY.get(key) ?? null;
}

export function listConnectors(): Omit<Connector, 'check'>[] {
  return CONNECTORS.map(({ check: _check, ...rest }) => rest);
}

/* ──────────────────────────── stored state ───────────────────────────── */

export type IntegrationRow = {
  id: string;
  tenant_id: string;
  factory_id: string | null;
  provider: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  config: Record<string, unknown>;
  secret_ciphertext: string | null;
  secret_iv: string | null;
  secret_tag: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
};

function ownershipOf(connector: Connector, row: IntegrationRow | null): 'platform' | 'tenant' {
  if (connector.ownership !== 'either') return connector.ownership;
  const declared = row?.config?.ownership;
  if (declared === 'tenant' || declared === 'platform') return declared;
  return row?.secret_ciphertext ? 'tenant' : 'platform';
}

/**
 * Can we store a customer credential at all?
 *
 * `lib/crypto` derives its key from CREDENTIALS_SECRET and refuses anything
 * under 16 characters, which is correct: a short key is not encryption. But a
 * misconfigured environment must surface as "credential storage is not
 * configured", not as a 500 from the middle of a connect. Checking first turns
 * an unhandled throw into a sentence an operator can act on.
 */
export function credentialStorageReady(): boolean {
  const secret = process.env.CREDENTIALS_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.CLIENT_SESSION_SECRET;
  return !!secret && secret.length >= 16;
}

function secretOf(row: IntegrationRow | null): string | null {
  if (!row?.secret_ciphertext || !row.secret_iv || !row.secret_tag) return null;
  try {
    return decryptSecret(row.secret_ciphertext, row.secret_iv, row.secret_tag);
  } catch {
    // A secret that will not decrypt is a secret that is gone: the signing key
    // changed. Say so as an expiry rather than a crash, so the fix is a reconnect.
    return null;
  }
}

export type IntegrationView = {
  provider: string;
  name: string;
  category: string;
  blurb: string;
  howToConnect: string;
  ownership: 'platform' | 'tenant';
  ownershipOptions: ConnectorOwnership;
  secretLabel: string | null;
  configFields: Record<string, string>;
  buildable: boolean;
  buildSpec: string | null;
  required: boolean;
  status: IntegrationRow['status'] | 'not_connected';
  detail: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  /** True when it was working and stopped. The RECONNECT case. */
  needsReconnect: boolean;
};

/**
 * What this tenant has, what its blueprint requires, and what is missing.
 *
 * Reads stored state only. Nothing here calls a provider, because this is what
 * renders a page, and a page that made six outbound API calls to draw a status
 * panel would be a page nobody opens twice. `testIntegration` is the live path.
 */
export async function integrationStatus(input: {
  supabase: SupabaseClient;
  tenantId: string;
  blueprint: Blueprint | null;
}): Promise<{ views: IntegrationView[]; required: string[]; missing: string[]; broken: string[] }> {
  const required = input.blueprint ? requiredIntegrations(input.blueprint.modules) : [];
  const { data } = await input.supabase.from('factory_integrations').select('*').eq('tenant_id', input.tenantId);
  const rows = new Map(((data as IntegrationRow[]) ?? []).map((r) => [r.provider, r]));

  // Everything required, plus anything already connected even if the blueprint
  // stopped needing it. A stale connection is still a credential we hold.
  const keys = [...new Set([...required, ...rows.keys()])];

  const views: IntegrationView[] = keys.map((key) => {
    const connector = getConnector(key);
    const row = rows.get(key) ?? null;
    if (!connector) {
      return {
        provider: key, name: key, category: 'unknown',
        blurb: 'A module asks for this, and no connector defines it.',
        howToConnect: 'This is a bug in the module registry, not something a customer can connect.',
        ownership: 'platform', ownershipOptions: 'platform', secretLabel: null, configFields: {},
        buildable: false, buildSpec: null,
        required: required.includes(key), status: 'not_connected', detail: null,
        lastSuccessAt: null, lastErrorAt: null, needsReconnect: false,
      };
    }
    return {
      provider: connector.key,
      name: connector.name,
      category: connector.category,
      blurb: connector.blurb,
      howToConnect: connector.howToConnect,
      ownership: ownershipOf(connector, row),
      ownershipOptions: connector.ownership,
      secretLabel: connector.secretLabel,
      configFields: connector.configFields,
      buildable: connector.status === 'available',
      buildSpec: connector.buildSpec ?? null,
      required: required.includes(key),
      status: row?.status ?? 'not_connected',
      detail: row?.last_error ?? (row?.status === 'connected' ? (row.config?.detail as string) ?? null : null),
      lastSuccessAt: row?.last_success_at ?? null,
      lastErrorAt: row?.last_error_at ?? null,
      needsReconnect: (row?.status === 'expired' || row?.status === 'error') && !!row?.last_success_at,
    };
  });

  return {
    views: views.sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)),
    required,
    missing: required.filter((k) => rows.get(k)?.status !== 'connected'),
    broken: [...rows.values()].filter((r) => r.status === 'error' || r.status === 'expired').map((r) => r.provider),
  };
}

/* ─────────────────────────── connect and test ────────────────────────── */

export type ConnectInput = {
  supabase: SupabaseClient;
  tenantId: string;
  provider: string;
  blueprint: Blueprint | null;
  ownership?: 'platform' | 'tenant';
  config?: Record<string, unknown>;
  /** Plaintext, encrypted before it is stored, never returned or logged. */
  secret?: string | null;
  actor: string;
  actorKind?: 'admin' | 'client' | 'system';
};

export type ConnectResult = { ok: boolean; status: IntegrationRow['status']; detail: string; provider: string };

/**
 * Connect or reconnect. The check runs BEFORE the row is written as connected,
 * so a stored `connected` always means somebody proved it, and a failure is
 * stored as the error it was rather than thrown away.
 */
export async function connectIntegration(input: ConnectInput): Promise<ConnectResult> {
  const connector = getConnector(input.provider);
  if (!connector) return { ok: false, status: 'disconnected', detail: `No connector called "${input.provider}".`, provider: input.provider };
  if (connector.status === 'proposed') {
    return { ok: false, status: 'disconnected', detail: connector.howToConnect, provider: connector.key };
  }

  const { data: existingRow } = await input.supabase
    .from('factory_integrations')
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('provider', connector.key)
    .maybeSingle();
  const existing = existingRow as IntegrationRow | null;

  const ownership =
    input.ownership ?? (connector.ownership === 'either' ? ownershipOf(connector, existing) : connector.ownership);
  if (ownership === 'tenant' && !connector.secretLabel) {
    return { ok: false, status: 'disconnected', detail: `${connector.name} is provided by Modern Mustard Seed and cannot be connected to your own account.`, provider: connector.key };
  }

  if (input.secret?.trim() && !credentialStorageReady()) {
    return {
      ok: false,
      status: 'error',
      detail: 'Credential storage is not configured on this environment (CREDENTIALS_SECRET). The key was not stored and nothing was connected.',
      provider: connector.key,
    };
  }

  const secret = input.secret?.trim() || (ownership === 'tenant' ? secretOf(existing) : null);
  const config = { ...(existing?.config ?? {}), ...(input.config ?? {}), ownership };

  const result = await connector.check({
    supabase: input.supabase,
    tenantId: input.tenantId,
    blueprint: input.blueprint,
    ownership,
    secret,
    config,
  });

  const now = new Date().toISOString();
  const encrypted = input.secret?.trim() ? encryptSecret(input.secret.trim()) : null;
  const status: IntegrationRow['status'] = result.ok ? 'connected' : result.expired ? 'expired' : 'error';

  const row: Record<string, unknown> = {
    tenant_id: input.tenantId,
    provider: connector.key,
    category: connector.category,
    status,
    config: { ...config, detail: result.detail, meta: result.meta ?? {} },
    last_success_at: result.ok ? now : existing?.last_success_at ?? null,
    last_error: result.ok ? null : result.detail,
    last_error_at: result.ok ? null : now,
    updated_at: now,
  };
  if (encrypted) {
    row.secret_ciphertext = encrypted.ciphertext;
    row.secret_iv = encrypted.iv;
    row.secret_tag = encrypted.tag;
  } else if (ownership === 'platform') {
    row.secret_ciphertext = null;
    row.secret_iv = null;
    row.secret_tag = null;
  }

  const { error } = await input.supabase.from('factory_integrations').upsert(row, { onConflict: 'tenant_id,provider' });
  if (error) return { ok: false, status: 'error', detail: error.message, provider: connector.key };

  await audit(input.supabase, {
    tenantId: input.tenantId,
    actor: input.actor,
    actorKind: input.actorKind ?? 'admin',
    action: result.ok ? 'integration.connected' : 'integration.failed',
    target: connector.key,
    severity: result.ok ? 'info' : 'warning',
    // The detail is a status sentence, never a credential. redact() in the
    // audit log is the second line of defence, not the first.
    meta: { ownership, detail: result.detail },
  });

  return { ok: result.ok, status, detail: result.detail, provider: connector.key };
}

/** Re-run the check against a stored connection. This is the live path. */
export async function testIntegration(input: {
  supabase: SupabaseClient;
  tenantId: string;
  provider: string;
  blueprint: Blueprint | null;
  actor: string;
}): Promise<ConnectResult> {
  return connectIntegration({ ...input, secret: null });
}

export async function disconnectIntegration(input: {
  supabase: SupabaseClient;
  tenantId: string;
  provider: string;
  actor: string;
}): Promise<{ ok: boolean }> {
  // The row is kept with its secret cleared, so the history of "this was once
  // connected, then somebody removed it" survives in one place.
  const { error } = await input.supabase
    .from('factory_integrations')
    .update({
      status: 'disconnected',
      secret_ciphertext: null, secret_iv: null, secret_tag: null,
      last_error: 'Disconnected by request.', last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', input.tenantId)
    .eq('provider', input.provider);
  if (error) return { ok: false };

  await audit(input.supabase, {
    tenantId: input.tenantId,
    actor: input.actor,
    actorKind: 'admin',
    action: 'integration.disconnected',
    target: input.provider,
    severity: 'warning',
  });
  return { ok: true };
}

/**
 * Connect everything a blueprint requires that MMS can provide by itself.
 *
 * This is the "should software know how to do this forever" answer to three
 * integrations sitting red on a checklist. Platform-owned connectors need no
 * customer input, so there is no reason a human should click them one at a time
 * for every tenant. Tenant-owned ones are skipped and reported, because those
 * genuinely need the customer.
 */
export async function autoConnectPlatform(input: {
  supabase: SupabaseClient;
  tenantId: string;
  blueprint: Blueprint | null;
  actor: string;
  /** Connect platform-side even for 'either' connectors. Right for MMS itself. */
  claimEither?: boolean;
}): Promise<{ connected: ConnectResult[]; needsCustomer: string[]; failed: ConnectResult[] }> {
  const required = input.blueprint ? requiredIntegrations(input.blueprint.modules) : [];
  const connected: ConnectResult[] = [];
  const failed: ConnectResult[] = [];
  const needsCustomer: string[] = [];

  for (const key of required) {
    const connector = getConnector(key);
    if (!connector || connector.status !== 'available') {
      needsCustomer.push(key);
      continue;
    }
    if (connector.ownership === 'tenant' || (connector.ownership === 'either' && !input.claimEither && connector.key === 'payments')) {
      needsCustomer.push(key);
      continue;
    }

    const result = await connectIntegration({
      supabase: input.supabase,
      tenantId: input.tenantId,
      provider: key,
      blueprint: input.blueprint,
      ownership: 'platform',
      actor: input.actor,
      actorKind: 'system',
    });
    (result.ok ? connected : failed).push(result);
  }

  return { connected, needsCustomer, failed };
}

/**
 * Re-check every stored connection for a tenant. Run on a schedule so a broken
 * integration is something MMS tells the customer about, not something the
 * customer tells MMS about.
 */
export async function refreshIntegrations(input: {
  supabase: SupabaseClient;
  tenantId: string;
  blueprint: Blueprint | null;
}): Promise<ConnectResult[]> {
  const { data } = await input.supabase.from('factory_integrations').select('provider').eq('tenant_id', input.tenantId).neq('status', 'disconnected');
  const providers = ((data as { provider: string }[]) ?? []).map((r) => r.provider);
  const out: ConnectResult[] = [];
  for (const provider of providers) {
    out.push(await testIntegration({ ...input, provider, actor: 'health-check' }));
  }
  return out;
}
