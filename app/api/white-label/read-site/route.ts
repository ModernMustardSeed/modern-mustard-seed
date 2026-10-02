/**
 * Read a client's website for the white label demo, once, and keep it.
 *
 * Returns what the page shows the agency (name, phone, color, which pages
 * were read) plus a key. The demo call sends the key, never the text, so the
 * agent always speaks from what this route actually read. Cached a week per
 * URL in app_state `white-label:site:<key>`.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { readClientSite, siteKey, normalizeUrl, type SiteRead } from '@/lib/white-label/read-site';

export const runtime = 'nodejs';
export const maxDuration = 30;

const WEEK = 7 * 24 * 60 * 60 * 1000;
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 12;
}

function view(key: string, r: SiteRead) {
  return { ok: true, key, url: r.url, name: r.name, description: r.description, phone: r.phone, themeColor: r.themeColor, pages: r.pages, chars: r.text.length };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeUrl(body.url || '');
  if (!url) return NextResponse.json({ error: 'bad_url', message: 'That does not look like a website address.' }, { status: 400 });

  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'unavailable', message: 'The reader is offline right now.' }, { status: 503 });

  const key = siteKey(url);
  const cached = await db.from('app_state').select('value, updated_at').eq('key', `white-label:site:${key}`).maybeSingle();
  if (cached.data?.value && Date.now() - Date.parse(cached.data.updated_at as string) < WEEK) {
    return NextResponse.json(view(key, cached.data.value as SiteRead));
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited', message: 'That is a lot of sites in an hour. Try again shortly.' }, { status: 429 });

  const read = await readClientSite(url);
  if (!read || read.text.length < 200) {
    return NextResponse.json(
      { error: 'unreadable', message: 'We could not read enough of that site. Try its homepage address, or pick a sample client instead.' },
      { status: 422 },
    );
  }

  await db.from('app_state').upsert({ key: `white-label:site:${key}`, value: read, updated_at: new Date().toISOString() });
  return NextResponse.json(view(key, read));
}
