/**
 * IS THIS CONNECTION ACTUALLY ALIVE?
 *
 * A green check in a database means a token was accepted once. It says
 * nothing about today: tokens expire, a Page admin gets removed, an owner
 * changes a password, Meta rotates an app. The desk has already shown a
 * confident green check beside an account that could not post, which is worse
 * than showing nothing, because nobody goes and looks.
 *
 * So this asks each platform, live, right now. It reads and never writes: no
 * test post ever lands on a real business's feed, because a test post is
 * something a customer can see, and "we put a test on your Facebook page" is
 * not a sentence we are going to say. What it proves is exactly what matters
 * before an hour comes: the token is valid, it points at the right account,
 * and it carries the permission that posting needs.
 *
 * The answer is written back onto the account row, so a failure found here
 * shows up on both desks as the same red state the publisher would produce.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount } from './accounts';
import { instagramAccess, viaInstagramLogin } from './instagram-login';
import { getGoogleAccessToken } from '@/lib/oauth-google';
import type { Platform } from './types';

const FB_GRAPH = 'https://graph.facebook.com/v21.0';

export type Check = {
  platform: Platform;
  ok: boolean;
  /** What it is pointing at, in the platform's own words. */
  account: string | null;
  /** Why it is not ok, in words a person can act on. */
  error: string | null;
  /** What to do about it, when there is something to do. */
  fix: string | null;
  at: string;
};

const fail = (platform: Platform, error: string, fix: string | null = null): Check => ({ platform, ok: false, account: null, error, fix, at: new Date().toISOString() });
const pass = (platform: Platform, account: string | null): Check => ({ platform, ok: true, account, error: null, fix: null, at: new Date().toISOString() });

async function checkFacebook(sb: SupabaseClient, email: string, platform: 'facebook' | 'instagram'): Promise<Check> {
  const acct = platform === 'instagram' ? await instagramAccess(sb, email) : await accessToken(sb, email, platform);
  if (!acct) return fail(platform, 'Not connected.', platform === 'instagram' ? 'Press Connect Instagram and sign in with the Business or Creator account.' : 'Connect the Page with a Page access token.');
  const GRAPH = 'graph' in acct ? acct.graph : FB_GRAPH;
  const igLogin = 'graph' in acct && viaInstagramLogin(acct.row);
  const id = acct.row.external_id;
  if (!id) return fail(platform, 'The connection has no account id on it.', 'Connect it again.');

  const fields = platform === 'instagram' ? 'id,username' : 'id,name,fan_count';
  const res = await fetch(`${GRAPH}/${id}?fields=${fields}&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { id?: string; name?: string; username?: string; error?: { message?: string; code?: number } };
  if (!res.ok || j.error) {
    const msg = j.error?.message ?? `HTTP ${res.status}`;
    // 190 is the whole family of expired, invalidated and revoked tokens.
    const expired = j.error?.code === 190;
    await markAccount(sb, email, platform, expired ? 'revoked' : 'error', msg);
    return fail(platform, msg, expired ? (igLogin ? 'The Instagram sign-in has ended. Press Connect Instagram and sign in again.' : 'The token has expired or been revoked. Connect it again.') : null);
  }

  if (platform === 'facebook') {
    // A token that reads a Page but cannot post is the quiet failure this
    // check exists for. /me/permissions answers for user tokens; a Page token
    // answers on the Page's own tasks instead.
    const perm = await fetch(`${GRAPH}/${id}?fields=tasks&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
    const pj = (await perm.json().catch(() => ({}))) as { tasks?: string[] };
    if (Array.isArray(pj.tasks) && pj.tasks.length && !pj.tasks.includes('CREATE_CONTENT')) {
      await markAccount(sb, email, 'facebook', 'error', 'This token can read the Page but not post to it.');
      return fail('facebook', 'This token can read the Page but not post to it.', 'Generate the token again with pages_manage_posts and pages_read_engagement ticked.');
    }
  }

  await markAccount(sb, email, platform, 'connected', null);
  return pass(platform, platform === 'instagram' ? (j.username ? `@${j.username}` : (acct.row.account_name ?? null)) : (j.name ?? acct.row.account_name ?? null));
}

async function checkX(sb: SupabaseClient, email: string): Promise<Check> {
  const acct = await accessToken(sb, email, 'x');
  if (!acct) return fail('x', 'Not connected.', 'Connect X, or paste its tokens from the developer portal.');
  const res = await fetch('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${acct.token}` }, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { data?: { username?: string }; detail?: string; title?: string };
  if (!res.ok || !j.data) {
    const msg = j.detail ?? j.title ?? `HTTP ${res.status}`;
    // X access tokens last two hours. An expired one is normal and is renewed
    // from the refresh token at publish time, so it is not a red state here.
    const renewable = res.status === 401 && Boolean(acct.row.refresh_ciphertext);
    if (!renewable) await markAccount(sb, email, 'x', res.status === 401 ? 'revoked' : 'error', msg);
    return renewable
      ? { platform: 'x', ok: true, account: acct.row.account_name, error: null, fix: null, at: new Date().toISOString() }
      : fail('x', msg, res.status === 401 ? 'Connect X again; the token was revoked.' : null);
  }
  await markAccount(sb, email, 'x', 'connected', null);
  return pass('x', j.data.username ? `@${j.data.username}` : acct.row.account_name);
}

async function checkLinkedIn(sb: SupabaseClient, email: string): Promise<Check> {
  const acct = await accessToken(sb, email, 'linkedin');
  if (!acct) return fail('linkedin', 'Not connected.', 'Connect LinkedIn as an admin of the company page.');
  const org = acct.row.external_id;
  if (!org) return fail('linkedin', 'No company page chosen on this connection.', 'Connect it again and pick the company page.');
  const res = await fetch(`https://api.linkedin.com/rest/organizations/${encodeURIComponent(org.replace('urn:li:organization:', ''))}?fields=localizedName`, {
    headers: { Authorization: `Bearer ${acct.token}`, 'LinkedIn-Version': '202508', 'X-Restli-Protocol-Version': '2.0.0' },
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await res.json().catch(() => ({}))) as { localizedName?: string; message?: string };
  if (!res.ok) {
    const msg = j.message ?? `HTTP ${res.status}`;
    await markAccount(sb, email, 'linkedin', res.status === 401 ? 'revoked' : 'error', msg);
    return fail('linkedin', msg, res.status === 401 ? 'The token expired. Connect LinkedIn again.' : null);
  }
  await markAccount(sb, email, 'linkedin', 'connected', null);
  return pass('linkedin', j.localizedName ?? acct.row.account_name);
}

async function checkGbp(sb: SupabaseClient, email: string): Promise<Check> {
  const token = await getGoogleAccessToken(sb, email);
  if (!token) return fail('gbp', 'Google is not connected.', 'Sign in with the Google account that manages the profile.');
  const { data } = await sb.from('client_integrations').select('meta').eq('client_email', email.toLowerCase().trim()).eq('provider', 'google').maybeSingle();
  const location = (data?.meta as { gbp_location?: string } | null)?.gbp_location ?? null;
  if (!location) return fail('gbp', 'Google is connected, but no Business Profile location is chosen.', 'Pick the profile this posts to.');
  const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${location.split('/').slice(-2).join('/')}?readMask=title`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await res.json().catch(() => ({}))) as { title?: string; error?: { message?: string; status?: string } };
  if (!res.ok) {
    const denied = j.error?.status === 'PERMISSION_DENIED';
    return fail(
      'gbp',
      denied ? 'Google has not approved Business Profile API access for this project yet.' : (j.error?.message ?? `HTTP ${res.status}`),
      denied ? 'Nothing to do here. Posts go on the hand-post sheet until Google answers the access request.' : null,
    );
  }
  return pass('gbp', j.title ?? 'the profile');
}

/** Ask one platform, live. */
export async function checkOne(sb: SupabaseClient, email: string, platform: Platform): Promise<Check> {
  try {
    switch (platform) {
      case 'facebook':
      case 'instagram':
        return await checkFacebook(sb, email, platform);
      case 'x':
        return await checkX(sb, email);
      case 'linkedin':
        return await checkLinkedIn(sb, email);
      case 'gbp':
        return await checkGbp(sb, email);
      case 'houzz':
        return fail('houzz', 'Houzz has no door for software.', 'Each post goes on the sheet and takes a minute by hand.');
    }
  } catch (err) {
    return fail(platform, err instanceof Error ? err.message : 'The platform did not answer.', 'Try again in a moment.');
  }
}

/** Ask every platform at once. */
export async function checkAll(sb: SupabaseClient, email: string, platforms: Platform[]): Promise<Check[]> {
  return Promise.all(platforms.map((p) => checkOne(sb, email, p)));
}
