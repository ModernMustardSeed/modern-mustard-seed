import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { accountViews, connectFacebookByToken, connectXByTokens, disconnectAccount, dropPageInstagram, saveAccount } from '@/lib/posting/accounts';
import { checkAll, checkOne } from '@/lib/posting/verify';
import { importFacebookHistory, importInstagramHistory } from '@/lib/posting/import-history';
import { getSettings } from '@/lib/posting/settings';
import { DEFAULT_PLATFORMS, PLATFORMS, type Platform } from '@/lib/posting/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * CONNECTIONS, from the Command Center's own session.
 *
 * GET  every account with its live state.
 * POST check one or all of them against the live API, connect one by paste,
 *      or disconnect one.
 *
 * The pastes are gated on `preview`, which is Sarah looking as the client. A
 * Page token is generated inside the client's own Meta account and is worth
 * exactly as much as the Page itself, so the field that accepts one belongs
 * on the studio side of the glass, not in front of the owner.
 */

const isPlatform = (v: unknown): v is Platform => (PLATFORMS as readonly string[]).includes(String(v));

export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  const [accounts, settings] = await Promise.all([accountViews(sb, account.clientEmail), getSettings(sb, account.clientEmail).catch(() => null)]);
  return NextResponse.json({ accounts, platforms: settings?.platforms ?? [], posting: Boolean(settings) });
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, preview } = got.desk;
  const email = account.clientEmail;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  if (action === 'check') {
    const one = body.platform;
    if (isPlatform(one)) return NextResponse.json({ ok: true, checks: [await checkOne(sb, email, one)] });
    const settings = await getSettings(sb, email).catch(() => null);
    const platforms = settings?.platforms?.length ? settings.platforms : DEFAULT_PLATFORMS;
    return NextResponse.json({ ok: true, checks: await checkAll(sb, email, [...platforms]) });
  }

  if (action === 'import-history') {
    // Their own posting history, brought home. Read only, and idempotent on
    // the platform's post id, so a second run catches up rather than doubles.
    const which = String(body.platform ?? 'facebook');
    const r = which === 'instagram' ? await importInstagramHistory(sb, email) : await importFacebookHistory(sb, email);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    const since = r.oldest ? new Date(r.oldest).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
    return NextResponse.json({
      ok: true,
      added: r.added,
      seen: r.seen,
      said: r.added
        ? `${r.added} ${r.added === 1 ? 'post' : 'posts'} brought into your archive${since ? `, back to ${since}` : ''}.`
        : `Nothing new. Your archive already holds ${r.seen} of them.`,
    });
  }

  if (action === 'disconnect') {
    if (!isPlatform(body.platform)) return NextResponse.json({ error: 'Which one?' }, { status: 400 });
    await disconnectAccount(sb, email, body.platform);
    // Instagram lives on the Facebook Page's token. Dropping the Page and
    // leaving Instagram behind leaves a green check on a dead connection.
    if (body.platform === 'facebook') await dropPageInstagram(sb, email);
    return NextResponse.json({ ok: true, accounts: await accountViews(sb, email) });
  }

  if (!preview) return NextResponse.json({ error: 'That one is wired from our side. Nothing for you to do here.' }, { status: 403 });

  if (action === 'facebook-token') {
    const r = await connectFacebookByToken(sb, email, String(body.token ?? ''), (body.pageId as string) ?? null);
    if (!r.ok) return NextResponse.json({ error: r.error, choices: r.choices ?? null }, { status: 400 });
    return NextResponse.json({ ok: true, page: r.page, instagram: r.instagram, accounts: await accountViews(sb, email) });
  }

  if (action === 'x-tokens') {
    const r = await connectXByTokens(sb, email, String(body.access ?? ''), (body.refresh as string) ?? null);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, username: r.username, accounts: await accountViews(sb, email) });
  }

  if (action === 'linkedin-token') {
    // LinkedIn's Community Management access takes weeks to be granted, and
    // a page admin can produce a token in the developer console today. The
    // organization id is the number in the page's admin URL.
    const token = String(body.access ?? '').trim();
    const raw = String(body.organization ?? '').trim();
    const id = raw.replace(/^urn:li:organization:/, '').replace(/\D/g, '');
    if (!token) return NextResponse.json({ error: 'Paste the access token first.' }, { status: 400 });
    if (!id) return NextResponse.json({ error: 'The company page id is the number in the page admin URL.' }, { status: 400 });

    const res = await fetch(`https://api.linkedin.com/rest/organizations/${id}?fields=localizedName`, {
      headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202508', 'X-Restli-Protocol-Version': '2.0.0' },
      signal: AbortSignal.timeout(20_000),
    });
    const j = (await res.json().catch(() => ({}))) as { localizedName?: string; message?: string };
    if (!res.ok) return NextResponse.json({ error: `LinkedIn did not accept that: ${j.message ?? `HTTP ${res.status}`}` }, { status: 400 });

    const saved = await saveAccount(sb, email, {
      provider: 'linkedin',
      externalId: `urn:li:organization:${id}`,
      accountName: j.localizedName ?? `Company ${id}`,
      accessToken: token,
      refreshToken: (body.refresh as string) ?? null,
      scopes: 'w_organization_social r_organization_social',
      meta: { via: 'token' },
    });
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 500 });
    return NextResponse.json({ ok: true, organization: j.localizedName ?? id, accounts: await accountViews(sb, email) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
