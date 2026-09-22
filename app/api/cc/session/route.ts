import { NextResponse } from 'next/server';
import { brandFor } from '@/lib/cc-access';
import { getDesk } from '@/lib/cc-desk';
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
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, preview, people, who } = got.desk;

  const [posting, mail, bt] = await Promise.all([
    getSettings(sb, account.clientEmail).catch(() => null),
    mailStatus(sb, account.clientEmail).catch(() => ({ connected: false }) as Awaited<ReturnType<typeof mailStatus>>),
    account.project.crm === 'buildertrend' ? buildertrendStatus(sb, account.clientEmail).catch(() => null) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    email: account.clientEmail,
    person: who?.name ?? null,
    who,
    people,
    preview,
    brand: brandFor(account.project),
    projects: account.project.projects,
    publicUrl: account.project.publicUrl,
    modules: {
      leads: true,
      // The pre-construction board. On for every account: the months between
      // an inquiry and a contract exist for every business that sells work,
      // and an empty board teaches what it is for.
      jobs: true,
      // From the site is the superintendent's screen. It needs a board to land on.
      field: true,
      contacts: true,
      conversations: Boolean(account.project.assistantId),
      inbox: true,
      reviews: account.project.reviews.length > 0,
      marketing: Boolean(posting?.visible),
      website: account.project.projects.length > 0,
      domains: true,
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
