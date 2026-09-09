/**
 * OAuth plumbing shared by the X and LinkedIn connect flows: a signed state
 * that carries whose account is being connected (and, for X, the PKCE
 * verifier), so the callback can trust it without a session table. Sarah can
 * run a flow on a client's behalf from the admin desk; the state records that
 * too, so the account lands on the client's card, never on hers.
 */
import { createHmac, randomBytes, createHash } from 'node:crypto';
import { SITE } from '@/lib/seo';

function secret(): string {
  const s = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('CLIENT_SESSION_SECRET not configured');
  return s;
}
const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');

export type OAuthState = { email: string; provider: 'x' | 'linkedin'; verifier?: string; by: 'client' | 'admin'; exp: number };

export function signState(st: Omit<OAuthState, 'exp'>): string {
  const payload = b64(JSON.stringify({ ...st, exp: Date.now() + 15 * 60_000 }));
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(raw: string): OAuthState | null {
  const [payload, sig] = String(raw ?? '').split('.');
  if (!payload || !sig) return null;
  const want = createHmac('sha256', secret()).update(payload).digest('base64url');
  if (want.length !== sig.length || !want.split('').every((c, i) => c === sig[i])) return null;
  try {
    const st = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (!st.email || !st.provider || Date.now() > st.exp) return null;
    return st;
  } catch {
    return null;
  }
}

export function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function real(v: string | undefined): string | null {
  return v && !/^\[SENSITIVE\]$/i.test(v) ? v : null;
}

export function redirectUri(provider: 'x' | 'linkedin'): string {
  return `${SITE.url}/api/oauth/${provider}/callback`;
}

/** Where a flow goes home: the client's calendar, or the admin desk when Sarah ran it. */
export function homeFor(st: Pick<OAuthState, 'by' | 'email'>, note: string): string {
  return st.by === 'admin'
    ? `${SITE.url}/admin/posting?client=${encodeURIComponent(st.email)}&connect=${encodeURIComponent(note)}`
    : `${SITE.url}/portal/posting?connect=${encodeURIComponent(note)}`;
}
