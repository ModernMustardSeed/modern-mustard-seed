/**
 * Save the post-purchase customization intake for a demo order and hand the
 * details to Sarah (email + the lead's cockpit thread). Keyed by hubId + the
 * Stripe session id, both unguessable; only pending/paid orders accept intake.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { queueRebuild, rebuildInputFor } from '@/lib/site-rebuild';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { sidekickVoice } from '@/lib/sidekick-voice';
import { recordOfficeEvent } from '@/lib/front-office/provision';
import { syncAssistant } from '@/lib/front-office/agent';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * How long after the intake their real site goes live, by default.
 *
 * The page promises "within 7 days", so this is the number we actually hit, and it
 * must stay under the promise. Three days beats it and still leaves the work looking
 * like a studio's rather than a vending machine's. It is a date on the project, not a
 * hardcoded law: Sarah can pull any project forward or push it back on the board.
 */
const REVEAL_DELAY_DAYS = Number(process.env.DEMO_REVEAL_DELAY_DAYS || 3);

const FIELD_LABELS: Record<string, string> = {
  hours: 'Business hours',
  services: 'What they sell or do',
  greeting: 'Phone greeting',
  domain: 'Website domain',
  brand: 'Look and feel',
  contact: 'Best contact',
  notes: 'Anything else',
  // Their real presence. These are what turn a demo into THEIR site, and what
  // feeds the SEO and GEO work: a Google Business Profile is the single highest
  // leverage local-search asset a small business owns.
  gbp: 'Google Business Profile',
  facebook: 'Facebook',
  instagram: 'Instagram',
  competitors: 'Who they compete with',
  audience: 'Who their customer is',
  // The Front Office answers. These are not notes for a human to read later:
  // they are applied to the live receptionist the moment intake is filed.
  agent_name: 'What to call the receptionist',
  never_do: 'What it must never do',
  transfer_to: 'Who to transfer calls to',
};

/**
 * THE FRONT OFFICE ANSWERS.
 *
 * Everything here changes how their receptionist behaves, so each one is
 * validated to a known value rather than trusted. A free-text `tone` reaching
 * the agent prompt is an instruction-injection hole in a field we hand to a
 * stranger on the internet.
 */
const VOICE_GENDERS = ['male', 'female'] as const;
const FORWARD_MODES = ['all_calls', 'after_hours', 'overflow', 'voicemail_only'] as const;
const TONES = ['warm', 'professional', 'brisk', 'folksy'] as const;
const LANGUAGES = ['en', 'es'] as const;

/**
 * "Danny, (406) 555-0161, anything about thermostats" -> a transfer row.
 *
 * One person per line, name first, the phone number found anywhere in the line,
 * and whatever is left over as the "when". Written to be forgiving, because the
 * alternative is three form fields per teammate and a field nobody fills in.
 * A line with no usable number is dropped rather than saved as a transfer that
 * would silently fail on a live call.
 */
export function parseTeam(raw: unknown): Array<{ name: string; phone: string; when?: string }> {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const phoneMatch = line.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      const phone = phoneMatch?.[0]?.trim() ?? '';
      const rest = line.replace(phone, '').split(',').map((p) => p.trim()).filter(Boolean);
      return { name: rest[0] ?? 'Team member', phone, when: rest.slice(1).join(', ') || undefined };
    })
    .filter((t) => t.phone.replace(/\D/g, '').length >= 10);
}

function oneOf<T extends readonly string[]>(allowed: T, v: unknown, fallback: T[number]): T[number] {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return (allowed as readonly string[]).includes(s) ? (s as T[number]) : fallback;
}

/** Uploaded files (logo, photos, product or menu lists) that came with the intake. */
type Asset = { url: string; name: string; kind: 'logo' | 'photo' | 'product' | 'file' };
const ASSET_KINDS = ['logo', 'photo', 'product', 'file'] as const;
const MAX_ASSETS = 24;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Only accept URLs we ourselves minted. The client posts back the URLs it got from
 * /api/intake/upload, and an attacker holding a link could otherwise smuggle any
 * URL into Sarah's inbox and the client portal as a trusted "asset".
 */
function isOurUpload(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co') && u.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: {
    hubId?: string;
    sessionId?: string;
    answers?: Record<string, string>;
    assets?: Asset[];
    /** How their receptionist should behave. Applied to fo_offices, not filed as a note for somebody to re-type. */
    frontOffice?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const hubId = (body.hubId || '').trim();
  const sessionId = (body.sessionId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(hubId) || !sessionId || sessionId.length > 100) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Only known fields, hard length caps: this lands in email + the cockpit.
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.answers || {})) {
    if (FIELD_LABELS[k] && typeof v === 'string' && v.trim()) answers[k] = v.trim().slice(0, 1500);
  }

  const assets: Asset[] = (Array.isArray(body.assets) ? body.assets : [])
    .filter(
      (a): a is Asset =>
        !!a &&
        typeof a.url === 'string' &&
        isOurUpload(a.url) &&
        (ASSET_KINDS as readonly string[]).includes(a.kind),
    )
    .slice(0, MAX_ASSETS)
    .map((a) => ({ url: a.url, name: String(a.name ?? 'file').slice(0, 120), kind: a.kind }));

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const { data: order } = await supabase
    .from('demo_orders')
    .select('id, outbound_lead_id, business_name, products, status, client_email, project_id')
    .eq('hub_demo_id', hubId)
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'unknown_order' }, { status: 404 });

  // MONEY GATE: a Stripe session id is not proof of payment (checkout mints it
  // BEFORE the card is charged). Only a paid order may file intake, or an
  // abandoned checkout could start our 7-day delivery clock for free.
  if (order.status !== 'paid' && order.status !== 'intake_done' && order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'not_paid', message: 'We have not seen the payment land yet. Give it a minute and refresh, or call (406) 312-1223.' },
      { status: 409 }
    );
  }

  // Only the FIRST intake notifies. A resubmit still updates the answers (the
  // buyer may be correcting a typo) but must not let anyone holding the link
  // re-fire Sarah's inbox and the cockpit thread on a loop.
  const firstIntake = order.status === 'paid';

  const { error: upErr } = await supabase
    .from('demo_orders')
    .update({
      intake: { ...answers, assets },
      intake_at: new Date().toISOString(),
      ...(firstIntake ? { status: 'intake_done' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  if (upErr) {
    console.error('demo-order intake save failed:', upErr.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  /* ── CONFIGURE THEIR RECEPTIONIST ──────────────────────────────────────────
     Intake is the moment the customer tells us how their front desk should
     sound, and until now those answers went into an email for a human to
     re-type. They are applied to the live office here instead.

     A resubmit re-applies, on purpose: an owner correcting "actually, use the
     female voice" expects that to take effect, not to be filed as a note. */
  const fo = (body.frontOffice ?? {}) as Record<string, unknown>;
  if (order.client_email && Object.keys(fo).length) {
    try {
      const { data: office } = await supabase
        .from('fo_offices')
        .select('id')
        .eq('client_email', order.client_email)
        .maybeSingle();

      if (office?.id) {
        const voiceGender = oneOf(VOICE_GENDERS, fo.voiceGender, 'female');
        const langs = Array.isArray(fo.languages)
          ? [...new Set(fo.languages.map((l) => oneOf(LANGUAGES, l, 'en')))]
          : ['en'];
        // English is not optional. A caller who reaches a Spanish-only agent
        // when the owner speaks English is a support call, not a feature.
        if (!langs.includes('en')) langs.unshift('en');

        const patch: Record<string, unknown> = {
          voice_gender: voiceGender,
          voice_id: sidekickVoice(voiceGender).voiceId,
          forward_mode: oneOf(FORWARD_MODES, fo.forwardMode, 'after_hours'),
          tone: oneOf(TONES, fo.tone, 'warm'),
          languages: langs,
          booking_enabled: fo.bookingEnabled !== false,
          transfers_enabled: fo.transfersEnabled !== false,
          status: 'configuring',
          updated_at: new Date().toISOString(),
        };
        if (typeof fo.agentName === 'string' && fo.agentName.trim()) patch.agent_name = fo.agentName.trim().slice(0, 60);
        if (typeof fo.greeting === 'string' && fo.greeting.trim()) patch.greeting = fo.greeting.trim().slice(0, 600);
        if (typeof fo.forwardFrom === 'string' && fo.forwardFrom.trim()) patch.forward_from = fo.forwardFrom.trim().slice(0, 40);
        // Where they work. The agent uses it to tell a caller straight away
        // whether somebody comes out to them, which is the second question on
        // half of these calls.
        if (typeof fo.serviceArea === 'string' && fo.serviceArea.trim()) patch.service_area = fo.serviceArea.trim().slice(0, 300);
        if (typeof fo.timezone === 'string' && fo.timezone.trim()) patch.timezone = fo.timezone.trim().slice(0, 60);
        if (Array.isArray(fo.services)) patch.services = fo.services.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 80)).slice(0, 30);
        // Appended, never replaced: the trade's own hard rules were seeded at
        // provisioning and an owner adding one must not delete "never diagnose
        // the equipment" by not mentioning it.
        if (typeof fo.neverDo === 'string' && fo.neverDo.trim()) {
          const { data: cur } = await supabase.from('fo_offices').select('never_do').eq('id', office.id).maybeSingle();
          const seeded = (cur?.never_do as string[] | null) ?? [];
          patch.never_do = [...new Set([...seeded, fo.neverDo.trim().slice(0, 300)])];
        }

        await supabase.from('fo_offices').update(patch).eq('id', office.id);
        await recordOfficeEvent(supabase, office.id, {
          type: 'configured',
          label: 'Configured at intake by the owner',
          detail: { voiceGender, forwardMode: patch.forward_mode, languages: langs },
          actor: order.client_email,
        });

        // Who a call gets handed to. Replaced wholesale, because a team list is
        // the one thing an owner edits by removing somebody.
        //
        // Accepts either the structured shape (from admin) or the one line per
        // person a human actually types into a textarea. Asking a contractor to
        // fill three boxes per teammate is how the field comes back empty and
        // every call becomes a message instead of a transfer.
        const team = Array.isArray(fo.transfers) ? fo.transfers : parseTeam(fo.transfers);
        if (team.length) {
          await supabase.from('fo_transfers').delete().eq('office_id', office.id);
          await supabase.from('fo_transfers').insert(
            team
              .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
              .slice(0, 12)
              .map((t, i) => ({
                office_id: office.id,
                name: String(t.name ?? '').slice(0, 80) || 'Team member',
                role: t.role ? String(t.role).slice(0, 80) : null,
                phone: String(t.phone ?? '').slice(0, 40),
                when_to_transfer: t.when ? String(t.when).slice(0, 300) : null,
                priority: i + 1,
              }))
              .filter((t) => t.phone.replace(/\D/g, '').length >= 10),
          );
        }
        // The agent hears the intake immediately (loop audit, break #7). The
        // owner just chose their voice, greeting and transfer list; leaving
        // the assistant unsynced meant a live agent kept saying the old
        // greeting and a new office had no assistant until a human pressed
        // sync. Number purchase and go-live stay behind the human QA gate;
        // building the brain costs nothing and buys the test call its time.
        try {
          const synced = await syncAssistant(supabase, office.id);
          if (!synced.ok) console.error('intake auto-sync failed (board sync button still works):', synced.error);
        } catch (err) {
          console.error('intake auto-sync threw', err);
        }
      }
    } catch (err) {
      // Never fail intake over configuration. The answers are saved on the
      // order either way and the admin board shows offices still unconfigured.
      console.error('front office configuration from intake failed', err);
    }
  }

  // Their logo and photos belong in the portal, not only in an inbox. This is the
  // whole reason uploads exist: the build needs the real brand, and the client
  // needs to see that we actually received it.
  if (order.client_email && assets.length) {
    try {
      const { data: already } = await supabase
        .from('client_files')
        .select('url')
        .eq('client_email', order.client_email);
      const seen = new Set((already ?? []).map((f) => f.url as string));
      const fresh = assets.filter((a) => !seen.has(a.url));
      if (fresh.length) {
        await supabase.from('client_files').insert(
          fresh.map((a) => ({
            client_email: order.client_email,
            label: a.kind === 'logo' ? `Your logo (${a.name})` : a.kind === 'product' ? `Products / menu (${a.name})` : `Photo: ${a.name}`,
            url: a.url,
            kind: 'design',
          })),
        );
      }
    } catch (err) {
      console.error('demo-order intake: client_files insert failed', err);
    }
  }

  // Tick the one milestone that was theirs to do, so the portal reflects reality
  // the moment they hit send.
  if (firstIntake && order.project_id) {
    try {
      const { data: proj } = await supabase
        .from('projects')
        .select('milestones, progress')
        .eq('id', order.project_id)
        .maybeSingle();
      const ms = Array.isArray(proj?.milestones) ? (proj!.milestones as Array<{ title: string; done?: boolean }>) : [];
      if (ms.length) {
        ms[0] = { ...ms[0], done: true };
        await supabase
          .from('projects')
          .update({ milestones: ms, status: 'building', progress: Math.max(20, Number(proj?.progress ?? 0)) })
          .eq('id', order.project_id);
      }
    } catch (err) {
      console.error('demo-order intake: milestone update failed', err);
    }
  }

  // THE REBUILD. Everything above is the truth about their business, and until now
  // nothing consumed it: the demo was still the demo, guessed from a scraped lead,
  // and turning it into their real site was a manual job on a 900KB HTML file. So
  // the build runs again, immediately, against their real logo, photos and menu.
  //
  // It does NOT reach the client. It lands on the delivery board, a human approves
  // it, and it reveals on the scheduled date. The machine does the work; a person
  // signs it.
  if (firstIntake && order.project_id) {
    try {
      const input = await rebuildInputFor(supabase, order.project_id);
      if ('error' in input) {
        console.error('demo-order intake: cannot queue rebuild:', input.error);
      } else {
        const queued = await queueRebuild(supabase, input);
        if (!queued.ok) console.error('demo-order intake: rebuild queue failed:', queued.error);
      }
      // The target date is set now so the board (and Sarah) can see the clock the
      // buyer is counting on. Publishing still requires approved_at, so a date on
      // its own can never ship an unreviewed site.
      const revealAt = new Date(Date.now() + REVEAL_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('projects')
        .update({ reveal_at: revealAt })
        .eq('id', order.project_id)
        .is('reveal_at', null);
    } catch (err) {
      console.error('demo-order intake: rebuild queue threw', err);
    }
  }

  // A correction is saved above, but only the first submission is announced.
  if (!firstIntake) return NextResponse.json({ ok: true, updated: true });

  const assetLines = assets.length
    ? `<p><strong>Files they sent (${assets.length}):</strong></p>` +
      assets
        .map((a) => `<p style="margin:2px 0">${esc(a.kind)}: <a href="${esc(a.url)}">${esc(a.name)}</a></p>`)
        .join('')
    : '';
  const lines =
    Object.entries(answers)
      .map(([k, v]) => `<p><strong>${FIELD_LABELS[k]}:</strong> ${esc(v)}</p>`)
      .join('') + assetLines;
  const safeBusiness = esc(order.business_name || 'A buyer');

  if (order.outbound_lead_id) {
    try {
      await supabase.from('messages').insert({
        outbound_lead_id: order.outbound_lead_id,
        direction: 'inbound',
        channel: 'note',
        subject: 'Demo order intake (customization details)',
        body:
          Object.entries(answers).map(([k, v]) => `${FIELD_LABELS[k]}: ${v}`).join('\n') +
          (assets.length ? `\n\nFiles (${assets.length}):\n${assets.map((a) => `${a.kind}: ${a.url}`).join('\n')}` : ''),
        snippet: `Customization intake received${assets.length ? ` (+${assets.length} files)` : ''}`,
      });
    } catch (err) {
      console.error('demo-order intake thread note failed', err);
    }
  }

  if (process.env.RESEND_API_KEY && lines) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `INTAKE IN: ${(order.business_name || 'demo order').replace(/[\r\n]/g, ' ')} (${Array.isArray(order.products) ? (order.products as string[]).join(', ') : ''})`,
        html: clientEmail({
          preheader: 'Customization details for a paid demo order.',
          eyebrow: 'DEMO ORDER INTAKE',
          greeting: `${safeBusiness} filled in their details.`,
          body: `${lines}<p>Their real site is already being rebuilt from these details. Review and approve it at <a href="https://modernmustardseed.com/admin/delivery">/admin/delivery</a>. Nothing goes live until you say so.</p>`,
          signature: 'The Demo Hub',
        }),
      });
    } catch (err) {
      console.error('demo-order intake email failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
