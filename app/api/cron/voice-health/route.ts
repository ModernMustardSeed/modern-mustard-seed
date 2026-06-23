/**
 * Mr. Mustard brain watchdog.
 *
 * Vapi has no native model fallback on Anthropic (it rejects `fallbackModels`),
 * and on 2026-06-23 the live claude-opus-4-6 brain faulted UPSTREAM for a few
 * hours: every call dropped ~30s in with
 * call.in-progress.error-providerfault-anthropic-llm-failed, and a /chat probe
 * hung with HTTP 524. It then recovered on its own. This cron is the safety net.
 *
 * Every 10 minutes it probes the Opus brain in isolation and:
 *   - if Opus is DOWN and the assistant is still on Opus, it fails the assistant
 *     over to the proven-stable Sonnet brain so calls keep connecting;
 *   - if Opus is HEALTHY again and the assistant is on the Sonnet fallback, it
 *     restores Opus.
 * It emails Sarah on every state change and stays silent otherwise (never noise).
 *
 * Hysteresis (anti-flap): two back-to-back probes per run. Fail over only when
 * BOTH fail (a single transient blip is ignored). Restore only when BOTH pass
 * (don't flap back to a flaky Opus). One pass + one fail = hold, no action.
 *
 * Health is read from an isolated transient /chat probe (no tools, no webhook),
 * so probing never disturbs a live call or fires the booking tools. Failover
 * does a GET-merge-PATCH so the full persona, temperature, and tools are
 * preserved and ONLY the model string changes.
 *
 * Auth: Vercel cron secret (Authorization: Bearer ${CRON_SECRET}); Vercel adds
 * it automatically. No-ops cleanly if VAPI_API_KEY is missing.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { leadNotification } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VAPI = 'https://api.vapi.ai';
const ASSISTANT_ID =
  process.env.VAPI_ASSISTANT_ID ||
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
  'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';
const PRIMARY = process.env.VOICE_PRIMARY_MODEL || 'claude-opus-4-6';
const FALLBACK = process.env.VOICE_FALLBACK_MODEL || 'claude-sonnet-4-6';

async function vapiFetch(
  path: string,
  init: RequestInit,
  key: string,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${VAPI}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Probe a model in isolation via a transient assistant. true = serving now. */
async function probeModel(model: string, key: string): Promise<boolean> {
  try {
    const res = await vapiFetch(
      '/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          assistant: {
            model: {
              provider: 'anthropic',
              model,
              messages: [
                { role: 'system', content: 'You are a health probe. Reply with exactly: OK' },
              ],
            },
          },
          input: 'ping',
        }),
      },
      key,
      18000,
    );
    return res.ok; // 201 on success; any non-2xx (incl. 524 upstream fault) = unhealthy
  } catch {
    return false; // timeout / abort / network = unhealthy
  }
}

/** Current model string on the live assistant, or null if unreadable. */
async function currentModel(key: string): Promise<string | null> {
  try {
    const res = await vapiFetch(`/assistant/${ASSISTANT_ID}`, { method: 'GET' }, key, 12000);
    if (!res.ok) return null;
    const a = await res.json();
    return a?.model?.model ?? null;
  } catch {
    return null;
  }
}

/**
 * Swap ONLY the model string, preserving the full model object (persona,
 * temperature, tools) via GET-merge-PATCH.
 */
async function swapModel(toModel: string, key: string): Promise<boolean> {
  const get = await vapiFetch(`/assistant/${ASSISTANT_ID}`, { method: 'GET' }, key, 12000);
  if (!get.ok) return false;
  const a = await get.json();
  const model = { ...a.model, model: toModel };
  const patch = await vapiFetch(
    `/assistant/${ASSISTANT_ID}`,
    { method: 'PATCH', body: JSON.stringify({ model }) },
    key,
    20000,
  );
  return patch.ok;
}

async function alert(action: 'failover' | 'restore', to: string, from: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const down = action === 'failover';
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      subject: down
        ? 'Mr. Mustard: Opus brain down, failed over to Sonnet'
        : 'Mr. Mustard: Opus brain recovered, restored',
      html: leadNotification({
        type: 'Contact',
        name: 'Mr. Mustard brain watchdog',
        email: 'sarah@modernmustardseed.com',
        fields: [
          { label: 'Event', value: down ? 'Opus DOWN, failed over' : 'Opus RECOVERED, restored' },
          { label: 'Brain now', value: to },
          { label: 'Was', value: from },
        ],
        message: down
          ? 'The Opus brain (claude-opus-4-6) stopped serving through Vapi, so the watchdog switched Mr. Mustard to the stable Sonnet brain (claude-sonnet-4-6) so calls keep connecting. Calls are working right now. The watchdog restores Opus automatically the moment it is healthy again.'
          : 'The Opus brain is serving again, so the watchdog restored Mr. Mustard to claude-opus-4-6. Nothing to do.',
        suggestedAction: down
          ? 'No action needed. To pin Sonnet yourself, set VOICE_PRIMARY_MODEL=claude-sonnet-4-6 in Vercel.'
          : 'All clear.',
      }),
    });
  } catch (err) {
    console.error('voice-health alert email failed', err);
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const key = process.env.VAPI_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: true, note: 'VAPI_API_KEY not set; watchdog idle' });
  }

  const live = await currentModel(key);

  // Two probes, back to back, for hysteresis.
  const p1 = await probeModel(PRIMARY, key);
  const p2 = await probeModel(PRIMARY, key);
  const passes = (p1 ? 1 : 0) + (p2 ? 1 : 0);
  const opusDown = passes === 0;
  const opusUp = passes === 2;

  let action: 'none' | 'failover' | 'restore' = 'none';
  let changedTo: string | null = null;

  if (live === PRIMARY && opusDown) {
    if (await swapModel(FALLBACK, key)) {
      action = 'failover';
      changedTo = FALLBACK;
    }
  } else if (live === FALLBACK && opusUp) {
    if (await swapModel(PRIMARY, key)) {
      action = 'restore';
      changedTo = PRIMARY;
    }
  }

  if (action !== 'none' && changedTo && live) {
    await alert(action, changedTo, live);
  }

  return NextResponse.json({ ok: true, live, opusProbes: passes, action, changedTo });
}
