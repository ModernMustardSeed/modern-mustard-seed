/**
 * MAY THIS OFFICE SPEND MONEY, AND MAY IT ANSWER A REAL PHONE?
 *
 * Two irreversible things sit behind this file. Buying a phone number starts a
 * bill that runs every month until somebody remembers to release it. Going live
 * points a real contractor's customers at an AI. Sarah's rule, and it is the
 * right one: neither happens until they are a LIVE PAYING CUSTOMER and their
 * agent has been TESTED by a person who listened to it.
 *
 * ── ONE FUNCTION, CONSULTED BY EVERYTHING ────────────────────────────────────
 * The board renders from `readiness()`, the buy button calls it, and the
 * go-live route calls it again server-side before acting. A button that is
 * merely hidden is not a control: anybody can POST. The check that matters is
 * the one on the server, and it is the same check, so the screen can never
 * disagree with what the API will actually allow.
 *
 * ── WHY "TESTED" EXPIRES ─────────────────────────────────────────────────────
 * A pass recorded before the agent was last edited is not evidence about the
 * agent that exists now. Somebody changing the greeting, the rules, or the
 * transfer list invalidates the test, and this says so rather than letting a
 * stale green tick carry a changed agent onto a live line.
 */

export type OfficeReadiness = {
  id: string;
  status: string;
  greeting: string | null;
  hours: Record<string, unknown> | null;
  vapi_assistant_id: string | null;
  agent_phone: string | null;
  forward_from: string | null;
  billing_status: string;
  test_call_at: string | null;
  test_call_passed: boolean | null;
  agent_synced_at: string | null;
};

export type Gate = {
  /** True only when nothing at all stands in the way. */
  ok: boolean;
  /** Short reason, written for the person who has to fix it. */
  blockers: string[];
};

export type Readiness = {
  /** Can we build or rebuild the agent? Cheap and reversible, so almost always. */
  canSync: Gate;
  /** Can a test call be placed? Needs an agent to test. */
  canTest: Gate;
  /** Can we spend money on a line for them? */
  canBuyNumber: Gate;
  /** Can their customers start reaching this? */
  canGoLive: Gate;
  /** Plain-language summary for the board. */
  summary: string;
};

const gate = (blockers: string[]): Gate => ({ ok: blockers.length === 0, blockers });

/** Paying, right now. "They checked out once" is not this. */
export function isPaying(o: Pick<OfficeReadiness, 'billing_status'>): boolean {
  return o.billing_status === 'active';
}

/**
 * Tested, and the test still describes the agent we would put live.
 *
 * A null `test_call_passed` means nobody has judged it, which is deliberately
 * NOT the same as a judged failure and must never be read as a pass.
 */
export function isTested(o: Pick<OfficeReadiness, 'test_call_at' | 'test_call_passed' | 'agent_synced_at'>): { ok: boolean; reason: string | null } {
  if (!o.test_call_at) return { ok: false, reason: 'No test call has been made yet' };
  if (o.test_call_passed !== true) {
    return { ok: false, reason: o.test_call_passed === false ? 'The test call was marked as failed' : 'The test call has not been judged yet' };
  }
  if (o.agent_synced_at && Date.parse(o.agent_synced_at) > Date.parse(o.test_call_at)) {
    return { ok: false, reason: 'The agent has been changed since it was tested, so test it again' };
  }
  return { ok: true, reason: null };
}

export function readiness(o: OfficeReadiness): Readiness {
  /* ── build the agent ── */
  const syncBlockers: string[] = [];
  if (!o.greeting?.trim()) syncBlockers.push('No greeting');

  /* ── test it ── */
  const testBlockers: string[] = [...syncBlockers];
  if (!o.vapi_assistant_id) testBlockers.push('The agent has not been built yet');

  /* ── spend money ──
     Everything above, plus the two rules that exist to stop a monthly bill
     starting for somebody who is not paying us or an agent nobody has heard. */
  const buyBlockers: string[] = [...testBlockers];
  if (!isPaying(o)) buyBlockers.push(payingBlocker(o.billing_status));
  const tested = isTested(o);
  if (!tested.ok && tested.reason) buyBlockers.push(tested.reason);
  if (o.agent_phone) buyBlockers.push('A number is already assigned to this office');

  /* ── point real customers at it ── */
  const liveBlockers: string[] = [];
  if (!o.greeting?.trim()) liveBlockers.push('No greeting');
  if (!o.hours || !Object.keys(o.hours).length) liveBlockers.push('No hours, so it cannot book anything');
  if (!o.vapi_assistant_id) liveBlockers.push('The agent has not been built yet');
  if (!isPaying(o)) liveBlockers.push(payingBlocker(o.billing_status));
  if (!tested.ok && tested.reason) liveBlockers.push(tested.reason);
  if (!o.agent_phone) liveBlockers.push('No phone number yet');
  if (!o.forward_from) liveBlockers.push('We do not know which number is forwarding to us');

  return {
    canSync: gate(syncBlockers),
    canTest: gate(testBlockers),
    canBuyNumber: gate(buyBlockers),
    canGoLive: gate(liveBlockers),
    summary: summarize(o, liveBlockers),
  };
}

function payingBlocker(billing: string): string {
  if (billing === 'past_due') return 'Their subscription is past due';
  if (billing === 'cancelled') return 'Their subscription has been cancelled';
  return 'Not confirmed as a paying customer yet';
}

function summarize(o: OfficeReadiness, liveBlockers: string[]): string {
  if (o.status === 'live') return 'Answering their calls.';
  if (o.status === 'paused') return 'Paused. Their calls are not being answered.';
  if (!liveBlockers.length) return 'Ready to go live.';
  return `Waiting on: ${liveBlockers[0].toLowerCase()}.`;
}
