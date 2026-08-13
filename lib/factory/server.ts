import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import type { Blueprint, BlueprintRow, FactoryRow } from './types';
import { validateBlueprint, currentBlueprint, deployedBlueprint } from './blueprint';
import { getPlan, type PlanRow } from './plans';
import { loadFactory, type Scope } from './tenant';

/**
 * Route plumbing for Client Factory.
 *
 * Every route that touches a Factory needs the same five things resolved
 * together: the factory row, the tenant it belongs to, the plan, the blueprint,
 * and the set of modules the plan entitles. Assembling those in one place is
 * not tidiness, it is the guard: a route that only fetched four of them would
 * be a route that skipped an authorization check.
 */

export type FactoryBundle = {
  factory: FactoryRow;
  tenantId: string;
  plan: PlanRow | null;
  blueprintRow: BlueprintRow | null;
  blueprint: Blueprint | null;
  /** Deployed doc if there is one, otherwise the newest draft. */
  entitledModules: Set<string>;
};

export async function loadBundle(
  scope: Scope,
  factoryId: string,
  opts: { prefer?: 'deployed' | 'latest' } = {},
): Promise<FactoryBundle | { error: NextResponse }> {
  const loaded = await loadFactory(scope, factoryId);
  if ('error' in loaded) return loaded;
  const { factory, tenantId } = loaded;

  const { data: tenantRow } = await scope.supabase
    .from('factory_tenants')
    .select('plan_code')
    .eq('id', tenantId)
    .maybeSingle();
  const plan = await getPlan(scope.supabase, (tenantRow as { plan_code: string | null } | null)?.plan_code ?? null);

  const prefer = opts.prefer ?? 'latest';
  const row =
    prefer === 'deployed'
      ? (await deployedBlueprint(scope.supabase, factory.id)) ?? (await currentBlueprint(scope.supabase, factory.id))
      : await currentBlueprint(scope.supabase, factory.id);

  const parsed = row ? validateBlueprint(row.doc) : null;

  return {
    factory,
    tenantId,
    plan,
    blueprintRow: row,
    blueprint: parsed && parsed.ok ? parsed.doc : null,
    entitledModules: entitledModuleSet(plan),
  };
}

export function entitledModuleSet(plan: PlanRow | null): Set<string> {
  return new Set(plan?.entitlements?.modules ?? []);
}

/** Parse a JSON body against a zod schema, with the repo's error shape. */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: NextResponse.json({ error: 'Invalid request' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first.path.length ? ` (${first.path.join('.')})` : '';
    return { error: NextResponse.json({ error: `${first.message}${where}` }, { status: 400 }) };
  }
  return { data: parsed.data };
}

export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
