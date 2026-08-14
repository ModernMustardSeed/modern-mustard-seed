import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { computeSenderHealth } from '@/lib/acq/sender-health';
import { rampSender, SENDER_STATES } from '@/lib/acq/governor';
import { updateAcqSettings } from '@/lib/acq/settings';
import { recordEvent } from '@/lib/acq/events';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  return NextResponse.json({ health: await computeSenderHealth(g.db) });
}

/**
 * The only manual controls over the sender, and both of them are deliberately
 * blunt: force a ramp evaluation, or set the state by hand. There is no button
 * that raises the allowance directly, because the allowance is supposed to be
 * earned by measured health rather than granted by impatience.
 */
export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');

  if (action === 'ramp') {
    const result = await rampSender(db);
    if (result.changed) {
      await recordEvent(db, {
        type: 'note',
        label: `Sender allowance ${result.to > result.from ? 'raised' : 'lowered'} from ${result.from} to ${result.to} (${result.state})`,
        detail: { reason: result.reason },
      });
    }
    return NextResponse.json({ ok: true, result, health: await computeSenderHealth(db) });
  }

  if (action === 'set-state') {
    const state = String(body.state ?? '');
    if (!SENDER_STATES.includes(state as never)) {
      return NextResponse.json({ error: `Unknown sender state: ${state}` }, { status: 400 });
    }
    const reason = String(body.reason ?? 'Set by hand from Sender Health.');
    await updateAcqSettings({
      sender_state: state,
      sender_state_reason: reason,
      sender_state_at: new Date().toISOString(),
      ...(body.allowance !== undefined ? { adaptive_daily_allowance: Math.max(0, Number(body.allowance)) } : {}),
    });
    await recordEvent(db, { type: 'note', label: `Sender state set to ${state}`, detail: { reason } });
    return NextResponse.json({ ok: true, health: await computeSenderHealth(db) });
  }

  if (action === 'limits') {
    const patch: Record<string, unknown> = {};
    if (body.global_rolling_24h_ceiling !== undefined) {
      // Sarah's rule: below five thousand in a rolling day, always.
      patch.global_rolling_24h_ceiling = Math.max(0, Math.min(4999, Number(body.global_rolling_24h_ceiling)));
    }
    if (body.max_bounce_rate_pct !== undefined) patch.max_bounce_rate_pct = Math.max(0, Math.min(100, Number(body.max_bounce_rate_pct)));
    if (body.max_complaint_rate_pct !== undefined) patch.max_complaint_rate_pct = Math.max(0, Math.min(100, Number(body.max_complaint_rate_pct)));
    if (body.min_days_between_emails !== undefined) patch.min_days_between_emails = Math.max(0, Number(body.min_days_between_emails));
    if (Array.isArray(body.allowed_email_tiers)) patch.allowed_email_tiers = body.allowed_email_tiers;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
    await updateAcqSettings(patch);
    return NextResponse.json({ ok: true, health: await computeSenderHealth(db) });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
