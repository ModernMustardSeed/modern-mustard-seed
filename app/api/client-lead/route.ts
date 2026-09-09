import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * A LEAD FROM A CLIENT'S OWN SITE.
 *
 * Every form on a site we ship (contact, intake, refer a friend, the
 * first-week questionnaire) and the chat agent's send_lead tool post here.
 * The row is written first, then the client is told twice, by text and by
 * email, in plain words, and Sarah gets a copy. Nothing here sets a status a
 * person owns.
 *
 * One person, one row. A questionnaire or a second form from a phone or email
 * seen in the last thirty days attaches to that lead instead of opening a
 * new one, and `sources` keeps every door they came through, in order. That is
 * how "where do our leads come from" gets a true answer.
 *
 * Two body shapes:
 *   - The site forms: the fields below, as JSON.
 *   - Vapi: { message: { type: 'tool-calls', toolCallList: [{ id, arguments }] } },
 *     answered in the shape Vapi expects so the agent can say it went through.
 */
type Project = { clientEmail: string; business: string; origins: string[]; notify: { phone: string | null; emails: string[] } };

const PROJECTS: Record<string, Project> = {
  'built-right': {
    clientEmail: 'builtbyshan@gmail.com',
    business: 'Built Right in Montana',
    origins: ['https://built-right-montana-demo.vercel.app', 'https://builtrightinmontana.com', 'https://www.builtrightinmontana.com', 'https://built-right-prep.vercel.app'],
    notify: { phone: '(406) 471-5613', emails: ['builtbyshan@gmail.com'] },
  },
};

const SOURCES = ['contact', 'intake', 'refer', 'chat', 'questionnaire'] as const;
type Source = (typeof SOURCES)[number];
const VIA: Record<Source, string> = { contact: 'the contact form', intake: 'the project form', refer: 'the refer-a-friend form', chat: 'the website chat', questionnaire: 'the first-week questionnaire' };
const FIELDS = ['name', 'phone', 'email', 'town', 'project_type', 'land', 'message', 'page', 'referrer_name', 'referrer_phone'] as const;

function cors(res: NextResponse, origin: string | null): NextResponse {
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  return res;
}
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(PROJECTS)) if (p.origins.includes(origin)) return origin;
  return null;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

function str(v: unknown, max = 2000): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function digits(s: string | null): string | null {
  const d = (s ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return cors(NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }), origin);
  }

  // Vapi wraps the arguments; the site sends them bare. Same fields either way.
  let toolCallId: string | null = null;
  const msg = body.message as { type?: string; toolCallList?: Array<{ id?: string; arguments?: unknown }> } | undefined;
  if (msg?.type === 'tool-calls' && Array.isArray(msg.toolCallList) && msg.toolCallList.length) {
    const call = msg.toolCallList[0];
    toolCallId = call.id ?? null;
    let args: unknown = call.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    body = (args && typeof args === 'object' ? (args as Record<string, unknown>) : {}) as Record<string, unknown>;
  } else if (!origin) {
    // Site forms must come from a site we ship. The Vapi path carries no origin and is trusted by the project key.
    return NextResponse.json({ ok: false, error: 'origin not allowed' }, { status: 403 });
  }

  const project = PROJECTS[String(body.project ?? '')];
  const source = String(body.source ?? '') as Source;
  const reply = (payload: Record<string, unknown>, status = 200) => {
    if (toolCallId) {
      const ok = payload.ok === true;
      return NextResponse.json({ results: [{ toolCallId, result: ok ? 'Sent. Carmen will call back.' : `Not sent: ${String(payload.error ?? 'unknown')}` }] });
    }
    return cors(NextResponse.json(payload, { status }), origin);
  };
  if (!project) return reply({ ok: false, error: 'unknown project' }, 400);
  if (!SOURCES.includes(source)) return reply({ ok: false, error: 'unknown source' }, 400);
  if (str(body.hp)) return reply({ ok: true, id: 'ok' }); // a bot filled the honeypot; say nothing, keep nothing

  const lead: Record<string, string | null> = {};
  for (const f of FIELDS) lead[f] = str(body[f], f === 'message' ? 4000 : 300);
  if (!lead.phone && !lead.email) return reply({ ok: false, error: 'a phone or an email is needed' }, 400);

  // The questionnaire: [{q, a}], kept as given, bounded.
  let answers: Array<{ q: string; a: string }> | null = null;
  if (Array.isArray(body.answers)) {
    answers = (body.answers as unknown[])
      .map((x) => (x && typeof x === 'object' ? { q: str((x as { q?: unknown }).q, 300) ?? '', a: str((x as { a?: unknown }).a, 2000) ?? '' } : null))
      .filter((x): x is { q: string; a: string } => !!x && !!x.q)
      .slice(0, 40);
    if (!answers.length) answers = null;
  }

  const sb = getSupabase();
  if (!sb) return reply({ ok: false, error: 'no database' }, 500);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 24) : null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300);

  // Same person in the last thirty days? Attach, do not duplicate.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const phoneKey = digits(lead.phone);
  const emailKey = lead.email?.toLowerCase() ?? null;
  const { data: recent } = await sb.from('client_leads').select('id, phone, email, sources, answers, message, name, town, project_type, land, page').eq('client_email', project.clientEmail).gte('created_at', since).order('created_at', { ascending: false }).limit(200);
  const existing = (recent ?? []).find((r) => (phoneKey && digits(r.phone as string | null) === phoneKey) || (emailKey && String(r.email ?? '').toLowerCase() === emailKey)) ?? null;

  let id: string;
  let merged = false;
  if (existing) {
    const sources = [...((existing.sources as string[]) ?? []), source];
    const patch: Record<string, unknown> = { sources };
    // Newer, non-empty facts fill gaps; a person's earlier answer is never blanked.
    for (const f of ['name', 'phone', 'email', 'town', 'project_type', 'land', 'page'] as const) if (lead[f] && !existing[f]) patch[f] = lead[f];
    if (lead.message) patch.message = existing.message ? `${existing.message}\n\n[${VIA[source]}] ${lead.message}` : lead.message;
    if (answers) patch.answers = answers;
    await sb.from('client_leads').update(patch).eq('id', existing.id as string);
    id = existing.id as string;
    merged = true;
  } else {
    const row = { client_email: project.clientEmail, project: String(body.project), source, sources: [source], ...lead, answers, ip_hash: ipHash, ua };
    const { data, error } = await sb.from('client_leads').insert(row).select('id').single();
    if (error || !data) return reply({ ok: false, error: 'could not save' }, 500);
    id = data.id as string;
  }

  // Tell the client, twice. Plain words, everything they need to call back.
  const who = lead.name ?? (existing?.name as string | null) ?? 'Someone';
  const lines = [
    merged ? `${who} is back, this time through ${VIA[source]} on the website.` : `${who} came in through ${VIA[source]} on the website.`,
    lead.phone ? `Phone: ${lead.phone}` : existing?.phone ? `Phone: ${existing.phone}` : null,
    lead.email ? `Email: ${lead.email}` : existing?.email ? `Email: ${existing.email}` : null,
    lead.town ? `Town: ${lead.town}` : null,
    lead.project_type ? `Project: ${lead.project_type}` : null,
    lead.land ? `Starting point: ${lead.land}` : null,
    lead.referrer_name ? `Referred by: ${lead.referrer_name}${lead.referrer_phone ? ` (${lead.referrer_phone})` : ''}` : null,
    lead.message ? `They said: ${lead.message}` : null,
  ].filter(Boolean) as string[];
  const answerLines = (answers ?? []).map((a) => `${a.q}: ${a.a || '(blank)'}`);

  const notified: Record<string, unknown> = {};
  if (project.notify.phone && toE164(project.notify.phone)) {
    const short = [
      `${merged ? 'Back again' : 'New lead'}: ${who}${lead.town ? `, ${lead.town}` : ''}${source === 'questionnaire' ? ' (questionnaire in)' : ''}.`,
      lead.phone ? `Call ${lead.phone}` : lead.email ? `Email ${lead.email}` : null,
      lead.project_type ?? null,
      lead.message ? `"${lead.message.slice(0, 110)}"` : answers ? `${answers.length} answers in your portal.` : null,
    ]
      .filter(Boolean)
      .join(' ');
    const sms = await sendSms(project.notify.phone, short);
    notified.sms = sms.ok ? { ok: true, sid: sms.sid } : { ok: false, error: sms.error };
  }
  try {
    const resend = resendClient();
    const html = `<div style="font:400 16px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">
      ${lines.map((l) => `<p style="margin:0 0 10px;">${esc(l)}</p>`).join('')}
      ${answerLines.length ? `<p style="margin:16px 0 6px;font-weight:700;">Their questionnaire</p>${(answers ?? []).map((a) => `<p style="margin:0 0 8px;"><span style="opacity:.6;">${esc(a.q)}</span><br>${esc(a.a || '(blank)')}</p>`).join('')}` : ''}
      <p style="margin:16px 0 0;color:#161616;opacity:.6;font-size:13px;">Every lead is kept in your portal at ${SITE.url}/portal.</p>
    </div>`;
    const sent = await resend.emails.send({
      from: `${project.business} website <sarah@modernmustardseed.com>`,
      to: project.notify.emails,
      cc: ['sarah@modernmustardseed.com'],
      replyTo: lead.email ? [lead.email] : ['sarah@modernmustardseed.com'],
      subject: `${merged ? 'Back again' : 'New lead'}: ${who}${lead.town ? `, ${lead.town}` : ''}${lead.project_type ? `, ${lead.project_type}` : ''}${source === 'questionnaire' ? ' (questionnaire)' : ''}`,
      html,
      text: [...lines, ...(answerLines.length ? ['', 'Their questionnaire:', ...answerLines] : [])].join('\n'),
    });
    notified.email = { ok: !sent.error, id: sent.data?.id ?? null, error: sent.error?.message ?? null };
  } catch (err) {
    notified.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const { data: prior } = await sb.from('client_leads').select('notified').eq('id', id).maybeSingle();
  const history = { ...((prior?.notified as Record<string, unknown>) ?? {}), [`${source}@${new Date().toISOString()}`]: notified };
  await sb.from('client_leads').update({ notified: history }).eq('id', id);

  return reply({ ok: true, id, merged });
}
