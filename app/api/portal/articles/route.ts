import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * THE CLIENT'S WRITING, ON THEIR OWN SITE.
 *
 * Carmen writes a piece for Kalispell Montana Hidden Gems every month. It runs
 * on their site under Built Right's byline, which means every keyword in it
 * earns for someone else's domain. The fix is cheap: a written summary on
 * Built Right's own blog carrying the same trade terms and town names, and a
 * link to the full article.
 *
 * She should not have to email anyone to start that. She pastes the link, we
 * read the title and date off the page so she can see we got the right one,
 * and Sarah is told. Everything is scoped by the signed-in email, never by an
 * id in the request.
 */
function clean(url: string): string | null {
  const s = url.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    return u.href.slice(0, 600);
  } catch {
    return null;
  }
}

/** Read the title and publication date off the article, so a wrong paste is obvious at a glance. */
async function readArticle(url: string): Promise<{ title: string | null; publishedOn: string | null; publisher: string | null }> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ModernMustardSeed/1.0)' }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return { title: null, publishedOn: null, publisher: null };
    const html = (await res.text()).slice(0, 400_000);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? null;
    const title =
      pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ??
      pick(/<title[^>]*>([^<]{3,200})/i);
    const raw =
      pick(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i) ??
      pick(/"datePublished"\s*:\s*"([^"]+)"/i) ??
      pick(/<time[^>]+datetime=["']([^"']+)/i);
    const publishedOn = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString().slice(0, 10) : null;
    const publisher = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i);
    return { title: title ? title.replace(/\s+/g, ' ').slice(0, 300) : null, publishedOn, publisher: publisher?.slice(0, 160) ?? null };
  } catch {
    // A site that refuses us is not a reason to refuse her. The row still saves.
    return { title: null, publishedOn: null, publisher: null };
  }
}

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ articles: [] });
  try {
    const { data } = await sb
      .from('client_articles')
      .select('id, url, title, published_on, publisher, status, live_at, created_at')
      .eq('client_email', session.email)
      .neq('status', 'skipped')
      .order('published_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    return NextResponse.json({ articles: data ?? [] });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { url?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const url = clean(String(body.url ?? ''));
  if (!url) return NextResponse.json({ error: 'That does not look like a link. Paste the whole address, starting with https.' }, { status: 400 });

  const { data: existing } = await sb.from('client_articles').select('id, title').eq('client_email', session.email).eq('url', url).maybeSingle();
  if (existing) return NextResponse.json({ error: 'That one is already on the list.', article: existing }, { status: 409 });

  const meta = await readArticle(url);
  const { data, error } = await sb
    .from('client_articles')
    .insert({ client_email: session.email, url, title: meta.title, published_on: meta.publishedOn, publisher: meta.publisher, added_by: session.email, status: 'new' })
    .select('id, url, title, published_on, publisher, status, created_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Could not save that. Try again in a minute.' }, { status: 500 });

  try {
    const resend = resendClient();
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      replyTo: [session.email],
      subject: `New article to write up: ${meta.title ?? url}`,
      html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:540px;">
        <p style="margin:0 0 12px;">${esc(session.email)} added an article from their portal.</p>
        <p style="margin:0 0 12px;"><strong>${esc(meta.title ?? 'Title not read')}</strong><br>
        ${meta.publishedOn ? `Published ${esc(meta.publishedOn)}<br>` : ''}
        <a href="${url}" style="color:#C4380C;">${esc(url)}</a></p>
        <p style="margin:0;">Write the summary and put it on their blog. It is waiting in <a href="${SITE.url}/admin/clients">the client book</a>.</p>
      </div>`,
      text: `${session.email} added an article.\n\n${meta.title ?? 'Title not read'}\n${meta.publishedOn ?? ''}\n${url}\n\nWrite the summary and put it on their blog.`,
    });
  } catch {
    /* the row is saved; a failed notification must not lose it */
  }

  return NextResponse.json({ ok: true, article: data });
}
