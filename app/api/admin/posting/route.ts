import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { getSession } from '@/lib/admin-auth';
import { listSettings, getSettings, saveSettings, EDITABLE_SETTINGS } from '@/lib/posting/settings';
import { accountViews, connectFacebookByToken, connectXByTokens, disconnectAccount, setGbpLocation } from '@/lib/posting/accounts';
import { planClient, planFromToday } from '@/lib/posting/planner';
import { publishPost, markManual, ensureWords } from '@/lib/posting/publish';
import { enqueueCaptions, scrub, type Brief } from '@/lib/posting/captions';
import { evergreenFor } from '@/lib/posting/evergreen';
import { listGbpLocations } from '@/lib/posting/publishers/gbp';
import { mountainDate, addDays, mountainToUtc } from '@/lib/posting/time';
import { PLATFORMS, type Platform, type PostRow, type MaterialRow, type SettingsRow } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * THE POSTING DESK. Every client on Daily Posting, their connections, their
 * bin, their calendar, and every lever: connect by token, plan now, post now,
 * rewrite, hold, skip, mark the hand-posts done.
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
      const [{ data: todays }, { data: next }, { count: fresh }, accounts] = await Promise.all([
        db.from('posting_posts').select('id, status, headline').eq('client_email', s.client_email).eq('scheduled_for', today).maybeSingle(),
        db.from('posting_posts').select('scheduled_for').eq('client_email', s.client_email).gt('scheduled_for', today).order('scheduled_for').limit(1).maybeSingle(),
        db.from('posting_materials').select('id', { count: 'exact', head: true }).eq('client_email', s.client_email).eq('status', 'fresh').eq('kind', 'photo'),
        accountViews(db, s.client_email),
      ]);
      return { settings: s, today: todays ?? null, nextPlanned: next?.scheduled_for ?? null, freshPhotos: fresh ?? 0, connected: accounts.filter((a) => a.connected).map((a) => a.provider) };
    }),
  );

  if (!client) return NextResponse.json({ clients: overview, detail: null });

  const settings = clients.find((s) => s.client_email === client) ?? null;
  if (!settings) return NextResponse.json({ clients: overview, detail: null, error: 'No posting settings for that client.' });
  const [posts, materials, accounts, leads] = await Promise.all([
    db.from('posting_posts').select('*').eq('client_email', client).gte('scheduled_for', addDays(today, -21)).lte('scheduled_for', addDays(today, 7)).order('scheduled_for', { ascending: false }),
    db.from('posting_materials').select('*').eq('client_email', client).neq('status', 'archived').order('kind').order('created_at', { ascending: false }).limit(120),
    accountViews(db, client),
    db.from('client_leads').select('id, source, sources, name, phone, email, town, project_type, land, page, created_at').eq('client_email', client).order('created_at', { ascending: false }).limit(30),
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
      if (!r.ok) return bad(r.error);
      const s = await getSettings(db, client);
      if (s) await planFromToday(db, s);
      return NextResponse.json({ ok: true });
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
    case 'material': {
      if (!client) return bad('Client is needed.');
      const url = String(body.url ?? '');
      if (!/^https:\/\//.test(url)) return bad('A public image URL is needed.');
      const kind = body.kind === 'brand' ? 'brand' : 'photo';
      const { error } = await db.from('posting_materials').insert({ client_email: client, url, kind, note: String(body.note ?? '').slice(0, 1000) || null, uploaded_by: by, status: 'fresh' });
      if (error) return bad(error.message, 500);
      const s = await getSettings(db, client);
      if (s && kind === 'photo') await planClient(db, s, { days: 3 });
      return NextResponse.json({ ok: true });
    }
    case 'material-archive': {
      await db.from('posting_materials').update({ status: 'archived' }).eq('id', String(body.id));
      return NextResponse.json({ ok: true });
    }
    case 'plan': {
      if (!client) return bad('Client is needed.');
      const s = await getSettings(db, client);
      if (!s) return bad('No settings.');
      const r = body.fromToday ? await planFromToday(db, s) : await planClient(db, s, { force: Boolean(body.force) });
      return NextResponse.json({ ok: true, plan: r });
    }
    case 'words-now': {
      // Fill the words this minute (template if the drainer has not answered), so the desk shows something to edit.
      const { data } = await db.from('posting_posts').select('*').eq('id', String(body.id)).maybeSingle();
      if (!data) return bad('No such post.', 404);
      const s = await getSettings(db, data.client_email as string);
      if (!s) return bad('No settings.');
      const post = await ensureWords(db, s, data as PostRow);
      return NextResponse.json({ ok: true, post });
    }
    case 'rewrite': {
      // Queue Claude again; the hourly upgrade swaps the words in when the answer lands.
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
      const brief: Brief = post.source === 'material' && material ? { kind: 'material', material, dateStr: post.scheduled_for } : { kind: 'evergreen', evergreen: evergreenFor(s, post.scheduled_for), dateStr: post.scheduled_for };
      const jobId = await enqueueCaptions(s, brief);
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
      await db.from('posting_posts').update({ status, edited_by: by, updated_at: new Date().toISOString() }).eq('id', post.id as string);
      if (post.material_id) await db.from('posting_materials').update({ status: body.action === 'skip' ? 'fresh' : 'used' }).eq('id', post.material_id as string).eq('kind', 'photo');
      return NextResponse.json({ ok: true });
    }
    case 'reschedule': {
      const date = String(body.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Date as YYYY-MM-DD.');
      const { data: post } = await db.from('posting_posts').select('id, client_email, status').eq('id', String(body.id)).maybeSingle();
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
