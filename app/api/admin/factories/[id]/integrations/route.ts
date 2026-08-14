import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { loadBundle, parseJson, bad } from '@/lib/factory/server';
import {
  integrationStatus,
  connectIntegration,
  testIntegration,
  disconnectIntegration,
  autoConnectPlatform,
  listConnectors,
} from '@/lib/factory/connectors';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

/**
 * What this tenant has connected, what its blueprint requires, and what
 * connecting each one involves.
 *
 * Reads stored state. Nothing here calls a provider, because this draws a
 * panel, and a panel that fired six outbound API calls on every render would be
 * a panel nobody opens twice. Use the `test` action for the live check.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;

  const status = await integrationStatus({
    supabase: guard.supabase,
    tenantId: bundle.tenantId,
    blueprint: bundle.blueprint,
  });

  return NextResponse.json({ ...status, catalog: listConnectors() });
}

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('connect'),
    provider: z.string().trim().min(2).max(60),
    ownership: z.enum(['platform', 'tenant']).optional(),
    // Plaintext on the way in only. Encrypted before storage by lib/crypto, and
    // never returned by any route in this file.
    secret: z.string().trim().min(8).max(400).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({ action: z.literal('test'), provider: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal('disconnect'), provider: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal('auto_connect') }),
]);

/**
 * Connect, test, disconnect, or connect everything MMS can provide by itself.
 *
 * `auto_connect` is the answer to three integrations sitting red on a
 * checklist. Platform-owned connectors need nothing from the customer, so
 * nobody should click them one at a time for every tenant. Tenant-owned ones
 * are skipped and named, because those genuinely need the customer.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, schema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;

  const base = { supabase: guard.supabase, tenantId: bundle.tenantId, blueprint: bundle.blueprint, actor: guard.user.email };

  switch (input.action) {
    case 'connect': {
      const result = await connectIntegration({
        ...base,
        provider: input.provider,
        ownership: input.ownership,
        secret: input.secret ?? null,
        config: input.config,
      });
      const status = await integrationStatus(base);
      return NextResponse.json({ result, ...status }, { status: result.ok ? 200 : 400 });
    }

    case 'test': {
      const result = await testIntegration({ ...base, provider: input.provider });
      const status = await integrationStatus(base);
      return NextResponse.json({ result, ...status });
    }

    case 'disconnect': {
      const { ok } = await disconnectIntegration({ supabase: guard.supabase, tenantId: bundle.tenantId, provider: input.provider, actor: guard.user.email });
      if (!ok) return bad('Could not disconnect that integration.', 500);
      const status = await integrationStatus(base);
      return NextResponse.json({ result: { ok: true, provider: input.provider, status: 'disconnected', detail: 'Disconnected.' }, ...status });
    }

    case 'auto_connect': {
      // The MMS reference tenant collects through the platform account, so it
      // claims the 'either' connectors too. A customer's Factory does not: a
      // prospect buying from them must pay them.
      const { data: tenantRow } = await guard.supabase.from('factory_tenants').select('kind').eq('id', bundle.tenantId).maybeSingle();
      const claimEither = (tenantRow as { kind: string } | null)?.kind === 'internal';

      const outcome = await autoConnectPlatform({ ...base, claimEither });
      const status = await integrationStatus(base);
      return NextResponse.json({ outcome, ...status });
    }
  }
}
