import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE SITE SMOKE CHECK (2026-09-23). Two failures in one week sat silent for
 * days: the build ask dying at 60 seconds, and every demo website reading
 * "refused to connect" after a header change. This runs after every production
 * deploy and every half hour (.github/workflows/site-smoke.yml) and emails
 * Sarah the moment one of the money paths breaks.
 *
 * It never creates a lead, spends a build slot or sends a customer anything:
 * the build ask is probed with an empty body, which must come back as a fast
 * validation error, proving the route is alive without doing any work.
 * Fails closed on CRON_SECRET.
 */

type Check = { name: string; ok: boolean; detail: string };

function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

async function timed(url: string, init?: RequestInit): Promise<{ res: Response | null; ms: number; error?: string }> {
  const t = Date.now();
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    return { res, ms: Date.now() - t };
  } catch (err) {
    return { res: null, ms: Date.now() - t, error: err instanceof Error ? err.message : String(err) };
  }
}

async function page(name: string, path: string, marker: string): Promise<Check> {
  const { res, ms, error } = await timed(`${SITE.url}${path}?smoke=${Date.now()}`);
  if (!res) return { name, ok: false, detail: `no response (${error})` };
  const body = await res.text();
  const ok = res.status === 200 && body.includes(marker);
  return { name, ok, detail: `${res.status} in ${ms}ms${ok ? '' : `, expected "${marker}" on the page`}` };
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const selftest = new URL(req.url).searchParams.get('selftest') === '1';

  const checks: Check[] = await Promise.all([
    page('Homepage', '/', 'Beautifully'),
    page('Build ask page (/demos)', '/demos', 'We sketch your'),
    page('For the Kingdom', '/kingdom', 'Until all have heard'),
    // The build ask must answer, and fast. An empty body is a validation error:
    // the route is alive and nothing is built.
    (async (): Promise<Check> => {
      const { res, ms, error } = await timed(`${SITE.url}/api/demo-station`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res) return { name: 'Build ask endpoint', ok: false, detail: `no response (${error})` };
      const ok = res.status === 400 && ms < 10000;
      return { name: 'Build ask endpoint', ok, detail: `${res.status} in ${ms}ms (expects a fast 400 on an empty request)` };
    })(),
    // A real finished demo website must render inside our own frame.
    (async (): Promise<Check> => {
      const db = getSupabase();
      if (!db) return { name: 'Demo website frame', ok: false, detail: 'database not configured' };
      const { data } = await db
        .from('outbound_demo_sites')
        .select('id')
        .eq('status', 'ready')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.id) return { name: 'Demo website frame', ok: true, detail: 'no ready demo site to check' };
      const { res, ms, error } = await timed(`${SITE.url}/demo/site/${data.id}/raw`);
      if (!res) return { name: 'Demo website frame', ok: false, detail: `no response (${error})` };
      const xfo = (res.headers.get('x-frame-options') || '').toUpperCase();
      const csp = res.headers.get('content-security-policy') || '';
      const body = await res.text();
      const framable = xfo !== 'DENY' && !/frame-ancestors\s+'none'/.test(csp);
      const ok = res.status === 200 && framable && body.length > 2000;
      return {
        name: 'Demo website frame',
        ok,
        detail: `${res.status} in ${ms}ms, X-Frame-Options ${xfo || 'none'}${framable ? '' : ' (blocks our own demo viewer)'}, ${body.length} bytes`,
      };
    })(),
  ]);

  if (selftest) checks.push({ name: 'Self-test', ok: false, detail: 'synthetic failure to prove the alert email works' });

  const failed = checks.filter((c) => !c.ok);
  if (failed.length && process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `SITE CHECK FAILED: ${failed.map((c) => c.name).join(', ')}`,
        html: clientEmail({
          preheader: 'A money path on modernmustardseed.com is broken right now.',
          eyebrow: 'SITE SMOKE CHECK',
          greeting: 'Something on the site just broke.',
          body: `<ul>${checks.map((c) => `<li>${c.ok ? '✅' : '❌'} <strong>${c.name}</strong>: ${c.detail}</li>`).join('')}</ul><p>This check runs after every production deploy and every half hour. The most recent deploy is the first suspect.</p>`,
          signature: 'The Site Check',
        }),
      });
    } catch (err) {
      console.error('site-smoke alert failed', err);
    }
  }

  return NextResponse.json({ ok: failed.length === 0, checks }, { status: failed.length ? 500 : 200 });
}
