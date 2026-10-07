import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { resolveIntake } from '@/lib/intake-resolve';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Where "this landed" goes. Sarah reads sarah@, so that is where it goes.
 * OPS_INBOX overrides it with a comma separated list if that ever changes.
 */
const OPS_INBOX = (process.env.OPS_INBOX ?? 'sarah@modernmustardseed.com')
  .split(',')
  .map((a) => a.trim())
  .filter(Boolean);

/**
 * The welcome intake, for every kind of business.
 *
 * Lives at /api/intake/contractor because that is where it started and where
 * every form already posts. The form itself is tailored per business by
 * lib/intake-profiles.ts; this route resolves the same profile so the email
 * Sarah gets reads in the form's own words, not raw field names.
 *
 * The existing brand intake asks about products, price lists and a shop. A
 * builder has none of those and does have four things it never asks for: a
 * contractor license, proof of insurance, the towns he covers, and photographs
 * of jobs rather than of stock.
 *
 * Identified by a token, not by a typed email. The old form asked the client to
 * retype the address every record keys on, which is how one client ends up
 * filed under two addresses and a paid build nobody can find.
 *
 * What it does, in order, and each step is independent so a failure late does
 * not lose what came early:
 *
 *   1. Resolves the token to a client. No token, no write.
 *   2. Stores the answers on client_intake, which is jsonb and already the
 *      table the admin reads.
 *   3. Files every upload on client_files so they show on his card.
 *   4. Moves his project to `building`, because he has now done his part.
 *   5. Emails Sarah that it landed, with the profile's one must-publish answer
 *      (a license, for a trade or a clinic) in the subject line.
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

  const answers = (body.answers ?? {}) as Record<string, unknown>;
  const files = Array.isArray(body.files) ? body.files.slice(0, 60) : [];
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

  await supabase.from('client_intake').upsert(
    {
      client_email: email,
      answers: { ...answers, kind: profile.kind, fileCount: files.length },
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'client_email' },
  );

  /* Files go on the card as links, which is what client_files is. Uploaded
   * separately by /api/intake/upload, so by here they are already URLs. */
  let filesFiled = 0;
  if (files.length) {
    const { error: fileErr, count } = await supabase.from('client_files').insert(
      files.map((f) => ({
        client_email: email,
        label: clean(f.label, 200) ?? 'Uploaded',
        url: f.url,
        kind: clean(f.kind, 40) ?? 'doc',
      })),
      { count: 'exact' },
    );
    /* Say so when this fails.
     *
     * This insert used to ignore its error, and client_files.kind carries a
     * check constraint that did not allow 'photo'. So an intake full of
     * photographs returned ok:true with every one of them dropped, and the only
     * way to find out was to go looking in the database. A file that does not
     * land is the whole point of the form not landing. */
    if (fileErr) {
      console.error('contractor intake: files not filed', fileErr.message);
    } else {
      filesFiled = count ?? files.length;
    }
  }

  // They have done their part, so the project is ours again.
  await supabase.from('projects').update({ status: 'building' }).eq('client_email', email);

  const resend = resendClient();
  if (resend) {
    const rows = Object.entries(answers)
      .filter(([k, v]) => k !== 'kind' && v !== null && v !== undefined && String(v).trim() !== '')
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;color:#6e7c87;font:600 12px/1.5 sans-serif;">${esc(labels.get(k) ?? k)}</td>` +
          `<td style="padding:6px 0;font:400 14px/1.55 sans-serif;color:#14181c;white-space:pre-wrap;">${esc(String(v).slice(0, 1500))}</td></tr>`,
      )
      .join('');

    try {
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OPS_INBOX,
        // The license is in the subject because it is the one answer that has
        // to end up on the live site, and a subject line is the only part of an
        // email you can be sure gets read.
        subject: `Intake in: ${who}${
          profile.subjectField ? (headline ? ` · ${profile.subjectField.label} ${headline}` : ` · no ${profile.subjectField.label} given`) : ''
        }`,
        html: `<div style="font:400 15px/1.6 sans-serif;color:#14181c;">
          <p style="margin:0 0 6px;"><strong>${esc(who)}</strong> finished the intake form <span style="color:#6e7c87;">(${profile.kind} form)</span>.</p>
          <p style="margin:0 0 16px;color:#6e7c87;">${files.length} file${files.length === 1 ? '' : 's'} uploaded. They are on the card.</p>
          <table style="border-collapse:collapse;">${rows}</table>
          <p style="margin:18px 0 0;">
            <a href="https://modernmustardseed.com/admin/clients/${encodeURIComponent(email)}"
               style="color:#C4380C;font-weight:700;">Open the card and build it</a>
          </p>
        </div>`,
      });
    } catch {
      /* The answers are saved. A failed notification must not lose them, and
       * must not tell them something went wrong when nothing did. */
    }
  }

  // filesFiled is reported so the caller can tell the difference between
  // "nothing was sent" and "they were sent and did not land".
  return NextResponse.json({ ok: true, filesFiled, filesSent: files.length });
}
