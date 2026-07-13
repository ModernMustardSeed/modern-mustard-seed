/**
 * Mic-path hardening for the Vapi web SDK.
 *
 * The SDK unconditionally turns on Daily's Krisp "noise-cancellation" audio
 * processor when a web call starts (@vapi-ai/web 2.5.2, vapi.js stage 7). On a
 * meaningful share of machines that processor swallows the entire microphone
 * track: the assistant greets you, hears literal silence for the whole call,
 * and hangs up with `silence-timed-out` or
 * `call.in-progress.error-assistant-did-not-receive-customer-audio`. From the
 * prospect's side the demo looks broken. It talks, then ignores you.
 *
 * Observed 2026-07-13 on the Hall Roofing demo: mic delivering audio at 0.31
 * peak RMS in the page, Vapi transcript containing zero user turns. Turning the
 * processor off makes the same call transcribe normally.
 *
 * The SDK only falls back to `type: 'none'` if Krisp raises an
 * `audio-processor-error`. The failure we hit is silent, so nothing fires and
 * the call dies quietly. We do not need noise cancellation for a browser demo,
 * so we turn it off outright.
 *
 * `call` is the SDK's internal DailyCall. It is TS-private but present at
 * runtime, and this is the only way to reach updateInputSettings.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

async function setProcessorNone(vapi: any): Promise<boolean> {
  const call = vapi?.call;
  if (!call?.updateInputSettings) return false;
  await call.updateInputSettings({ audio: { processor: { type: 'none' } } });
  return true;
}

/**
 * Disable Krisp so the caller is actually heard.
 *
 * The SDK enables the processor during its own start sequence, so a single
 * call here can lose the race and be overwritten. We retry across the window in
 * which the SDK finishes joining. Best effort by design: a failure here must
 * never take the call down, since a call with noise cancellation still stands a
 * chance, but a thrown error is a guaranteed dead demo.
 */
export function hardenMicPath(vapi: unknown): void {
  const attempts = [0, 400, 1200, 2500];
  for (const delay of attempts) {
    window.setTimeout(() => {
      void setProcessorNone(vapi as any).catch(() => {
        /* processor may not be attached yet; a later attempt covers it */
      });
    }, delay);
  }
}
