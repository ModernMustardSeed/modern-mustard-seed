import { NextResponse } from 'next/server';
import { getCcSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { accountForSession, brandFor } from '@/lib/cc-access';
import { getSettings } from '@/lib/posting/settings';
import { mailStatus } from '@/lib/mail-desk';
import { buildertrendStatus } from '@/lib/buildertrend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHO IS AT THE DESK, and which rooms are theirs. One call on load: identity,
 * their brand, and the modules that actually have something behind them, so
 * the rail never offers a door that opens on nothing.
 */
export async function GET() {
  const session = await getCcSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const account = await accountForSession(sb, session.email, session.preview);
  if (!account) return NextResponse.json({ error: 'No Command Center on this account.' }, { status: 403 });

  const [posting, mail, bt] = await Promise.all([
    getSettings(sb, account.clientEmail).catch(() => null),
    mailStatus(sb, account.clientEmail).catch(() => ({ connected: false }) as Awaited<ReturnType<typeof mailStatus>>),
    account.project.crm === 'buildertrend' ? buildertrendStatus(sb, account.clientEmail).catch(() => null) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    email: account.clientEmail,
    person: account.person,
    preview: Boolean(session.preview),
    brand: brandFor(account.project),
    modules: {
      leads: true,
      contacts: true,
      conversations: Boolean(account.project.assistantId),
      inbox: true,
      reviews: account.project.reviews.length > 0,
      marketing: Boolean(posting?.visible),
      website: account.project.projects.length > 0,
      accounts: true,
    },
    state: {
      mailConnected: Boolean(mail?.connected),
      crm: account.project.crm,
      crmConnected: Boolean(bt?.connected),
      crmCaptcha: Boolean(bt?.captcha),
    },
  });
}
