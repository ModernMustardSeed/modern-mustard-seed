import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession, resolveAdminUserAsync, type AdminUser } from '@/lib/admin-auth';
import { getClientSession, normalizeEmail } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import type { FactoryRow, FactoryTenant } from './types';

/**
 * TENANT AUTHORIZATION. Every read and write in Client Factory goes through
 * this file, and nothing else is allowed to decide which tenant a request may
 * touch.
 *
 * THE RULE. A tenant id is never authority. Not from a query string, not from a
 * request body, not from a cookie the browser can edit, and above all not from
 * an LLM tool call: a model that has been asked to "look up the leads for
 * tenant X" will happily pass whatever X it was handed. Authorization is always
 * a JOIN against the signed-in identity:
 *
 *   customer side -> factory_tenant_members.email = session email
 *   staff side    -> an authenticated MMS admin session
 *
 * A supplied id is at most a REQUEST to narrow that set, and it is intersected
 * with what the identity actually owns before a single row is read.
 *
 * WHY BOTH GUARDS EXIST. MMS staff legitimately need to work across tenants
 * (that is the whole master view). Customers legitimately must not. Those are
 * different questions, so they are different functions: `requireFactoryAdmin`
 * and `requirePortalTenant`. There is deliberately no third function that takes
 * a tenant id and trusts it.
 */

export type AdminScope = {
  supabase: SupabaseClient;
  user: AdminUser;
  /** MMS staff, so cross-tenant reads are permitted and recorded. */
  crossTenant: true;
};

export type TenantScope = {
  supabase: SupabaseClient;
  tenant: FactoryTenant;
  tenantId: string;
  email: string;
  role: 'owner' | 'member' | 'viewer';
  crossTenant: false;
};

export type Scope = AdminScope | TenantScope;

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = (msg = 'Forbidden') => NextResponse.json({ error: msg }, { status: 403 });
const noDb = () => NextResponse.json({ error: 'Database not configured' }, { status: 500 });
const notFound = (what: string) => NextResponse.json({ error: `${what} not found` }, { status: 404 });

/** MMS staff guard. Cross-tenant by design; the caller still has to name a tenant to touch one. */
export async function requireFactoryAdmin(): Promise<AdminScope | { error: NextResponse }> {
  const session = await getSession();
  if (!session) return { error: unauthorized() };
  const supabase = getSupabase();
  if (!supabase) return { error: noDb() };
  const user = await resolveAdminUserAsync(session.email);
  return { supabase, user, crossTenant: true };
}

/** Owner-only actions: pricing, plan changes, template publishing, tenant deletion. */
export async function requireFactoryOwner(): Promise<AdminScope | { error: NextResponse }> {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard;
  if (guard.user.role !== 'owner') return { error: forbidden('Owner only') };
  return guard;
}

/**
 * Customer-portal guard. Resolves the tenant FROM the session email, never from
 * the request. `wantTenantId` is honoured only if the signed-in person is
 * actually a member of it, which is what makes a multi-tenant client (an agency
 * with two Factories, say) safe rather than a hole.
 */
export async function requirePortalTenant(
  wantTenantId?: string | null,
): Promise<TenantScope | { error: NextResponse }> {
  const session = await getClientSession();
  if (!session) return { error: unauthorized() };
  const supabase = getSupabase();
  if (!supabase) return { error: noDb() };
  const email = normalizeEmail(session.email);

  const { data: memberships, error } = await supabase
    .from('factory_tenant_members')
    .select('tenant_id, role, factory_tenants!inner(*)')
    .eq('email', email);
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };

  type Membership = { tenant_id: string; role: TenantScope['role']; factory_tenants: FactoryTenant };
  const rows = (memberships ?? []) as unknown as Membership[];
  const active = rows.filter((r) => r.factory_tenants?.status === 'active');
  if (!active.length) return { error: forbidden('No active Client Factory on this account') };

  const chosen = wantTenantId ? active.find((r) => r.tenant_id === wantTenantId) : active[0];
  if (!chosen) return { error: forbidden('No access to that Factory') };

  return {
    supabase,
    tenant: chosen.factory_tenants,
    tenantId: chosen.tenant_id,
    email,
    role: chosen.role,
    crossTenant: false,
  };
}

/** Portal writes are owner/member only. A viewer reads and nothing else. */
export function requireWriteRole(scope: Scope): NextResponse | null {
  if (scope.crossTenant) return null;
  if (scope.role === 'viewer') return forbidden('Read-only access');
  return null;
}

/**
 * Load a Factory and prove it belongs where the caller may reach.
 *
 * This is the choke point every route funnels through: a route that has a
 * factory id and a scope cannot accidentally read another tenant's rows,
 * because the tenant_id it goes on to filter by comes from the row this
 * function returned, not from the request.
 */
export async function loadFactory(
  scope: Scope,
  factoryId: string,
): Promise<{ factory: FactoryRow; tenantId: string } | { error: NextResponse }> {
  if (!isUuid(factoryId)) return { error: NextResponse.json({ error: 'Invalid factory id' }, { status: 400 }) };

  let query = scope.supabase.from('factories').select('*').eq('id', factoryId);
  if (!scope.crossTenant) query = query.eq('tenant_id', scope.tenantId);

  const { data, error } = await query.maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: notFound('Factory') };

  const factory = data as FactoryRow;
  return { factory, tenantId: factory.tenant_id };
}

/** Load a tenant the caller may reach. Staff may name any; a customer may only name their own. */
export async function loadTenant(
  scope: Scope,
  tenantId: string,
): Promise<{ tenant: FactoryTenant } | { error: NextResponse }> {
  if (!isUuid(tenantId)) return { error: NextResponse.json({ error: 'Invalid tenant id' }, { status: 400 }) };
  if (!scope.crossTenant && tenantId !== scope.tenantId) return { error: forbidden('No access to that tenant') };

  const { data, error } = await scope.supabase.from('factory_tenants').select('*').eq('id', tenantId).maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: notFound('Tenant') };
  return { tenant: data as FactoryTenant };
}

/**
 * A SELECT that is already narrowed to one tenant.
 *
 * Use this instead of `supabase.from(table)` anywhere a tenant's data is
 * involved. It takes the tenant id as an argument rather than reading it from
 * ambient state precisely so that the call site has to have obtained it from
 * `loadFactory` / `loadTenant` first.
 */
export function tenantTable(supabase: SupabaseClient, table: string, tenantId: string) {
  return supabase.from(table).select('*').eq('tenant_id', tenantId);
}

/** Same idea for writes: the tenant_id is stamped by us, not accepted from a payload. */
export function stampTenant<T extends Record<string, unknown>>(row: T, tenantId: string, factoryId?: string) {
  const { tenant_id: _drop, ...rest } = row as Record<string, unknown>;
  return { ...rest, tenant_id: tenantId, ...(factoryId ? { factory_id: factoryId } : {}) };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Who is acting, for the audit log. */
export function actorOf(scope: Scope): { actor: string; actor_kind: 'admin' | 'client' } {
  return scope.crossTenant
    ? { actor: scope.user.email, actor_kind: 'admin' }
    : { actor: scope.email, actor_kind: 'client' };
}

/** The MMS reference tenant. Its Factory is the one we run ourselves. */
export const INTERNAL_TENANT_SLUG = 'modern-mustard-seed';

export async function getInternalTenant(supabase: SupabaseClient): Promise<FactoryTenant | null> {
  const { data } = await supabase.from('factory_tenants').select('*').eq('slug', INTERNAL_TENANT_SLUG).maybeSingle();
  return (data as FactoryTenant) ?? null;
}
