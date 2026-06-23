/**
 * Voice-agent brain watchdog (whole fleet).
 *
 * Vapi has no native model fallback on Anthropic, and on 2026-06-23 the live
 * claude-opus-4-6 brain faulted UPSTREAM for a few hours: every call dropped
 * ~30s in with call.in-progress.error-providerfault-anthropic-llm-failed, and a
 * /chat probe hung with HTTP 524. It recovered on its own. This cron is the
 * safety net for EVERY monitored agent (see lib/voice-agents.ts).
 *
 * Every ~10 minutes it probes each agent's primary brain in isolation and, with
 * two-probe hysteresis, fails an agent over to its stable fallback when the
 * primary is down, and restores the primary when it recovers:
 *   - both probes fail  + agent on primary  -> fail over to fallback
 *   - both probes pass  + agent on fallback  -> restore primary
 *   - one pass one fail (flaky)              -> hold, no change
 * One consolidated email goes to Sarah whenever anything changes; silent
 * otherwise (never noise).
 *
 * Probes use isolated transient /chat assistants (no tools, no webhook), so they
 * never disturb a live call or fire booking tools. Unique primary models are
 * probed once per run and shared across agents. Failover swaps ONLY the model
 * string via GET-merge-PATCH, so each agent's full persona, temperature, and
 * tools are preserved.
 *
 * Trigger: a GitHub Actions schedule pings this route (.github/workflows/
 * voice-health.yml), because the MMS Vercel project is on Hobby (Vercel cron is
 * daily-only there). Auth: optional Vercel cron secret (Authorization: Bearer
 * ${CRON_SECRET}). No-ops cleanly if VAPI_API_KEY is missing.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { leadNotification } from '@/lib/email';
import { VOICE_AGENTS, type VoiceAgent } from '@/lib/voice-agents';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VAPI = 'https://api.vapi.ai';

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
async function probeModel(provider: string, model: string, key: string): Promise<boolean> {
  try {
    const res = await vapiFetch(
      '/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          assistant: {
            model: {
              provider,
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

/** Current model string on an assistant, or null if unreadable. */
async function currentModel(id: string, key: string): Promise<string | null> {
  try {
    const res = await vapiFetch(`/assistant/${id}`, { method: 'GET' }, key, 12000);
    if (!res.ok) return null;
    const a = await res.json();
    return a?.model?.model ?? null;
  } catch {
    return null;
  }
}

/** Swap ONLY the model string, preserving the full model object (persona, temperature, tools). */
async function swapModel(id: string, toModel: string, key: string): Promise<boolean> {
  const get = await vapiFetch(`/assistant/${id}`, { method: 'GET' }, key, 12000);
  if (!get.ok) return false;
  const a = await get.json();
  const model = { ...a.model, model: toModel };
  const patch = await vapiFetch(
    `/assistant/${id}`,
    { method: 'PATCH', body: JSON.stringify({ model }) },
    key,
    20000,
  );
  return patch.ok;
}

type Change = { label: string; action: 'failover' | 'restore'; from: string; to: string };

async function alertAll(changes: Change[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || changes.length === 0) return;
  const anyDown = changes.some((c) => c.action === 'failover');
  const lines = changes.map(
    (c) =>
      `${c.action === 'failover' ? 'DOWN' : 'RECOVERED'}: ${c.label} . ${c.from} -> ${c.to}`,
  );
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      subject: anyDown
        ? `Voice agents: ${changes.filter((c) => c.action === 'failover').length} brain(s) down, failed over`
        : 'Voice agents: brain(s) recovered, restored',
      html: leadNotification({
        type: 'Contact',
        name: 'Voice-agent brain watchdog',
        email: 'sarah@modernmustardseed.com',
        fields: changes.map((c) => ({
          label: c.label,
          value: `${c.action === 'failover' ? 'failed over' : 'restored'} ${c.from} -> ${c.to}`,
        })),
        message: anyDown
          ? `A primary brain stopped serving through Vapi, so the watchdog switched the affected agent(s) to their stable fallback so calls keep connecting. Calls are working now. Each agent is restored automatically the moment its primary brain is healthy again.\n\n${lines.join('\n')}`
          : `Primary brains are serving again, so the watchdog restored the affected agent(s). Nothing to do.\n\n${lines.join('\n')}`,
        suggestedAction: anyDown
          ? 'No action needed. Fleet config lives in lib/voice-agents.ts.'
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

  // Probe each UNIQUE primary model once (two probes, hysteresis), shared across agents.
  const uniqueModels = [
    ...new Map(VOICE_AGENTS.map((a) => [`${a.provider}::${a.primary}`, a])).values(),
  ];
  const health = new Map<string, 'up' | 'down' | 'flaky'>();
  await Promise.all(
    uniqueModels.map(async (a: VoiceAgent) => {
      const k = `${a.provider}::${a.primary}`;
      const p1 = await probeModel(a.provider, a.primary, key);
      const p2 = await probeModel(a.provider, a.primary, key);
      const passes = (p1 ? 1 : 0) + (p2 ? 1 : 0);
      health.set(k, passes === 2 ? 'up' : passes === 0 ? 'down' : 'flaky');
    }),
  );

  // Decide + act per agent.
  const changes: Change[] = [];
  const agents = await Promise.all(
    VOICE_AGENTS.map(async (a) => {
      const live = await currentModel(a.id, key);
      const h = health.get(`${a.provider}::${a.primary}`) ?? 'flaky';
      let action: 'none' | 'failover' | 'restore' = 'none';
      let changedTo: string | null = null;

      if (live === a.primary && h === 'down') {
        if (await swapModel(a.id, a.fallback, key)) {
          action = 'failover';
          changedTo = a.fallback;
        }
      } else if (live === a.fallback && h === 'up') {
        if (await swapModel(a.id, a.primary, key)) {
          action = 'restore';
          changedTo = a.primary;
        }
      }

      if (action !== 'none' && changedTo && live) {
        changes.push({ label: a.label, action, from: live, to: changedTo });
      }

      return { label: a.label, live: changedTo ?? live, primaryHealth: h, action };
    }),
  );

  if (changes.length) await alertAll(changes);

  return NextResponse.json({ ok: true, agents, changes: changes.length });
}
