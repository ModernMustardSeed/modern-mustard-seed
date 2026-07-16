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
};

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
  let body: { hubId?: string; sessionId?: string; answers?: Record<string, string>; assets?: Asset[] };
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
  // the forge runs again, immediately, against their real logo, photos and menu.
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
