import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Public one-click unsubscribe. Adds the contact to the permanent suppression
 *  list and marks any matching prospect opted out. Honored instantly, forever. */
export async function GET(req: Request) {
  const contact = new URL(req.url).searchParams.get('c')?.toLowerCase().trim();
  const supabase = getSupabase();
  if (contact && supabase) {
    try {
      await supabase.from('suppression').upsert({ contact, reason: 'unsubscribe link' }, { onConflict: 'contact' });
      await supabase.from('prospects').update({ status: 'opted_out' }).eq('contact', contact);
    } catch {
      /* ignore */
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="margin:0;background:#080c16;color:#f5f0e8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:460px;padding:40px;text-align:center">
<p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#C8964E;font-weight:700">Modern Mustard Seed</p>
<h1 style="font-size:26px;font-weight:600;margin:14px 0">You are unsubscribed</h1>
<p style="color:#b9b4a8;line-height:1.6">You will not be contacted again. Thank you, and I am sorry for the interruption. If you ever want to look at the partner program on your own terms, it lives at <a href="https://modernmustardseed.com/partners" style="color:#C8964E">modernmustardseed.com/partners</a>.</p>
</div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
