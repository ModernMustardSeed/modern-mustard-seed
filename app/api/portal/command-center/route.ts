import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { accountViews } from '@/lib/posting/accounts';
import { buildertrendStatus } from '@/lib/buildertrend';
import { clientGuide } from '@/lib/command-center/guide';
import { PLATFORM_LABEL } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE ACCOUNTS EVERYTHING RUNS ON, and whether each is connected, plus the
 * words that explain the page. Scoped by the signed-in email; a client who
 * is not on a project gets null and the card does not render.
 */
export type AccountLine = { key: string; label: string; state: 'connected' | 'waiting' | 'manual' | 'error'; detail: string; action: string | null; href: string | null };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ commandCenter: null });

  const lines: AccountLine[] = [];
  try {
    const views = await accountViews(sb, session.email);
    for (const v of views) {
      // Google Business Profile gets its own line below, with the manager step.
      if (v.provider === 'gbp') continue;
      // `needs` names the studio-side keys still missing; that is Sarah's list,
      // not the owner's. The owner reads that we are on it.
      const ours = Boolean(v.needs) && !v.connected;
      lines.push({
        key: v.provider,
        label: PLATFORM_LABEL[v.provider],
        state: v.manualOnly ? 'manual' : v.status === 'error' ? 'error' : v.connected ? 'connected' : 'waiting',
        detail: v.manualOnly
          ? 'Posted by hand from the sheet we send; there is no door for software here.'
          : v.connected
            ? `Connected as ${v.accountName ?? 'your account'}.`
            : v.status === 'error'
              ? 'The connection needs a fresh login; we will ask you when it is time.'
              : ours
                ? 'Being wired from our side. Nothing for you to do yet.'
                : 'Add sarah@modernmustardseed.com as an admin, and it connects from our side.',
        action: null,
        href: null,
      });
    }
  } catch {
    /* posting tables not migrated: the card still shows the rest */
  }

  const { data: google } = await sb.from('client_integrations').select('status, account_email').eq('client_email', session.email).eq('provider', 'google').maybeSingle();
  lines.push({
    key: 'gbp',
    label: 'Google Business Profile',
    state: google?.status === 'connected' ? 'connected' : 'waiting',
    detail:
      google?.status === 'connected'
        ? `Connected as ${google.account_email ?? 'your Google account'}. Reviews, hours and posts are handled from here.`
        : 'Add sarah@modernmustardseed.com as a manager on the profile (Google Business Profile, People and access). Reviews, hours and posts follow.',
    action: google?.status === 'connected' ? null : 'Add Sarah as manager',
    href: 'https://business.google.com/',
  });

  if (project.crm === 'buildertrend') {
    const bt = await buildertrendStatus(sb, session.email);
    lines.push({
      key: 'buildertrend',
      label: 'Buildertrend',
      state: bt.connected ? (bt.captcha ? 'error' : 'connected') : 'waiting',
      detail: bt.connected
        ? bt.captcha
          ? `Connected (builder ${bt.builderId}), but the Lead Contact Form has a captcha on, so Buildertrend may refuse the hand-off. Ask Buildertrend support to turn it off; we screen every lead already.`
          : `Connected (builder ${bt.builderId}). Every website lead becomes a Lead Opportunity.`
        : 'Paste your Lead Contact Form embed below and every website lead lands in your pipeline.',
      action: null,
      href: null,
    });
  }

  if (project.emailDomain) {
    lines.push({
      key: 'workspace',
      label: 'Google Workspace',
      state: 'waiting',
      detail: `Your business email on ${project.emailDomain}, billed by Google to your own card. Create it at workspace.google.com once the domain is yours; we do the records and the verification.`,
      action: 'Open Google Workspace',
      href: 'https://workspace.google.com/',
    });
    lines.push({
      key: 'calendar',
      label: 'Google Calendar',
      state: 'waiting',
      detail: 'Comes with Workspace. Your calendar, on your phone, shared with Carmen.',
      action: 'Open Calendar',
      href: 'https://calendar.google.com/',
    });
  }

  return NextResponse.json({ commandCenter: { business: project.business, accounts: lines, guide: clientGuide(project) } });
}
