/**
 * codex-relay client: render images on Sarah's flat Codex subscription from a
 * serverless function.
 *
 * Sarah, 2026-08-01: "use codex for all image gen everywhere from now on. fal
 * can still do full on video."
 *
 * A Vercel function has no Codex CLI, so it talks to `scripts/codex-image-relay.mjs`
 * running on Sarah's machine behind a cloudflared tunnel. Env:
 *
 *   CODEX_RELAY_URL    https://<tunnel>.trycloudflare.com
 *   CODEX_RELAY_TOKEN  the same secret the relay was started with
 *
 * THE RULE THIS FILE ENFORCES: never hang a user's request on a machine that
 * might be asleep. It probes /health first (cheap, ~50ms, cached), and returns a
 * typed miss rather than throwing, so every caller can decide for itself whether
 * to fall back to the paid path or degrade gracefully. A checkout must never
 * block for 90 seconds because a laptop lid was closed.
 *
 * CANONICAL COPY. cxc-studio, mms-youtube-studio, adforge-studio and
 * fiat-lux-design carry copies of this file; change it here first.
 */

export type RelayMiss = 'disabled' | 'offline' | 'busy' | 'failed';

export type RelayResult =
  | { ok: true; buffer: Buffer; mime: string; width: number; height: number; bytes: number; seconds: number; source: string }
  | { ok: false; reason: RelayMiss; error: string };

export interface RelayOptions {
  prompt: string;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
  quality?: number;
  /** Only when the image is SUPPOSED to carry words. Generated lettering is usually mangled. */
  allowText?: boolean;
  /** Let the RELAY spend fal money if Codex fails. Off unless the caller truly cannot ship without an image. */
  fallbackFal?: boolean;
  /**
   * Reference images, as https URLs (a blob URL, a product shot, the mascot).
   * Verified 2026-08-01: Codex genuinely holds subject and lighting across a
   * change of angle, which is what makes apparel mockups and a consistent
   * mascot possible without fal's nano-banana/edit.
   */
  refs?: string[];
  /** subject = keep the item's design. character = keep the person. style = mood only. composition = keep the framing. */
  refMode?: 'subject' | 'character' | 'style' | 'composition';
  /** Hard ceiling on the render itself. A Codex image takes 60-120s. */
  timeoutMs?: number;
}

/**
 * Health is cached briefly. Without this, a page rendering six images probes the
 * tunnel six times, and each probe is a round trip to a home internet connection.
 */
let healthCache: { at: number; up: boolean; busy: boolean } | null = null;
const HEALTH_TTL_MS = 30_000;

function config() {
  const url = (process.env.CODEX_RELAY_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.CODEX_RELAY_TOKEN || '').trim();
  return url && token ? { url, token } : null;
}

/** Is the relay reachable right now? Never throws. */
export async function relayHealth(force = false): Promise<{ up: boolean; busy: boolean }> {
  const cfg = config();
  if (!cfg) return { up: false, busy: false };
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS) {
    return { up: healthCache.up, busy: healthCache.busy };
  }
  try {
    const res = await fetch(`${cfg.url}/health`, {
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    });
    const body = res.ok ? await res.json() : null;
    const state = {
      up: Boolean(body?.ok),
      busy: Boolean(body?.queued >= (body?.capacity ?? 4)),
    };
    healthCache = { at: Date.now(), ...state };
    return state;
  } catch {
    // A closed laptop, a dropped tunnel, or home internet down. All the same
    // answer, and all of them mean "do not wait on it".
    healthCache = { at: Date.now(), up: false, busy: false };
    return { up: false, busy: false };
  }
}

export async function renderViaRelay(opts: RelayOptions): Promise<RelayResult> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, reason: 'disabled', error: 'CODEX_RELAY_URL / CODEX_RELAY_TOKEN are not set' };
  }

  const health = await relayHealth();
  if (!health.up) return { ok: false, reason: 'offline', error: 'codex relay is not reachable' };
  if (health.busy) return { ok: false, reason: 'busy', error: 'codex relay queue is full' };

  const width = opts.width ?? 1600;
  const height = opts.height ?? 900;

  try {
    const res = await fetch(`${cfg.url}/image`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        width,
        height,
        format: opts.format ?? 'jpeg',
        quality: opts.quality ?? 85,
        allowText: opts.allowText ?? false,
        fallbackFal: opts.fallbackFal ?? false,
        refs: opts.refs ?? [],
        refMode: opts.refMode ?? 'subject',
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 300_000),
      cache: 'no-store',
    });

    if (res.status === 503) {
      healthCache = null; // it just told us it is saturated, so stop trusting the cache
      return { ok: false, reason: 'busy', error: 'codex relay is saturated' };
    }

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok || !body?.base64) {
      return {
        ok: false,
        reason: 'failed',
        error: body?.error || `relay returned ${res.status}`,
      };
    }

    return {
      ok: true,
      buffer: Buffer.from(body.base64, 'base64'),
      mime: body.mime || 'image/jpeg',
      width: body.width ?? width,
      height: body.height ?? height,
      bytes: body.bytes ?? 0,
      seconds: body.seconds ?? 0,
      source: body.source || 'codex relay',
    };
  } catch (e) {
    // A timeout here means the render started and we gave up on it, so the
    // caller should fall back rather than retry and burn a second render.
    healthCache = null;
    return { ok: false, reason: 'failed', error: e instanceof Error ? e.message : String(e) };
  }
}

/** Convenience for callers that just want bytes or nothing. */
export async function renderViaRelayOrNull(opts: RelayOptions): Promise<Buffer | null> {
  const r = await renderViaRelay(opts);
  return r.ok ? r.buffer : null;
}
