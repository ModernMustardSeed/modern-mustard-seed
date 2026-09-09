import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { getSession } from '@/lib/admin-auth';
import { listSettings, getSettings, saveSettings, EDITABLE_SETTINGS } from '@/lib/posting/settings';
import { accountViews, connectFacebookByToken, connectXByTokens, disconnectAccount, setGbpLocation } from '@/lib/posting/accounts';
import { planClient, releaseForGraphic, approvePost, repost } from '@/lib/posting/planner';
import { publishPost, markManual, ensureWords } from '@/lib/posting/publish';
import { refreshStats } from '@/lib/posting/insights';
import { enqueueCaptions, scrub } from '@/lib/posting/captions';
import { listGbpLocations } from '@/lib/posting/publishers/gbp';
import { deskGuide, clientGuide } from '@/lib/posting/guide';
import { mountainDate, addDays, mountainToUtc } from '@/lib/posting/time';
import { PLATFORMS, type Platform, type PostRow, type MaterialRow, type SettingsRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * THE POSTING DESK. Every client on Daily Posting, their connections, their
 * queue, their graphic requests, their calendar, and every lever: show or
 * hide it from the client, connect by token, post now, re-edit, approve,
 * hold, skip, move, attach a graphic, say it again, mark the hand-posts done.
 */
export async function GET(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;
  const url = new URL(req.url);
  const client = url.searchParams.get('client')?.toLowerCase().trim() ?? null;

  const clients = await listSettings(db);
  const today = mountainDate();
  const overview = await Promise.all(
    clients.map(async (s) => {
      const [{ data: todays }, { data: next }, { count: queued }, { count: graphics }, { count: approvals }, accounts] = await Promise.all([
        db.from('posting_posts').select('id, status, headline').eq('client_email', s.client_email).eq('scheduled_for', today).maybeSingle(),
        db.from('posting_posts').select('scheduled_for').eq('client_email', s.client_email).gt('scheduled_for', today).neq('status', 'skipped').order('scheduled_for').limit(1).maybeSingle(),
        db.from('posting_posts').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).gt('scheduled_for', today).in('status', ['writing', 'scheduled', 'held']),
        db.from('posting_materials').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).eq('wants_graphic', true).is('graphic_done_at', null).neq('status', 'archived'),
        db.from('posting_posts').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).eq('status', 'held').is('approved_at', null),
        accountViews(db, s.client_email),
      ]);
      return { settings: s, today: todays ?? null, nextPlanned: next?.scheduled_for ?? null, queued: queued ?? 0, graphicsWaiting: graphics ?? 0, approvalsWaiting: approvals ?? 0, connected: accounts.filter((a) => a.connected).map((a) => a.provider) };
    }),
  );

  if (!client) return NextResponse.json({ clients: overview, detail: null });

  const settings = clients.find((s) => s.client_email === client) ?? null;
  if (!settings) return NextResponse.json({ clients: overview, detail: null, error: 'No posting settings for that client.' });
  const [posts, materials, accounts, leads] = await Promise.all([
    db.from('posting_posts').select('*').eq('client_email', client).gte('scheduled_for', addDays(today, -21)).lte('scheduled_for', addDays(today, 30)).order('scheduled_for', { ascending: false }),
    db.from('posting_materials').select('*').eq('client_email', client).eq('kind', 'post').neq('status', 'archived').order('created_at', { ascending: false }).limit(120),
    accountViews(db, client),
    db.from('client_leads').select('id, source, sources, name, phone, email, town, project_type, land, page, priority, handled_at, created_at').eq('client_email', client).order('created_at', { ascending: false }).limit(30),
  ]);
  return NextResponse.json({
    clients: overview,
    detail: {
      settings,
      today,
      posts: (posts.data ?? []) as PostRow[],
      materials: (materials.data ?? []) as MaterialRow[],
      accounts,
      leads: leads.data ?? [],
      guide: deskGuide(settings),
      clientGuide: clientGuide(settings),
      env: {
        x: Boolean(process.env.X_OAUTH2_CLIENT_ID),
        linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID),
        google: Boolean(process.env.GOOGLE_CLIENT_ID),
        facebookApp: Boolean(process.env.FACEBOOK_APP_ID),
      },
    },
  });
}

type Body = { action: string; client?: string } & Record<string, unknown>;

export async function POST(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;
  const admin = await getSession();
  const by = admin?.email ?? 'admin';
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const client = String(body.client ?? '').toLowerCase().trim();
  const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

  switch (body.action) {
    case 'create': {
      if (!client || !body.business_name) return bad('Client email and business name are needed.');
      const r = await saveSettings(db, client, { business_name: String(body.business_name), site_url: (body.site_url as string) ?? null, phone: (body.phone as string) ?? null, towns: (body.towns as string[]) ?? [], services: (body.services as string[]) ?? [] });
      return r.ok ? NextResponse.json({ ok: true }) : bad(r.error);
    }
    case 'settings': {
      if (!client) return bad('Client is needed.');
      const patch: Partial<SettingsRow> = {};
      for (const k of EDITABLE_SETTINGS) if (k in body) (patch as Record<string, unknown>)[k] = body[k];
      const r = await saveSettings(db, client, patch);
      return r.ok ? NextResponse.json({ ok: true }) : bad(r.error);
    }
    case 'facebook-token': {
      if (!client) return bad('Client is needed.');
      const r = await connectFacebookByToken(db, client, String(body.token ?? ''), (body.pageId as string) ?? null);
      if (!r.ok) return NextResponse.json({ error: r.error, choices: r.choices ?? null }, { status: 400 });
      return NextResponse.json({ ok: true, page: r.page, instagram: r.instagram });
    }
    case 'x-tokens': {
      if (!client) return bad('Client is needed.');
      const r = await connectXByTokens(db, client, String(body.access ?? ''), (body.refresh as string) ?? null);
      return r.ok ? NextResponse.json({ ok: true, username: r.username }) : bad(r.error);
    }
    case 'gbp-locations': {
      if (!client) return bad('Client is needed.');
      const r = await listGbpLocations(db, client);
      return r.ok ? NextResponse.json({ ok: true, locations: r.locations }) : bad(r.error);
    }
    case 'gbp-location': {
      if (!client) return bad('Client is needed.');
      await setGbpLocation(db, client, (body.location as string) ?? null, (body.title as string) ?? null);
      return NextResponse.json({ ok: true });
    }
    case 'disconnect': {
      const p = String(body.platform ?? '') as Platform;
      if (!client || !(PLATFORMS as readonly string[]).includes(p)) return bad('Client and platform are needed.');
      await disconnectAccount(db, client, p);
      if (p === 'facebook') await disconnectAccount(db, client, 'instagram');
      return NextResponse.json({ ok: true });
    }
    case 'post': {
      if (!client) return bad('Client is needed.');
      const text = String(body.text ?? '').trim().slice(0, 4000);
      if (text.length < 3) return bad('Their words are needed.');
      const url = body.url ? String(body.url) : null;
      const platforms = Array.isArray(body.platforms) ? (body.platforms as string[]).filter((p) => (PLATFORMS as readonly string[]).includes(p)) : null;
      const { error } = await db.from('posting_materials').insert({ client_email: client, kind: 'post', text, url, platforms: platforms?.length ? platforms : null, link: (body.link as string) || null, wants_graphic: Boolean(body.wants_graphic) && !url, graphic_brief: (body.graphic_brief as string) ?? null, note: String(body.note ?? '').slice(0, 1000) || null, uploaded_by: by, status: 'fresh' });
      if (error) return bad(error.message, 500);
      const s = await getSettings(db, client);
      if (s) await planClient(db, s);
      return NextResponse.json({ ok: true });
    }
    case 'post-archive': {
      await db.from('posting_materials').update({ status: 'archived' }).eq('id', String(body.id));
      return NextResponse.json({ ok: true });
    }
    case 'graphic': {
      const id = String(body.id ?? '');
      const url = String(body.url ?? '');
      if (!id || !/^https:\/\//.test(url)) return bad('The material id and a public image URL are needed.');
      const { data: m } = await db.from('posting_materials').select('client_email').eq('id', id).maybeSingle();
      if (!m) return bad('No such submission.', 404);
      await db.from('posting_materials').update({ url, graphic_done_at: new Date().toISOString(), graphic_by: by }).eq('id', id);
      const s = await getSettings(db, m.client_email as string);
      if (s) await releaseForGraphic(db, s, id);
      await db.from('posting_posts').update({ image_url: url, updated_at: new Date().toISOString() }).eq('material_id', id).in('status', ['writing', 'scheduled', 'held']);
      return NextResponse.json({ ok: true });
    }
    case 'plan': {
      if (!client) return bad('Client is needed.');
      const s = await getSettings(db, client);
      if (!s) return bad('No settings.');
      return NextResponse.json({ ok: true, plan: await planClient(db, s) });
    }
    case 'approve': {
      const r = await approvePost(db, String(body.id), by);
      return r.ok ? NextResponse.json({ ok: true, status: r.status }) : bad(r.error, 409);
    }
    case 'repost': {
      if (!client) return bad('Client is needed.');
      const s = await getSettings(db, client);
      if (!s) return bad('No settings.');
      const r = await repost(db, s, String(body.id), by);
      return 'error' in r ? bad(r.error) : NextResponse.json({ ok: true, planned: r });
    }
    case 'stats': {
      const { data } = await db.from('posting_posts').select('*').eq('id', String(body.id)).maybeSingle();
      if (!data) return bad('No such post.', 404);
      return NextResponse.json({ ok: true, stats: await refreshStats(db, data as PostRow) });
    }
    case 'words-now': {
      const { data } = await db.from('posting_posts').select('*').eq('id', String(body.id)).maybeSingle();
      if (!data) return bad('No such post.', 404);
      const s = await getSettings(db, data.client_email as string);
      if (!s) return bad('No settings.');
      const post = await ensureWords(db, s, data as PostRow);
      return NextResponse.json({ ok: true, post });
    }
    case 'rewrite': {
      const { data } = await db.from('posting_posts').select('*').eq('id', String(body.id)).maybeSingle();
      if (!data) return bad('No such post.', 404);
      const post = data as PostRow;
      const s = await getSettings(db, post.client_email);
      if (!s) return bad('No settings.');
      let material: MaterialRow | null = null;
      if (post.material_id) {
        const { data: m } = await db.from('posting_materials').select('*').eq('id', post.material_id).maybeSingle();
        material = (m as MaterialRow | null) ?? null;
      }
      if (!material?.text) return bad('No source text to edit from.');
      const jobId = await enqueueCaptions(s, { material, dateStr: post.scheduled_for });
      await db.from('posting_posts').update({ llm_job_id: jobId, written_by: post.captions.facebook ? 'template' : null, edited_by: null, updated_at: new Date().toISOString() }).eq('id', post.id);
      return NextResponse.json({ ok: true, jobId });
    }
    case 'caption': {
      const p = String(body.platform ?? '') as Platform;
      if (!(PLATFORMS as readonly string[]).includes(p)) return bad('Unknown platform');
      const { data: post } = await db.from('posting_posts').select('id, captions, status').eq('id', String(body.id)).maybeSingle();
      if (!post) return bad('No such post.', 404);
      const captions = scrub({ ...((post.captions as Record<string, string>) ?? {}), [p]: String(body.text ?? '').slice(0, 3000) });
      const patch: Record<string, unknown> = { captions, edited_by: by, updated_at: new Date().toISOString() };
      if (post.status === 'writing') patch.status = 'scheduled';
      await db.from('posting_posts').update(patch).eq('id', post.id as string);
      return NextResponse.json({ ok: true });
    }
    case 'headline': {
      await db.from('posting_posts').update({ headline: String(body.text ?? '').slice(0, 80), updated_at: new Date().toISOString() }).eq('id', String(body.id));
      return NextResponse.json({ ok: true });
    }
    case 'hold':
    case 'release':
    case 'skip':
    case 'unskip': {
      const { data: post } = await db.from('posting_posts').select('id, status, material_id, captions').eq('id', String(body.id)).maybeSingle();
      if (!post) return bad('No such post.', 404);
      if (['published', 'publishing'].includes(String(post.status)) && body.action !== 'unskip') return bad('That one has already gone out.', 409);
      const has = Boolean((post.captions as Record<string, string>)?.facebook);
      const status = body.action === 'hold' ? 'held' : body.action === 'skip' ? 'skipped' : has ? 'scheduled' : 'writing';
      const patch: Record<string, unknown> = { status, edited_by: by, updated_at: new Date().toISOString() };
      if (body.action === 'hold') patch.results = { note: 'Held by Sarah.' };
      if (body.action === 'release') patch.results = {};
      await db.from('posting_posts').update(patch).eq('id', post.id as string);
      if (post.material_id) await db.from('posting_materials').update({ status: body.action === 'skip' ? 'archived' : 'used' }).eq('id', post.material_id as string);
      return NextResponse.json({ ok: true });
    }
    case 'reschedule': {
      const date = String(body.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Date as YYYY-MM-DD.');
      const { data: post } = await db.from('posting_posts').select('id, client_email, status, platforms').eq('id', String(body.id)).maybeSingle();
      if (!post) return bad('No such post.', 404);
      if (['published', 'publishing', 'partial'].includes(String(post.status))) return bad('That one has already gone out.', 409);
      const s = await getSettings(db, post.client_email as string);
      if (!s) return bad('No settings.');
      const { error } = await db.from('posting_posts').update({ scheduled_for: date, publish_at: mountainToUtc(date, s.post_hour_mt).toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id as string);
      if (error) return bad(error.message.includes('unique') ? 'That day already has a post.' : error.message);
      return NextResponse.json({ ok: true });
    }
    case 'publish-now': {
      const r = await publishPost(db, String(body.id), { force: true });
      return 'error' in r ? bad(r.error) : NextResponse.json({ ok: true, outcome: r });
    }
    case 'mark-manual': {
      const p = String(body.platform ?? '') as Platform;
      if (!(PLATFORMS as readonly string[]).includes(p)) return bad('Unknown platform');
      const r = await markManual(db, String(body.id), p, (body.url as string) ?? null, by);
      return r.ok ? NextResponse.json({ ok: true }) : bad(r.error);
    }
    default:
      return bad('Unknown action');
  }
}
