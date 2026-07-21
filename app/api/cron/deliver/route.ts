import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { publishProject } from '@/lib/site-publish';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * THE SCHEDULED REVEAL.
 *
 * The site is built the hour they pay. It is not SHOWN the hour they pay. It sits on
 * the delivery board until a human looks at it, and then it goes out on the day we
 * told them it would. That gap is the product: a studio, not a vending machine.
 *
 * TWO CONDITIONS, BOTH REQUIRED, AND THIS IS THE WHOLE SAFETY ARGUMENT:
 *   approved_at IS NOT NULL   a person signed it
 *   reveal_at   <= now()      the day arrived
 *
 * Requiring BOTH is deliberate. A date on its own can never ship an unreviewed site
 * (a typo in a date field is not allowed to put a stranger's half-built page on the
 * internet under their name), and an approval on its own can never jump the queue.
 *
 * Runs hourly. Vercel Pro allows sub-daily crons; Hobby rejects them AT BUILD TIME and
 * has broken every deploy in this repo before, so if this project is ever downgraded,
 * this schedule has to move to GitHub Actions like forge-fallback did.
 */

const BATCH = 5;

export async function GET(req: Request) {
  // Vercel signs its cron calls. Anything else is a stranger asking us to publish
  // client websites, so it fails closed: no secret configured, no publishing.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: due, error } = await sb
    .from('projects')
    .select('id, name')
    .not('approved_at', 'is', null)
    .not('reveal_at', 'is', null)
    .lte('reveal_at', new Date().toISOString())
    .is('site_published_at', null)
    .not('site_html', 'is', null)
    // A direction board the client has not signed yet holds the reveal. Boards
    // never sent (none/draft) hold nothing, so every pre-board project and any
    // project Sarah skips the board on behaves exactly as before.
    .not('moodboard_status', 'in', '(sent,changes)')
    .order('reveal_at', { ascending: true })
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ ok: true, published: 0 });

  const results: Array<{ project: string; ok: boolean; detail: string }> = [];
  for (const p of due) {
    // Serial, not parallel: each publish is a real Vercel deployment, and a failure
    // must not take the rest of the batch down with it.
    try {
      const pub = await publishProject(sb, p.id as string);
      results.push({
        project: String(p.name ?? p.id),
        ok: pub.ok,
        detail: pub.ok ? pub.liveUrl : pub.error,
      });
      if (!pub.ok) {
        // Say so where Sarah will see it. A silent failure here is a client sitting on
        // their promised launch day with nothing.
        await sb.from('projects').update({ site_build_error: `Reveal failed: ${pub.error}` }).eq('id', p.id);
      }
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      results.push({ project: String(p.name ?? p.id), ok: false, detail: msg });
      await sb.from('projects').update({ site_build_error: `Reveal threw: ${msg}` }).eq('id', p.id);
    }
  }

  return NextResponse.json({ ok: true, published: results.filter((r) => r.ok).length, results });
}
