import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { mailAuthUrl, type MailBack } from '@/lib/oauth-google';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Sign in with Google" for one mailbox. Sends the signed-in owner to Google's
 * own consent screen, asking for mail and nothing else. The state is bound to
 * the account that started it, so the callback files the mailbox under that
 * account and no other. `back` picks which desk they return to; `hint` is an
 * address they typed, so Google opens on the right account.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back: MailBack = url.searchParams.get('back') === 'portal' ? 'portal' : 'cc';
  const home = back === 'portal' ? '/portal' : '/cc';
  const session = await getClientSession();
  if (!session) return NextResponse.redirect(`${SITE.url}${back === 'portal' ? '/portal/login?next=/portal' : '/cc/login'}`);
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!project) return NextResponse.redirect(`${SITE.url}${home}?mail=failed#inbox`);
  const to = mailAuthUrl(session.email, back, url.searchParams.get('hint'));
  if (!to) return NextResponse.redirect(`${SITE.url}${home}?mail=unconfigured#inbox`);
  return NextResponse.redirect(to);
}
