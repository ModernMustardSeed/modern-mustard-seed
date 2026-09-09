import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getSettings, saveSettings } from '@/lib/posting/settings';
import { accountViews, disconnectAccount } from '@/lib/posting/accounts';
import { planClient } from '@/lib/posting/planner';
import { scrub } from '@/lib/posting/captions';
import { mountainDate, addDays } from '@/lib/posting/time';
import { PLATFORMS, type Platform, type PostRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE CLIENT'S POSTING CALENDAR. Every read and write is scoped by the
 * session email, never by an id in the request. A client sees their own
 * material, their own posts, their own connections, and can change the words
 * on a post that has not gone out yet, skip a day, or put a day back.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const email = session.email;

  const settings = await getSettings(sb, email);
  if (!settings) return NextResponse.json({ settings: null });

  const today = mountainDate();
  const [posts, materials, accounts] = await Promise.all([
    sb.from('posting_posts').select('*').eq('client_email', email).gte('scheduled_for', addDays(today, -30)).lte('scheduled_for', addDays(today, 7)).order('scheduled_for', { ascending: false }),
    sb.from('posting_materials').select('*').eq('client_email', email).eq('kind', 'photo').neq('status', 'archived').order('created_at', { ascending: false }).limit(60),
    accountViews(sb, email),
  ]);
  return NextResponse.json({
    settings,
    today,
    posts: (posts.data ?? []) as PostRow[],
    materials: materials.data ?? [],
    accounts,
  });
}

type Body =
  | { action: 'material'; url: string; note?: string }
  | { action: 'material-archive'; id: string }
  | { action: 'caption'; id: string; platform: Platform; text: string }
  | { action: 'skip'; id: string }
  | { action: 'unskip'; id: string }
  | { action: 'settings'; post_hour_mt?: number; weekly_summary?: boolean; notify_emails?: string[] }
  | { action: 'disconnect'; platform: Platform };

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const email = session.email;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const settings = await getSettings(sb, email);
  if (!settings) return NextResponse.json({ error: 'Daily Posting is not on this account.' }, { status: 403 });

  switch (body.action) {
    case 'material': {
      const url = String(body.url ?? '');
      if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/client-intake\/posting\//i.test(url)) {
        return NextResponse.json({ error: 'That is not one of your uploads.' }, { status: 400 });
      }
      const note = String(body.note ?? '').trim().slice(0, 1000) || null;
      const { data, error } = await sb.from('posting_materials').insert({ client_email: email, url, kind: 'photo', note, uploaded_by: email, status: 'fresh' }).select('*').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // A fresh photo takes the next open day at once, so the client sees it land on the calendar.
      await planClient(sb, settings, { days: 3 });
      return NextResponse.json({ ok: true, material: data });
    }
    case 'material-archive': {
      await sb.from('posting_materials').update({ status: 'archived' }).eq('id', String(body.id)).eq('client_email', email).eq('status', 'fresh');
      return NextResponse.json({ ok: true });
    }
    case 'caption': {
      if (!(PLATFORMS as readonly string[]).includes(String(body.platform))) return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
      const { data: post } = await sb.from('posting_posts').select('id, status, captions').eq('id', String(body.id)).eq('client_email', email).maybeSingle();
      if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });
      if (['published', 'publishing'].includes(String(post.status))) return NextResponse.json({ error: 'That one has already gone out.' }, { status: 409 });
      const captions = scrub({ ...((post.captions as Record<string, string>) ?? {}), [body.platform]: String(body.text ?? '').slice(0, 3000) });
      const patch: Record<string, unknown> = { captions, edited_by: email, updated_at: new Date().toISOString() };
      if (post.status === 'writing') patch.status = 'scheduled';
      await sb.from('posting_posts').update(patch).eq('id', post.id as string);
      return NextResponse.json({ ok: true });
    }
    case 'skip': {
      const { data: post } = await sb.from('posting_posts').select('id, status, material_id').eq('id', String(body.id)).eq('client_email', email).maybeSingle();
      if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });
      if (['published', 'publishing', 'partial'].includes(String(post.status))) return NextResponse.json({ error: 'That one has already gone out.' }, { status: 409 });
      await sb.from('posting_posts').update({ status: 'skipped', edited_by: email, updated_at: new Date().toISOString() }).eq('id', post.id as string);
      // The photo goes back in the bin for another day.
      if (post.material_id) await sb.from('posting_materials').update({ status: 'fresh' }).eq('id', post.material_id as string).eq('kind', 'photo');
      return NextResponse.json({ ok: true });
    }
    case 'unskip': {
      const { data: post } = await sb.from('posting_posts').select('id, status, material_id, captions').eq('id', String(body.id)).eq('client_email', email).maybeSingle();
      if (!post || post.status !== 'skipped') return NextResponse.json({ error: 'Nothing to put back' }, { status: 404 });
      const has = (post.captions as Record<string, string>)?.facebook;
      await sb.from('posting_posts').update({ status: has ? 'scheduled' : 'writing', updated_at: new Date().toISOString() }).eq('id', post.id as string);
      if (post.material_id) await sb.from('posting_materials').update({ status: 'used' }).eq('id', post.material_id as string);
      return NextResponse.json({ ok: true });
    }
    case 'settings': {
      const patch: Record<string, unknown> = {};
      if (typeof body.post_hour_mt === 'number') patch.post_hour_mt = body.post_hour_mt;
      if (typeof body.weekly_summary === 'boolean') patch.weekly_summary = body.weekly_summary;
      if (Array.isArray(body.notify_emails)) patch.notify_emails = body.notify_emails.map((e) => String(e).trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 5);
      const r = await saveSettings(sb, email, patch);
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
    }
    case 'disconnect': {
      if (!(PLATFORMS as readonly string[]).includes(String(body.platform))) return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
      if (body.platform === 'gbp') return NextResponse.json({ error: 'Google is disconnected from the main portal page.' }, { status: 400 });
      await disconnectAccount(sb, email, body.platform);
      if (body.platform === 'facebook') await disconnectAccount(sb, email, 'instagram');
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
