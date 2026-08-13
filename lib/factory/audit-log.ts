import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * THE FACTORY AUDIT LOG.
 *
 * At ten tenants, memory works. At a thousand it does not, and "who turned this
 * campaign back on" stops being answerable by asking around. Every action that
 * changes what a Factory does, spends money, or touches a prospect writes a row
 * here.
 *
 * NEVER LOG A SECRET. `meta` is redacted on the way in rather than trusted at
 * the call site, because the call site is exactly where a credential ends up in
 * an object by accident.
 */

export type AuditAction =
  | 'tenant.created' | 'tenant.updated' | 'tenant.plan_changed'
  | 'factory.created' | 'factory.updated' | 'factory.cloned'
  | 'factory.activated' | 'factory.paused' | 'factory.resumed' | 'factory.mode_changed' | 'factory.autonomy_changed'
  | 'blueprint.generated' | 'blueprint.edited' | 'blueprint.approved' | 'blueprint.rejected'
  | 'blueprint.deployed' | 'blueprint.rolled_back'
  | 'template.created' | 'template.published' | 'template.deprecated'
  | 'campaign.created' | 'campaign.activated' | 'campaign.paused' | 'campaign.updated'
  | 'prospects.imported' | 'prospects.sourced' | 'prospect.suppressed'
  | 'message.sent' | 'message.received'
  | 'conversation.started' | 'conversation.escalated'
  | 'action.run' | 'action.delivered'
  | 'meeting.booked' | 'checkout.sent' | 'proposal.created'
  | 'integration.connected' | 'integration.failed' | 'integration.disconnected'
  | 'billing.changed' | 'limit.reached' | 'simulation.run' | 'experiment.decided'
  | 'admin.action';

export type AuditEntry = {
  tenantId?: string | null;
  factoryId?: string | null;
  actor?: string | null;
  actorKind?: 'admin' | 'client' | 'system' | 'ai';
  action: AuditAction;
  target?: string | null;
  meta?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
};

/** Key fragments whose values never reach the log, whatever the caller passed. */
const SECRET_HINTS = ['secret', 'token', 'password', 'key', 'credential', 'authorization', 'cookie', 'apikey'];

export function redact(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (SECRET_HINTS.some((h) => lower.includes(h))) {
      out[k] = '[redacted]';
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>);
      continue;
    }
    if (typeof v === 'string' && v.length > 2000) {
      out[k] = `${v.slice(0, 2000)}…`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Write an audit row. Never throws: a failed audit write must not take down the
 * operation it was recording, and a swallowed error here is visible in the
 * server log rather than as a 500 on a customer's screen.
 */
export async function audit(supabase: SupabaseClient, entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase.from('factory_events').insert({
      tenant_id: entry.tenantId ?? null,
      factory_id: entry.factoryId ?? null,
      actor: entry.actor ?? null,
      actor_kind: entry.actorKind ?? 'system',
      action: entry.action,
      target: entry.target ?? null,
      meta: redact(entry.meta),
      severity: entry.severity ?? 'info',
    });
    if (error) console.error('audit insert failed', entry.action, error.message);
  } catch (err) {
    console.error('audit threw', entry.action, err);
  }
}

export type AuditRow = {
  id: string;
  tenant_id: string | null;
  factory_id: string | null;
  actor: string | null;
  actor_kind: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  occurred_at: string;
};

export async function recentAudit(
  supabase: SupabaseClient,
  opts: { tenantId?: string; factoryId?: string; limit?: number } = {},
): Promise<AuditRow[]> {
  let q = supabase.from('factory_events').select('*').order('occurred_at', { ascending: false }).limit(opts.limit ?? 50);
  if (opts.tenantId) q = q.eq('tenant_id', opts.tenantId);
  if (opts.factoryId) q = q.eq('factory_id', opts.factoryId);
  const { data } = await q;
  return (data as AuditRow[]) ?? [];
}
