import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { loadBundle, parseJson, bad } from '@/lib/factory/server';
import { importProspects, reservoirCounts, hotRightNow, nextReady, scoreProspect } from '@/lib/factory/prospects';
import { assertWithinLimit } from '@/lib/factory/plans';
import { suppress } from '@/lib/factory/campaigns';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Params = Promise<{ id: string }>;

/** The reservoir: counts, what is hot, and what is next to contact. */
export async function GET(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

  const [counts, hot, ready] = await Promise.all([
    reservoirCounts(guard.supabase, bundle.tenantId, bundle.factory.id),
    hotRightNow(guard.supabase, bundle.tenantId, bundle.factory.id, 20),
    bundle.blueprint
      ? nextReady(guard.supabase, {
          tenantId: bundle.tenantId,
          factoryId: bundle.factory.id,
          limit,
          minScore: bundle.blueprint.sourcing.min_score,
          isTest: bundle.factory.mode === 'test',
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ counts, hot, ready });
}

const importSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
  source: z.string().trim().max(120).optional(),
  isTest: z.boolean().optional(),
});

/**
 * CLIENT-PROVIDED LEADS.
 *
 * A customer with their own list should not have to wait for us to source one.
 * The import is checked against the plan allowance BEFORE the work, so a 5,000
 * row paste against a 1,500 row allowance imports what fits and says exactly
 * how many it left, rather than importing all of them and inventing an overage.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, importSchema);
  if ('error' in parsed) return parsed.error;

  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;
  if (!bundle.blueprint) return bad('This Factory has no valid blueprint, so imported prospects could not be scored.');

  const limit = await assertWithinLimit(guard.supabase, bundle.tenantId, bundle.plan, 'prospects_sourced', parsed.data.rows.length);
  const remaining = limit.state.remaining;

  const outcome = await importProspects({
    supabase: guard.supabase,
    tenantId: bundle.tenantId,
    factoryId: bundle.factory.id,
    blueprint: bundle.blueprint,
    rows: parsed.data.rows,
    source: parsed.data.source,
    isTest: parsed.data.isTest ?? bundle.factory.mode === 'test',
    remaining: limit.allowed ? null : remaining,
    actor: guard.user.email,
  });

  if (outcome.inserted && !bundle.factory.first_prospect_at) {
    await guard.supabase
      .from('factories')
      .update({ first_prospect_at: new Date().toISOString() })
      .eq('id', bundle.factory.id)
      .eq('tenant_id', bundle.tenantId);
  }

  return NextResponse.json({
    ...outcome,
    limit: limit.allowed ? null : limit.reason,
  });
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suppress'), email: z.string().trim().min(3).max(200), reason: z.enum(['unsubscribe', 'bounce', 'complaint', 'manual', 'client_list']) }),
  z.object({ action: z.literal('rescore') }),
]);

/** Suppress an address, or re-score the reservoir after a scoring change. */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, patchSchema);
  if ('error' in parsed) return parsed.error;

  const bundle = await loadBundle(guard, id, { prefer: 'deployed' });
  if ('error' in bundle) return bundle.error;

  if (parsed.data.action === 'suppress') {
    await suppress(guard.supabase, bundle.tenantId, { kind: 'email', value: parsed.data.email, reason: parsed.data.reason });
    await guard.supabase
      .from('factory_prospects')
      .update({ state: 'suppressed', suppressed_at: new Date().toISOString(), suppressed_reason: parsed.data.reason })
      .eq('tenant_id', bundle.tenantId)
      .eq('factory_id', bundle.factory.id)
      .ilike('email', parsed.data.email);
    await audit(guard.supabase, {
      tenantId: bundle.tenantId,
      factoryId: bundle.factory.id,
      actor: guard.user.email,
      actorKind: 'admin',
      action: 'prospect.suppressed',
      meta: { reason: parsed.data.reason },
    });
    return NextResponse.json({ suppressed: true });
  }

  if (!bundle.blueprint) return bad('No valid blueprint to score against.');

  const { data } = await guard.supabase
    .from('factory_prospects')
    .select('id, company, domain, website, email, contact_name, industry, city, region, employee_count, signals, state')
    .eq('tenant_id', bundle.tenantId)
    .eq('factory_id', bundle.factory.id)
    .not('state', 'in', '("suppressed","won","lost")')
    .limit(5000);

  type Row = Parameters<typeof scoreProspect>[1] & { id: string; state: string };
  const rows = (data as Row[]) ?? [];
  let updated = 0;
  for (const row of rows) {
    const scored = scoreProspect(bundle.blueprint, row);
    const { error } = await guard.supabase
      .from('factory_prospects')
      .update({
        score: scored.score,
        score_reasons: scored.reasons,
        // Only lifecycle-neutral states are re-derived. A prospect that is
        // already active or engaged keeps its state: a scoring tweak must never
        // yank somebody back out of a live conversation.
        ...(row.state === 'discovered' || row.state === 'qualified' || row.state === 'ready' ? { state: scored.state } : {}),
      })
      .eq('id', row.id)
      .eq('tenant_id', bundle.tenantId);
    if (!error) updated++;
  }

  return NextResponse.json({ rescored: updated, of: rows.length });
}
