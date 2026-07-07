/**
 * The GEO Watch: daily cron (Hobby plan = daily only) that re-grades every
 * watched site that is due (monthly cadence anchored to createdAt), emails
 * the owner the delta in plain words, and flags drift loudly.
 *
 * Hardened per ship-gate: each watch is LEASED (nextAt pushed forward with a
 * verified write) BEFORE any auditing or emailing, so a crash, a concurrent
 * run, or an unauthenticated re-trigger can never double-audit or
 * double-email. Optional CRON_SECRET gate when the env is set.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { dueGeoWatches, saveGeoWatch, type GeoWatch } from '@/lib/geo-store';
import { runWebsiteAudit } from '@/lib/website-audit';
import { clientEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH = 4; // watches per run; each can hold up to 3 URLs (~30s per audit)

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Monthly cadence anchored to createdAt so cycles never drift past expiry. */
function nextAnchored(watch: GeoWatch): { nextAt: string; cycles: number } {
  const created = new Date(watch.createdAt).getTime();
  const cycles = (watch.cycles ?? 0) + 1;
  return { nextAt: new Date(created + (cycles + 1) * 30 * 86400_000).toISOString(), cycles };
}

export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get('key') !== secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: 'no_store' }, { status: 503 });

  const due = await dueGeoWatches(supabase, BATCH);
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const results: Record<string, string> = {};

  for (const { id, watch } of due) {
    // LEASE FIRST: push nextAt forward before any expensive/side-effect work.
    // If the lease write fails, skip: better a late report than a double one.
    const { nextAt, cycles } = nextAnchored(watch);
    const leased = await saveGeoWatch(supabase, id, { ...watch, nextAt, cycles });
    if (!leased) {
      results[id] = 'lease_failed';
      continue;
    }

    const lines: string[] = [];
    const nextScores: Record<string, number> = { ...watch.lastScores };
    let drift = false;

    for (const url of watch.urls.slice(0, 3)) {
      const audit = await runWebsiteAudit(url);
      if (!audit.ok) {
        lines.push(`<p><strong>${esc(url)}</strong>: could not be scanned this month (${esc(audit.error)}). We will retry next cycle; if your site is down, that is worth a look today.</p>`);
        drift = true;
        continue;
      }
      const prev = watch.lastScores[url];
      const score = audit.report.overall_score ?? 0;
      nextScores[url] = score;
      const delta = prev == null ? null : score - prev;
      const deltaText = delta == null ? 'baseline set' : delta === 0 ? 'no change' : delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`;
      if (delta != null && delta < -5) drift = true;
      const topFix = audit.report.top_three_fixes?.[0];
      lines.push(
        `<p><strong>${esc(url)}</strong>: <strong>${esc(audit.report.letter_grade)} (${score}/100)</strong>, ${deltaText}.<br/>${esc(audit.report.headline ?? '')}${topFix ? `<br/>Next best fix: <em>${esc(topFix.title)}</em>` : ''}</p>`
      );
    }

    if (resendKey && lines.length) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: watch.email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: drift ? 'Your Watch report (something moved)' : 'Your monthly Watch report',
          html: clientEmail({
            preheader: 'This month\'s AI-findability re-grade.',
            eyebrow: 'GEO DESK · THE WATCH',
            greeting: drift ? 'Something moved this month.' : 'Steady as she goes.',
            body: lines.join('') + '<p style="font-size:13px;color:#666">Honest reports, never ranking promises. Reply anytime; it reaches Sarah directly.</p>',
            signature: 'Sarah',
          }),
        });
      } catch (err) {
        console.error('geo watch email failed', id, err);
      }
    }

    await saveGeoWatch(supabase, id, { ...watch, lastScores: nextScores, nextAt, cycles });
    results[id] = 'sent';
  }

  return NextResponse.json({ ok: true, processed: due.length, results });
}
