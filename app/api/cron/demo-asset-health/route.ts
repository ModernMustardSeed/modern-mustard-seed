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

  const broken: Broken[] = [];
  let checked = 0;

  // The demo fleet: what prospects open from an email or an ad.
  const { data: demos, error: demoErr } = await sb
    .from('outbound_demo_sites')
    .select('id,business_name,html')
    .not('html', 'is', null);
  if (demoErr) {
    return NextResponse.json({ error: `could not read the demo fleet: ${demoErr.message}` }, { status: 500 });
  }
  for (const row of demos ?? []) {
    checked++;
    const refs = localAssetRefs(row.html as string);
    if (refs.length) {
      broken.push({
        kind: 'demo',
        id: row.id as string,
        name: (row.business_name as string) || 'unnamed',
        refs,
        url: `${SITE.url}/demo/site/${row.id}`,
      });
    }
  }

  // Client sites, which matter more: these are live pages somebody paid for.
  const { data: projects, error: projErr } = await sb
    .from('projects')
    .select('id,name,site_html')
    .not('site_html', 'is', null);
  if (projErr) {
    return NextResponse.json({ error: `could not read client sites: ${projErr.message}` }, { status: 500 });
  }
  for (const row of projects ?? []) {
    checked++;
    const refs = localAssetRefs(row.site_html as string);
    if (refs.length) {
      broken.push({
        kind: 'client site',
        id: row.id as string,
        name: (row.name as string) || 'unnamed',
        refs,
        url: `${SITE.url}/admin/delivery`,
      });
    }
  }

  if (!broken.length) {
    return NextResponse.json({ ok: true, checked, broken: 0 });
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
            'Run node scripts/audit-demo-assets.mjs. It says which rows can be repaired in place ' +
            'and which have lost their assets and need forging again.',
        }),
      });
    } catch (err) {
      // An email failure must not swallow the finding: the 500 below still surfaces it.
      console.error('demo-asset-health alert email failed', err);
    }
  }

  return NextResponse.json({ ok: false, checked, broken: broken.length, sites: broken }, { status: 500 });
}
