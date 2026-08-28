import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The contractor intake.
 *
 * The existing brand intake asks about products, price lists and a shop. A
 * builder has none of those and does have four things it never asks for: a
 * contractor licence, proof of insurance, the towns he covers, and photographs
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
 *   5. Emails Sarah that it landed, with the licence number in the subject
 *      line, because that is the thing that has to go on the live site.
 */

type Body = {
  key?: string;
  answers?: Record<string, unknown>;
  files?: Array<{ label: string; url: string; kind?: string }>;
};

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

  const { data: client } = await supabase
    .from('clients')
    .select('email, name, company')
    .eq('intake_key', key)
    .maybeSingle();

  if (!client?.email) {
    return NextResponse.json({ error: 'unknown_key' }, { status: 401 });
  }

  const answers = (body.answers ?? {}) as Record<string, unknown>;
  const files = Array.isArray(body.files) ? body.files.slice(0, 60) : [];
  const email = client.email as string;
  const who = (client.company as string) || (client.name as string) || email;
  const licence = clean(answers.licenceNumber, 120);

  await supabase.from('client_intake').upsert(
    {
      client_email: email,
      answers: { ...answers, kind: 'contractor', fileCount: files.length },
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'client_email' },
  );

  /* Files go on the card as links, which is what client_files is. Uploaded
   * separately by /api/intake/upload, so by here they are already URLs. */
  if (files.length) {
    await supabase.from('client_files').insert(
      files.map((f) => ({
        client_email: email,
        label: clean(f.label, 200) ?? 'Uploaded',
        url: f.url,
        kind: clean(f.kind, 40) ?? 'doc',
      })),
    );
  }

  // He has done his part, so the project is ours again.
  await supabase.from('projects').update({ status: 'building' }).eq('client_email', email);

  const resend = resendClient();
  if (resend) {
    const rows = Object.entries(answers)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;color:#6e7c87;font:600 12px/1.5 sans-serif;white-space:nowrap;">${k}</td>` +
          `<td style="padding:6px 0;font:400 14px/1.55 sans-serif;color:#14181c;">${String(v).slice(0, 800)}</td></tr>`,
      )
      .join('');

    try {
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com'],
        // The licence is in the subject because it is the one answer that has
        // to end up on the live site, and a subject line is the only part of an
        // email you can be sure gets read.
        subject: `Intake in: ${who}${licence ? ` · licence ${licence}` : ' · NO LICENCE GIVEN'}`,
        html: `<div style="font:400 15px/1.6 sans-serif;color:#14181c;">
          <p style="margin:0 0 6px;"><strong>${who}</strong> finished the intake form.</p>
          <p style="margin:0 0 16px;color:#6e7c87;">${files.length} file${files.length === 1 ? '' : 's'} uploaded. They are on his card.</p>
          <table style="border-collapse:collapse;">${rows}</table>
          <p style="margin:18px 0 0;">
            <a href="https://modernmustardseed.com/admin/clients/${encodeURIComponent(email)}"
               style="color:#C4380C;font-weight:700;">Open his card and build it</a>
          </p>
        </div>`,
      });
    } catch {
      /* The answers are saved. A failed notification must not lose them, and
       * must not tell him something went wrong when nothing did. */
    }
  }

  return NextResponse.json({ ok: true });
}
