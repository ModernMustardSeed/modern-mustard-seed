import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { loadBundle, parseJson, bad } from '@/lib/factory/server';
import { validateBlueprint, saveBlueprint, diffBlueprints, summarizeDiff, requiresApproval, rollbackTo, blueprintHistory } from '@/lib/factory/blueprint';
import { preflight } from '@/lib/factory/preflight';
import { stripTenantData } from '@/lib/factory/templates';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

/** History plus the current doc, for the blueprint editor. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const bundle = await loadBundle(guard, id);
  if ('error' in bundle) return bundle.error;

  return NextResponse.json({
    blueprint: bundle.blueprintRow?.doc ?? null,
    meta: bundle.blueprintRow,
    history: await blueprintHistory(guard.supabase, bundle.factory.id),
  });
}

const saveSchema = z.object({
  doc: z.record(z.string(), z.unknown()),
  changeSummary: z.string().trim().max(600).optional(),
});

/**
 * Save the next version.
 *
 * Never an in-place edit: this writes version N+1 and supersedes the draft it
 * came from, so the diff, the reason and the rollback target all survive. The
 * response carries the diff and whether it needs approval, because a change to
 * pricing or to what the AI may claim is not the same kind of edit as fixing a
 * typo in a subject line.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, saveSchema);
  if ('error' in parsed) return parsed.error;

  const bundle = await loadBundle(guard, id);
  if ('error' in bundle) return bundle.error;

  const validated = validateBlueprint(parsed.data.doc);
  if (!validated.ok) {
    return NextResponse.json({ error: 'The blueprint is not valid.', issues: validated.errors }, { status: 400 });
  }

  const changes = bundle.blueprintRow ? diffBlueprints(bundle.blueprintRow.doc, validated.doc) : [];
  const saved = await saveBlueprint(guard.supabase, {
    tenantId: bundle.tenantId,
    factoryId: bundle.factory.id,
    doc: validated.doc,
    source: 'manual',
    createdBy: guard.user.email,
    changeSummary: parsed.data.changeSummary || summarizeDiff(changes),
  });
  if ('error' in saved) return bad(saved.error, 409);

  const report = await preflight({
    supabase: guard.supabase,
    tenantId: bundle.tenantId,
    factory: bundle.factory,
    blueprint: validated.doc,
    plan: bundle.plan,
  });
  await guard.supabase.from('factory_blueprints').update({ validation: report }).eq('id', saved.row.id);

  await audit(guard.supabase, {
    tenantId: bundle.tenantId,
    factoryId: bundle.factory.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'blueprint.edited',
    target: saved.row.id,
    meta: { version: saved.row.version, changes: changes.length, sensitive: changes.filter((c) => c.sensitive).length },
  });

  return NextResponse.json({
    version: saved.row.version,
    blueprintId: saved.row.id,
    changes,
    needsApproval: requiresApproval(changes),
    preflight: report,
  });
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), blueprintId: z.string().uuid() }),
  z.object({ action: z.literal('reject'), blueprintId: z.string().uuid(), reason: z.string().trim().max(600) }),
  z.object({ action: z.literal('rollback'), version: z.number().int().min(1) }),
  z.object({ action: z.literal('save_as_template'), key: z.string().trim().min(2).max(60), name: z.string().trim().min(2).max(120), vertical: z.string().trim().max(80).optional(), parent: z.string().trim().max(60).optional() }),
]);

/** Approve, reject, roll back, or promote this blueprint into the template library. */
export async function PUT(req: Request, { params }: { params: Params }) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const parsed = await parseJson(req, actionSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const bundle = await loadBundle(guard, id);
  if ('error' in bundle) return bundle.error;

  if (input.action === 'approve' || input.action === 'reject') {
    const { data, error } = await guard.supabase
      .from('factory_blueprints')
      .update(
        input.action === 'approve'
          ? { status: 'approved', approved_by: guard.user.email, approved_at: new Date().toISOString() }
          : { status: 'rejected', change_summary: `Rejected: ${input.reason}` },
      )
      .eq('id', input.blueprintId)
      .eq('factory_id', bundle.factory.id)
      .select('id, version, status')
      .maybeSingle();
    if (error) return bad(error.message, 500);
    if (!data) return bad('Blueprint version not found.', 404);

    await audit(guard.supabase, {
      tenantId: bundle.tenantId,
      factoryId: bundle.factory.id,
      actor: guard.user.email,
      actorKind: 'admin',
      action: input.action === 'approve' ? 'blueprint.approved' : 'blueprint.rejected',
      target: input.blueprintId,
      meta: input.action === 'reject' ? { reason: input.reason } : {},
    });
    return NextResponse.json({ blueprint: data });
  }

  if (input.action === 'rollback') {
    const res = await rollbackTo(guard.supabase, {
      tenantId: bundle.tenantId,
      factoryId: bundle.factory.id,
      version: input.version,
      actor: guard.user.email,
    });
    if ('error' in res) return bad(res.error);
    await audit(guard.supabase, {
      tenantId: bundle.tenantId,
      factoryId: bundle.factory.id,
      actor: guard.user.email,
      actorKind: 'admin',
      action: 'blueprint.rolled_back',
      meta: { to: input.version, newVersion: res.row.version },
      severity: 'warning',
    });
    return NextResponse.json({ version: res.row.version, note: `Rolled forward to version ${res.row.version}, carrying the configuration from version ${input.version}. Deploy it to make it live.` });
  }

  // SAVE AS TEMPLATE. This is how a Factory that worked becomes MMS IP.
  if (!bundle.blueprintRow) return bad('This Factory has no blueprint to promote.');
  const body = stripTenantData(bundle.blueprintRow.doc as unknown as Record<string, unknown>);

  const { data: latest } = await guard.supabase
    .from('factory_templates')
    .select('version')
    .eq('key', input.key)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((latest as { version: number } | null)?.version ?? 0) + 1;

  const { error } = await guard.supabase.from('factory_templates').insert({
    key: input.key,
    version,
    name: input.name,
    vertical: input.vertical ?? null,
    blurb: `Promoted from ${bundle.factory.name}.`,
    parent_key: input.parent ?? bundle.factory.template_key ?? 'base',
    body,
    // Always internal on promotion. A template earns its way to beta and then
    // stable by running, not by being saved.
    channel: 'internal',
    source_factory_id: bundle.factory.id,
    created_by: guard.user.email,
  });
  if (error) return bad(error.message, 500);

  await audit(guard.supabase, {
    tenantId: bundle.tenantId,
    factoryId: bundle.factory.id,
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'template.created',
    target: `${input.key}@${version}`,
    meta: { from: bundle.factory.name },
  });

  return NextResponse.json({
    template: { key: input.key, version, channel: 'internal' },
    note: 'Saved as an internal template with every tenant-specific fact stripped: business, economics, pricing, senders, owners and notes. Promote it to beta once it has run.',
  });
}
