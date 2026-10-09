import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { resolveIntake } from '@/lib/intake-resolve';
import { cleanAnswers, isClientIntakeUrl, listIntakeFiles } from '@/lib/intake-files';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Where "this landed" goes: both of Sarah's inboxes (lib/owner.ts), because the
 * Zoho mailbox alone is easy to miss. OPS_INBOX overrides it with a comma
 * separated list if that ever changes.
 */
const OPS_INBOX = process.env.OPS_INBOX
  ? process.env.OPS_INBOX.split(',').map((a) => a.trim()).filter(Boolean)
  : OWNER_NOTIFY_TO;

/**
 * The welcome intake, for every kind of business: the "Send it in" button.
 *
 * Lives at /api/intake/contractor because that is where it started and where
 * every form already posts. The form itself is tailored per business by
 * lib/intake-profiles.ts; this route resolves the same profile so the email
 * Sarah gets reads in the form's own words, not raw field names.
 *
 * Identified by a token, not by a typed email. The old form asked the client to
 * retype the address every record keys on, which is how one client ends up
 * filed under two addresses and a paid build nobody can find.
 *
 * By the time this runs the answers have usually been autosaved already
 * (/api/intake/draft) and every file filed on the card as it landed
 * (/api/intake/file). This is the final word:
 *
 *   1. Resolves the token to a client. No token, no write.
 *   2. Stores the answers on client_intake as submitted. If that write fails
 *      the client is told, because "thank you" over a lost form is the failure
 *      that matters most.
 *   3. Files any file URLs the form still holds that are not on the card yet.
 *   4. Moves the project to `building`, because they have done their part.
 *   5. Emails Sarah every answer and a link to every file.
 */

type Body = {
  key?: string;
  answers?: Record<string, unknown>;
  files?: Array<{ label: string; url: string; kind?: string }>;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clean = (v: unknown, max = 2000): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const key = clean(body.key, 120);
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const client = await resolveIntake(supabase, key);
  if (!client) {
    return NextResponse.json({ error: 'unknown_key' }, { status: 401 });
  }

  const answers = cleanAnswers(body.answers);
  const email = client.email;
  const who = client.company || client.name || email;
  const profile = client.profile;
  // licenceNumber is the old field name; intakes submitted before 2026-10-05 carry it.
  const headline = profile.subjectField
    ? clean(answers[profile.subjectField.name] ?? (profile.subjectField.name === 'licenseNumber' ? answers.licenceNumber : undefined), 120)
    : null;

  /* The form's own wording for each answer, so the email reads "Conditions and
   * injuries you treat", not "services". Unknown keys fall back to the key. */
  const labels = new Map<string, string>();
  for (const section of profile.sections) for (const f of section.fields) labels.set(f.name, f.label);
  labels.set('domain', 'Web address');

  const { data: prior } = await supabase.from('client_intake').select('answers').eq('client_email', email).maybeSingle();
  const kept = (prior?.answers ?? {}) as Record<string, unknown>;
  const carry: Record<string, unknown> = {};
  if ('brand_intake' in kept) carry.brand_intake = kept.brand_intake;

  const now = new Date().toISOString();
  const { error: saveErr } = await supabase.from('client_intake').upsert(
    {
      client_email: email,
      answers: { ...carry, ...answers, kind: profile.kind },
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
    },
    { onConflict: 'client_email' },
  );
  if (saveErr) {
    console.error('intake submit: answers not saved', saveErr.message);
    return NextResponse.json({ error: 'not_saved' }, { status: 500 });
  }

  /* Files normally reach the card one by one as they upload. Anything the form
   * still sends that is not there yet (an older open tab) is filed here. */
  const onCard = await listIntakeFiles(supabase, email);
  const known = new Set(onCard.map((f) => f.url));
  const late = (Array.isArray(body.files) ? body.files.slice(0, 60) : []).filter(
    (f) => f && typeof f.url === 'string' && !known.has(f.url) && isClientIntakeUrl(f.url, email),
  );
  if (late.length) {
    const { error: fileErr } = await supabase.from('client_files').insert(
      late.map((f) => ({
        client_email: email,
        label: clean(f.label, 200) ?? 'Uploaded',
        url: f.url,
        kind: ['photo', 'logo', 'doc'].includes(String(f.kind)) ? String(f.kind) : 'doc',
      })),
    );
    if (fileErr) console.error('intake submit: late files not filed', fileErr.message);
  }
  const files = await listIntakeFiles(supabase, email);

  // They have done their part, so the project is ours again.
  await supabase.from('projects').update({ status: 'building' }).eq('client_email', email);

  const rows = Object.entries(answers)
    .filter(([k, v]) => k !== 'kind' && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;color:#6e7c87;font:600 12px/1.5 sans-serif;">${esc(labels.get(k) ?? k)}</td>` +
        `<td style="padding:6px 0;font:400 14px/1.55 sans-serif;color:#14181c;white-space:pre-wrap;">${esc(String(v).slice(0, 3000))}</td></tr>`,
    )
    .join('');

  const fileList = files
    .map((f) => `<li style="margin:0 0 4px;"><a href="${esc(f.url)}" style="color:#0a7c78;">${esc(f.label)}</a></li>`)
    .join('');
  const thumbs = files
    .filter((f) => f.kind === 'photo' || f.kind === 'logo')
    .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f.url))
    .slice(0, 24)
    .map(
      (f) =>
        `<a href="${esc(f.url)}"><img src="${esc(f.url)}" alt="" width="120" height="120" style="width:120px;height:120px;object-fit:cover;border-radius:6px;margin:0 6px 6px 0;border:1px solid #d9dee2;"></a>`,
    )
    .join('');

  const sent = await sendViaResend({
    from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: OPS_INBOX,
    // The license is in the subject because it is the one answer that has to
    // end up on the live site, and a subject line is the only part of an email
    // you can be sure gets read.
    subject: `Intake in: ${who}${
      profile.subjectField ? (headline ? ` · ${profile.subjectField.label} ${headline}` : ` · no ${profile.subjectField.label} given`) : ''
    }`,
    html: `<div style="font:400 15px/1.6 sans-serif;color:#14181c;">
      <p style="margin:0 0 6px;"><strong>${esc(who)}</strong> sent in the intake form <span style="color:#6e7c87;">(${profile.kind} form)</span>.</p>
      <p style="margin:0 0 16px;color:#6e7c87;">${files.length} file${files.length === 1 ? '' : 's'} on the card.</p>
      <table style="border-collapse:collapse;">${rows || '<tr><td style="color:#6e7c87;">No written answers.</td></tr>'}</table>
      ${thumbs ? `<p style="margin:20px 0 8px;font-weight:700;">Photos</p><div>${thumbs}</div>` : ''}
      ${fileList ? `<p style="margin:20px 0 8px;font-weight:700;">Every file</p><ul style="margin:0;padding-left:18px;">${fileList}</ul>` : ''}
      <p style="margin:18px 0 0;">
        <a href="https://modernmustardseed.com/admin/clients/${encodeURIComponent(email)}"
           style="color:#C4380C;font-weight:700;">Open the card and build it</a>
      </p>
    </div>`,
  });
  /* The answers are saved either way. A failed notification must not tell the
   * client something went wrong, but it is logged so the gap can be seen. */
  if (!sent.ok) console.error('intake submit: notification not sent', sent.error);

  return NextResponse.json({ ok: true, filesFiled: files.length, notified: sent.ok });
}
