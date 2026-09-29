import { NextResponse } from 'next/server';
import { brandFor } from '@/lib/cc-access';
import { getDesk } from '@/lib/cc-desk';
import { getSettings } from '@/lib/posting/settings';
import { mailStatus } from '@/lib/mail-desk';
import { buildertrendStatus } from '@/lib/buildertrend';
import { getCcSession } from '@/lib/client-auth';
import { roomHidden } from '@/lib/client-leads';

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
  // The studio key, as opposed to the admin look pass: both are previews,
  // only the studio can switch clients from inside.
  const studio = Boolean((await getCcSession())?.studio);

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
    studio,
    brand: brandFor(account.project),
    projects: account.project.projects,
    publicUrl: account.project.publicUrl,
    googleProfileUrl: account.project.googleProfile?.mapsUrl ?? null,
    modules: {
      leads: true,
      // The pre-construction board. On for every account: the months between
      // an inquiry and a contract exist for every business that sells work,
      // and an empty board teaches what it is for.
      jobs: !roomHidden(account.project, 'jobs'),
      // From the site is the superintendent's screen. It needs a board to land on.
      field: !roomHidden(account.project, 'field'),
      // The bench. On for everyone: every business that hires anybody has
      // somebody whose insurance can lapse.
      trades: !roomHidden(account.project, 'trades'),
      contacts: true,
      conversations: Boolean(account.project.assistantId),
      inbox: true,
      reviews: account.project.reviews.length > 0,
      marketing: Boolean(posting?.visible),
      website: account.project.projects.length > 0,
      domains: account.project.domainsReady !== false,
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
