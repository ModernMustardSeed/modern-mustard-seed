import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAcqAdmin } from '@/lib/acq/server';
import { getCampaign } from '@/lib/acq/settings';
import { readBuildWorkerVitals } from '@/lib/build-worker';
import { blankMovement, readMovement } from '@/lib/acq/engagement';
import type { Movement } from '@/lib/acq/engagement';
import {
  DEFAULT_DESIGN_TIER,
  buildProspectSuite,
  queueProspectSite,
  suiteState,
} from '@/lib/acq/suite';
import type { DesignTier, SuiteState } from '@/lib/acq/suite';
import { sendSuiteEmail } from '@/lib/acq/send';
import { enqueue } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import type { AcqProspect } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE ACQUISITION BUILD BOARD.
 *
 * The outbound cockpit has had a build board since July. Acquisition has had
 * forty thousand prospects and no way to build any of them a demo unless they
 * first agreed to a phone call from an AI. That is backwards: the people who
 * clicked and then did not hand over their phone number are the warmest
 * audience the campaign produces, and until now they were the only ones with
 * nothing to open.
 *
 * This board is where they get built. It answers four questions in the order
 * they cost money:
 *   1. Who showed interest and never gave a number? (Build for them.)
 *   2. What is on the anvil right now?
 *   3. What is BUILT and has never been sent to anybody?
 *   4. What broke?
 */

/* ─────────────────────────────── segments ──────────────────────────────── */

/**
 * The buckets, in work order. `door` and `warm` are the two Sarah asked for and
 * they are kept apart on purpose: someone who reached the permission page and
 * stopped is a sharper signal than someone who only clicked, and it is worth
 * seeing which of the two you are working.
 */
export type BuildSegment =
  | 'forging'
  | 'failed'
  | 'door'
  | 'warm'
  | 'opened'
  | 'consented'
  | 'called'
  | 'built'
  | 'sent'
  | 'cold'
  | 'closed';

export const SEGMENT_LABELS: Record<BuildSegment, string> = {
  forging: 'On the anvil',
  failed: 'Build failed',
  door: 'Reached the door',
  warm: 'Clicked, no number',
  opened: 'Opened, no number',
  consented: 'Consented, not built',
  called: 'Talked, not built',
  built: 'Built, never sent',
  sent: 'Suite sent',
  cold: 'Quiet',
  closed: 'Closed',
};

export const SEGMENT_NOTES: Record<BuildSegment, string> = {
  forging: 'Their website is being built on your machine right now.',
  failed: 'The last website build failed. Retry puts it back on the anvil.',
  door:
    'They opened the permission page and did not type their number. They got as close as a person gets without saying yes. Build it and send it.',
  warm:
    'A person clicked the button and never gave a number. Rarer than it looks: four in five recorded clicks turn out to be mail security software, and those are filtered out before this count.',
  opened:
    'They opened at least one email and went no further. The softest real signal there is, and still an enormous audience nobody has ever handed anything to.',
  consented: 'They gave permission to be called. Their suite should already exist.',
  called: 'Mr. Mustard has talked to them. Everything he heard goes into the build.',
  built: 'Finished suites nobody has sent. This is money already spent and sitting there.',
  sent: 'They have their suite. The follow-up sequence is chasing.',
  cold: 'In the campaign, nothing built, no movement yet.',
  closed: 'They bought, opted out, or were lost. Work stops.',
};

/* ────────────────────────────── the row ────────────────────────────────── */

export type AcqBuildRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  city: string | null;
  state: string | null;
  trade: string | null;
  rating: number | null;
  review_count: number | null;
  lead_score: number | null;
  acq_stage: string;
  consent_status: string | null;
  call_stage: string | null;
  last_call_at: string | null;
  demo_emailed_at: string | null;
  checkout_sent_at: string | null;
  client_status: string | null;
  unsubscribed_at: string | null;
  is_test: boolean;
  suite: SuiteState;
  movement: Movement;
  segment: BuildSegment;
  /** The newest website build row, so the anvil can show its clock and its error. */
  siteRun: { id: string; status: string; kind: string | null; error: string | null; created_at: string; claimed_at: string | null; built_at: string | null } | null;
  /** True when a face-to-camera video is attached to this prospect. */
  personalVideo: boolean;
};

export type AcqBuildCounts = Record<BuildSegment | 'all', number>;

const LEAD_COLS =
  'id,business_name,contact_name,email,phone,website,city,state,trade,rating,review_count,lead_score,' +
  'acq_stage,acq_campaign_id,consent_status,consent_at,call_stage,call_attempts,last_call_at,' +
  'demo_status,demo_url,demo_emailed_at,site_demo_id,site_demo_url,site_demo_status,os_demo_id,os_demo_url,' +
  'hub_demo_id,hub_demo_url,suite_film_status,checkout_sent_at,client_status,unsubscribed_at,is_test,' +
  'reservoir_state,created_at,updated_at';

/** Anything built for the prospect: voice agent, website, command center, or hub. */
const BUILT_FILTER = 'demo_url.not.is.null,site_demo_id.not.is.null,os_demo_id.not.is.null,hub_demo_id.not.is.null';

/**
 * PostgREST puts `.in()` in the URL, so a thousand ids would blow the request
 * line and one oversized chunk would truncate silently. Forty per chunk stays
 * well inside both limits even for a prospect with a long build history.
 */
const CHUNK = 40;
function chunk<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Page a select past the silent 1000-row ceiling. */
async function pageAll<T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: { message: string } | null }> }): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
    if (out.length >= 8000) break;
  }
  return out;
}

function segmentFor(lead: AcqProspect, suite: SuiteState, move: Movement): BuildSegment {
  if (suite.stage === 'closed') return 'closed';
  if (suite.stage === 'forging') return 'forging';
  if (suite.stage === 'failed') return 'failed';
  if (suite.stage === 'sent') return 'sent';
  if (suite.stage === 'built') return 'built';
  // Nothing built. Rank by how close they already got on their own.
  if (lead.call_stage === 'completed') return 'called';
  if (lead.consent_status === 'granted') return 'consented';
  if (move.visitedDoor) return 'door';
  // A click and an open are different animals and the board keeps them apart:
  // a click is a decision, an open is a glance, and burning the day on the
  // glances first is how the decisions go cold.
  if (move.clicked || move.replied) return 'warm';
  if (move.opened) return 'opened';
  return 'cold';
}

/** Which prospects already have a face-to-camera video attached. One storage list. */
async function personalVideoIds(db: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from('booth').list('founder', { limit: 1000, offset });
      if (error || !data?.length) break;
      for (const f of data) {
        const id = f.name.replace(/\.webm$/i, '');
        if (/^[0-9a-f-]{36}$/i.test(id)) out.add(id);
      }
      if (data.length < 1000) break;
    }
  } catch {
    /* the video badge is a nicety; never take the board down for it */
  }
  return out;
}

/**
 * The working set: everyone who has a suite, everyone who moved, and everyone
 * who got as far as consenting or talking. Deliberately NOT the whole campaign,
 * which is tens of thousands of rows nobody is going to build anything for
 * today.
 */
const WORKING_SET_CAP = 6000;

export async function GET(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const includeTest = new URL(req.url).searchParams.get('test') === '1';

  let built: AcqProspect[] = [];
  let movement: Map<string, Movement>;
  try {
    [built, movement] = await Promise.all([
      // Everything with work already invested in it, campaign or not: a suite
      // that exists must never fall off this board just because the prospect
      // was never enrolled.
      pageAll<AcqProspect>(() =>
        db
          .from('outbound_leads')
          .select(LEAD_COLS)
          .or(BUILT_FILTER)
          .order('updated_at', { ascending: false }) as never,
      ),
      readMovement(db),
    ]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the build board.' }, { status: 500 });
  }

  const byId = new Map<string, AcqProspect>(built.map((l) => [l.id, l]));
  const need = new Set<string>([...movement.keys()].filter((id) => !byId.has(id)));

  // Opens were stamped on the lead row long before the timeline started
  // carrying them (2026-08-18). Without this the headline number quietly
  // undercounts every prospect who opened during the campaign's first month,
  // which is exactly the audience this board exists to surface.
  const preTimelineOpeners = new Set<string>();
  {
    const { data } = await db
      .from('outbound_leads')
      .select('id')
      .not('acq_campaign_id', 'is', null)
      .gt('email_open_count', 0)
      .order('last_open_at', { ascending: false, nullsFirst: false })
      .limit(2000);
    for (const r of (data ?? []) as { id: string }[]) {
      preTimelineOpeners.add(r.id);
      if (!byId.has(r.id)) need.add(r.id);
    }
  }

  // Consented and talked-to prospects belong here whether or not a timeline row
  // survives the window: the lead row is authoritative and never expires.
  {
    const { data } = await db
      .from('outbound_leads')
      .select('id')
      .not('acq_campaign_id', 'is', null)
      .or('consent_status.eq.granted,call_stage.eq.completed')
      .order('updated_at', { ascending: false })
      .limit(2000);
    for (const r of (data ?? []) as { id: string }[]) if (!byId.has(r.id)) need.add(r.id);
  }

  const wanted = [...need].slice(0, WORKING_SET_CAP);
  for (const c of chunk(wanted)) {
    const { data } = await db.from('outbound_leads').select(LEAD_COLS).in('id', c);
    for (const row of (data ?? []) as unknown as AcqProspect[]) byId.set(row.id, row);
  }

  const leads = [...byId.values()].filter((l) => includeTest || !l.is_test);

  // Website build rows, fetched by their OWN ids rather than by lead. Most
  // prospects have never had a site queued, so this turns what used to be a
  // query per forty leads into a query per forty BUILDS. The database this runs
  // against has fallen over under load before; economy here is not premature.
  const siteIds = leads.map((l) => l.site_demo_id).filter((v): v is string => !!v);
  const siteById = new Map<string, AcqBuildRow['siteRun']>();
  for (const c of chunk(siteIds)) {
    const { data } = await db
      .from('outbound_demo_sites')
      .select('id, status, kind, error, created_at, claimed_at, built_at')
      .in('id', c);
    for (const r of (data ?? []) as NonNullable<AcqBuildRow['siteRun']>[]) siteById.set(r.id, r);
  }

  const videos = await personalVideoIds(db);

  const rows: AcqBuildRow[] = leads.map((l) => {
    const suite = suiteState(l);
    const move = movement.get(l.id) ?? blankMovement();
    // A pre-timeline opener has no event row, so the flag is set from the
    // counter instead. Nothing else about the movement is invented.
    if (!move.opened && preTimelineOpeners.has(l.id)) {
      move.opened = true;
      move.hits = Math.max(move.hits, 1);
    }
    return {
      id: l.id,
      business_name: l.business_name,
      contact_name: l.contact_name,
      email: l.email,
      phone: l.phone,
      website: l.website,
      city: l.city,
      state: l.state,
      trade: l.trade,
      rating: l.rating,
      review_count: l.review_count,
      lead_score: l.lead_score,
      acq_stage: l.acq_stage,
      consent_status: l.consent_status,
      call_stage: l.call_stage,
      last_call_at: l.last_call_at,
      demo_emailed_at: l.demo_emailed_at,
      checkout_sent_at: l.checkout_sent_at,
      client_status: l.client_status,
      unsubscribed_at: l.unsubscribed_at,
      is_test: l.is_test,
      suite,
      movement: move,
      segment: segmentFor(l, suite, move),
      siteRun: l.site_demo_id ? siteById.get(l.site_demo_id) ?? null : null,
      personalVideo: videos.has(l.id),
    };
  });

  const counts = rows.reduce<AcqBuildCounts>(
    (acc, r) => {
      acc[r.segment] += 1;
      acc.all += 1;
      return acc;
    },
    { forging: 0, failed: 0, door: 0, warm: 0, opened: 0, consented: 0, called: 0, built: 0, sent: 0, cold: 0, closed: 0, all: 0 },
  );

  // Work order, not chronology: what is building, what broke, who is warmest,
  // then what is built and unspent. Inside a bucket, the freshest movement leads.
  const rank: Record<BuildSegment, number> = {
    forging: 0, failed: 1, door: 2, warm: 3, consented: 4, called: 5, built: 6, opened: 7, sent: 8, cold: 9, closed: 10,
  };
  rows.sort((a, b) => {
    const r = rank[a.segment] - rank[b.segment];
    if (r !== 0) return r;
    const at = a.movement.lastAt ?? a.siteRun?.created_at ?? '';
    const bt = b.movement.lastAt ?? b.siteRun?.created_at ?? '';
    return bt.localeCompare(at);
  });

  return NextResponse.json({
    rows,
    counts,
    worker: await readBuildWorkerVitals(db),
    // A cap that nobody is told about reads as "this is everyone", which is the
    // one thing a board about unspent work must never imply.
    truncated: need.size > wanted.length ? need.size - wanted.length : 0,
  });
}

/* ─────────────────────────────── actions ───────────────────────────────── */

/**
 * How many suites one request will build on the spot. Each one mints a Vapi
 * assistant and fetches their site for brand capture, so the ceiling is the
 * serverless clock, not a policy. Anything larger goes on the durable queue,
 * which is idempotent, paced, and already draining every twenty minutes.
 */
const INLINE_BUILD_LIMIT = 8;

const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

export async function POST(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    ids?: unknown;
    site?: unknown;
    designTier?: unknown;
    talkingWebsite?: unknown;
    force?: unknown;
  };
  const action = String(body.action ?? '');
  const ids = (Array.isArray(body.ids) ? body.ids : []).filter(isUuid) as string[];
  if (!ids.length) return NextResponse.json({ error: 'Nothing selected.' }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ error: 'Select 500 or fewer at a time.' }, { status: 400 });

  const withSite = body.site !== false;
  const designTier: DesignTier = body.designTier === 3 ? 3 : DEFAULT_DESIGN_TIER;
  const talkingWebsite = body.talkingWebsite === true;
  const force = body.force === true;
  const campaign = await getCampaign();

  const load = async (list: string[]): Promise<AcqProspect[]> => {
    const out: AcqProspect[] = [];
    for (const c of chunk(list)) {
      const { data } = await db.from('outbound_leads').select('*').in('id', c);
      out.push(...((data ?? []) as AcqProspect[]));
    }
    return out;
  };

  switch (action) {
    /* Build the whole suite. Small batches run now; big ones go on the queue. */
    case 'forge': {
      if (ids.length > INLINE_BUILD_LIMIT) {
        let queued = 0;
        for (const id of ids) {
          const res = await enqueue(db, {
            kind: 'forge',
            leadId: id,
            campaignId: campaign?.id ?? null,
            payload: { site: withSite, designTier, talkingWebsite, by: 'forge-board' },
          });
          if (res.ok && res.created) queued++;
        }
        return NextResponse.json({
          ok: true,
          queued,
          inline: 0,
          note:
            queued === 0
              ? 'Every one of those was already queued. Nothing was double-booked.'
              : `${queued} suite${queued === 1 ? '' : 's'} queued. The engine builds them on its next pass, and the websites land as your build works through them.`,
        });
      }

      const leads = await load(ids);
      const results: { id: string; business: string; ok: boolean; note: string }[] = [];
      for (const lead of leads) {
        const res = await buildProspectSuite(db, lead, {
          site: withSite,
          designTier,
          talkingWebsite,
          forceSite: force,
          by: 'forge-board',
        });
        results.push({
          id: lead.id,
          business: lead.business_name,
          ok: res.ok,
          note: res.ok
            ? res.created.length
              ? `Built ${res.created.join(', ')}${res.warnings.length ? `. ${res.warnings[0]}` : ''}`
              : 'Already built'
            : res.error,
        });
      }
      const built = results.filter((r) => r.ok).length;
      return NextResponse.json({
        ok: true,
        inline: built,
        queued: 0,
        results,
        note: `${built} of ${results.length} built.${withSite ? ' Their websites are on the anvil now.' : ''}`,
      });
    }

    /* Re-queue a website build: the retry for a failure, the rebuild for a stale one. */
    case 'retry-site': {
      const leads = await load(ids.slice(0, 25));
      let queued = 0;
      const failures: string[] = [];
      for (const lead of leads) {
        const res = await queueProspectSite(db, lead, { designTier, talkingWebsite, force: true });
        if (res.ok) queued++;
        else failures.push(`${lead.business_name}: ${res.error}`);
      }
      return NextResponse.json({
        ok: true,
        queued,
        failures,
        note: `${queued} back on the anvil at Tier ${designTier}${talkingWebsite ? ', Talking Website front and center' : ''}.`,
      });
    }

    /* Mail them the suite. */
    case 'send-suite': {
      if (!campaign) return NextResponse.json({ error: 'There is no campaign to send from.' }, { status: 500 });
      const leads = await load(ids.slice(0, 50));
      let sent = 0;
      const refused: string[] = [];
      for (const lead of leads) {
        const res = await sendSuiteEmail(db, campaign, lead);
        if (res.ok) sent++;
        else refused.push(`${lead.business_name}: ${res.error}`);
      }
      return NextResponse.json({
        ok: true,
        sent,
        refused,
        note: sent
          ? `${sent} suite${sent === 1 ? '' : 's'} sent.`
          : 'Nothing sent. Every one of them was refused, and the reasons are listed.',
      });
    }

    /* Queue the suite email instead of sending it now, so the pacing applies. */
    case 'queue-suite': {
      let queued = 0;
      for (const id of ids) {
        const res = await enqueue(db, {
          kind: 'demo_email',
          leadId: id,
          campaignId: campaign?.id ?? null,
          step: 0,
        });
        if (res.ok && res.created) queued++;
      }
      await Promise.all(
        ids.map((id) =>
          recordEvent(db, {
            leadId: id,
            campaignId: campaign?.id ?? null,
            type: 'note',
            label: 'Their suite email was queued from the build board',
          }),
        ),
      );
      return NextResponse.json({ ok: true, queued, note: `${queued} queued to send on the engine's next pass.` });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
