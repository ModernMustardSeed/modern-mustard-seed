/**
 * RECONCILE WHAT ACTUALLY HAPPENED TO EVERY EMAIL WE SENT.
 *
 *   npx tsx scripts/acq-reconcile-delivery.mts [--apply] [--limit N]
 *
 * The delivery webhook was never registered on the Resend account until
 * 2026-08-20, so every send before that reads `status='sent'` forever: accepted
 * by the provider, outcome unknown. That is not a cosmetic gap. The outbound
 * governor computes its bounce and complaint rates off acq_sends, so a
 * campaign with a real bounce problem reported `sender_state: healthy` and kept
 * raising its own allowance, because zero bounces of zero known outcomes is
 * always a clean day.
 *
 * Resend still holds the truth for those messages. This walks every send whose
 * outcome we never learned, asks Resend what became of it, and writes the
 * answer back through the same rules the webhook uses.
 *
 * Dry by default. Nothing is written without --apply.
 *
 * The webhook handles everything from here; this is for the backlog it could
 * not see, and for any future window where the endpoint was down long enough
 * that Resend gave up retrying.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/* ── config, read the same way the app reads it ─────────────────────────── */

function envFromFile(name: string): string {
  for (const file of ['.env.local', '.env']) {
    try {
      const line = readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith(`${name}=`));
      if (line) {
        const v = line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
        if (v && v !== '[SENSITIVE]') return v;
      }
    } catch {
      /* next file */
    }
  }
  return process.env[name] ?? '';
}

const RESEND_KEY = envFromFile('RESEND_API_KEY');
const SUPABASE_URL = envFromFile('NEXT_PUBLIC_SUPABASE_URL') || envFromFile('SUPABASE_URL');
const SUPABASE_KEY = envFromFile('SUPABASE_SERVICE_ROLE_KEY');

const APPLY = process.argv.includes('--apply');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

if (!RESEND_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing RESEND_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

/**
 * Resend's `last_event` mapped onto our send status.
 *
 * `suppressed` is the one worth naming. It means Resend accepted the message
 * and then never sent it, because the address is on the account suppression
 * list from an earlier bounce or complaint. It is not a delivery and counting
 * it as one overstates reach, so it gets its own status and takes the lead out
 * of the campaign the same way a bounce does.
 */
const STATUS: Record<string, string> = {
  delivered: 'delivered',
  bounced: 'bounced',
  complained: 'complaint',
  delivery_delayed: 'deferred',
  suppressed: 'suppressed',
  failed: 'failed',
  canceled: 'canceled',
};

/** Outcomes that mean this address must not be mailed again. */
const TERMINAL_FOR_LEAD = new Set(['bounced', 'complaint', 'suppressed']);

/** Statuses we already know; anything here is left alone. */
const ALREADY_RESOLVED = new Set(['delivered', 'bounced', 'complaint', 'suppressed', 'failed', 'canceled']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Resend lookup, with a polite retry on rate limit. */
async function lastEventFor(id: string): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.resend.com/emails/${id}`, {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    });
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { last_event?: string };
    return body.last_event ?? null;
  }
  return null;
}

async function main() {
  const { data, error } = await db
    .from('acq_sends')
    .select('id,lead_id,to_email,status,provider_message_id,sent_at')
    .not('provider_message_id', 'is', null)
    .order('sent_at', { ascending: true })
    .limit(10000);
  if (error) throw error;

  const rows = (data ?? []).filter((r) => !ALREADY_RESOLVED.has(String(r.status))).slice(0, LIMIT);
  console.log(`${rows.length} sends with an unknown outcome.${APPLY ? '' : '  DRY RUN, nothing will be written.'}`);

  const tally: Record<string, number> = {};
  let written = 0;
  let unknown = 0;

  for (const [i, row] of rows.entries()) {
    const event = await lastEventFor(String(row.provider_message_id));
    if (!event) {
      unknown++;
      continue;
    }
    tally[event] = (tally[event] ?? 0) + 1;

    const status = STATUS[event];
    if (!status) continue; // still in flight (queued, sent, scheduled): ask again later

    if (APPLY) {
      const stamp = new Date(String(row.sent_at)).toISOString();
      const patch: Record<string, unknown> = { status, status_detail: `reconciled from Resend (${event})` };
      if (status === 'delivered') patch.delivered_at = stamp;
      if (status === 'bounced') patch.bounced_at = stamp;
      if (status === 'complaint') patch.complained_at = stamp;
      await db.from('acq_sends').update(patch).eq('id', row.id);

      // A drop takes the prospect out of the campaign, exactly as the webhook
      // would have done the day it happened.
      if (TERMINAL_FOR_LEAD.has(status) && row.lead_id) {
        await db
          .from('outbound_leads')
          .update({
            bounced: status === 'bounced',
            acq_eligible: false,
            acq_ineligible_reason:
              status === 'bounced'
                ? 'Hard bounced.'
                : status === 'complaint'
                  ? 'Marked our mail as spam.'
                  : 'Resend suppressed this address.',
            reservoir_state: 'suppressed',
          })
          .eq('id', row.lead_id);
        // A queued follow-up to an address that hard bounced must never fire.
        // The webhook cancels these the day it happens; a reconciliation that
        // marks a lead dead and leaves five emails aimed at it has done half
        // the job.
        await db
          .from('acq_queue')
          .update({
            status: 'cancelled',
            error:
              status === 'bounced'
                ? 'Hard bounced.'
                : status === 'complaint'
                  ? 'Spam complaint.'
                  : 'Resend suppressed this address.',
            done_at: new Date().toISOString(),
          })
          .eq('lead_id', row.lead_id)
          .in('status', ['pending', 'claimed']);
        await db.from('acq_events').insert({
          lead_id: row.lead_id,
          type: status === 'bounced' ? 'email_bounced' : 'suppressed',
          label:
            status === 'bounced'
              ? 'Hard bounce (reconciled from Resend)'
              : status === 'complaint'
                ? 'Marked our email as spam (reconciled from Resend)'
                : 'Resend suppressed this address (reconciled)',
          detail: { providerId: row.provider_message_id, event, reconciled: true },
          occurred_at: stamp,
        });
      }
      written++;
    }

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${rows.length}`);
    await sleep(120); // stay well inside Resend's rate limit
  }

  console.log('\nWhat Resend says actually happened:');
  for (const [event, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${event}`);
  }
  if (unknown) console.log(`  ${String(unknown).padStart(5)}  (no answer from Resend)`);
  console.log(APPLY ? `\n${written} send rows updated.` : '\nDry run. Re-run with --apply to write.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
