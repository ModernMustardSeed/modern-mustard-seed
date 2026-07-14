/**
 * BUY A DOMAIN AND PUT A CLIENT'S SITE ON IT.
 *
 * The demo funnel sells "the site you just toured, customized to your business and
 * PUT LIVE ON YOUR DOMAIN" (lib/demo-order.ts). Until now there was no code anywhere
 * in this repo that could publish anything to any domain: no registrar, no DNS, no
 * deploy. Every launch was Sarah doing it by hand, and the offer was a promise the
 * system could not keep. That does not scale to "thousands of clients", and with ads
 * running it becomes a promise we break at volume.
 *
 * Everything goes through Vercel, on purpose. Buying the domain from the same place
 * that hosts the site means the DNS is already correct the moment the purchase
 * settles: no registrar account per client, no nameserver dance, no waiting on a
 * customer to paste a TXT record they do not understand. One vendor, one token, one
 * failure mode.
 *
 * MONEY (rule: never leak revenue, guards fail CLOSED):
 *   - We NEVER buy blind. Every purchase quotes the price first and sends it back as
 *     `expectedPrice`. If Vercel's price moved even a dollar, the purchase is
 *     rejected rather than silently charged.
 *   - A hard per-domain ceiling (MAX_DOMAIN_USD). A premium domain can be thousands
 *     of dollars. Nobody clicks "buy" on a $4,000 domain by accident here.
 *   - No token, no spend. Missing config fails closed with a clear message.
 *
 * Requires VERCEL_TOKEN (an API token from vercel.com/account/tokens, NOT the CLI's
 * OAuth token, which the REST API rejects) and VERCEL_TEAM_ID.
 */

const API = 'https://api.vercel.com';

/**
 * The most we will ever pay for a client's domain without a human overriding it.
 * A standard .com is ~$20/yr. Anything asking three figures is a premium name and
 * needs a conversation, not a button.
 */
export const MAX_DOMAIN_USD = Number(process.env.MAX_DOMAIN_USD || 100);

export type VercelCfg = { token: string; teamId: string };

export function vercelConfig(): VercelCfg | null {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !teamId) return null;
  return { token, teamId };
}

async function api<T>(
  cfg: VercelCfg,
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set('teamId', cfg.teamId);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || `Vercel returned ${res.status}`;
      return { ok: false, error: String(msg), status: res.status };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? 'network error', status: 0 };
  }
}

/* ─────────────────────────── DOMAINS ─────────────────────────── */

export type DomainQuote = {
  domain: string;
  available: boolean;
  priceUsd: number | null;
  years: number;
  /** False when we will not sell it with one click: too expensive, or not for sale. */
  buyable: boolean;
  reason?: string;
};

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+$/i;

export function normalizeDomain(input: string): string | null {
  let d = (input || '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
  if (!DOMAIN_RE.test(d)) return null;
  return d;
}

/** Is it available, and what would it cost? Never buys. Safe to call on every keystroke. */
export async function quoteDomain(domain: string): Promise<DomainQuote | { error: string }> {
  const cfg = vercelConfig();
  if (!cfg) return { error: 'Domain buying is not configured yet (VERCEL_TOKEN / VERCEL_TEAM_ID).' };
  const name = normalizeDomain(domain);
  if (!name) return { error: 'That does not look like a domain.' };

  const avail = await api<{ available: boolean }>(cfg, `/v1/registrar/domains/${encodeURIComponent(name)}/availability`);
  if (!avail.ok) return { error: avail.error };
  if (!avail.data.available) {
    return { domain: name, available: false, priceUsd: null, years: 1, buyable: false, reason: 'Someone already owns it.' };
  }

  const price = await api<{ price?: number; years?: number }>(cfg, `/v1/registrar/domains/${encodeURIComponent(name)}/price`);
  if (!price.ok) {
    return { domain: name, available: true, priceUsd: null, years: 1, buyable: false, reason: 'Available, but we could not get a price. Buy it manually.' };
  }

  const priceUsd = typeof price.data.price === 'number' ? price.data.price : null;
  const years = typeof price.data.years === 'number' && price.data.years > 0 ? price.data.years : 1;

  if (priceUsd == null) {
    return { domain: name, available: true, priceUsd: null, years, buyable: false, reason: 'No price came back. Buy it manually.' };
  }
  if (priceUsd > MAX_DOMAIN_USD) {
    return {
      domain: name,
      available: true,
      priceUsd,
      years,
      buyable: false,
      reason: `Premium name at $${priceUsd}. Over the $${MAX_DOMAIN_USD} one-click ceiling, so this one needs a conversation.`,
    };
  }

  return { domain: name, available: true, priceUsd, years, buyable: true };
}

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  companyName?: string;
};

/**
 * Buy it. Re-quotes first and passes the quoted number as `expectedPrice`, so Vercel
 * rejects the purchase if the price moved between the quote and the click. We would
 * rather fail a purchase than charge a number nobody saw.
 */
export async function buyDomain(
  domain: string,
  contact: Contact,
  opts: { autoRenew?: boolean } = {},
): Promise<{ ok: true; domain: string; paidUsd: number; orderId?: string } | { ok: false; error: string }> {
  const cfg = vercelConfig();
  if (!cfg) return { ok: false, error: 'Domain buying is not configured yet (VERCEL_TOKEN / VERCEL_TEAM_ID).' };

  const quote = await quoteDomain(domain);
  if ('error' in quote) return { ok: false, error: quote.error };
  if (!quote.available) return { ok: false, error: 'That domain is already taken.' };
  if (!quote.buyable || quote.priceUsd == null) return { ok: false, error: quote.reason ?? 'Not buyable with one click.' };

  const res = await api<{ orderId?: string }>(cfg, `/v1/registrar/domains/${encodeURIComponent(quote.domain)}/buy`, {
    method: 'POST',
    body: JSON.stringify({
      years: quote.years,
      expectedPrice: quote.priceUsd,
      // Auto-renew ON by default: a client's website silently dying because a domain
      // lapsed is the single worst outcome this system can produce.
      autoRenew: opts.autoRenew !== false,
      contactInformation: contact,
    }),
  });
  if (!res.ok) return { ok: false, error: res.error };

  return { ok: true, domain: quote.domain, paidUsd: quote.priceUsd, orderId: res.data.orderId };
}

/* ─────────────────────────── PUBLISHING ─────────────────────────── */

/** Vercel project names: lowercase, alphanumeric and dashes, <= 100 chars. */
export function projectSlug(business: string, suffix: string): string {
  const base = (business || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'client';
  return `mms-${base}-${suffix.slice(0, 6)}`.replace(/-+/g, '-').slice(0, 90);
}

/**
 * Ship a single-file site to its own Vercel project, live, on the production target.
 *
 * One project per client site, because a custom domain attaches to a project. The
 * site is one self-contained index.html (that is what the forge produces), so the
 * deployment is a single inline file: no build step, no framework, nothing to break.
 */
export async function publishSite(args: {
  html: string;
  business: string;
  key: string;
  projectId?: string | null;
}): Promise<{ ok: true; projectId: string; projectName: string; url: string } | { ok: false; error: string }> {
  const cfg = vercelConfig();
  if (!cfg) return { ok: false, error: 'Publishing is not configured yet (VERCEL_TOKEN / VERCEL_TEAM_ID).' };
  if (!args.html || args.html.length < 500) return { ok: false, error: 'There is no site to publish.' };

  const name = projectSlug(args.business, args.key);

  // Reuse the project if we already made one, so a re-publish updates the SAME site
  // (and keeps its domain) instead of stranding the old one at a dead URL.
  let projectId = args.projectId ?? null;
  if (!projectId) {
    const created = await api<{ id: string }>(cfg, '/v10/projects', {
      method: 'POST',
      body: JSON.stringify({ name, framework: null }),
    });
    if (created.ok) {
      projectId = created.data.id;
    } else if (created.status === 409) {
      const found = await api<{ id: string }>(cfg, `/v9/projects/${encodeURIComponent(name)}`);
      if (!found.ok) return { ok: false, error: `Project name is taken and unreadable: ${found.error}` };
      projectId = found.data.id;
    } else {
      return { ok: false, error: created.error };
    }
  }

  const deploy = await api<{ id: string; url: string; readyState?: string }>(cfg, '/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name,
      project: projectId,
      target: 'production',
      files: [
        {
          file: 'index.html',
          data: Buffer.from(args.html, 'utf8').toString('base64'),
          encoding: 'base64',
        },
      ],
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    }),
  });
  if (!deploy.ok) return { ok: false, error: deploy.error };

  return { ok: true, projectId: projectId!, projectName: name, url: `https://${deploy.data.url}` };
}

/**
 * Point a domain at a client's project.
 *
 * A domain bought through Vercel needs no DNS work: attaching it here is the whole
 * job. A domain they already own elsewhere comes back `verified: false` with the
 * exact records they must add, which we hand to them in plain language rather than
 * leaving them to guess.
 */
export async function attachDomain(
  projectIdOrName: string,
  domain: string,
): Promise<
  | { ok: true; verified: boolean; instructions: Array<{ type: string; domain: string; value: string }> }
  | { ok: false; error: string }
> {
  const cfg = vercelConfig();
  if (!cfg) return { ok: false, error: 'Publishing is not configured yet (VERCEL_TOKEN / VERCEL_TEAM_ID).' };
  const name = normalizeDomain(domain);
  if (!name) return { ok: false, error: 'That does not look like a domain.' };

  const res = await api<{
    verified: boolean;
    verification?: Array<{ type: string; domain: string; value: string }>;
  }>(cfg, `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  // Already attached to this project is a success, not a failure: re-running the
  // delivery must be safe.
  if (!res.ok && !/already in use by this project|domain_already_in_use/i.test(res.error)) {
    return { ok: false, error: res.error };
  }

  const verified = res.ok ? Boolean(res.data.verified) : true;
  const instructions = res.ok ? (res.data.verification ?? []) : [];
  return { ok: true, verified, instructions };
}
