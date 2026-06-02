import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Harvest one-click opt-out. Adds the contact to the shared suppression table
 * that Harvest honors on every run. Supports both a clicked link (GET) and the
 * RFC 8058 one-click POST that email clients use from the List-Unsubscribe
 * header. Opt-outs are honored immediately, as CAN-SPAM requires.
 */

async function suppress(contact: string): Promise<boolean> {
  const c = contact.trim().toLowerCase();
  if (!c) return false;
  const db = getSupabase();
  if (!db) return false;
  try {
    await db.from('suppression').upsert({ contact: c, reason: 'unsubscribe-harvest' }, { onConflict: 'contact' });
    // Also flip any matching prospect so it never re-enters outreach.
    await db.from('harvest_prospects').update({ status: 'suppressed' }).eq('contact', c);
    return true;
  } catch {
    return false;
  }
}

function page(message: string): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f7f5f0;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}main{max-width:460px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#555;line-height:1.5}</style></head><body><main><h1>You are unsubscribed.</h1><p>${message}</p></main></body></html>`;
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: Request) {
  const contact = new URL(req.url).searchParams.get('c') ?? '';
  if (!contact) return page('No address was provided, but you will not be contacted further.');
  await suppress(contact);
  return page('We have removed you and will not email you again. Thank you.');
}

export async function POST(req: Request) {
  // One-click (RFC 8058). The address is in the query string.
  const contact = new URL(req.url).searchParams.get('c') ?? '';
  const ok = await suppress(contact);
  return NextResponse.json({ ok });
}
