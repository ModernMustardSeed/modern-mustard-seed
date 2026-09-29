import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { CLIENT_PROJECTS, type ClientProject } from '@/lib/client-leads';
import { hydrateDesks } from '@/lib/client-desks';
import { doorOf } from '@/lib/cc-access';
import { buildWeek, forecastFor, type DayVerdict } from '@/lib/cc-weather';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * THE MORNING BRIEF. Before the truck leaves, one email to the people a client
 * named for it: who is waiting on a call and for how long, how many emails
 * need a reply, and whether today is a day to pour, move dirt or be on a roof.
 * Three facts and a link, readable one handed.
 *
 * Runs at 13:13 UTC (7:13 in Mountain summer time). Only projects with
 * `morningBrief` get one, and only the people it names. `?preview=1` returns
 * what would be sent without sending, and `?client=` limits the pass.
 */

const PLACES: Record<string, { lat: number; lon: number }> = {
  kalispell: { lat: 48.1958, lon: -114.3129 },
  whitefish: { lat: 48.4111, lon: -114.3376 },
  bigfork: { lat: 48.0633, lon: -114.0724 },
  eureka: { lat: 48.8797, lon: -115.0537 },
  polson: { lat: 47.6936, lon: -114.1633 },
  'columbia falls': { lat: 48.3722, lon: -114.1817 },
  lakeside: { lat: 48.0158, lon: -114.2233 },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function waitedLabel(iso: string): string {
  const h = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'}`;
}

type Brief = { subject: string; html: string; text: string };

async function briefFor(project: ClientProject): Promise<Brief | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const email = project.clientEmail.toLowerCase();

  const [leadsQ, mailQ] = await Promise.all([
    sb.from('client_leads').select('name, town, created_at').eq('client_email', email).is('handled_at', null).order('created_at', { ascending: true }).limit(8),
    sb.from('client_mail').select('id', { count: 'exact', head: true }).eq('client_email', email).eq('status', 'new').eq('needs_reply', true),
  ]);
  const waiting = (leadsQ.data ?? []) as Array<{ name: string | null; town: string | null; created_at: string }>;
  const replies = mailQ.count ?? 0;

  const postal = (project.postal ?? '').toLowerCase();
  const town = Object.keys(PLACES).find((t) => postal.includes(t)) ?? 'kalispell';
  let today: DayVerdict | null = null;
  try {
    const fc = await forecastFor(PLACES[town].lat, PLACES[town].lon);
    if (fc) today = buildWeek(fc.place, fc.periods).days[0] ?? null;
  } catch {
    today = null;
  }

  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Denver' });
  const link = `${SITE.url}/cc/${doorOf(project)}`;
  const yes = (v: { ok: boolean } | undefined) => (v?.ok ? 'yes' : 'no');
  const weatherLine = today
    ? `${today.sky}${today.high != null ? `, high ${today.high}` : ''}. Pour: ${yes(today.concrete)}. Dirt: ${yes(today.dirt)}. Roof: ${yes(today.roof)}.`
    : 'The forecast did not answer this morning.';

  const subjectBits = [
    waiting.length ? `${waiting.length} waiting on a call` : 'nobody waiting on a call',
    replies ? `${replies} ${replies === 1 ? 'email' : 'emails'} to answer` : null,
    today ? (today.concrete.ok ? 'a pour day' : 'no pour today') : null,
  ].filter(Boolean);
  const subject = `${day.split(',')[0]}: ${subjectBits.join(', ')}`;

  const leadRows = waiting.length
    ? waiting.map((l) => `<tr><td style="padding:6px 0;font:600 15px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12151b">${esc(l.name ?? 'Someone')}${l.town ? `<span style="font-weight:400;color:#5b6472">, ${esc(l.town)}</span>` : ''}</td><td style="padding:6px 0;text-align:right;font:400 14px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#b42318;white-space:nowrap">${waitedLabel(l.created_at)}</td></tr>`).join('')
    : `<tr><td style="padding:6px 0;font:400 15px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#5b6472">Nobody. Every lead has been called.</td></tr>`;

  const section = (title: string, inner: string) =>
    `<tr><td style="padding:18px 24px 0"><div style="font:600 11px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#5b6472;padding-bottom:8px">${title}</div>${inner}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e6e8ec">
<tr><td style="padding:22px 24px 0;font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${project.office.colors.accent}">${esc(project.business)}</td></tr>
<tr><td style="padding:4px 24px 0;font:400 22px/1.3 Georgia,'Times New Roman',serif;color:#12151b">Good morning. ${esc(day)}.</td></tr>
${section('Waiting on a call', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${leadRows}</table>`)}
${section('Email', `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12151b">${replies ? `${replies} ${replies === 1 ? 'email needs' : 'emails need'} a reply, each with one already drafted.` : 'Nothing waiting on a reply.'}</div>`)}
${section(`Today on site${today ? `, ${esc(town.replace(/\b\w/g, (c) => c.toUpperCase()))}` : ''}`, `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12151b">${esc(weatherLine)}</div>`)}
<tr><td style="padding:22px 24px 24px"><a href="${link}" style="display:inline-block;background:${project.office.colors.accent};color:#ffffff;text-decoration:none;font:700 15px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:10px">Open the Command Center</a></td></tr>
</table>
<div style="font:400 12px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8b949e;padding:14px">Built and run by <a href="https://modernmustardseed.com" style="color:#F5B700">Modern Mustard Seed</a></div>
</td></tr></table></body></html>`;

  const text = [
    `${project.business}. Good morning, ${day}.`,
    '',
    'Waiting on a call:',
    ...(waiting.length ? waiting.map((l) => `- ${l.name ?? 'Someone'}${l.town ? `, ${l.town}` : ''}: ${waitedLabel(l.created_at)}`) : ['- Nobody. Every lead has been called.']),
    '',
    replies ? `${replies} ${replies === 1 ? 'email needs' : 'emails need'} a reply, each with one already drafted.` : 'Nothing waiting on a reply.',
    '',
    `Today on site: ${weatherLine}`,
    '',
    `Open the Command Center: ${link}`,
  ].join('\n');

  return { subject, html, text };
}

export async function GET(req: Request) {
  await hydrateDesks();
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const only = url.searchParams.get('client')?.toLowerCase() ?? null;
  const preview = url.searchParams.get('preview') === '1';

  const report: Array<Record<string, unknown>> = [];
  for (const project of Object.values(CLIENT_PROJECTS)) {
    if (!project.morningBrief?.length) continue;
    if (only && project.clientEmail.toLowerCase() !== only) continue;
    const to = project.morningBrief.map((k) => project.people?.[k]?.email).filter((e): e is string => Boolean(e));
    if (!to.length) continue;
    const brief = await briefFor(project);
    if (!brief) {
      report.push({ client: project.clientEmail, sent: false, why: 'no database' });
      continue;
    }
    if (preview) {
      report.push({ client: project.clientEmail, to, subject: brief.subject, text: brief.text });
      continue;
    }
    try {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
      await resendClient().emails.send({
        from: `${project.business} Command Center <sarah@modernmustardseed.com>`,
        to,
        replyTo: 'sarah@modernmustardseed.com',
        subject: brief.subject,
        html: brief.html,
        text: brief.text,
      });
      report.push({ client: project.clientEmail, to, sent: true, subject: brief.subject });
    } catch (err) {
      report.push({ client: project.clientEmail, to, sent: false, why: err instanceof Error ? err.message : 'failed' });
    }
  }
  return NextResponse.json({ ok: true, report });
}
