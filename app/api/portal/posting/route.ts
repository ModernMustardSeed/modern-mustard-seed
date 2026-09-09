import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getSettings, saveSettings } from '@/lib/posting/settings';
import { accountViews, disconnectAccount } from '@/lib/posting/accounts';
import { planClient, emptyDaysAhead, approvePost, repost } from '@/lib/posting/planner';
import { sendGraphicRequest } from '@/lib/posting/notify';
import { scrub } from '@/lib/posting/captions';
import { clientGuide } from '@/lib/posting/guide';
import { mountainDate, addDays } from '@/lib/posting/time';
import { PLATFORMS, type MaterialRow, type Platform, type PostRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE CLIENT'S POSTING CALENDAR. Every read and write is scoped by the
 * session email, never by an id in the request. A client types what they
 * want said, attaches a photo or asks for a graphic, picks the platforms and
 * a link, and sees the day it takes. They can change any version until the
 * hour it posts, approve a held day, skip a day, put a day back, or say a
 * past post again.
 *
 * Until Sarah switches the calendar on for them (`visible`), this answers as
 * if Daily Posting were not on the account. The engine can run underneath
 * for as long as it takes to make it right.
 */
const UPLOAD_RE = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/client-intake\/posting\//i;

function pickPlatforms(v: unknown): Platform[] | null {
  if (!Array.isArray(v)) return null;
  const list = v.filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(String(p)));
  return list.length ? list : null;
}
function cleanLink(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.href.slice(0, 500);
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const email = session.email;

  const settings = await getSettings(sb, email);
  if (!settings || !settings.visible) return NextResponse.json({ settings: null });

  const today = mountainDate();
  const [posts, materials, accounts, empty] = await Promise.all([
    sb.from('posting_posts').select('*').eq('client_email', email).gte('scheduled_for', addDays(today, -30)).lte('scheduled_for', addDays(today, 30)).order('scheduled_for', { ascending: false }),
    sb.from('posting_materials').select('*').eq('client_email', email).eq('kind', 'post').neq('status', 'archived').order('created_at', { ascending: false }).limit(60),
    accountViews(sb, email),
    emptyDaysAhead(sb, settings, 7),
  ]);
  return NextResponse.json({ settings, today, posts: (posts.data ?? []) as PostRow[], materials: (materials.data ?? []) as MaterialRow[], accounts, emptyDays: empty, guide: clientGuide(settings) });
}

type Body =
  | { action: 'post'; text: string; url?: string | null; wants_graphic?: boolean; graphic_brief?: string; note?: string; platforms?: Platform[]; link?: string }
  | { action: 'post-archive'; id: string }
  | { action: 'caption'; id: string; platform: Platform; text: string }
  | { action: 'approve'; id: string }
  | { action: 'repost'; id: string }
  | { action: 'skip'; id: string }
  | { action: 'unskip'; id: string }
  | { action: 'settings'; post_hour_mt?: number; platform_hours?: Record<string, number>; approve_first?: boolean; weekly_summary?: boolean; notify_emails?: string[] }
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
  if (!settings || !settings.visible) return NextResponse.json({ error: 'Daily Posting is not on this account.' }, { status: 403 });

  switch (body.action) {
    case 'post': {
      const text = String(body.text ?? '').trim().slice(0, 4000);
      if (text.length < 3) return NextResponse.json({ error: 'Type what you want said first.' }, { status: 400 });
      const url = body.url ? String(body.url) : null;
      if (url && !UPLOAD_RE.test(url)) return NextResponse.json({ error: 'That is not one of your uploads.' }, { status: 400 });
      const wantsGraphic = Boolean(body.wants_graphic) && !url;
      const row = {
        client_email: email,
        kind: 'post',
        text,
        url,
        platforms: pickPlatforms(body.platforms),
        link: cleanLink(body.link),
        wants_graphic: wantsGraphic,
        graphic_brief: wantsGraphic ? String(body.graphic_brief ?? '').trim().slice(0, 1000) || null : null,
        note: String(body.note ?? '').trim().slice(0, 1000) || null,
        uploaded_by: email,
        status: 'fresh',
      };
      const { data, error } = await sb.from('posting_materials').insert(row).select('*').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const planned = await planClient(sb, settings);
      if (wantsGraphic) await sendGraphicRequest(settings, data as MaterialRow);
      return NextResponse.json({ ok: true, material: data, planned });
    }
    case 'post-archive': {
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
    case 'approve': {
      const { data: post } = await sb.from('posting_posts').select('id').eq('id', String(body.id)).eq('client_email', email).maybeSingle();
      if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });
      const r = await approvePost(sb, post.id as string, email);
      return r.ok ? NextResponse.json({ ok: true, status: r.status }) : NextResponse.json({ error: r.error }, { status: 409 });
    }
    case 'repost': {
      const r = await repost(sb, settings, String(body.id), email);
      return 'error' in r ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json({ ok: true, planned: r });
    }
    case 'skip': {
      const { data: post } = await sb.from('posting_posts').select('id, status, material_id').eq('id', String(body.id)).eq('client_email', email).maybeSingle();
      if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });
      if (['published', 'publishing'].includes(String(post.status))) return NextResponse.json({ error: 'That one has already gone out.' }, { status: 409 });
      await sb.from('posting_posts').update({ status: 'skipped', edited_by: email, updated_at: new Date().toISOString() }).eq('id', post.id as string);
      if (post.material_id) await sb.from('posting_materials').update({ status: 'archived' }).eq('id', post.material_id as string);
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
      if (body.platform_hours && typeof body.platform_hours === 'object') patch.platform_hours = { ...settings.platform_hours, ...body.platform_hours };
      if (typeof body.approve_first === 'boolean') patch.approve_first = body.approve_first;
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
