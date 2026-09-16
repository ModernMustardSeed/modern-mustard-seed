import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { MEDIA, campaignUrl, isCode, mintCode, type Campaign } from '@/lib/campaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE OWNER'S QR CODES. GET lists them with scans and leads; POST makes one
 * from a label and a page; DELETE retires one (the sign may still be out
 * there, so a retired code keeps counting but drops off the list).
 * Scoped by the signed-in email.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ campaigns: null });
  let rows: Campaign[] = [];
  try {
    const { data } = await sb.from('client_campaigns').select('id, code, label, medium, path, scans, leads, archived_at, created_at').eq('client_email', session.email).is('archived_at', null).order('created_at', { ascending: false });
    rows = (data ?? []) as Campaign[];
  } catch {
    /* not migrated */
  }
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: week } = await sb.from('client_visits').select('campaign_code').eq('client_email', session.email).gte('created_at', since);
  const weekBy = new Map<string, number>();
  for (const v of week ?? []) weekBy.set(v.campaign_code as string, (weekBy.get(v.campaign_code as string) ?? 0) + 1);
  const pages: Array<{ path: string; label: string; group: string }> = [
    { path: '/', label: 'Home page', group: 'Pages' },
    { path: '/contact', label: 'Contact', group: 'Pages' },
    { path: '/projects', label: 'Projects', group: 'Pages' },
    { path: '/services', label: 'Services', group: 'Pages' },
    { path: '/about', label: 'About', group: 'Pages' },
    { path: '/blog', label: 'Blog', group: 'Pages' },
    { path: '/community', label: 'Community', group: 'Pages' },
    ...['kalispell', 'whitefish', 'bigfork', 'eureka', 'columbia-falls', 'lakeside', 'polson'].map((t) => ({ path: `/custom-homes-${t}-mt`, label: `Custom homes, ${t.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`, group: 'Towns' })),
    ...project.projects.map((p) => ({ path: `/projects/${p.slug}`, label: p.title, group: 'Projects (jobsite signs)' })),
  ];
  return NextResponse.json({
    campaigns: rows.map((c) => ({ ...c, url: campaignUrl(project, c), scansThisWeek: weekBy.get(c.code) ?? 0 })),
    pages,
    media: MEDIA,
    base: project.publicUrl,
  });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: { label?: string; medium?: string; path?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const label = String(body.label ?? '').trim().slice(0, 80);
  if (label.length < 2) return NextResponse.json({ error: 'Give it a name a person would recognise: "Bigfork yard sign", "Truck door".' }, { status: 400 });
  const medium = (MEDIA as readonly string[]).includes(String(body.medium)) ? String(body.medium) : 'other';
  let path = String(body.path ?? '/').trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (!/^\/[A-Za-z0-9\-._~/]*$/.test(path)) return NextResponse.json({ error: 'That page address has characters a link cannot carry.' }, { status: 400 });
  const code = await mintCode(sb, session.email, label);
  const { data, error } = await sb.from('client_campaigns').insert({ client_email: session.email, code, label, medium, path }).select('id, code, label, medium, path, scans, leads, archived_at, created_at').single();
  if (error || !data) return NextResponse.json({ error: 'Could not save that. Try again in a minute.' }, { status: 500 });
  return NextResponse.json({ ok: true, campaign: { ...data, url: campaignUrl(project, data as Campaign), scansThisWeek: 0 } });
}

export async function DELETE(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const code = new URL(req.url).searchParams.get('code') ?? '';
  if (!isCode(code)) return NextResponse.json({ error: 'Which code?' }, { status: 400 });
  await sb.from('client_campaigns').update({ archived_at: new Date().toISOString() }).eq('client_email', session.email).eq('code', code);
  return NextResponse.json({ ok: true });
}
