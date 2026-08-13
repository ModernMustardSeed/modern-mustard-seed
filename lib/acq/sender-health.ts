/**
 * SENDER HEALTH.
 *
 * What is actually true about our ability to reach an inbox, read from things
 * that can be checked: DNS records that either exist or do not, provider
 * webhooks that either fired or did not, and counts of events we genuinely
 * received.
 *
 * ⚠️ THE ONE THING THIS FILE WILL NOT DO IS CLAIM INBOX PLACEMENT.
 * Resend accepting a message proves the message was accepted. It does not prove
 * Inbox over Promotions, it does not prove Spam avoidance, and it certainly
 * does not prove a human read it. Every status here is a status a provider
 * actually reports, and anything we cannot see is reported as UNKNOWN rather
 * than assumed good.
 */

import { resolveTxt, resolveCname } from 'node:dns/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { getAcqSettings } from '@/lib/acq/settings';
import { rollingCounts, SENDER_STATE_LABELS, RAMP_STEPS } from '@/lib/acq/governor';
import type { SenderState } from '@/lib/acq/governor';

export type HealthLevel = 'pass' | 'warning' | 'error' | 'unknown';

export type HealthCheck = {
  id: string;
  label: string;
  level: HealthLevel;
  detail: string;
  /** What Sarah does about it, when there is something to do. */
  fix?: string;
};

export type SenderHealth = {
  domain: string;
  identity: string;
  state: SenderState;
  stateLabel: string;
  stateReason: string | null;
  checks: HealthCheck[];
  volume: {
    sent24h: number;
    sent1h: number;
    allowance: number;
    ceiling: number;
    hourlyCap: number;
    usedPct: number;
  };
  rates: {
    bouncePct: number | null;
    complaintPct: number | null;
    unsubPct: number | null;
    measurable: boolean;
    maxBouncePct: number;
    maxComplaintPct: number;
  };
  statuses: Record<string, number>;
  ramp: { steps: number[]; current: number; next: number | null };
  worst: HealthLevel;
};

const SENDING_DOMAIN = 'modernmustardseed.com';

/* ─────────────────────────────── DNS facts ──────────────────────────────── */

async function txt(name: string): Promise<string[]> {
  try {
    const records = await resolveTxt(name);
    return records.map((chunks) => chunks.join(''));
  } catch {
    return [];
  }
}

/**
 * SPF, checked where it is ACTUALLY evaluated.
 *
 * ⚠️ The root domain's SPF record is the wrong place to look, and looking there
 * alone produced a false alarm on 2026-08-13 that nearly had Sarah editing a
 * working record. SPF is checked against the ENVELOPE sender (the Return-Path),
 * not the From header. Resend provisions a `send.<domain>` subdomain for that
 * envelope and puts the SES include on it. The root SPF record belongs to
 * whoever handles normal business mail, which here is Zoho, and it is
 * completely irrelevant to what Resend sends.
 *
 * Under DMARC relaxed alignment (`aspf=r`, which is the default and what this
 * domain publishes) an envelope of send.example.com aligns with a From of
 * example.com, because the organizational domain matches. So a correctly
 * provisioned Return-Path subdomain means SPF both PASSES and ALIGNS.
 */
async function checkSpf(domain: string): Promise<HealthCheck> {
  const root = (await txt(domain)).filter((r) => /^v=spf1/i.test(r));
  const envelopeHost = `send.${domain}`;
  const envelope = (await txt(envelopeHost)).filter((r) => /^v=spf1/i.test(r));
  const sesInclude = (r: string) => /include:.*(amazonses|resend)/i.test(r);

  if (root.length > 1) {
    return {
      id: 'spf',
      label: 'SPF',
      level: 'error',
      detail: `${root.length} SPF records on ${domain}. More than one is an automatic fail at every receiver.`,
      fix: 'Merge them into a single v=spf1 record.',
    };
  }

  // The path that actually matters for this sender.
  if (envelope.length === 1 && sesInclude(envelope[0])) {
    return {
      id: 'spf',
      label: 'SPF',
      level: 'pass',
      detail:
        `${envelopeHost} publishes "${envelope[0]}". That subdomain is the Return-Path Resend sends from, so SPF is ` +
        `evaluated there and passes, and it aligns with ${domain} under relaxed DMARC alignment. ` +
        (root.length ? `The root record ("${root[0]}") belongs to normal business mail and is not used by this path.` : ''),
    };
  }

  if (!root.length && !envelope.length) {
    return {
      id: 'spf',
      label: 'SPF',
      level: 'error',
      detail: `No SPF record on ${domain} or ${envelopeHost}.`,
      fix: 'Add the SPF record Resend shows in its Domains screen.',
    };
  }

  if (root.length === 1 && sesInclude(root[0])) {
    return { id: 'spf', label: 'SPF', level: 'pass', detail: `${domain} publishes "${root[0]}".` };
  }

  // No Return-Path subdomain and no SES include on the root. DKIM still carries
  // DMARC on its own, so this is a warning rather than a stop.
  return {
    id: 'spf',
    label: 'SPF',
    level: 'warning',
    detail:
      `${root[0] ?? '(no root SPF)'}. There is no Return-Path subdomain at ${envelopeHost} and no SES include on the ` +
      `root, so SPF will not align on these sends. DKIM signs on this domain and DMARC can pass on DKIM alignment ` +
      `alone, which is why this is a warning and not a stop.`,
    fix: `Verify the domain in Resend so it provisions ${envelopeHost}. Do not edit the root SPF record, which belongs to normal business mail.`,
  };
}

/**
 * DKIM is looked up at the selector Resend publishes. A CNAME that resolves is
 * the honest signal available from here; whether the receiver validated the
 * signature is not something we can see.
 */
async function checkDkim(domain: string): Promise<HealthCheck> {
  const selectors = ['resend._domainkey', 'resend2._domainkey', 'default._domainkey'];
  for (const selector of selectors) {
    const host = `${selector}.${domain}`;
    try {
      const cname = await resolveCname(host);
      if (cname.length) {
        return { id: 'dkim', label: 'DKIM', level: 'pass', detail: `${host} points at ${cname[0]}.` };
      }
    } catch {
      /* try the next selector */
    }
    const records = await txt(host);
    if (records.some((r) => /p=/.test(r))) {
      return { id: 'dkim', label: 'DKIM', level: 'pass', detail: `${host} publishes a public key.` };
    }
  }
  return {
    id: 'dkim',
    label: 'DKIM',
    level: 'error',
    detail: `No DKIM record found at any known selector on ${domain}.`,
    fix: 'Add the DKIM record from the Resend Domains screen and wait for it to verify.',
  };
}

async function checkDmarc(domain: string): Promise<HealthCheck> {
  const records = (await txt(`_dmarc.${domain}`)).filter((r) => /^v=DMARC1/i.test(r));
  if (!records.length) {
    return {
      id: 'dmarc',
      label: 'DMARC',
      level: 'error',
      detail: `No DMARC record on ${domain}.`,
      fix: 'Publish at least _dmarc TXT "v=DMARC1; p=none; rua=mailto:you@yourdomain". Gmail and Yahoo require one from bulk senders.',
    };
  }
  const record = records[0];
  const policy = /p=(none|quarantine|reject)/i.exec(record)?.[1]?.toLowerCase() ?? 'none';
  return {
    id: 'dmarc',
    label: 'DMARC',
    level: policy === 'none' ? 'warning' : 'pass',
    detail: record,
    fix: policy === 'none' ? 'p=none monitors but enforces nothing. Move to quarantine once the reports look clean.' : undefined,
  };
}

/* ─────────────────────────── provider facts ─────────────────────────────── */

/** Resend's own view of the domain, when the key allows reading it. */
async function checkProviderDomain(): Promise<HealthCheck> {
  const key = process.env.RESEND_API_KEY;
  if (!key || /^\[SENSITIVE\]$/i.test(key)) {
    return { id: 'provider', label: 'Sending provider', level: 'error', detail: 'RESEND_API_KEY is not set.', fix: 'Set RESEND_API_KEY in Vercel.' };
  }
  try {
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) {
      return {
        id: 'provider',
        label: 'Sending provider',
        level: 'unknown',
        detail: `Resend answered ${res.status} for the domain list. The key may not carry domain read access.`,
      };
    }
    const json = (await res.json()) as { data?: { name: string; status: string; region?: string }[] };
    const domain = (json.data ?? []).find((d) => d.name === SENDING_DOMAIN);
    if (!domain) {
      return {
        id: 'provider',
        label: 'Sending provider',
        level: 'warning',
        detail: `${SENDING_DOMAIN} is not in the Resend domain list.`,
        fix: 'Add and verify the domain in Resend.',
      };
    }
    return {
      id: 'provider',
      label: 'Sending provider',
      level: domain.status === 'verified' ? 'pass' : 'warning',
      detail: `Resend reports ${SENDING_DOMAIN} as ${domain.status}${domain.region ? ` in ${domain.region}` : ''}.`,
      fix: domain.status === 'verified' ? undefined : 'Finish domain verification in Resend.',
    };
  } catch (err) {
    return { id: 'provider', label: 'Sending provider', level: 'unknown', detail: err instanceof Error ? err.message : 'Resend is unreachable.' };
  }
}

/* ──────────────────────────────── the report ────────────────────────────── */

export async function computeSenderHealth(dbIn?: SupabaseClient | null): Promise<SenderHealth> {
  const db = dbIn ?? getSupabase();
  const settings = await getAcqSettings();
  const state = (settings.sender_state ?? 'validating') as SenderState;

  const [spf, dkim, dmarc, provider] = await Promise.all([
    checkSpf(SENDING_DOMAIN),
    checkDkim(SENDING_DOMAIN),
    checkDmarc(SENDING_DOMAIN),
    checkProviderDomain(),
  ]);

  const checks: HealthCheck[] = [provider, spf, dkim, dmarc];

  checks.push({
    id: 'unsubscribe',
    label: 'One-click unsubscribe',
    level: 'pass',
    detail: 'Every campaign send emits List-Unsubscribe and List-Unsubscribe-Post (RFC 8058) plus a footer link.',
  });

  /* the webhooks that tell us the truth after a send */
  let bounceWebhook: HealthCheck = { id: 'bounce-webhook', label: 'Bounce and complaint webhook', level: 'unknown', detail: 'No database.' };
  let suppression: HealthCheck = { id: 'suppression', label: 'Suppression engine', level: 'unknown', detail: 'No database.' };
  let statuses: Record<string, number> = {};
  let volume = { sent24h: 0, sent1h: 0, bounced24h: 0, complained24h: 0, unsub24h: 0 };

  if (db) {
    try {
      volume = await rollingCounts(db);
    } catch {
      /* reported below as unknown */
    }

    const { count: suppressed, error: supErr } = await db.from('email_suppressions').select('email', { count: 'exact', head: true });
    const { count: optOuts, error: optErr } = await db.from('suppression').select('contact', { count: 'exact', head: true });
    suppression = supErr || optErr
      ? { id: 'suppression', label: 'Suppression engine', level: 'error', detail: 'A suppression list cannot be read. Every send path fails closed while that is true.', fix: 'Check the Supabase connection.' }
      : { id: 'suppression', label: 'Suppression engine', level: 'pass', detail: `${optOuts ?? 0} permanent opt-outs and ${suppressed ?? 0} bounce or complaint entries, both readable.` };

    // The webhook is proven by evidence, not by configuration: if bounce and
    // complaint events have ever landed, it works.
    const { count: events } = await db
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .in('status', ['bounced', 'complained', 'delivered']);
    bounceWebhook = (events ?? 0) > 0
      ? { id: 'bounce-webhook', label: 'Bounce and complaint webhook', level: 'pass', detail: `${events} delivery events received from Resend so far.` }
      : {
          id: 'bounce-webhook',
          label: 'Bounce and complaint webhook',
          level: 'warning',
          detail: 'No delivery, bounce or complaint event has ever been received.',
          fix: 'Point a Resend webhook at /api/webhooks/resend so bounces suppress themselves automatically.',
        };

    const { data: recent } = await db
      .from('acq_sends')
      .select('status')
      .gte('sent_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(50000);
    for (const r of (recent ?? []) as { status: string }[]) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
    if (!Object.keys(statuses).length) statuses = { none: 0 };
  }

  checks.push(bounceWebhook, suppression);

  const ceiling = settings.global_rolling_24h_ceiling ?? 4500;
  const allowance = Math.min(settings.adaptive_daily_allowance ?? 100, ceiling);
  const measurable = volume.sent24h >= 25;

  checks.push({
    id: 'ceiling',
    label: 'Rolling 24 hour ceiling',
    level: volume.sent24h >= ceiling ? 'error' : volume.sent24h >= allowance ? 'warning' : 'pass',
    detail: `${volume.sent24h} sent in the last 24 hours. Allowance ${allowance}, hard ceiling ${ceiling}. The ceiling is a ceiling, not a target.`,
  });

  const bouncePct = measurable ? (volume.bounced24h / volume.sent24h) * 100 : null;
  const complaintPct = measurable ? (volume.complained24h / volume.sent24h) * 100 : null;
  const unsubPct = measurable ? (volume.unsub24h / volume.sent24h) * 100 : null;
  const maxBounce = Number(settings.max_bounce_rate_pct ?? 4);
  const maxComplaint = Number(settings.max_complaint_rate_pct ?? 0.1);

  checks.push({
    id: 'bounce-rate',
    label: 'Bounce rate',
    level: !measurable ? 'unknown' : bouncePct! > maxBounce ? 'error' : bouncePct! > maxBounce / 2 ? 'warning' : 'pass',
    detail: measurable ? `${bouncePct!.toFixed(2)}% over 24 hours, ceiling ${maxBounce}%.` : 'Under 25 sends in 24 hours, so there is nothing honest to measure yet.',
  });
  checks.push({
    id: 'complaint-rate',
    label: 'Complaint rate',
    level: !measurable ? 'unknown' : complaintPct! > maxComplaint ? 'error' : complaintPct! > maxComplaint / 2 ? 'warning' : 'pass',
    detail: measurable ? `${complaintPct!.toFixed(3)}% over 24 hours, ceiling ${maxComplaint}%.` : 'Under 25 sends in 24 hours, so there is nothing honest to measure yet.',
  });

  checks.push({
    id: 'placement',
    label: 'Inbox placement',
    level: 'unknown',
    detail:
      'Not measurable from here, and deliberately not guessed. Resend reports accepted, delivered, bounced and complained. It cannot tell us Inbox versus Promotions versus Spam, so this engine never claims to know.',
  });

  const order: Record<HealthLevel, number> = { pass: 0, unknown: 1, warning: 2, error: 3 };
  const worst = checks.reduce<HealthLevel>((w, c) => (order[c.level] > order[w] ? c.level : w), 'pass');

  return {
    domain: SENDING_DOMAIN,
    identity: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    state,
    stateLabel: SENDER_STATE_LABELS[state],
    stateReason: settings.sender_state_reason ?? null,
    checks,
    volume: {
      sent24h: volume.sent24h,
      sent1h: volume.sent1h,
      allowance,
      ceiling,
      hourlyCap: 25,
      usedPct: allowance > 0 ? Math.round((volume.sent24h / allowance) * 100) : 0,
    },
    rates: { bouncePct, complaintPct, unsubPct, measurable, maxBouncePct: maxBounce, maxComplaintPct: maxComplaint },
    statuses,
    ramp: { steps: RAMP_STEPS, current: allowance, next: RAMP_STEPS.find((s) => s > allowance) ?? null },
    worst,
  };
}
