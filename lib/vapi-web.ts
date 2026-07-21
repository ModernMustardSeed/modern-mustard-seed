/**
 * Mic-path hardening for the Vapi web SDK.
 *
 * The SDK unconditionally turns on Daily's Krisp "noise-cancellation" audio
 * processor when a web call starts (@vapi-ai/web 2.5.2, vapi.js stage 7). On a
 * meaningful share of machines that processor swallows the entire microphone
 * track: the assistant greets you, hears literal silence for the whole call,
 * and hangs up with `silence-timed-out` or
 * `call.in-progress.error-assistant-did-not-receive-customer-audio`. From the
 * prospect's side the demo looks broken. It talks, then ignores you. The
 * failure is intermittent and machine-dependent, which is what made it so easy
 * to miss: the same demo works on one laptop and is stone deaf on the next.
 *
 * Observed 2026-07-13 on the Hall Roofing demo: mic delivering audio at 0.31
 * peak RMS in the page, Vapi transcript containing zero user turns. Turning the
 * processor off makes the same call transcribe normally.
 *
 * The SDK only falls back to `type: 'none'` if Krisp raises an
 * `audio-processor-error`. The failure we hit is silent, so nothing fires and
 * the call dies quietly. We do not need Krisp for a browser demo: the browser's
 * own WebRTC pipeline still gives us echoCancellation, noiseSuppression and
 * autoGainControl (verified true on the live mic track after this runs), so
 * turning Krisp off does not expose us to speakerphone echo.
 *
 * `call` is the SDK's internal DailyCall. It is TS-private but present at
 * runtime in the npm, Turbopack and esm.sh builds. Because we depend on an
 * internal, the SDK version is PINNED EXACTLY in package.json: a minor bump
 * that renames this property would otherwise silently make every demo go deaf
 * again. If it ever does change, the warning below is how we find out.
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
 * The SDK enables the processor during its own start sequence, so we retry
 * across the window in which it finishes joining. Best effort by design: a
 * throw here must never take the call down, since a call with noise
 * cancellation still stands a chance while a crashed call is a dead demo.
 *
 * If every attempt fails we shout, because that means the SDK internals moved
 * and the demos are about to go deaf.
 */
/**
 * Fully destroy a previous call instance before starting a new one.
 *
 * Daily allows only ONE call object per page. The SDK's stop() is async (it
 * awaits call.destroy()) but flips its `started` flag immediately, so a rapid
 * hang-up-and-redial can create a second Daily call object while the first is
 * still tearing down. When that race lands, the new call grabs no mic (Vapi
 * ends it with `error-assistant-did-not-receive-customer-audio` or
 * `silence-timed-out`) or plays no output audio (the caller hears nothing).
 * Observed live 2026-07-21: Sarah redialed within seconds and got one deaf
 * call and one mute call back to back.
 *
 * Every surface now builds a FRESH Vapi instance per call and awaits this
 * first. The settle delay gives the browser a beat to release the mic and
 * output devices after destroy resolves.
 */
export async function teardownVapi(vapi: unknown): Promise<void> {
  if (!vapi) return;
  try {
    await Promise.resolve((vapi as any).stop());
  } catch {
    /* already stopped or never started */
  }
  await new Promise((r) => window.setTimeout(r, 150));
}

export function hardenMicPath(vapi: unknown): void {
  const attempts = [0, 400, 1200, 2500];
  let landed = false;

  attempts.forEach((delay, i) => {
    window.setTimeout(() => {
      void setProcessorNone(vapi as any)
        .then((ok) => {
          if (ok) landed = true;
        })
        .catch(() => {
          /* processor may not be attached yet; a later attempt covers it */
        })
        .finally(() => {
          if (i === attempts.length - 1 && !landed) {
            console.warn(
              '[vapi] Could not disable the Krisp noise processor. The SDK internals may have changed. ' +
                'Callers may not be heard. See lib/vapi-web.ts.',
            );
          }
        });
    }, delay);
  });
}
