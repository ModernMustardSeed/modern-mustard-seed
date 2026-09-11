import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { encryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

/**
 * ANSWERS, NOT PRINTOUTS.
 *
 * The onboarding questionnaire and the vendor handover form live as web pages
 * on the prospect's prep site. Each submit POSTs here: the answers are stored
 * in prep_intakes, filed on the client's card as a client_files row and a note
 * on the lead, and emailed to Sarah in full. GET ?id= renders the submission.
 */

const PROJECTS: Record<string, { name: string; origin: string; email: string }> = {
  'built-right': { name: 'Built Right in Montana', origin: 'https://built-right-prep.vercel.app', email: 'builtbyshan@gmail.com' },
};
const KINDS = new Set(['onboarding', 'handover']);
const LABEL: Record<string, string> = { onboarding: 'Onboarding answers', handover: 'Web Express handover form' };

type QA = { q: string; a: string };

function cors(res: NextResponse, origin: string): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  res.headers.set('Vary', 'Origin');
  return res;
}
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(PROJECTS)) if (origin === p.origin) return origin;
  return null;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return NextResponse.json({ ok: false }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return cors(NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }), origin);
  }
  const project = String(body.project ?? '');
  const spec = PROJECTS[project];
  const kind = String(body.kind ?? '');
  const submittedBy = String(body.submittedBy ?? '').trim().slice(0, 160) || null;
  const answers = Array.isArray(body.answers)
    ? (body.answers as QA[]).filter((x) => x && typeof x.q === 'string').map((x) => ({ q: x.q.slice(0, 300), a: String(x.a ?? '').slice(0, 4000) })).filter((x) => x.a.trim())
    : [];
  // Credentials travel apart from answers: encrypted at rest, never emailed.
  type Secret = { label?: unknown; value?: unknown };
  const secrets = Array.isArray(body.secrets)
    ? (body.secrets as Secret[])
        .filter((x) => x && typeof x.label === 'string' && String(x.value ?? '').trim())
        .map((x) => ({ label: String(x.label).slice(0, 160), value: String(x.value).slice(0, 4000) }))
        .slice(0, 30)
    : [];

  if (!spec || !KINDS.has(kind) || (!answers.length && !secrets.length)) {
    return cors(NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 }), origin);
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = ip ? createHash('sha256').update(`${ip}|${day}|prep-intake`).digest('hex').slice(0, 24) : null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300) || null;

  const sb = getSupabase();
  if (!sb) return cors(NextResponse.json({ ok: false, error: 'no database' }, { status: 503 }), origin);
  const { data: row, error } = await sb
    .from('prep_intakes')
    .insert({ project, kind, client_email: spec.email, submitted_by: submittedBy, answers, ip_hash: ipHash, ua })
    .select('id, created_at')
    .single();
  if (error || !row) return cors(NextResponse.json({ ok: false, error: 'could not record' }, { status: 500 }), origin);

  // Credentials, encrypted with the same AES-GCM helper the OAuth tokens use.
  // Caught on its own: a failure here must never lose the submission.
  let secretsSaved = 0;
  if (secrets.length) {
    try {
      const rows = secrets.map((x) => {
        const enc = encryptSecret(x.value);
        return { intake_id: row.id, project, client_email: spec.email, label: x.label, ciphertext: enc.ciphertext, iv: enc.iv, tag: enc.tag, submitted_by: submittedBy };
      });
      const { error: sErr } = await sb.from('prep_secrets').insert(rows);
      if (sErr) console.error('prep-intake secrets failed', sErr);
      else secretsSaved = rows.length;
    } catch (err) {
      console.error('prep-intake encryption failed', err);
    }
  }

  const viewUrl = `${SITE.url}/api/prep-intake?id=${row.id}`;
  const when = new Date(row.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'long', timeStyle: 'short' });
  try {
    await sb.from('client_files').insert({ client_email: spec.email, label: `${LABEL[kind]}, ${when}`, url: viewUrl, kind: 'doc' });
    // Files uploaded from the page arrive as "Uploaded file: <name>" answers
    // whose value is the storage URL. Each becomes its own row on the card so
    // Sarah opens a design without reading the whole submission.
    const uploads = answers.filter((x) => x.q.startsWith('Uploaded file: ') && /^https:\/\//.test(x.a));
    if (uploads.length) {
      await sb.from('client_files').insert(uploads.map((x) => ({ client_email: spec.email, label: x.q.slice('Uploaded file: '.length).slice(0, 120), url: x.a, kind: 'design' })));
    }
    const { data: lead } = await sb.from('leads').select('id, notes').ilike('email', spec.email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lead) {
      await sb.from('leads').update({ notes: `${(lead.notes as string | null) ?? ''}\n[${kind} ${row.created_at.slice(0, 10)}] ${submittedBy ?? 'submitted'}: ${answers.length} answers. ${viewUrl}`.trim() }).eq('id', lead.id);
    }
  } catch (err) {
    console.error('prep-intake filing failed', err);
  }
  try {
    const answersHtml = answers.map((x) => `<p style="margin:0 0 14px"><strong>${escape(x.q)}</strong><br>${escape(x.a).replace(/\n/g, '<br>')}</p>`).join('');
    // Credentials are named, never printed. The value lives encrypted and is
    // read once from the admin, then changed.
    const secretsHtml = secretsSaved
      ? `<p style="margin:22px 0 8px"><strong>${secretsSaved} credential${secretsSaved === 1 ? '' : 's'} came with this. They are held encrypted and deliberately not printed here:</strong></p>` +
        `<ul style="margin:0 0 14px;padding-left:20px">${secrets.map((x) => `<li>${escape(x.label)}</li>`).join('')}</ul>` +
        `<p style="margin:0 0 14px">Open them from the client book, use each one once, and change every password as you go.</p>`
      : '';
    const bodyHtml = answersHtml + secretsHtml;
    await sendViaResend({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      replyTo: spec.email,
      subject: `${LABEL[kind]}: ${spec.name}${submittedBy ? ` (${submittedBy})` : ''}`,
      html: clientEmail({
        preheader: `${answers.length} answers from ${spec.name}.`,
        greeting: 'Sarah,',
        body: p(`${escape(LABEL[kind])} for ${escape(spec.name)}, submitted ${escape(when)}${submittedBy ? ` by ${escape(submittedBy)}` : ''}. Filed on the client card. Read it any time at <a href="${viewUrl}">${viewUrl}</a>.`) + bodyHtml,
        signature: 'Mr. Mustard',
        ranchLine: false,
      }),
    });
  } catch (err) {
    console.error('prep-intake email failed', err);
  }
  return cors(NextResponse.json({ ok: true, id: row.id, url: viewUrl }), origin);
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const sb = getSupabase();
  if (!sb) return new NextResponse('Unavailable', { status: 503 });
  const { data: r } = await sb.from('prep_intakes').select('*').eq('id', id).maybeSingle();
  if (!r) return new NextResponse('Not found', { status: 404 });
  const spec = PROJECTS[String(r.project)];
  const when = new Date(r.created_at as string).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'long', timeStyle: 'short' });
  const items = ((r.answers as QA[]) ?? []).map((x) => `<div class="qa"><div class="q">${escape(x.q)}</div><div class="a">${escape(x.a).replace(/\n/g, '<br>')}</div></div>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(LABEL[String(r.kind)] ?? 'Submission')}: ${escape(spec?.name ?? '')}</title>
<style>body{margin:0;background:#FBF6EA;color:#161616;font-family:system-ui,sans-serif}.wrap{max-width:760px;margin:0 auto;padding:40px 20px}h1{font-family:Georgia,serif;font-size:28px;margin:0 0 6px}.meta{color:rgba(22,22,22,.65);margin:0 0 24px}.qa{background:#fff;border:2px solid #161616;border-radius:12px;padding:14px 16px;margin-bottom:12px}.q{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(22,22,22,.6);font-weight:700;margin-bottom:6px}.a{font-size:15.5px;line-height:1.5;white-space:pre-wrap}</style></head><body><div class="wrap">
<h1>${escape(LABEL[String(r.kind)] ?? 'Submission')}: ${escape(spec?.name ?? '')}</h1><p class="meta">Submitted ${escape(when)} Mountain${r.submitted_by ? ` by ${escape(String(r.submitted_by))}` : ''}.</p>${items}</div></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
