import { getSupabase } from '@/lib/supabase';
import { unsubscribe } from '@/lib/client-mailings';
import { CLIENT_PROJECTS } from '@/lib/client-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE WAY OUT of a client's campaign list.
 *
 * GET shows the page and changes nothing, because mail scanners open every
 * link in a message before a person ever sees it, and a scanner must not be
 * able to unsubscribe somebody. POST is the act: the button on the page posts
 * here, and so does a mail client's own one-click unsubscribe (RFC 8058).
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title: string, line: string, token: string | null): Response {
  const form = token
    ? `<form method="post" action="/api/client-unsubscribe?t=${esc(token)}"><button type="submit">Unsubscribe me</button></form>`
    : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#f6f3ee;color:#161616;font:17px/1.6 Georgia,'Times New Roman',serif;display:grid;min-height:100vh;place-items:center;padding:24px}
main{max-width:520px;background:#fff;padding:36px 32px;border-top:4px solid #161616}h1{font-size:26px;line-height:1.2;margin:0 0 12px}p{margin:0 0 20px}
button{font:600 15px/1 Arial,Helvetica,sans-serif;background:#161616;color:#fff;border:0;padding:14px 22px;cursor:pointer}button:focus-visible{outline:3px solid #f5b700;outline-offset:3px}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(line)}</p>${form}</main></body></html>`;
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

const businessFor = (clientEmail: string | null) =>
  Object.values(CLIENT_PROJECTS).find((p) => p.clientEmail.toLowerCase() === (clientEmail ?? '').toLowerCase())?.business ?? 'this business';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  if (!/^[a-f0-9]{32}$/i.test(token)) return page('That link is not complete', 'Open the unsubscribe link from the email again.', null);
  return page('Stop these emails?', 'Press the button and we will not write to this address again.', token);
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const sb = getSupabase();
  if (!sb) return page('Something went wrong on our side', 'Nothing was changed. Try the link again in a minute.', null);
  const done = await unsubscribe(sb, token);
  if (!done.ok) return page('That link is not complete', 'Open the unsubscribe link from the email again.', null);
  return page('You are unsubscribed', `${businessFor(done.clientEmail)} will not email this address again.`, null);
}
