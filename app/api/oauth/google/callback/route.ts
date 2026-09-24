import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { exchangeCode, verifyState, saveGoogleIntegration, isMailState, verifyMailState } from '@/lib/oauth-google';
import { connectGoogleMailbox, syncMailbox } from '@/lib/mail-desk';
import { visibleProject } from '@/lib/command-center/visible';
import { resendClient } from '@/lib/send-email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The first read of a new mailbox runs before the owner lands back on the desk.
export const maxDuration = 60;

/**
 * A mailbox signed in with Google. The state names the account and the desk
 * to return to; the address is whichever Google account they chose. The first
 * read runs here so the inbox is not empty when they land, and Sarah hears
 * about it the same way she does for a password mailbox.
 */
async function mailboxCallback(error: string | null, code: string | null, state: string) {
  const verified = verifyMailState(state);
  const home = verified?.back === 'portal' ? '/portal' : '/cc';
  const back = (q: string) => NextResponse.redirect(`${SITE.url}${home}?${q}#inbox`);
  if (!verified) return back('mail=failed');
  if (error) return back('mail=declined');
  if (!code) return back('mail=failed');

  const tokens = await exchangeCode(code);
  if ('error' in tokens) {
    console.error('google mailbox: token exchange failed:', tokens.error);
    return back('mail=failed');
  }
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, verified.email) : null;
  if (!sb || !project) return back('mail=failed');

  const r = await connectGoogleMailbox(sb, verified.email, tokens);
  if (!r.ok) return back(`mail=failed&why=${encodeURIComponent(r.error)}`);

  const s = await syncMailbox(sb, project).catch(() => ({ fetched: 0, queued: 0 }));
  try {
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      subject: `${project.business} connected their mailbox`,
      text: `${verified.email} signed ${r.address} in with Google for the mail desk. First read: ${s.fetched} messages, ${s.queued} queued for sorting.`,
    });
  } catch {
    /* connected either way */
  }
  return back(`mail=connected&address=${encodeURIComponent(r.address)}`);
}

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

  // A mailbox sign-in comes back through the same registered redirect URI.
  if (isMailState(state)) return mailboxCallback(error, code, state as string);

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
