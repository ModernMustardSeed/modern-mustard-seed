import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { commandCenterVisible } from '@/lib/command-center/visible';
import { resendClient } from '@/lib/send-email';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * THE FIRST OF THE MONTH, 8:23 AM MOUNTAIN (the cron fires daily; the
 * route acts only on the 1st). It tells Sarah the monthly review is due,
 * with last month's counts for every client whose Command Center is shown:
 * leads by door and by sign, replies sent from the mail desk, posts that went
 * out, photos added, review asks. It never emails a client. Client reports are
 * built in the monthly sweep, reviewed by Sarah, and sent only on her word
 * (Sarah, 2026-10-08). Every number is a count from the tables.
 */
const DOOR: Record<string, string> = { contact: 'contact form', intake: 'project form', refer: 'refer-a-friend', chat: 'website chat', questionnaire: 'questionnaire' };

export async function GET(req: Request) {
  await hydrateDesks();
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  // Runs daily so the collision check can reason about it; sends on the 1st,
  // Mountain time. ?force=1 sends today, for a test.
  const mtDay = Number(new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', day: 'numeric' }));
  if (mtDay !== 1 && new URL(req.url).searchParams.get('force') !== '1') return NextResponse.json({ ok: true, skipped: 'not the first of the month' });

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const s = start.toISOString();
  const e = end.toISOString();
  const report: Record<string, string> = {};
  const digest: { business: string; lines: string[] }[] = [];

  for (const p of Object.values(CLIENT_PROJECTS)) {
    const email = p.clientEmail;
    // Counts come from the Command Center, so a client who has not been shown it is left out.
    if (!(await commandCenterVisible(sb, email))) {
      report[p.key] = 'command center not shown yet';
      continue;
    }
    const [leads, visits, campaigns, mail, posts, photos, asks] = await Promise.all([
      sb.from('client_leads').select('source, sources, campaign, priority, handled_at').eq('client_email', email).gte('created_at', s).lt('created_at', e),
      sb.from('client_visits').select('campaign_code').eq('client_email', email).gte('created_at', s).lt('created_at', e),
      sb.from('client_campaigns').select('code, label').eq('client_email', email),
      sb.from('client_mail').select('category, status').eq('client_email', email).gte('received_at', s).lt('received_at', e),
      sb.from('posting_posts').select('status').eq('client_email', email).gte('scheduled_for', s.slice(0, 10)).lt('scheduled_for', e.slice(0, 10)),
      sb.from('client_project_photos').select('id').eq('client_email', email).gte('created_at', s).lt('created_at', e),
      sb.from('client_review_requests').select('id').eq('client_email', email).gte('created_at', s).lt('created_at', e),
    ]);
    const L = leads.data ?? [];
    const byDoor = new Map<string, number>();
    for (const l of L) for (const src of ((l.sources as string[]) ?? []).length ? (l.sources as string[]) : [String(l.source)]) byDoor.set(DOOR[src] ?? src, (byDoor.get(DOOR[src] ?? src) ?? 0) + 1);
    const called = L.filter((l) => l.handled_at).length;
    const labelOf = new Map((campaigns.data ?? []).map((c) => [c.code as string, c.label as string]));
    const bySign = new Map<string, number>();
    for (const v of visits.data ?? []) bySign.set(labelOf.get(v.campaign_code as string) ?? (v.campaign_code as string), (bySign.get(labelOf.get(v.campaign_code as string) ?? (v.campaign_code as string)) ?? 0) + 1);
    const leadsFromSigns = L.filter((l) => l.campaign).length;
    const M = mail.data ?? [];
    const replied = M.filter((m) => m.status === 'replied').length;
    const inquiries = M.filter((m) => m.category === 'lead').length;
    const P = posts.data ?? [];
    const published = P.filter((x) => x.status === 'published').length;

    const lines: string[] = [];
    lines.push(L.length ? `${L.length} ${L.length === 1 ? 'lead' : 'leads'} came in through the website${byDoor.size ? `: ${[...byDoor.entries()].map(([k, v]) => `${v} by ${k}`).join(', ')}` : ''}. ${called} marked called.` : 'No leads came in through the website.');
    if ((visits.data ?? []).length) lines.push(`${(visits.data ?? []).length} QR scans: ${[...bySign.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}. ${leadsFromSigns} ${leadsFromSigns === 1 ? 'lead' : 'leads'} came from a sign.`);
    if (M.length) lines.push(`${M.length} emails sorted, ${inquiries} of them new inquiries. ${replied} ${replied === 1 ? 'reply' : 'replies'} sent from the mail desk.`);
    if (P.length) lines.push(`${published} of ${P.length} planned posts went out.`);
    if ((photos.data ?? []).length) lines.push(`${(photos.data ?? []).length} project photos added.`);
    if ((asks.data ?? []).length) lines.push(`${(asks.data ?? []).length} review ${(asks.data ?? []).length === 1 ? 'ask' : 'asks'} sent.`);

    digest.push({ business: p.business, lines });
    report[p.key] = `counted, ${lines.length} lines`;
  }

  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const intro = 'The monthly review is due. Nothing has gone to any client. Open Claude Code and run the client monthly review: it sweeps every client, builds each report and email for you to read, and sends only when you say send.';
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'MMS monthly review <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      subject: `Monthly review is due: ${monthName}`,
      html: `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p>${esc(intro)}</p>${digest.map((d) => `<p style="margin:18px 0 6px;"><strong>${esc(d.business)}</strong></p>${d.lines.map((l) => `<p style="margin:0 0 6px;">${esc(l)}</p>`).join('')}`).join('')}</div>`,
      text: `${intro}\n\n${digest.map((d) => `${d.business}\n${d.lines.join('\n')}`).join('\n\n')}`,
    });
    report.sarah = `sent, ${digest.length} clients`;
  } catch (err) {
    report.sarah = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  return NextResponse.json({ ok: true, month: monthName, report });
}
