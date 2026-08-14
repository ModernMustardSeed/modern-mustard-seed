import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin, requireFactoryOwner } from '@/lib/factory/tenant';
import { parseJson, bad } from '@/lib/factory/server';
import { listPlans } from '@/lib/factory/plans';
import { slugify } from '@/lib/factory/types';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';

/**
 * CLIENT FACTORY TENANTS. One per MMS customer.
 *
 * A tenant is created when a customer buys, and the same row is what the client
 * portal resolves against. `client_email` is the join back to the existing MMS
 * portal identity, so a Client Factory customer signs in with the magic link
 * they already have rather than a second account nobody wants.
 */
export async function GET() {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const [{ data: tenants }, { data: factories }, { data: members }, plans] = await Promise.all([
    guard.supabase.from('factory_tenants').select('*').order('created_at', { ascending: false }),
    guard.supabase.from('factories').select('id, tenant_id, name, status, mode'),
    guard.supabase.from('factory_tenant_members').select('tenant_id, email, role'),
    listPlans(guard.supabase),
  ]);

  type F = { id: string; tenant_id: string; name: string; status: string; mode: string };
  type M = { tenant_id: string; email: string; role: string };
  const byTenant = new Map<string, F[]>();
  for (const f of ((factories as F[]) ?? [])) {
    const bucket = byTenant.get(f.tenant_id) ?? [];
    if (!byTenant.has(f.tenant_id)) byTenant.set(f.tenant_id, bucket);
    bucket.push(f);
  }
  const membersByTenant = new Map<string, M[]>();
  for (const m of ((members as M[]) ?? [])) {
    const bucket = membersByTenant.get(m.tenant_id) ?? [];
    if (!membersByTenant.has(m.tenant_id)) membersByTenant.set(m.tenant_id, bucket);
    bucket.push(m);
  }

  return NextResponse.json({
    tenants: ((tenants as { id: string }[]) ?? []).map((t) => ({
      ...t,
      factories: byTenant.get(t.id) ?? [],
      members: membersByTenant.get(t.id) ?? [],
    })),
    plans,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  clientEmail: z.string().trim().email().max(200),
  planCode: z.string().trim().min(2).max(40),
  mrrCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  setupCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Create a tenant and seat its owner in one call.
 *
 * The membership row is written here rather than left for later because the
 * portal resolves access through it: a tenant with no members is a customer who
 * paid and cannot sign in.
 */
export async function POST(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseJson(req, createSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const plans = await listPlans(guard.supabase);
  if (!plans.some((p) => p.code === input.planCode)) return bad(`Unknown plan "${input.planCode}".`);

  const { data, error } = await guard.supabase
    .from('factory_tenants')
    .insert({
      slug: slugify(input.name),
      name: input.name,
      client_email: input.clientEmail.toLowerCase(),
      plan_code: input.planCode,
      kind: 'customer',
      status: 'active',
      mrr_cents: input.mrrCents ?? null,
      setup_cents: input.setupCents ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) {
    return bad(
      (error as { code?: string }).code === '23505' ? 'A tenant with that name already exists.' : error.message,
      400,
    );
  }

  const tenant = data as { id: string; name: string };
  await guard.supabase.from('factory_tenant_members').insert({
    tenant_id: tenant.id,
    email: input.clientEmail.toLowerCase(),
    role: 'owner',
  });

  await audit(guard.supabase, {
    tenantId: tenant.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'tenant.created',
    meta: { plan: input.planCode, mrrCents: input.mrrCents ?? null },
  });

  return NextResponse.json({ tenant });
}

const patchSchema = z.object({
  tenantId: z.string().uuid(),
  planCode: z.string().trim().max(40).optional(),
  status: z.enum(['active', 'suspended', 'churned']).optional(),
  mrrCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  addMember: z.object({ email: z.string().trim().email().max(200), role: z.enum(['owner', 'member', 'viewer']) }).optional(),
  removeMember: z.string().trim().email().max(200).optional(),
});

/** Plan changes and billing state are owner-only. Seats are any admin. */
export async function PATCH(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseJson(req, patchSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  if (input.planCode || input.status || input.mrrCents !== undefined) {
    const owner = await requireFactoryOwner();
    if ('error' in owner) return owner.error;
  }

  if (input.addMember) {
    await guard.supabase
      .from('factory_tenant_members')
      .upsert(
        { tenant_id: input.tenantId, email: input.addMember.email.toLowerCase(), role: input.addMember.role },
        { onConflict: 'tenant_id,email' },
      );
  }
  if (input.removeMember) {
    await guard.supabase
      .from('factory_tenant_members')
      .delete()
      .eq('tenant_id', input.tenantId)
      .eq('email', input.removeMember.toLowerCase());
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.planCode) patch.plan_code = input.planCode;
  if (input.status) patch.status = input.status;
  if (input.mrrCents !== undefined) patch.mrr_cents = input.mrrCents;

  const { data, error } =
    Object.keys(patch).length > 1
      ? await guard.supabase.from('factory_tenants').update(patch).eq('id', input.tenantId).select('*').single()
      : await guard.supabase.from('factory_tenants').select('*').eq('id', input.tenantId).single();
  if (error) return bad(error.message, 500);

  await audit(guard.supabase, {
    tenantId: input.tenantId,
    actor: guard.user.email,
    actorKind: 'admin',
    action: input.planCode ? 'tenant.plan_changed' : 'tenant.updated',
    meta: { plan: input.planCode ?? null, status: input.status ?? null, seatChange: !!(input.addMember || input.removeMember) },
  });

  return NextResponse.json({ tenant: data });
}
