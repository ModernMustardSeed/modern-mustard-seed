import { NextResponse } from 'next/server';
import { requireAcqAdmin, suppressedAddresses } from '@/lib/acq/server';
import { getCampaign, getAcqSettings } from '@/lib/acq/settings';
import { enqueue, cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import { evaluate } from '@/lib/acq/eligibility';
import type { AcqProspect } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LIST_COLS =
  'id,business_name,contact_name,contact_title,phone,email,website,trade,city,state,rating,review_count,' +
  'email_status,email_confidence,email_source_url,lead_score,priority,call_volume_score,missed_call_score,' +
  'acq_stage,acq_eligible,acq_ineligible_reason,email_stage,last_campaign_email_at,consent_status,consent_at,' +
  'call_stage,call_attempts,last_call_at,demo_status,demo_emailed_at,checkout_sent_at,meeting_status,' +
  'payment_status,client_status,unsubscribed_at,bounced,is_test,duplicate_of,needs_human,source,' +
  'open_24_7,emergency_service,created_at,updated_at,imported_at,last_researched_at,assigned_to,reply_at';

/** The CRM list: search, filter, sort, page. */
export async function GET(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const trade = url.searchParams.get('trade') ?? '';
  const stage = url.searchParams.get('stage') ?? '';
  const emailStatus = url.searchParams.get('email_status') ?? '';
  const eligible = url.searchParams.get('eligible') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const source = url.searchParams.get('source') ?? '';
  const sort = url.searchParams.get('sort') ?? 'lead_score';
  const dir = url.searchParams.get('dir') === 'asc';
  const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
  const size = Math.min(200, Math.max(10, Number(url.searchParams.get('size') ?? 50)));
  const campaignOnly = url.searchParams.get('all') !== '1';
  const csv = url.searchParams.get('format') === 'csv';

  let query = db.from('outbound_leads').select(LIST_COLS, { count: 'exact' });
  if (campaignOnly) query = query.not('acq_campaign_id', 'is', null);
  if (trade) query = query.eq('trade', trade);
  if (stage) query = query.eq('acq_stage', stage);
  if (emailStatus) query = query.eq('email_status', emailStatus);
  if (state) query = query.eq('state', state.toUpperCase());
  if (source) query = query.eq('source', source);
  if (eligible === '1') query = query.eq('acq_eligible', true);
  if (eligible === '0') query = query.eq('acq_eligible', false);
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ');
    query = query.or(`business_name.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%,website.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  const sortable = new Set(['lead_score', 'created_at', 'updated_at', 'business_name', 'review_count', 'email_confidence', 'last_campaign_email_at']);
  query = query.order(sortable.has(sort) ? sort : 'lead_score', { ascending: dir, nullsFirst: false });

  if (csv) {
    const { data } = await query.range(0, 4999);
    return new NextResponse(toCsv((data ?? []) as unknown as AcqProspect[]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="acquisition-prospects-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const { data, count, error } = await query.range(page * size, page * size + size - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, size });
}

/** Bulk actions. Every one of them is idempotent and every one records why. */
export async function POST(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const body = (await req.json().catch(() => ({}))) as { action?: string; ids?: string[]; reason?: string; value?: unknown };
  const action = String(body.action ?? '');
  const ids = (body.ids ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return NextResponse.json({ error: 'No prospects selected.' }, { status: 400 });
  if (ids.length > 2000) return NextResponse.json({ error: 'Select 2000 or fewer at a time.' }, { status: 400 });

  const campaign = await getCampaign();
  const settings = await getAcqSettings();
  const stamp = new Date().toISOString();
  let affected = 0;

  switch (action) {
    case 'assign-campaign': {
      const suppressed = await suppressedAddresses(db);
      const { data } = await db.from('outbound_leads').select('*').in('id', ids);
      for (const lead of ((data ?? []) as AcqProspect[])) {
        const verdict = evaluate(lead, { suppressed, minLeadScore: settings.min_lead_score });
        await db
          .from('outbound_leads')
          .update({
            acq_campaign_id: campaign?.id ?? null,
            acq_eligible: verdict.eligible,
            acq_ineligible_reason: verdict.eligible ? null : verdict.reason,
            imported_at: lead.imported_at ?? stamp,
          })
          .eq('id', lead.id);
        affected++;
      }
      break;
    }
    case 'queue-email': {
      if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });
      const { data } = await db.from('outbound_leads').select('id,email_stage,acq_eligible').in('id', ids);
      for (const l of ((data ?? []) as { id: string; email_stage: number; acq_eligible: boolean }[])) {
        if (!l.acq_eligible) continue;
        const step = Math.min(3, (l.email_stage ?? 0) + 1);
        const res = await enqueue(db, { kind: 'email', leadId: l.id, campaignId: campaign.id, step });
        if (res.ok && res.created) affected++;
      }
      break;
    }
    case 'pause': {
      await db
        .from('outbound_leads')
        .update({ acq_eligible: false, acq_ineligible_reason: body.reason ? String(body.reason) : 'Paused by hand from the CRM.' })
        .in('id', ids);
      for (const id of ids) await cancelPendingFor(db, id, ['email', 'followup'], 'Paused by hand.');
      affected = ids.length;
      break;
    }
    case 'resume': {
      const suppressed = await suppressedAddresses(db);
      const { data } = await db.from('outbound_leads').select('*').in('id', ids);
      for (const lead of ((data ?? []) as AcqProspect[])) {
        const verdict = evaluate(lead, { suppressed, minLeadScore: settings.min_lead_score });
        await db
          .from('outbound_leads')
          .update({ acq_eligible: verdict.eligible, acq_ineligible_reason: verdict.eligible ? null : verdict.reason })
          .eq('id', lead.id);
        affected++;
      }
      break;
    }
    case 'suppress': {
      // Permanent, and written to the shared opt-out list so EVERY send path in
      // the app honours it, not just this campaign.
      const { data } = await db.from('outbound_leads').select('id,email').in('id', ids);
      for (const l of ((data ?? []) as { id: string; email: string | null }[])) {
        if (l.email) {
          await db.from('suppression').upsert({ contact: l.email.toLowerCase(), reason: String(body.reason ?? 'suppressed by admin') }, { onConflict: 'contact' });
        }
        await cancelPendingFor(db, l.id, undefined, 'Suppressed.');
        await recordEvent(db, { leadId: l.id, type: 'suppressed', label: `Suppressed by hand: ${body.reason ?? 'no reason given'}` });
        affected++;
      }
      await db
        .from('outbound_leads')
        .update({
          acq_eligible: false,
          acq_ineligible_reason: 'Suppressed by hand.',
          unsubscribed_at: stamp,
          suppression_reason: String(body.reason ?? 'suppressed by admin'),
          acq_stage: 'lost',
        })
        .in('id', ids);
      break;
    }
    case 'mark-test': {
      await db.from('outbound_leads').update({ is_test: body.value !== false, acq_eligible: false, acq_ineligible_reason: 'Marked as a test prospect.' }).in('id', ids);
      affected = ids.length;
      break;
    }
    case 'set-trade': {
      const trade = String(body.value ?? '');
      if (!['hvac', 'plumbing', 'roofing', 'other'].includes(trade)) {
        return NextResponse.json({ error: 'Unknown trade.' }, { status: 400 });
      }
      await db.from('outbound_leads').update({ trade }).in('id', ids);
      affected = ids.length;
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affected });
}

function toCsv(rows: AcqProspect[]): string {
  const cols = [
    'business_name', 'trade', 'city', 'state', 'website', 'email', 'email_status', 'email_confidence',
    'email_source_url', 'phone', 'contact_name', 'contact_title', 'rating', 'review_count', 'lead_score',
    'priority', 'acq_stage', 'acq_eligible', 'acq_ineligible_reason', 'email_stage', 'consent_status',
    'call_stage', 'demo_status', 'checkout_sent_at', 'client_status', 'source', 'created_at',
  ] as const;
  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(','))].join('\n');
}
