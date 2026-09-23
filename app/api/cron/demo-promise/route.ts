import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE 24-HOUR PROMISE, WATCHED (2026-09-23).
 *
 * The homepage, /demos, the hub and every demo email now promise a website
 * "within 24 hours". The build floor has stalled silently before (a finished
 * voice agent, a site stuck on the anvil, no error anywhere), so the promise
 * gets a watchman. Hourly, this finds websites a person ASKED for (Demo
 * Station, Mr. Mustard on a call, a partner's link) that are:
 *   - failed in the last hour, or
 *   - still not ready as they cross 18 hours old,
 * and emails Sarah one list while there are six hours left to make it right.
 *
 * Each run looks only at the hour that just passed, so every site is reported
 * once, with no state to keep. Cold acquisition builds are not a promise to
 * anybody and are left out. Fails closed on CRON_SECRET.
 */

const ASKED = new Set(['demo-station', 'mr-mustard']);

function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

type SiteRow = { id: string; lead_id: string | null; business_name: string | null; status: string; created_at: string; updated_at: string | null };
type LeadRow = { id: string; source: string | null; origin: string | null; email: string | null; hub_demo_url: string | null };

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });

  const now = Date.now();
  const hour = 3600_000;
  const iso = (ms: number) => new Date(now - ms).toISOString();

  // Crossing 18 hours in the last hour, and not ready.
  const { data: late } = await db
    .from('outbound_demo_sites')
    .select('id, lead_id, business_name, status, created_at, updated_at')
    .in('status', ['queued', 'building', 'failed'])
    .lte('created_at', iso(18 * hour))
    .gt('created_at', iso(19 * hour))
    .limit(200);

  // Failed in the last hour, at any age under 18 hours (those are in `late`).
  const { data: failed } = await db
    .from('outbound_demo_sites')
    .select('id, lead_id, business_name, status, created_at, updated_at')
    .eq('status', 'failed')
    .gt('updated_at', iso(hour))
    .gt('created_at', iso(18 * hour))
    .limit(200);

  const sites = [...((late ?? []) as SiteRow[]), ...((failed ?? []) as SiteRow[])];
  const leadIds = [...new Set(sites.map((s) => s.lead_id).filter((x): x is string => Boolean(x)))];
  const { data: leads } = leadIds.length
    ? await db.from('outbound_leads').select('id, source, origin, email, hub_demo_url').in('id', leadIds)
    : { data: [] as LeadRow[] };
  const byId = new Map(((leads ?? []) as LeadRow[]).map((l) => [l.id, l]));

  const flagged = sites
    .map((s) => ({ site: s, lead: s.lead_id ? byId.get(s.lead_id) : undefined }))
    .filter(({ lead }) => lead && (ASKED.has(lead.source ?? '') || lead.origin === 'partner'));

  if (!flagged.length) return NextResponse.json({ ok: true, flagged: 0 });

  const rows = flagged
    .map(({ site, lead }) => {
      const age = Math.round((now - new Date(site.created_at).getTime()) / hour);
      const what = site.status === 'failed' ? `<strong>failed</strong> at ${age}h` : `still <strong>${site.status}</strong> at ${age}h`;
      const hub = lead?.hub_demo_url ? ` · <a href="${lead.hub_demo_url}">hub</a>` : '';
      return `<li><strong>${site.business_name ?? 'Unnamed'}</strong>: ${what}${hub} · <a href="${SITE.url}/demo/site/${site.id}">site</a></li>`;
    })
    .join('');

  if (process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `24-hour promise at risk: ${flagged.length} demo ${flagged.length === 1 ? 'website' : 'websites'}`,
        html: clientEmail({
          preheader: 'A requested demo website is running late or failed.',
          eyebrow: 'THE 24-HOUR PROMISE',
          greeting: 'These need a hand.',
          body: `<p>Someone asked for these, and the page promised the website within 24 hours:</p><ul>${rows}</ul><p>A failed build can be rebuilt from the build board. A stuck one usually means the worker is down.</p>`,
          signature: 'The Demo Station',
        }),
      });
    } catch (err) {
      console.error('demo-promise alert failed', err);
      return NextResponse.json({ ok: false, flagged: flagged.length, error: 'send_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, flagged: flagged.length });
}
