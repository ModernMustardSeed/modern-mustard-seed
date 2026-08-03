import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { vercelConfig, MAX_DOMAIN_USD } from '@/lib/vercel-platform';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * CAN WE ACTUALLY PUT A CLIENT ON THE INTERNET RIGHT NOW?
 *
 * Publishing is the last mile of the whole funnel and the one step that happens
 * on a real customer's launch day, in front of them. It is also the step made of
 * the most things that rot quietly: an API token that got rotated, a team id that
 * moved, a registrar contact nobody ever filled in, a cron secret.
 *
 * As of 2026-08-03 nothing had exercised it since July, and the honest answer to
 * "is publishing working" was "probably". The delivery board could only tell you
 * whether the env vars EXIST, which is not the same as whether the token still
 * works. This asks the real questions and gets real answers, so the discovery
 * happens on a Tuesday instead of during a launch.
 *
 * Read-only by construction: it lists one project and reads one config row. It
 * never buys, deploys, or attaches anything.
 */
type Check = { id: string; ok: boolean; label: string; detail: string; blocks: string };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checks: Check[] = [];
  const cfg = vercelConfig();

  checks.push({
    id: 'vercel-env',
    ok: Boolean(cfg),
    label: 'Vercel credentials present',
    detail: cfg ? 'VERCEL_TOKEN and VERCEL_TEAM_ID are both set.' : 'VERCEL_TOKEN or VERCEL_TEAM_ID is missing.',
    blocks: 'buying a domain and publishing a site',
  });

  // The check that actually matters: does the token still work? A token that was
  // valid in July and rotated in August looks identical from the env list.
  if (cfg) {
    try {
      const res = await fetch(`https://api.vercel.com/v9/projects?limit=1&teamId=${encodeURIComponent(cfg.teamId)}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: 'no-store',
      });
      const body = (await res.json().catch(() => ({}))) as { projects?: unknown[]; error?: { message?: string } };
      checks.push({
        id: 'vercel-token',
        ok: res.ok,
        label: 'Vercel token is live',
        detail: res.ok
          ? `Authenticated against the team; the API answered with ${Array.isArray(body.projects) ? body.projects.length : 0} project(s).`
          : `Vercel refused the token (HTTP ${res.status}${body.error?.message ? `: ${body.error.message}` : ''}).`,
        blocks: 'buying a domain and publishing a site',
      });
    } catch (e) {
      checks.push({
        id: 'vercel-token',
        ok: false,
        label: 'Vercel token is live',
        detail: `Could not reach Vercel: ${e instanceof Error ? e.message : 'network error'}.`,
        blocks: 'buying a domain and publishing a site',
      });
    }
  }

  // A registrar legally requires a postal contact, so a domain purchase refuses
  // without one. This is the single most likely thing to be missing, because it
  // is the only one that cannot be inferred from anything else.
  let registrant = Boolean(process.env.MMS_ADDRESS1 && process.env.MMS_ZIP);
  let registrantFrom = registrant ? 'environment' : '';
  const sb = getSupabase();
  if (!registrant && sb) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', 'platform:registrant').maybeSingle();
      const v = data?.value as { address1?: string; zip?: string } | null;
      registrant = Boolean(v?.address1 && v?.zip);
      if (registrant) registrantFrom = 'saved on the delivery board';
    } catch { /* leave false */ }
  }
  checks.push({
    id: 'registrant',
    ok: registrant,
    label: 'Registrar contact on file',
    detail: registrant
      ? `A postal contact is set (${registrantFrom}).`
      : 'No postal address anywhere. A registrar requires one, so buying a domain will refuse. Set it once on the delivery board.',
    blocks: 'buying a domain (publishing to a vercel.app URL still works)',
  });

  // The reveal cron is what actually puts an approved site live on its day.
  checks.push({
    id: 'cron-secret',
    ok: Boolean(process.env.CRON_SECRET),
    label: 'Reveal cron can authenticate',
    detail: process.env.CRON_SECRET
      ? 'CRON_SECRET is set, so /api/cron/deliver will accept the scheduled call.'
      : 'CRON_SECRET is missing, so the scheduled reveal cannot run and an approved site waits forever.',
    blocks: 'the scheduled reveal',
  });

  const blocking = checks.filter((c) => !c.ok);
  return NextResponse.json({
    ok: blocking.length === 0,
    domainCeilingUsd: MAX_DOMAIN_USD,
    checks,
    // Publishing and domain-buying fail independently, and conflating them is how
    // "it is broken" gets said about a thing that half works.
    canPublish: checks.find((c) => c.id === 'vercel-token')?.ok ?? false,
    canBuyDomain: (checks.find((c) => c.id === 'vercel-token')?.ok ?? false) && registrant,
    summary: blocking.length
      ? `${blocking.length} thing(s) would stop a launch: ${blocking.map((c) => c.label.toLowerCase()).join(', ')}.`
      : 'Everything a launch needs is in place.',
  });
}
