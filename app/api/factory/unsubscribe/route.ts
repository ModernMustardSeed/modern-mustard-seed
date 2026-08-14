import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { suppress, recordConsent } from '@/lib/factory/campaigns';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';

/**
 * UNSUBSCRIBE. Public, unauthenticated, and it works on the first click.
 *
 * Both GET and POST are handled: GET is the link in the footer, POST is RFC
 * 8058 one-click, which Gmail and Yahoo send automatically from their own
 * interface. A sender that honours one and not the other is a sender whose
 * complaints keep rising for reasons nobody can explain.
 *
 * NO CONFIRMATION STEP. No "are you sure", no preference centre, no "you have
 * been removed from this list but not that one". They asked once, in the way we
 * offered, and it is done: the address is suppressed for the whole tenant, the
 * prospect is moved out of every campaign, and the revocation is recorded as
 * evidence.
 *
 * The ids identify a Factory and a prospect, so guessing one gets you nothing
 * except unsubscribing a stranger, which is the failure mode worth having.
 */
async function unsubscribe(factoryId: string | null, prospectId: string | null): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'We could not process that right now. Reply to the email and we will remove you by hand.' };
  if (!factoryId || !prospectId) return { ok: false, message: 'That link is incomplete. Reply to the email and we will remove you by hand.' };

  const { data } = await supabase
    .from('factory_prospects')
    .select('id, tenant_id, factory_id, email, domain, company')
    .eq('id', prospectId)
    .eq('factory_id', factoryId)
    .maybeSingle();
  const prospect = data as { id: string; tenant_id: string; factory_id: string; email: string | null; company: string } | null;
  if (!prospect) return { ok: false, message: 'That link is no longer valid. Reply to the email and we will remove you by hand.' };

  if (prospect.email) {
    await suppress(supabase, prospect.tenant_id, { kind: 'email', value: prospect.email, reason: 'unsubscribe' });
  }
  await Promise.all([
    supabase
      .from('factory_prospects')
      .update({ state: 'suppressed', suppressed_at: new Date().toISOString(), suppressed_reason: 'unsubscribe', next_action_at: null })
      .eq('id', prospect.id),
    recordConsent(supabase, {
      tenantId: prospect.tenant_id,
      prospectId: prospect.id,
      channel: 'email',
      state: 'revoked',
      evidence: { via: 'unsubscribe_link', at: new Date().toISOString() },
    }),
    audit(supabase, {
      tenantId: prospect.tenant_id,
      factoryId: prospect.factory_id,
      action: 'prospect.suppressed',
      target: prospect.id,
      actorKind: 'system',
      meta: { reason: 'unsubscribe' },
    }),
  ]);

  return { ok: true, message: 'Done. You will not hear from us again.' };
}

function page(message: string, ok: boolean): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/><title>${ok ? 'Unsubscribed' : 'Unsubscribe'}</title><style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf8f3;color:#2b2a26;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
    .card{max-width:32rem;background:#fff;border:1px solid #e5e0d5;border-radius:14px;padding:32px}
    h1{margin:0 0 10px;font-size:1.35rem;letter-spacing:-0.01em}
    p{margin:0;color:#5d574c}
  </style></head><body><div class="card"><h1>${ok ? 'Unsubscribed' : 'We could not do that'}</h1><p>${message}</p></div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const result = await unsubscribe(url.searchParams.get('f'), url.searchParams.get('p'));
  return page(result.message, result.ok);
}

/** RFC 8058 one-click. The mail client expects a 200 and nothing else. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const result = await unsubscribe(url.searchParams.get('f'), url.searchParams.get('p'));
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 400 });
}
