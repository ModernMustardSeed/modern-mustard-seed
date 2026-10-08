import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { regKeyValid } from '@/lib/bootcamp/key';
import { recordEvent, setUnsubscribed } from '@/lib/bootcamp/store';

/**
 * Mute the bootcamp reminders. Sets unsubscribed_at on the one registration
 * the signed link names and nothing else: the ticket stands, the replays
 * stand, and the receipt still arrives, because a person who muted reminders
 * did not ask to lose what they paid for. It never writes the global
 * suppression tables.
 *
 * GET is the link in the footer. POST is what Gmail and Yahoo send when the
 * reader presses the client's own Unsubscribe button (RFC 8058), so both
 * answer, and both answer the same way.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, body: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body{margin:0;background:#F3EAD8;color:#161616;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6}
  main{max-width:560px;margin:0 auto;padding:72px 24px}
  .card{background:#FFFDF6;border:2px solid #161616;border-radius:18px;padding:36px 32px}
  .eyebrow{font-size:11px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#C2261A;margin:0 0 14px}
  h1{font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;margin:0 0 16px;font-weight:600}
  p{margin:0 0 14px;font-size:16px;color:#3A3733}
  a{color:#C2261A;font-weight:600}
  .rule{width:44px;height:3px;background:#F5B700;margin:22px 0 0}
</style></head>
<body><main><div class="card"><p class="eyebrow">The One-Person Company Bootcamp</p>${body}<div class="rule"></div></div></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handle(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const k = url.searchParams.get('k');

  if (!UUID_RE.test(id) || !regKeyValid(id, k)) {
    return page(
      'This link is not right',
      `<h1>This link is not right</h1><p>It may have been cut short by your mail client. Open the email again and tap the unsubscribe line, or reply to any of our emails and I will turn the reminders off by hand.</p>`,
      400,
    );
  }

  const sb = getSupabase();
  if (!sb) return page('Try again in a minute', `<h1>Try again in a minute</h1><p>The database did not answer. Reply to any of our emails and I will turn the reminders off by hand.</p>`, 500);

  try {
    const row = await setUnsubscribed(sb, id);
    if (!row) {
      return page('Nothing to turn off', `<h1>Nothing to turn off</h1><p>There is no registration behind this link any more, so there are no reminders to send.</p>`, 404);
    }
    try {
      await recordEvent(sb, 'unsubscribe', { email: row.email, registrationId: row.id, hostSlug: row.host_slug, detail: { method: req.method } });
    } catch {
      /* the mute is what matters; the log line is the lesser thing */
    }
    const ticketLine =
      row.tier === 'masterclass'
        ? 'Your masterclass seat stands. The live link still arrives the morning of, because you asked for that one.'
        : 'Your ticket stands. Replays, your private room and the receipt are untouched; only the reminder emails stop.';
    return page(
      'Reminders are off',
      `<h1>Reminders are off</h1><p>${ticketLine}</p><p>Changed your mind? Reply to any email from me and I will turn them back on.</p><p><a href="https://modernmustardseed.com/bootcamp">Back to the bootcamp</a></p>`,
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp unsubscribe failed', message);
    return page('Try again in a minute', `<h1>Try again in a minute</h1><p>Something did not save. Reply to any of our emails and I will turn the reminders off by hand.</p>`, 500);
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
