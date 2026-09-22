import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { getSettings } from '@/lib/posting/settings';
import { compose, scheduleComposed, nextOpenDay } from '@/lib/posting/compose';
import { accountViews } from '@/lib/posting/accounts';
import { projectForEmail } from '@/lib/client-leads';
import { PLATFORMS, type Captions, type Notes, type Platform } from '@/lib/posting/types';
import { mountainDate } from '@/lib/posting/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The shape step waits on the editor inside the request. The wait itself is
// capped well under this in lib/posting/compose.ts; this only has to be
// roomier than that cap, or the platform kills the request first and the
// owner gets nothing instead of an honest mechanical edit.
export const maxDuration = 60;

/**
 * THE COMPOSER. Two steps, one room.
 *
 *   shape    their words in, every platform's version back, nothing written.
 *   schedule the versions they just read, onto the calendar, already approved.
 *
 * Both run on the Command Center's own session, which means they also run for
 * Sarah looking as the client, because wiring a client's first week is done
 * from the same screen the client uses. Nothing here invents a post: the text
 * is theirs on the way in and theirs on the way out.
 */

const asPlatforms = (v: unknown): Platform[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(String(p)));
  return out.length ? out : null;
};

const UPLOAD_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/client-intake\//i;

/** Their own upload, or a photograph already on their own website. Nothing else. */
function pickImage(email: string, raw: unknown): string | null {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return null;
  if (UPLOAD_RE.test(url)) return url.slice(0, 500);
  const own = projectForEmail(email);
  const ok = [own?.siteUrl, own?.publicUrl].filter(Boolean).some((o) => url.startsWith(`${o}/images/`));
  return ok ? url.slice(0, 500) : null;
}

function cleanLink(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).href.slice(0, 500);
  } catch {
    return null;
  }
}

/** A date the owner picked, only if it is today or later. */
function pickDate(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s >= mountainDate() ? s : null;
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author } = got.desk;

  const settings = await getSettings(sb, account.clientEmail);
  if (!settings) return NextResponse.json({ error: 'Posting is not on this account yet.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? 'shape');
  const text = String(body.text ?? '').trim().slice(0, 4000);
  const url = pickImage(account.clientEmail, body.url);
  const link = cleanLink(body.link);
  const platforms = asPlatforms(body.platforms);
  const date = pickDate(body.date);

  if (action === 'shape') {
    if (text.length < 3) return NextResponse.json({ error: 'Type what you want said first.' }, { status: 400 });
    const [composed, accounts] = await Promise.all([
      compose(sb, settings, { text, url, link, platforms, date }),
      accountViews(sb, account.clientEmail),
    ]);
    return NextResponse.json({ ok: true, ...composed, accounts });
  }

  if (action === 'schedule') {
    const captions = (body.captions && typeof body.captions === 'object' ? body.captions : {}) as Captions;
    const notes = (body.notes && typeof body.notes === 'object' ? body.notes : null) as Notes | null;
    const result = await scheduleComposed(sb, settings, {
      text,
      captions,
      notes,
      headline: typeof body.headline === 'string' ? body.headline : null,
      url,
      link,
      platforms,
      date,
      jobId: typeof body.jobId === 'string' ? body.jobId : null,
      edited: body.edited === true,
      by: author.email,
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === 'next-day') {
    return NextResponse.json({ ok: true, date: await nextOpenDay(sb, account.clientEmail, date ?? undefined) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
