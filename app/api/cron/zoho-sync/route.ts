import { NextResponse } from 'next/server';
import { syncZohoInbox } from '@/lib/zoho-inbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Pulls new lead replies from Sarah's Zoho inbox into the correspondence log.
 * Pinged by a GitHub Actions schedule (.github/workflows/zoho-sync.yml) because
 * the MMS Vercel project is on Hobby (Vercel cron is daily-only there). Optional
 * Bearer CRON_SECRET. No-ops cleanly when Zoho IMAP is unconfigured.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = await syncZohoInbox({ sinceDays: 7 });
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
