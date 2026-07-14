import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { exchangeCode, verifyState, saveGoogleIntegration } from '@/lib/oauth-google';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Google hands the client back here with a code.
 *
 * We trust the STATE, not the session, to say who this is. The signed state is bound to
 * the client who started the flow, which is what stops a stolen callback URL from
 * attaching an attacker's Google account to someone else's portal. It also means the
 * flow still completes if Google bounced them through a browser that dropped the
 * cookie, which is common enough on mobile to matter.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // They said no. That is a legitimate answer, not a failure.
  if (error) {
    return NextResponse.redirect(`${SITE.url}/portal?connect=declined`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${SITE.url}/portal?connect=failed`);
  }

  const verified = verifyState(state);
  if (!verified) {
    console.error('google oauth: bad or expired state');
    return NextResponse.redirect(`${SITE.url}/portal?connect=failed`);
  }

  const tokens = await exchangeCode(code);
  if ('error' in tokens) {
    console.error('google oauth: token exchange failed:', tokens.error);
    return NextResponse.redirect(`${SITE.url}/portal?connect=failed`);
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.redirect(`${SITE.url}/portal?connect=failed`);

  const saved = await saveGoogleIntegration(sb, verified.email, tokens);
  if (!saved.ok) {
    console.error('google oauth: could not store the connection:', saved.error);
    return NextResponse.redirect(`${SITE.url}/portal?connect=failed`);
  }

  return NextResponse.redirect(`${SITE.url}/portal?connect=google`);
}
