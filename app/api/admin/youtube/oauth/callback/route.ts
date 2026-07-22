import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { verifyState } from '@/lib/oauth-google';
import { exchangeChannelCode, saveChannelTokens, CHANNEL_KEY } from '@/lib/youtube';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Google returns here after the channel consent. We trust the signed state (which
 * our own admin-gated start route minted), and it must be the channel sentinel, so
 * a stray callback cannot attach some other account as the channel.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const done = (q: string) => NextResponse.redirect(`${SITE.url}/admin/youtube?connect=${q}`);

  if (url.searchParams.get('error')) return done('declined');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return done('failed');

  const verified = verifyState(state);
  if (!verified || verified.email !== CHANNEL_KEY) return done('failed');

  const tokens = await exchangeChannelCode(code);
  if ('error' in tokens) {
    console.error('youtube oauth: token exchange failed:', tokens.error);
    return done('failed');
  }
  const sb = getSupabase();
  if (!sb) return done('failed');

  const saved = await saveChannelTokens(sb, tokens);
  if (!saved.ok) {
    console.error('youtube oauth: could not store the connection:', saved.error);
    return done('failed');
  }
  return done('ok');
}
