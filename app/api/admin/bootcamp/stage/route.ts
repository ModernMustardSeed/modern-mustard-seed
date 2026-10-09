import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { BOOTCAMP } from '@/data/bootcamp';
import { countsByTier } from '@/lib/bootcamp/store';
import { TRADE_SLUGS, attendanceCounts, getStage, listQuestions, markAnswered, patchStage, worksheetCount, type TradeSlug } from '@/lib/bootcamp/stage';
import { bootcampSessions, isLive, isSessionKey, liveSession, nextSession, playerFor, sessionEnd, type Audience } from '@/lib/bootcamp/sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Stage tab. GET reads everything Sarah needs during a live session in
 * one call: the stage links, which session is live or next, who is present
 * against who holds a seat, the question queue for the session in view, and
 * which replay letters are waiting on a replay link. POST sets a session's
 * links or flips the offer. PATCH marks a question answered.
 */

/** The database for a signed-in admin, or the response that says why not. */
async function guard(): Promise<SupabaseClient | NextResponse> {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  return sb;
}

export async function GET(req: Request) {
  const sb = await guard();
  if (sb instanceof NextResponse) return sb;

  try {
    const url = new URL(req.url);
    const now = Date.now();
    const all = bootcampSessions();
    const live = liveSession(now, all);
    const next = nextSession(now, all);
    const wanted = url.searchParams.get('session');
    const focus = isSessionKey(wanted) ? wanted : live?.key ?? next?.key ?? all[0].key;

    const [stage, present, counts, questions, worksheets] = await Promise.all([
      getStage(sb),
      attendanceCounts(sb),
      countsByTier(sb, BOOTCAMP.launch),
      listQuestions(sb, focus),
      worksheetCount(sb),
    ]);

    const seats: Record<Audience, number> = {
      everyone: counts.masterclass + counts.ga + counts.vip + counts.platinum + counts.operator,
      ticket: counts.ga + counts.vip + counts.platinum + counts.operator,
      operator: counts.operator,
    };

    const sessions = all.map((s) => {
      const entry = stage.sessions[s.key] ?? {};
      const ended = now >= sessionEnd(s);
      return {
        key: s.key,
        label: s.label,
        title: s.title,
        startsAt: s.startsAt,
        minutes: s.minutes,
        audience: s.audience,
        live: isLive(s, now),
        ended,
        seats: seats[s.audience],
        present: present[s.key] ?? 0,
        liveUrl: entry.liveUrl ?? '',
        replayUrl: entry.replayUrl ?? '',
        transcriptUrl: entry.transcriptUrl ?? '',
        rooms: s.key === 'day2' ? Object.fromEntries(TRADE_SLUGS.map((t) => [t, entry.rooms?.[t] ?? ''])) : null,
        liveKind: playerFor(entry.liveUrl)?.kind ?? null,
        replayKind: playerFor(entry.replayUrl)?.kind ?? null,
        // A session that has ended with no replay link is holding its replay letter.
        replayHeld: ended && !entry.replayUrl && (s.key === 'masterclass' || s.key === 'day1' || s.key === 'day2' || s.key === 'day3'),
      };
    });

    return NextResponse.json({
      ok: true,
      now: new Date(now).toISOString(),
      live: live?.key ?? null,
      next: next?.key ?? null,
      focus,
      offer: stage.offer,
      rev: stage.rev,
      sessions,
      questions,
      worksheets,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load the stage.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sb = await guard();
  if (sb instanceof NextResponse) return sb;

  let body: {
    session?: { key?: string; liveUrl?: string | null; replayUrl?: string | null; transcriptUrl?: string | null; rooms?: Record<string, string | null> | null };
    offerOpen?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const patch: Parameters<typeof patchStage>[1] = {};
  if (body.session) {
    if (!isSessionKey(body.session.key)) return NextResponse.json({ error: 'Unknown session.' }, { status: 400 });
    const s = body.session;
    for (const field of ['liveUrl', 'replayUrl', 'transcriptUrl'] as const) {
      const v = s[field];
      if (typeof v === 'string' && v.trim() && !/^https:\/\//i.test(v.trim())) {
        return NextResponse.json({ error: `${field === 'liveUrl' ? 'The live link' : field === 'replayUrl' ? 'The replay link' : 'The transcript link'} must start with https://` }, { status: 400 });
      }
    }
    const rooms: Partial<Record<TradeSlug, string | null>> = {};
    for (const [slug, v] of Object.entries(s.rooms ?? {})) {
      if (!(TRADE_SLUGS as string[]).includes(slug)) continue;
      if (typeof v === 'string' && v.trim() && !/^https:\/\//i.test(v.trim())) return NextResponse.json({ error: 'Every room link must start with https://' }, { status: 400 });
      rooms[slug as TradeSlug] = v;
    }
    patch.session = {
      key: body.session.key,
      ...('rooms' in s && body.session.key === 'day2' ? { rooms } : {}),
      ...('liveUrl' in s ? { liveUrl: s.liveUrl ?? null } : {}),
      ...('replayUrl' in s ? { replayUrl: s.replayUrl ?? null } : {}),
      ...('transcriptUrl' in s ? { transcriptUrl: s.transcriptUrl ?? null } : {}),
    };
  }
  if (typeof body.offerOpen === 'boolean') patch.offerOpen = body.offerOpen;
  if (!patch.session && patch.offerOpen === undefined) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  try {
    const stage = await patchStage(sb, patch);
    return NextResponse.json({ ok: true, stage });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the stage.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const sb = await guard();
  if (sb instanceof NextResponse) return sb;

  let body: { session?: string; questionId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!isSessionKey(body.session) || !Number.isInteger(body.questionId)) return NextResponse.json({ error: 'A session and a question id.' }, { status: 400 });

  try {
    await markAnswered(sb, body.session, Number(body.questionId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not mark it answered.' }, { status: 500 });
  }
}
