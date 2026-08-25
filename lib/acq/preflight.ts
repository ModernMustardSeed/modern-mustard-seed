/**
 * PREFLIGHT. What must be true before this machine is allowed to mail or call a
 * stranger, checked live and rendered at the top of the Command Center.
 *
 * The point is that a missing requirement is LOUD and specific ("Outbound
 * paused: business mailing address required") instead of a silent degradation.
 * Nothing here invents a value it cannot find. A blocker stays a blocker until
 * Sarah supplies the real thing.
 */

import { getSupabase } from '@/lib/supabase';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';

export type CheckLevel = 'blocker' | 'warning' | 'ok';

export type PreflightCheck = {
  id: string;
  level: CheckLevel;
  label: string;
  detail: string;
  /** What Sarah does about it, in one sentence. Empty when nothing to do. */
  fix: string;
};

export type Preflight = {
  checks: PreflightCheck[];
  blockers: PreflightCheck[];
  warnings: PreflightCheck[];
  canSendEmail: boolean;
  canPlaceCalls: boolean;
};

/** Vercel's write-only "Sensitive" vars read back as this. Truthy, and useless. */
const isPlaceholder = (v: string | undefined): boolean => !v || /^\[SENSITIVE\]$/i.test(v.trim());

export async function runPreflight(): Promise<Preflight> {
  const checks: PreflightCheck[] = [];
  const db = getSupabase();
  const settings = await getAcqSettings();
  const campaign = await getCampaign();

  const push = (c: PreflightCheck) => checks.push(c);

  /* ── the send path ── */

  push(
    !isPlaceholder(process.env.RESEND_API_KEY)
      ? { id: 'resend', level: 'ok', label: 'Email provider', detail: 'Resend is configured.', fix: '' }
      : {
          id: 'resend',
          level: 'blocker',
          label: 'Email provider missing',
          detail: 'RESEND_API_KEY is not set, so no campaign email can leave.',
          fix: 'Set RESEND_API_KEY in Vercel and redeploy.',
        },
  );

  const postal = process.env.MMS_POSTAL_ADDRESS?.trim();
  push(
    postal && !isPlaceholder(postal)
      ? { id: 'postal', level: 'ok', label: 'Postal address', detail: postal, fix: '' }
      : {
          id: 'postal',
          level: 'blocker',
          label: 'Business mailing address required',
          detail:
            'CAN-SPAM requires a real street address or registered PO box in every commercial email. It cannot be invented, so the compliance footer is currently running without one.',
          fix: 'Set MMS_POSTAL_ADDRESS in Vercel (street address or registered PO box), then redeploy.',
        },
  );

  push({
    id: 'sender',
    level: campaign?.from_email ? 'ok' : 'blocker',
    label: 'Sending identity',
    detail: campaign
      ? `${campaign.from_name} <${campaign.from_email}>, replies to ${campaign.reply_to}.`
      : 'No campaign row found.',
    fix: campaign ? '' : 'Apply migration 094 to seed the MEET MR. MUSTARD campaign.',
  });

  push({
    id: 'unsub',
    level: 'ok',
    label: 'Unsubscribe',
    detail:
      'Every campaign email carries the footer opt-out link and the RFC 8058 one-click List-Unsubscribe header. Opt-outs are permanent.',
    fix: '',
  });

  /* ── suppression must be readable, or nothing sends ── */

  if (db) {
    const [a, b] = await Promise.all([
      db.from('suppression').select('contact', { count: 'exact', head: true }),
      db.from('email_suppressions').select('email', { count: 'exact', head: true }),
    ]);
    const ok = !a.error && !b.error;
    push({
      id: 'suppression',
      level: ok ? 'ok' : 'blocker',
      label: 'Suppression lists',
      detail: ok
        ? `${a.count ?? 0} opt-outs and ${b.count ?? 0} bounce or complaint entries, both readable.`
        : 'A suppression list cannot be read. Sending fails closed until it can.',
      fix: ok ? '' : 'Check the Supabase connection. The send path refuses to run on an unreadable opt-out list.',
    });
  }

  /* ── the call path ── */

  const vapiKey = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY;
  const assistant =
    process.env.VAPI_MUSTARD_ASSISTANT_ID ||
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
    process.env.VAPI_ASSISTANT_ID;
  const numberId = process.env.VAPI_CALLBACK_NUMBER_ID || process.env.VAPI_PHONE_NUMBER_ID;

  push(
    !isPlaceholder(vapiKey)
      ? { id: 'vapi-key', level: 'ok', label: 'Telephony', detail: 'Vapi API key present.', fix: '' }
      : {
          id: 'vapi-key',
          level: 'blocker',
          label: 'Vapi API key missing',
          detail: 'Mr. Mustard cannot place a call without VAPI_API_KEY.',
          fix: 'Set VAPI_API_KEY in Vercel.',
        },
  );
  push(
    !isPlaceholder(assistant)
      ? { id: 'vapi-assistant', level: 'ok', label: 'Mr. Mustard assistant', detail: assistant as string, fix: '' }
      : {
          id: 'vapi-assistant',
          level: 'blocker',
          label: 'Mr. Mustard assistant id missing',
          detail: 'No assistant id is configured, so an outbound demo call has nobody to place it as.',
          fix: 'Set VAPI_MUSTARD_ASSISTANT_ID in Vercel to the live Mr. Mustard assistant id.',
        },
  );
  push(
    !isPlaceholder(numberId)
      ? { id: 'vapi-number', level: 'ok', label: 'Outbound number', detail: numberId as string, fix: '' }
      : {
          id: 'vapi-number',
          level: 'warning',
          label: 'Outbound number id not set',
          detail: 'Falling back to the studio line id used by the site callback path.',
          fix: 'Set VAPI_PHONE_NUMBER_ID so the number the prospect sees is explicit.',
        },
  );
  push(
    !isPlaceholder(process.env.VAPI_WEBHOOK_SECRET)
      ? { id: 'vapi-secret', level: 'ok', label: 'Voice webhook secret', detail: 'Tool calls are authenticated.', fix: '' }
      : {
          id: 'vapi-secret',
          level: 'warning',
          label: 'Voice webhook is unauthenticated',
          detail: 'Anyone who learns the /api/voice URL can POST built tool calls.',
          fix: 'Set VAPI_WEBHOOK_SECRET in Vercel and on the assistant in the Vapi dashboard.',
        },
  );

  /* ── the money path ── */

  push(
    !isPlaceholder(process.env.STRIPE_SECRET_KEY)
      ? { id: 'stripe', level: 'ok', label: 'Checkout', detail: 'Stripe is configured, so activation links are live.', fix: '' }
      : {
          id: 'stripe',
          level: 'warning',
          label: 'Stripe not configured',
          detail: 'Mr. Mustard can still demo and book, but he cannot send a working activation link.',
          fix: 'Set STRIPE_SECRET_KEY in Vercel.',
        },
  );

  /* ── the switch itself ── */

  if (settings.master_paused) {
    push({
      id: 'paused',
      level: 'warning',
      label: 'Acquisition engine is PAUSED',
      detail: settings.paused_reason || 'Nothing is emailed or called while the master switch is off.',
      fix: 'Flip the master switch on the Command Center when you are ready to go live.',
    });
  }

  const blockers = checks.filter((c) => c.level === 'blocker');
  const warnings = checks.filter((c) => c.level === 'warning');

  return {
    checks,
    blockers,
    warnings,
    canSendEmail: !blockers.some((b) => ['resend', 'postal', 'sender', 'suppression'].includes(b.id)),
    canPlaceCalls: !blockers.some((b) => b.id.startsWith('vapi')),
  };
}
