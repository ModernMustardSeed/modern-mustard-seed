import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { resendClient } from '@/lib/send-email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PHOTOS FOR A PROJECT PAGE. Carmen picks the project, drops the photos, adds
 * a line if she wants. The rows wait as `new` until the site build reads them
 * onto the page and marks them live; Sarah is told the moment they land.
 * Scoped by the signed-in email.
 */
type Photo = { id: string; project_slug: string; url: string; caption: string | null; status: string; live_at: string | null; created_at: string };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ projectPhotos: null });
  let photos: Photo[] = [];
  try {
    const { data } = await sb.from('client_project_photos').select('id, project_slug, url, caption, status, live_at, created_at').eq('client_email', session.email).neq('status', 'skipped').order('created_at', { ascending: false }).limit(200);
    photos = (data ?? []) as Photo[];
  } catch {
    /* not migrated */
  }
  return NextResponse.json({ projectPhotos: { projects: project.projects, photos, siteUrl: project.siteUrl } });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: { project?: string; photos?: Array<{ url?: string; name?: string }>; caption?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const slug = String(body.project ?? '');
  const proj = project.projects.find((p) => p.slug === slug);
  if (!proj) return NextResponse.json({ error: 'Pick which project these belong to.' }, { status: 400 });
  const urls = (Array.isArray(body.photos) ? body.photos : []).map((p) => String(p?.url ?? '')).filter((u) => /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/client-intake\/projects\//.test(u)).slice(0, 40);
  if (!urls.length) return NextResponse.json({ error: 'No photos came through. Drop them again.' }, { status: 400 });
  const caption = String(body.caption ?? '').trim().slice(0, 500) || null;
  const { error } = await sb.from('client_project_photos').insert(urls.map((url) => ({ client_email: session.email, project_slug: slug, url, caption, uploaded_by: session.email })));
  if (error) return NextResponse.json({ error: 'Could not save those. Try again in a minute.' }, { status: 500 });
  try {
    const resend = resendClient();
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      replyTo: [session.email],
      subject: `${project.business}: ${urls.length} new ${urls.length === 1 ? 'photo' : 'photos'} for ${proj.title}`,
      html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p>${esc(session.email)} dropped ${urls.length} ${urls.length === 1 ? 'photo' : 'photos'} for <strong>${esc(proj.title)}</strong>${caption ? `: "${esc(caption)}"` : ''}.</p>${urls.map((u) => `<p><a href="${u}">${esc(u.split('/').pop() ?? u)}</a></p>`).join('')}<p style="opacity:.6;font-size:13px;">They wait as new in client_project_photos until the site build puts them on /projects/${esc(slug)} and marks them live. Desk: ${SITE.url}/admin/posting</p></div>`,
      text: `${session.email} dropped ${urls.length} photos for ${proj.title}${caption ? `: "${caption}"` : ''}.\n${urls.join('\n')}`,
    });
  } catch {
    /* saved either way */
  }
  return NextResponse.json({ ok: true, count: urls.length });
}

export async function DELETE(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Which photo?' }, { status: 400 });
  // A photo already on the page is the site build's to take down, not a click's.
  await sb.from('client_project_photos').update({ status: 'skipped' }).eq('id', id).eq('client_email', session.email).eq('status', 'new');
  return NextResponse.json({ ok: true });
}
