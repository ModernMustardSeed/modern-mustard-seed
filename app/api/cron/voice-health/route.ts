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
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { VOICE_AGENTS, type VoiceAgent } from '@/lib/voice-agents';
import { getSupabase } from '@/lib/supabase';

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

/**
 * Probe a model in isolation via a transient assistant.
 * Returns { ok, billing }: a 402 / "wallet balance" failure is a BILLING outage
 * (the account is out of credits), NOT a model fault, so it must never trigger a
 * model failover (that just demotes a perfectly good brain while no call can
 * connect anyway). All other non-2xx (incl. 524 upstream fault) = model down.
 */
async function probeModel(
  provider: string,
  model: string,
  key: string,
): Promise<{ ok: boolean; billing: boolean }> {
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
    if (res.ok) return { ok: true, billing: false };
    let billing = res.status === 402;
    if (!billing) {
      try {
        const body = await res.text();
        billing = /wallet balance|purchase more credits|insufficient (funds|credit)|upgrade your plan/i.test(body);
      } catch {
        /* ignore */
      }
    }
    return { ok: false, billing };
  } catch {
    return { ok: false, billing: false }; // timeout / abort / network = model unhealthy
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
    const resend = resendClient();
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

/**
 * Low-balance alert. Fires when probes hit a Vapi wallet/billing error, so a
 * depleted account (which silently takes the whole voice fleet offline) pages
 * Sarah instead of failing quietly. Deduped to once per 6h via app_state, and
 * sends a one-time "resolved" note when credits are back. Degrades gracefully if
 * the app_state table is absent (then it simply alerts each run while down).
 */
async function billingAlert(active: boolean): Promise<void> {
  const sb = getSupabase();
  let lastAlertIso: string | null = null;
  let prevActive = false;
  if (sb) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', 'voice_billing').maybeSingle();
      const v = (data?.value ?? null) as { active?: boolean; alerted_at?: string } | null;
      if (v) { lastAlertIso = v.alerted_at ?? null; prevActive = !!v.active; }
    } catch {
      /* table missing or db down: fall through, alert un-deduped */
    }
  }
  const apiKey = process.env.RESEND_API_KEY;
  const send = async (subject: string, message: string, action: string) => {
    if (!apiKey) return;
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com'],
        subject,
        html: leadNotification({
          type: 'Contact',
          name: 'Voice-agent billing watchdog',
          email: 'sarah@modernmustardseed.com',
          fields: [
            { label: 'Service', value: 'Vapi (voice agents)' },
            { label: 'Status', value: active ? 'WALLET EMPTY — fleet offline' : 'Recovered' },
          ],
          message,
          suggestedAction: action,
        }),
      });
    } catch (err) {
      console.error('billing alert email failed', err);
    }
  };

  if (active) {
    const recently = lastAlertIso && Date.now() - new Date(lastAlertIso).getTime() < 6 * 3600 * 1000;
    if (!recently) {
      await send(
        'URGENT: Vapi wallet empty — your voice agents are DOWN',
        'Vapi returned a wallet/billing error (HTTP 402) when probing the voice models, so no inbound or outbound calls can connect. The brains are fine; the account is out of credits. The watchdog did NOT demote any agent off its primary brain, because this is billing, not a model fault. Top up at https://dashboard.vapi.ai (Billing).',
        'Top up Vapi credits now, then turn on auto-recharge so this cannot recur.',
      );
      if (sb) {
        try {
          await sb.from('app_state').upsert({ key: 'voice_billing', value: { active: true, alerted_at: new Date().toISOString() }, updated_at: new Date().toISOString() });
        } catch { /* graceful */ }
      }
    }
  } else if (prevActive) {
    await send('Voice agents: Vapi balance restored', 'The Vapi wallet/billing error has cleared. Inbound and outbound calls can connect again, and each agent is back on its primary brain.', 'All clear.');
    if (sb) {
      try {
        await sb.from('app_state').upsert({ key: 'voice_billing', value: { active: false }, updated_at: new Date().toISOString() });
      } catch { /* graceful */ }
    }
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
  const health = new Map<string, 'up' | 'down' | 'flaky' | 'billing'>();
  await Promise.all(
    uniqueModels.map(async (a: VoiceAgent) => {
      const k = `${a.provider}::${a.primary}`;
      const p1 = await probeModel(a.provider, a.primary, key);
      const p2 = await probeModel(a.provider, a.primary, key);
      if (p1.billing || p2.billing) {
        // Account out of credits: the brain is fine, do NOT fail over.
        health.set(k, 'billing');
        return;
      }
      const passes = (p1.ok ? 1 : 0) + (p2.ok ? 1 : 0);
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

  // Billing outage is account-level (not per-agent): alert once, never fail over.
  const billingDown = [...health.values()].includes('billing');
  await billingAlert(billingDown);

  return NextResponse.json({ ok: true, agents, changes: changes.length, billing: billingDown });
}
