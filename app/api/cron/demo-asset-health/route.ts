/**
 * BROKEN-IMAGE WATCHDOG for every site we put in front of someone.
 *
 * On 2026-08-02 two live demos, Miller Construction and Glacier Roofing, sat in
 * front of real prospects as pages of alt text. Only the html is stored and served;
 * the directory it was built in never leaves the laptop. Both builds had written
 * their photographs to disk and referenced them relatively, so every image 404'd and
 * the browser painted the long descriptive alt strings through the hero copy. Nobody
 * knew until Sarah opened one.
 *
 * Every write path is now gated (the worker re-inlines from disk, the serverless
 * forge refuses a document it cannot repair, the delivery editor rejects a paste).
 * This is the backstop for the case those gates miss: a path nobody thought of, a
 * manual row edit, a restored backup. Gates prevent; this detects.
 *
 * Silent when everything is clean, which is the only way a watchdog stays trusted.
 * Emails Sarah and returns 500 on a real finding, so the GitHub Actions run goes red
 * too (.github/workflows/demo-asset-health.yml). Same shape as checkout-health and
 * voice-health, and here for the same reason: the MMS Vercel project is on Hobby,
 * where crons are daily-only.
 *
 * ── WHY IT PAGES, AND WHY IT LOOKS AT A WINDOW ──
 * These rows carry entire websites with their photographs inlined as data URIs, so
 * the fleet is ~60MB of text. The first version selected all of it in one query and
 * Postgres killed it ("canceling statement due to statement timeout"), which is a
 * watchdog that reports a false emergency every hour. So it reads in small pages,
 * and by default only looks at rows touched in the last week. A site cannot break on
 * its own; it breaks when something writes it, and a write moves updated_at. Pass
 * ?full=1 for a complete sweep, or run `npm run audit:demo-assets` locally where
 * nothing is racing a serverless timeout.
 */
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { localAssetRefs } from '@/lib/site-asset-refs.mjs';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type Broken = { kind: string; id: string; name: string; refs: string[]; url: string };

const PAGE = 5; // ~4MB and ~2.3s per page; bigger pages risk the statement timeout
const WINDOW_DAYS = 7;
const DEADLINE_MS = 45_000; // leave headroom inside maxDuration for the alert email

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

  const full = new URL(req.url).searchParams.get('full') === '1';
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const startedAt = Date.now();
  const broken: Broken[] = [];
  let checked = 0;
  let truncated = false;

  /** Read one table in pages, stopping politely if we run out of time. */
  async function sweep(
    table: string,
    htmlCol: string,
    nameCol: string,
    kind: string,
    urlFor: (id: string) => string,
    windowed: boolean
  ): Promise<string | null> {
    for (let from = 0; ; from += PAGE) {
      if (Date.now() - startedAt > DEADLINE_MS) {
        truncated = true;
        return null;
      }
      // The column names are parameters, so PostgREST's compile-time select parser
      // cannot type this. The shape is checked at the point of use instead.
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
        const refs = localAssetRefs(row[htmlCol] as string);
        if (refs.length) {
          broken.push({
            kind,
            id: row.id as string,
            name: (row[nameCol] as string) || 'unnamed',
            refs,
            url: urlFor(row.id as string),
          });
        }
      }
      if (data.length < PAGE) return null;
    }
  }

  // Client sites first: fewest rows, and they are live pages somebody paid for.
  const projErr = await sweep('projects', 'site_html', 'name', 'client site', () => `${SITE.url}/admin/delivery`, false);
  if (projErr) return NextResponse.json({ error: projErr }, { status: 500 });

  const demoErr = await sweep(
    'outbound_demo_sites',
    'html',
    'business_name',
    'demo',
    (id) => `${SITE.url}/demo/site/${id}`,
    true
  );
  if (demoErr) return NextResponse.json({ error: demoErr }, { status: 500 });

  if (!broken.length) {
    return NextResponse.json({ ok: true, checked, broken: 0, window: full ? 'all' : `${WINDOW_DAYS}d`, truncated });
  }

  const fields = broken.slice(0, 12).map((b) => ({
    label: `${b.kind}: ${b.name}`,
    value: `${b.refs.length} broken image(s) [${b.refs.slice(0, 4).join(', ')}${b.refs.length > 4 ? ', ...' : ''}] ${b.url}`,
  }));

  if (process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `${broken.length} site(s) serving broken images`,
        html: leadNotification({
          type: 'Contact',
          name: 'Broken-image watchdog',
          email: 'sarah@modernmustardseed.com',
          fields,
          message:
            `${broken.length} site(s) are serving broken images right now. Each one renders its alt ` +
            `text where a photograph should be, in front of whoever opens it.`,
          suggestedAction:
            'Run npm run audit:demo-assets. It says which rows can be repaired in place and which ' +
            'have lost their assets and need forging again.',
        }),
      });
    } catch (err) {
      // An email failure must not swallow the finding: the 500 below still surfaces it.
      console.error('demo-asset-health alert email failed', err);
    }
  }

  return NextResponse.json(
    { ok: false, checked, broken: broken.length, window: full ? 'all' : `${WINDOW_DAYS}d`, truncated, sites: broken },
    { status: 500 }
  );
}
