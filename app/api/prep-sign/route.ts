import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * A SIGNED QUOTE, WITHOUT A PDF TO PRINT.
 *
 * A prospect's prep start page lets them tick the packages they want and type
 * their name. That click POSTs here before checkout opens. This route:
 *   1. records the signature in prep_signatures (what, price, who, when, where),
 *   2. files it on the client's card as a client_files row and a note on the lead,
 *   3. emails Sarah the signed copy and emails the signer their own copy,
 *   4. returns the record id and a link that renders the signed quote (GET ?id=).
 *
 * Only allowlisted projects and origins are accepted. The address is stored as
 * a salted day hash, never raw.
 */

const PROJECTS: Record<string, { name: string; origin: string; quoteUrl: string }> = {
  'built-right': {
    name: 'Built Right in Montana',
    origin: 'https://built-right-prep.vercel.app',
    quoteUrl: 'https://built-right-prep.vercel.app/docs/Built-Right-Quote.pdf',
  },
};

type Pkg = { key: string; label: string; setupCents: number; monthlyCents: number };

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

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US')}`;

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
  const signer = String(body.signerName ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200);
  const packages = Array.isArray(body.packages) ? (body.packages as Pkg[]).filter((x) => x && typeof x.key === 'string' && typeof x.label === 'string') : [];
  if (!spec || !signer || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !packages.length) {
    return cors(NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 }), origin);
  }
  const setup = packages.reduce((s, x) => s + (Number(x.setupCents) || 0), 0);
  const monthly = packages.reduce((s, x) => s + (Number(x.monthlyCents) || 0), 0);
  const terms = String(body.terms ?? '').slice(0, 2000) || null;
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = ip ? createHash('sha256').update(`${ip}|${day}|prep-sign`).digest('hex').slice(0, 24) : null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300) || null;

  const sb = getSupabase();
  if (!sb) return cors(NextResponse.json({ ok: false, error: 'no database' }, { status: 503 }), origin);
  const { data: row, error } = await sb
    .from('prep_signatures')
    .insert({ project, client_email: email, client_name: spec.name, signer_name: signer, packages, setup_cents: setup, monthly_cents: monthly, quote_url: spec.quoteUrl, terms, ip_hash: ipHash, ua })
    .select('id, created_at')
    .single();
  if (error || !row) return cors(NextResponse.json({ ok: false, error: 'could not record' }, { status: 500 }), origin);

  const viewUrl = `${SITE.url}/api/prep-sign?id=${row.id}`;
  const when = new Date(row.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'long', timeStyle: 'short' });
  const lines = packages.map((x) => `${x.label}: ${x.setupCents ? `${usd(x.setupCents)} setup, then ` : ''}${usd(x.monthlyCents)} a month`);

  // File it on the card: a document row, and a note on the lead.
  try {
    await sb.from('client_files').insert({ client_email: email, label: `Signed quote, ${when}`, url: viewUrl, kind: 'doc' });
    const { data: lead } = await sb.from('leads').select('id, notes').ilike('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lead) {
      const note = `[signed ${row.created_at.slice(0, 10)}] ${signer} signed the quote: ${packages.map((x) => x.label).join(' + ')} (${usd(setup)} setup, ${usd(monthly)}/mo). ${viewUrl}`;
      await sb.from('leads').update({ notes: `${(lead.notes as string | null) ?? ''}\n${note}`.trim(), status: 'won' }).eq('id', lead.id);
    }
  } catch (err) {
    console.error('prep-sign filing failed', err);
  }

  // Sarah gets the signed copy; the signer gets theirs.
  try {
    const summary = lines.map((l) => p(escape(l))).join('') + p(`<strong>Today:</strong> ${usd(setup)}. <strong>Then monthly:</strong> ${usd(monthly)}.`);
    await sendViaResend({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      replyTo: email,
      subject: `Signed: ${spec.name} chose ${packages.map((x) => x.label).join(' + ')}`,
      html: clientEmail({
        preheader: `${signer} signed the ${spec.name} quote.`,
        greeting: 'Sarah,',
        body: p(`<strong>${escape(signer)}</strong> signed the ${escape(spec.name)} quote on ${escape(when)} from ${escape(email)}.`) + summary + p(`Signed copy: <a href="${viewUrl}">${viewUrl}</a>. Filed on the client card. Checkout opened right after this signature.`),
        signature: 'Mr. Mustard',
        ranchLine: false,
      }),
    });
    await sendViaResend({
      from: 'Sarah Scarano <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `Your signed quote, ${spec.name}`,
      html: clientEmail({
        preheader: 'A copy of what you chose and signed.',
        greeting: `${escape(signer.split(' ')[0] || 'Hello')},`,
        body: p(`Here is what you chose and signed on ${escape(when)}:`) + summary + p(`Your signed copy: <a href="${viewUrl}">${viewUrl}</a>. The full quote is at <a href="${spec.quoteUrl}">${spec.quoteUrl}</a>. Changes to what we build are always included.`),
      }),
    });
  } catch (err) {
    console.error('prep-sign email failed', err);
  }

  return cors(NextResponse.json({ ok: true, id: row.id, url: viewUrl }), origin);
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const sb = getSupabase();
  if (!sb) return new NextResponse('Unavailable', { status: 503 });
  const { data: r } = await sb.from('prep_signatures').select('*').eq('id', id).maybeSingle();
  if (!r) return new NextResponse('Not found', { status: 404 });
  const pk = (r.packages as Pkg[]) ?? [];
  const when = new Date(r.created_at as string).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'long', timeStyle: 'short' });
  const rows = pk
    .map((x) => `<tr><td>${escape(x.label)}</td><td>${x.setupCents ? usd(x.setupCents) : 'None'}</td><td>${usd(x.monthlyCents)} a month</td></tr>`)
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Signed quote: ${escape(String(r.client_name ?? ''))}</title>
<style>body{margin:0;background:#FBF6EA;color:#161616;font-family:system-ui,sans-serif}.wrap{max-width:720px;margin:0 auto;padding:40px 20px}h1{font-family:Georgia,serif;font-size:30px;margin:0 0 6px}.meta{color:rgba(22,22,22,.65);margin:0 0 24px}table{width:100%;border-collapse:collapse;background:#fff;border:2px solid #161616;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid rgba(22,22,22,.12);font-size:15px}th{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(22,22,22,.6)}.tot{margin:18px 0 0;font-size:18px}.sig{margin-top:28px;padding:18px;border-left:6px solid #F5B700;background:#fff}.sig b{font-family:Georgia,serif;font-size:22px;display:block}.terms{margin-top:22px;font-size:13.5px;color:rgba(22,22,22,.72);line-height:1.5}</style></head><body><div class="wrap">
<h1>Signed quote: ${escape(String(r.client_name ?? ''))}</h1><p class="meta">Prepared by Modern Mustard Seed. Signed ${escape(when)} Mountain.</p>
<table><thead><tr><th>Package</th><th>Setup</th><th>Monthly</th></tr></thead><tbody>${rows}</tbody></table>
<p class="tot"><strong>Today:</strong> ${usd(Number(r.setup_cents) || 0)} &middot; <strong>Then monthly:</strong> ${usd(Number(r.monthly_cents) || 0)}</p>
<div class="sig"><b>${escape(String(r.signer_name))}</b>${escape(String(r.client_email))}<br>${escape(when)}</div>
${r.terms ? `<p class="terms">${escape(String(r.terms))}</p>` : ''}
<p class="terms">Full quote: <a href="${escape(String(r.quote_url ?? ''))}">${escape(String(r.quote_url ?? ''))}</a></p>
</div></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
