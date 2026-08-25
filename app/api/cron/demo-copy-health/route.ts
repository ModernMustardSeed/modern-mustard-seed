/**
 * BAD-COPY WATCHDOG for every site we put in front of someone.
 *
 * The twin of demo-asset-health. That one asks whether the pictures load. This
 * one reads the words, because on 2026-08-03 a full funnel test found that every
 * bakery, dental, medspa and salon demo we had ever built said "wants a quote on
 * a order", and that twenty-five surfaces (including the call pill on every demo
 * site, and therefore the walkthrough film) said "Olivia's Chocolates's".
 *
 * Nobody noticed either one for weeks. That is the whole argument for this file:
 * a broken image 404s and looks broken, while broken language renders perfectly,
 * passes every metric we collect, and quietly tells the prospect a machine wrote
 * their page. Machines have to watch it, because we demonstrably do not.
 *
 * Silent when clean. Emails Sarah and returns 500 on a HIGH severity finding, so
 * the GitHub Actions run goes red too. Low severity findings (an em dash, a
 * doubled word) are reported in the JSON and never page anyone: a watchdog that
 * pages over polish gets muted, and then it is not a watchdog.
 *
 * Same paging discipline as its twin: these rows carry whole websites with
 * photographs inlined, so the fleet is ~60MB of text and one greedy select gets
 * killed by Postgres. Small pages, windowed on updated_at, because a page cannot
 * develop a typo on its own. ?full=1 sweeps everything, ?selftest=1 proves the
 * alert path fires without touching a row.
 */
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { copyFindings, hasHighSeverity } from '@/lib/site-copy-lint.mjs';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type Finding = { id: string; severity: string; what: string; count: number; samples: string[] };
type Flagged = { kind: string; id: string; name: string; url: string; high: boolean; findings: Finding[] };

const PAGE = 5;
const WINDOW_DAYS = 7;
const DEADLINE_MS = 45_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, note: 'supabase not configured; watchdog idle' });

  const params = new URL(req.url).searchParams;
  const full = params.get('full') === '1';
  const selftest = params.get('selftest') === '1';
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const startedAt = Date.now();
  const flagged: Flagged[] = [];
  let checked = 0;
  let truncated = false;

  if (selftest) {
    flagged.push({
      kind: 'SELFTEST (not a real site)',
      id: 'selftest',
      name: 'Synthetic finding, nothing is actually wrong',
      url: `${SITE.url}/admin`,
      high: true,
      findings: [
        { id: 'double-possessive', severity: 'high', what: 'proof the alert path fires', count: 1, samples: ["Example Chocolates's"] },
      ],
    });
  }

  async function sweep(
    table: string,
    htmlCol: string,
    nameCol: string,
    kind: string,
    urlFor: (id: string) => string,
    windowed: boolean,
    cleanName: (raw: string) => string
  ): Promise<string | null> {
    for (let from = 0; ; from += PAGE) {
      if (Date.now() - startedAt > DEADLINE_MS) {
        truncated = true;
        return null;
      }
      // Column names are parameters here, so PostgREST cannot type the select.
      // The shape is checked at the point of use below.
      let q = sb!
        .from(table)
        .select(`id,${nameCol},${htmlCol}` as '*')
        .not(htmlCol, 'is', null)
        .order('updated_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (windowed && !full) q = q.gte('updated_at', since);

      const { data, error } = await q;
      if (error) return `could not read ${table}: ${error.message}`;
      if (!data?.length) return null;

      for (const row of data as unknown as Record<string, unknown>[]) {
        checked++;
        const name = cleanName((row[nameCol] as string) || '');
        const findings = copyFindings(row[htmlCol] as string, name) as Finding[];
        if (findings.length) {
          flagged.push({
            kind,
            id: row.id as string,
            name: name || 'unnamed',
            url: urlFor(row.id as string),
            high: hasHighSeverity(findings),
            findings,
          });
        }
      }
      if (data.length < PAGE) return null;
    }
  }

  // Client sites first: a paying customer's live page outranks a demo.
  // "Olivia's Chocolates: The Talking Website" carries the SKU, so strip it or
  // the business-name possessive check is looking for the wrong string.
  const projErr = await sweep(
    'projects',
    'site_html',
    'name',
    'client site',
    () => `${SITE.url}/admin/delivery`,
    false,
    (raw) => raw.replace(/:.*$/, '').trim()
  );
  if (projErr) return NextResponse.json({ error: projErr }, { status: 500 });

  const demoErr = await sweep(
    'outbound_demo_sites',
    'html',
    'business_name',
    'demo',
    (id) => `${SITE.url}/demo/site/${id}`,
    true,
    (raw) => raw.trim()
  );
  if (demoErr) return NextResponse.json({ error: demoErr }, { status: 500 });

  const high = flagged.filter((f) => f.high);

  if (!high.length) {
    return NextResponse.json({
      ok: true,
      checked,
      high: 0,
      polish: flagged.length,
      window: full ? 'all' : `${WINDOW_DAYS}d`,
      truncated,
      // Low-severity findings ride along in the response so a human can read them
      // on purpose, without any of them ever sending an email.
      findings: flagged.slice(0, 20),
    });
  }

  const fields = high.slice(0, 12).map((f) => ({
    label: `${f.kind}: ${f.name}`,
    value: `${f.findings
      .filter((x) => x.severity === 'high')
      .map((x) => `${x.what} (${x.samples.slice(0, 2).map((s) => `"${s}"`).join(', ')})`)
      .join('; ')} ${f.url}`,
  }));

  if (process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `${high.length} site(s) serving copy we would not say out loud`,
        html: leadNotification({
          type: 'Contact',
          name: 'Bad-copy watchdog',
          email: 'sarah@modernmustardseed.com',
          message:
            `These pages carry language a customer will read as machine-written. ` +
            `Run \`npm run audit:demo-copy\` for the full list, or open the page and fix it in the delivery editor.`,
          fields,
        }),
      });
    } catch {
      /* never let the alert email be the reason the watchdog fails silently */
    }
  }

  return NextResponse.json(
    { ok: false, checked, high: high.length, polish: flagged.length - high.length, truncated, findings: high.slice(0, 20) },
    { status: 500 }
  );
}
