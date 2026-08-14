import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { recordOfficeEvent } from '@/lib/front-office/provision';
import { sidekickVoice } from '@/lib/sidekick-voice';
import { syncAssistant } from '@/lib/front-office/agent';

export const runtime = 'nodejs';

/**
 * THE CUSTOMER'S OWN FRONT OFFICE.
 *
 * ── EVERY READ AND WRITE IS SCOPED BY THE SESSION EMAIL, NEVER BY AN ID ──────
 * There is no office id in the request and there deliberately never will be.
 * The office is looked up FROM the signed-in email, so a customer cannot read
 * another customer's calls by changing a number in a URL. That is the same rule
 * Client Factory states in lib/factory/tenant.ts and it is the rule here for
 * the same reason: an id supplied by a browser is a request, not authority.
 */

const VOICE_GENDERS = ['male', 'female'];
const FORWARD_MODES = ['all_calls', 'after_hours', 'overflow', 'voicemail_only'];
const TONES = ['warm', 'professional', 'brisk', 'folksy'];
const LANGUAGES = ['en', 'es'];

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: office } = await db.from('fo_offices').select('*').eq('client_email', session.email).maybeSingle();
  if (!office) return NextResponse.json({ office: null });

  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [calls, contacts, appts, transfers, monthCalls] = await Promise.all([
    db.from('fo_calls').select('*').eq('office_id', office.id).order('started_at', { ascending: false }).limit(50),
    db.from('fo_contacts').select('*').eq('office_id', office.id).order('last_seen_at', { ascending: false }).limit(100),
    db
      .from('fo_appointments')
      .select('*')
      .eq('office_id', office.id)
      .gte('starts_at', new Date(Date.now() - 24 * 3600_000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(50),
    db.from('fo_transfers').select('*').eq('office_id', office.id).order('priority', { ascending: true }),
    db.from('fo_calls').select('booked, transferred, duration_sec, urgency, started_at').eq('office_id', office.id).gte('started_at', since),
  ]);

  const month = monthCalls.data ?? [];
  const afterHours = month.filter((c) => {
    // The number that justifies the invoice: calls answered when a front desk
    // was not there to answer them.
    const h = new Date(c.started_at as string).getHours();
    return h < 8 || h >= 17;
  }).length;

  return NextResponse.json({
    office: {
      ...office,
      // Never hand the browser our provider ids. They are useless to the
      // customer and they are the sort of thing that ends up in a screenshot.
      vapi_assistant_id: undefined,
      vapi_phone_number_id: undefined,
    },
    calls: calls.data ?? [],
    contacts: contacts.data ?? [],
    appointments: appts.data ?? [],
    transfers: transfers.data ?? [],
    stats: {
      callsThisMonth: month.length,
      booked: month.filter((c) => c.booked).length,
      transferred: month.filter((c) => c.transferred).length,
      emergencies: month.filter((c) => c.urgency === 'emergency').length,
      afterHours,
      minutes: Math.round(month.reduce((s, c) => s + (Number(c.duration_sec) || 0), 0) / 60),
    },
  });
}

/** The owner changing how their own receptionist behaves. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: office } = await db.from('fo_offices').select('id, never_do').eq('client_email', session.email).maybeSingle();
  if (!office) return NextResponse.json({ error: 'No Front Office on this account.' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Enumerated fields are matched against the allowed list, never trusted.
  // These values reach the agent's own instructions, so a free-text `tone`
  // arriving from a browser is an instruction-injection hole.
  if (typeof body.voiceGender === 'string' && VOICE_GENDERS.includes(body.voiceGender)) {
    patch.voice_gender = body.voiceGender;
    patch.voice_id = sidekickVoice(body.voiceGender).voiceId;
  }
  if (typeof body.forwardMode === 'string' && FORWARD_MODES.includes(body.forwardMode)) patch.forward_mode = body.forwardMode;
  if (typeof body.tone === 'string' && TONES.includes(body.tone)) patch.tone = body.tone;
  if (Array.isArray(body.languages)) {
    const langs = [...new Set(body.languages.filter((l): l is string => typeof l === 'string' && LANGUAGES.includes(l)))];
    if (!langs.includes('en')) langs.unshift('en');
    patch.languages = langs;
  }
  if (typeof body.greeting === 'string') patch.greeting = body.greeting.trim().slice(0, 600);
  if (typeof body.agentName === 'string' && body.agentName.trim()) patch.agent_name = body.agentName.trim().slice(0, 60);
  if (typeof body.afterHoursMessage === 'string') patch.after_hours_message = body.afterHoursMessage.trim().slice(0, 600);
  if (typeof body.bookingEnabled === 'boolean') patch.booking_enabled = body.bookingEnabled;
  if (typeof body.transfersEnabled === 'boolean') patch.transfers_enabled = body.transfersEnabled;
  if (body.hours && typeof body.hours === 'object') patch.hours = body.hours;
  if (Array.isArray(body.services)) {
    patch.services = body.services.filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 80)).slice(0, 30);
  }
  // A customer may add a rule and may remove one THEY added. The rules seeded
  // from their trade are theirs to remove too: it is their business and their
  // liability, and a product that silently ignores an owner's instruction is
  // worse than one that lets them make a call we would not have made.
  if (Array.isArray(body.neverDo)) {
    patch.never_do = body.neverDo.filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 300)).slice(0, 30);
  }

  if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const { error } = await db.from('fo_offices').update(patch).eq('id', office.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordOfficeEvent(db, office.id, {
    type: 'updated',
    label: `Changed by the owner: ${Object.keys(patch).filter((k) => k !== 'updated_at').join(', ')}`,
    detail: patch,
    actor: session.email,
  });

  // PUSH IT TO THE LIVE AGENT.
  //
  // Without this the portal is a settings screen that changes nothing until
  // somebody in admin remembers to press sync, which means an owner switching
  // to the female voice on Friday still hears the male one on Monday and
  // reasonably concludes the product is broken.
  //
  // Failure is reported honestly rather than swallowed: the setting IS saved,
  // and saying so while admitting the agent has not picked it up yet is the
  // difference between a delay and a lie.
  const synced = await syncAssistant(db, office.id);
  if (!synced.ok) {
    console.error('front office portal sync failed', synced.error);
    return NextResponse.json({
      ok: true,
      synced: false,
      message: 'Saved. Your receptionist picks this up shortly; we are on it if it takes more than a few minutes.',
    });
  }

  return NextResponse.json({ ok: true, synced: true });
}
