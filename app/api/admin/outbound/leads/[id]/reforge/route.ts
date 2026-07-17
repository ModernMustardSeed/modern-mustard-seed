import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { forgeLeadVoiceDemo, buildOsConfig } from '@/lib/outbound-demo';
import { queueLeadSiteEdit } from '@/lib/site-edit';
import { TRADE_PRESETS } from '@/data/demo-os-trades';
import type { OsTradeKey } from '@/data/demo-os-trades';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * REFORGE FROM A PROMPT.
 *
 * One box in the lead, one sentence, and the lead's demo is rebuilt with that change:
 *   - site: re-queue their demo WEBSITE as an edit (the forge preserves everything and
 *     changes only what you asked).
 *   - os: remap their business OS demo's config (trade, owner, city, phone, the pain
 *     quote) from the instruction. Instant, token-cheap.
 *   - voice: rebuild their AI RECEPTIONIST with the instruction folded into its script.
 *
 * The instruction here is Sarah's, from behind the admin gate, so it is trusted. The
 * site path still frames it as data for the builder, which costs nothing and keeps the
 * engine identical to the client-facing one.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  let body: { target?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const target = body.target;
  const instruction = (body.instruction || '').trim();
  if (!instruction) return NextResponse.json({ error: 'Tell it what to change first.' }, { status: 400 });
  if (instruction.length > 4000) return NextResponse.json({ error: 'That is a lot. Trim it down.' }, { status: 400 });
  if (!['site', 'os', 'voice'].includes(target ?? '')) {
    return NextResponse.json({ error: 'Pick what to reforge: site, os, or voice.' }, { status: 400 });
  }

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  const note = async (subject: string, snippet: string) => {
    await guard.supabase.from('messages').insert({
      outbound_lead_id: l.id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: l.business_name,
      subject,
      snippet,
      read: true,
      occurred_at: new Date().toISOString(),
    });
  };

  /* ── VOICE: rebuild the receptionist with the instruction in its script. ── */
  if (target === 'voice') {
    const res = await forgeLeadVoiceDemo(guard.supabase, l, { instruction, force: true });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true, target, lead: res.lead });
  }

  /* ── SITE: re-queue their demo website as an edit. ── */
  if (target === 'site') {
    const queued = await queueLeadSiteEdit(guard.supabase, l, instruction);
    if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 400 });
    // The FULL instruction goes in the note. It is the only durable copy once the row's
    // brief is overwritten by a later reforge or a fresh forge (learned 2026-07-16, when
    // Polly's instructions survived only because the failed edit row still held them).
    await note('Website reforge queued', `Reforging their website from your prompt: "${instruction}"`);
    const { data: fresh } = await guard.supabase.from('outbound_leads').select('*').eq('id', l.id).single();
    return NextResponse.json({ ok: true, target, already: queued.already ?? false, lead: (fresh ?? l) as OutboundLead });
  }

  /* ── OS: remap the command-center demo's config from the instruction. ── */
  if (!l.os_demo_id) {
    return NextResponse.json({ error: 'There is no business OS demo yet. Forge one first, then reforge it.' }, { status: 400 });
  }
  const remapped = await remapOsConfig(l, instruction);
  if (!remapped.ok) return NextResponse.json({ error: remapped.error }, { status: 400 });

  const { error: upErr } = await guard.supabase
    .from('outbound_demo_os')
    .update({ config: remapped.config })
    .eq('id', l.os_demo_id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await note('Business OS reforged', `Their command center was remapped from your prompt: "${instruction}"`);
  return NextResponse.json({ ok: true, target, lead: l });
}

/**
 * Map one plain-English instruction to a handful of config overrides for the OS demo.
 * The OS is a template, so a reforge here is a config remap, not a rebuild: only the
 * fields below can change, each is type-checked, and a bad or empty model reply leaves
 * the config exactly as it was.
 */
type OsRemap = { config: ReturnType<typeof buildOsConfig>; ok: true } | { ok: false; error: string };

async function remapOsConfig(lead: OutboundLead, instruction: string): Promise<OsRemap> {
  const base = buildOsConfig(lead);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'The OS reforge needs ANTHROPIC_API_KEY set on the server.' };

  const tradeKeys = Object.keys(TRADE_PRESETS) as OsTradeKey[];
  const system = `You edit a small JSON config for a business "command center" demo. You are given the current config and a change request. Reply with ONLY a JSON object containing the fields to CHANGE, nothing else, no prose, no code fence.
Allowed fields: business (string), ownerFirst (string), city (string), state (2-letter string), phone (string), evidenceQuote (string, a real customer-pain quote), auditScore (integer 0-100), trade (one of: ${tradeKeys.join(', ')}).
Only include a field if the change request clearly asks to change it. If nothing should change, reply {}.`;

  let text = '';
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages: [
        {
          role: 'user',
          content: `Current config:\n${JSON.stringify({
            business: base.business,
            ownerFirst: base.ownerFirst,
            city: base.city,
            state: base.state,
            phone: base.phone,
            evidenceQuote: base.evidenceQuote,
            auditScore: base.auditScore,
            trade: base.trade,
          })}\n\nChange request:\n${instruction}`,
        },
      ],
    });
    text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
  } catch (e) {
    return { ok: false, error: `The OS reforge model call failed: ${(e as Error)?.message ?? e}` };
  }

  let overrides: Record<string, unknown>;
  try {
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    overrides = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Could not read the change. Try phrasing it more simply.' };
  }

  const config = { ...base };
  const s = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  if (s(overrides.business, 90)) config.business = s(overrides.business, 90)!;
  if (s(overrides.ownerFirst, 40)) config.ownerFirst = s(overrides.ownerFirst, 40);
  if (s(overrides.city, 60)) config.city = s(overrides.city, 60);
  if (s(overrides.state, 2)) config.state = s(overrides.state, 2)!.toUpperCase();
  if (s(overrides.phone, 30)) config.phone = s(overrides.phone, 30)!;
  if (s(overrides.evidenceQuote, 300)) config.evidenceQuote = s(overrides.evidenceQuote, 300);
  if (typeof overrides.auditScore === 'number' && overrides.auditScore >= 0 && overrides.auditScore <= 100) {
    config.auditScore = Math.round(overrides.auditScore);
  }
  if (typeof overrides.trade === 'string' && (TRADE_PRESETS as Record<string, unknown>)[overrides.trade]) {
    config.trade = overrides.trade as OsTradeKey;
    config.tradeLabel = TRADE_PRESETS[overrides.trade as OsTradeKey].label;
  }

  return { ok: true, config };
}
