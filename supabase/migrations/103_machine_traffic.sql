-- Machine traffic gets its own column, and the history gets its verdict.
--
-- A mail security gateway following our link is not a person clicking it. Both
-- arrive as the same GET, so before this migration a scanner hit stamped
-- last_seen_at and flipped the lead to `engaged`, and the board that answers
-- "who is moving" filled with prospects who had never opened the message.
--
-- last_scanned_at is where those hits land now. It is intelligence in its own
-- right: an address that scans every link sits behind a corporate filter, which
-- says something real about how hard that inbox is to reach.
--
-- The thresholds below mirror lib/acq/bots.ts exactly. If one moves, both move.

alter table outbound_leads
  add column if not exists last_scanned_at timestamptz;

comment on column outbound_leads.last_scanned_at is
  'Last time an automated agent (mail security gateway, link expander, crawler) followed one of our links for this lead. Never a human. See lib/acq/bots.ts.';

create index if not exists outbound_leads_last_scanned_at_idx
  on outbound_leads (last_scanned_at desc nulls last);


-- ── the backfill ───────────────────────────────────────────────────────────
--
-- Every hit before today was written unclassified and we never captured a user
-- agent, so the two tests available retroactively are the clock and the poller.
--
-- THE CLOCK. Each hit is dated against THE SEND IT FOLLOWED, meaning the most
-- recent email_sent at or before that hit, never the lead's newest send.
-- Pairing against the newest send is what made four ordinary two-minute
-- scanner hits look like a considered visit five days later, and getting that
-- wrong once is the reason it is spelled out here.
--
-- THE POLLER. Some gateways re-validate on a schedule rather than once at
-- delivery: 12, 26, 41, 54, 64 minutes after the send, over and over. A third
-- hit of the same kind inside ninety minutes is a loop, not a visit. The first
-- two are always left alone, so this rule can never erase a prospect.
--
-- PROOF OF LIFE outranks both. A lead that has consented, replied, or been on
-- a call is a person, and their clicks are not re-litigated.

with judged as (
  select
    e.id,
    e.occurred_at,
    (
      select max(s.occurred_at)
      from acq_events s
      where s.lead_id = e.lead_id
        and s.type = 'email_sent'
        and s.occurred_at <= e.occurred_at
    ) as sent_at,
    (
      select count(*)
      from acq_events q
      where q.lead_id = e.lead_id
        and q.type = e.type
        and q.occurred_at < e.occurred_at
        and q.occurred_at >= e.occurred_at - interval '90 minutes'
    ) as prior_hits,
    exists (
      select 1
      from acq_events pl
      where pl.lead_id = e.lead_id
        and pl.type in ('consent_captured', 'reply', 'call_started', 'call_completed',
                        'call_inbound', 'meeting_booked', 'purchased')
    ) as known_human
  from acq_events e
  where e.type in ('link_clicked', 'permission_visited', 'email_opened')
    and coalesce(e.detail, '{}'::jsonb) ->> 'machine' is null
),
verdict as (
  select
    j.*,
    case
      when j.known_human then null
      when j.sent_at is not null and j.occurred_at - j.sent_at < interval '300 seconds'
        then 'Backfilled: arrived '
             || round(extract(epoch from (j.occurred_at - j.sent_at)))::text
             || 's after the send, inside the delivery scan window'
      when j.prior_hits >= 2
        then 'Backfilled: hit ' || (j.prior_hits + 1)::text
             || ' from this prospect inside 90 minutes, a re-validation loop'
      else null
    end as machine_why
  from judged j
)
update acq_events e
set detail = coalesce(e.detail, '{}'::jsonb) || jsonb_build_object(
      'machine', v.machine_why is not null,
      'machine_why', v.machine_why,
      'seconds_after_send',
        case when v.sent_at is null then null
             else round(extract(epoch from (v.occurred_at - v.sent_at)))::int end,
      'prior_hits', v.prior_hits::int,
      'known_human', v.known_human,
      'backfilled', true
    )
from verdict v
where v.id = e.id;


-- ── the demotion ───────────────────────────────────────────────────────────
--
-- Any lead whose only claim to `engaged` was a scanner goes back to
-- `contacted`. The protected list is deliberately wide: consent, any call in
-- either direction, a reply, a booking, a purchase, a forge, a demo, a
-- checkout, or a flag that a human needs to look. Inbound callers are set to
-- `engaged` by app/api/voice/route.ts rather than by a click, and demoting one
-- of those would be the exact mistake this migration exists to undo.

update outbound_leads l
set reservoir_state = 'contacted'
where l.reservoir_state = 'engaged'
  and l.needs_human is null
  and not exists (
    select 1
    from acq_events e
    where e.lead_id = l.id
      and (
        e.type in (
          'consent_captured', 'call_queued', 'call_started', 'call_completed',
          'call_failed', 'call_inbound', 'reply', 'meeting_booked', 'purchased',
          'forge_requested', 'forge_completed', 'demo_emailed', 'checkout_sent'
        )
        or (
          e.type in ('link_clicked', 'permission_visited')
          and coalesce((coalesce(e.detail, '{}'::jsonb) ->> 'machine')::boolean, false) = false
        )
      )
  );
