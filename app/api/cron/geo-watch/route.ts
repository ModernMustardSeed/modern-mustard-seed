/**
 * The GEO Watch: daily cron (Hobby plan = daily only) that re-grades every
 * watched site that is due (monthly cadence per site), emails the owner the
 * delta in plain words, and flags drift loudly. Processes a bounded batch per
 * run so a pile-up can never blow the function budget.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { dueGeoWatches, saveGeoWatch } from '@/lib/geo-store';
import { runWebsiteAudit } from '@/lib/website-audit';
import { clientEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH = 5;

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: 'no_store' }, { status: 503 });

  const due = await dueGeoWatches(supabase, BATCH);
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const results: Record<string, string> = {};

  for (const { id, watch } of due) {
    const lines: string[] = [];
    const nextScores: Record<string, number> = { ...watch.lastScores };
    let drift = false;

    for (const url of watch.urls.slice(0, 3)) {
      const audit = await runWebsiteAudit(url);
      if (!audit.ok) {
        lines.push(`<p><strong>${url}</strong>: could not be scanned this month (${audit.error}). We will retry next cycle; if your site is down, that is worth a look today.</p>`);
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
        `<p><strong>${url}</strong>: <strong>${audit.report.letter_grade} (${score}/100)</strong>, ${deltaText}.<br/>${audit.report.headline ?? ''}${topFix ? `<br/>Next best fix: <em>${topFix.title}</em>` : ''}</p>`
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

    await saveGeoWatch(supabase, id, {
      ...watch,
      lastScores: nextScores,
      nextAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    });
    results[id] = 'sent';
  }

  return NextResponse.json({ ok: true, processed: due.length, results });
}
