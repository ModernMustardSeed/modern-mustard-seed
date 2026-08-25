-- ─────────────────────── A FULL MAILBOX IS NOT A BAD ADDRESS ────────────────
--
-- Resend reports two kinds of bounce and they mean opposite things. Permanent
-- means the address does not exist and sending again damages the domain.
-- Transient means the mailbox was full, or the server was busy, and the same
-- address will very likely accept the next message.
--
-- The suppression path already knew this: app/api/webhooks/resend/route.ts has
-- always refused to suppress a Transient bounce. The reputation math did not.
-- acq_rolling_send_counts counted every row with status 'bounced', so one full
-- inbox out of twenty-five sends read as a 4% bounce rate and the governor
-- stopped the day. On 2026-08-24 that is exactly what happened: two "bounces"
-- out of twenty-five, one of them a MailboxFull, 8.00% against a 4% ceiling,
-- and every campaign email and demo suite email refused for the rest of the day.
--
-- Two changes here:
--   1. acq_sends remembers WHICH kind of bounce it was.
--   2. The rolling counts count only the permanent ones against the rate, and
--      report the transient ones separately so they are visible rather than
--      silently forgiven.
--
-- The measurement floor moves from 25 to 100 sends in lib/acq/governor.ts, for
-- the reason a statistician would give: at n=25 a single bad address is 4%,
-- which is the entire ceiling. That is not a signal, it is one address.

-- ── 1. remember the kind ──

alter table public.acq_sends
  add column if not exists bounce_type text;

comment on column public.acq_sends.bounce_type is
  'Resend''s bounce classification: Permanent, Transient, or Undetermined. Only Permanent counts against the sender reputation. Null on anything that did not bounce.';

-- Backfill from the detail string the webhook has always written, which is
-- "<type> · <subType> · <message>". Anything that bounced before this column
-- existed and does not say Transient is treated as permanent, which is the
-- safe direction: it keeps the rate conservative rather than flattering.
update public.acq_sends
   set bounce_type = case
         when status_detail like 'Transient%' then 'Transient'
         when status_detail like 'Undetermined%' then 'Undetermined'
         else 'Permanent'
       end
 where status = 'bounced'
   and bounce_type is null;

create index if not exists acq_sends_bounce_type_idx
  on public.acq_sends (bounce_type)
  where bounce_type is not null;

-- ── 2. count only what should count ──

drop function if exists public.acq_rolling_send_counts();

create or replace function public.acq_rolling_send_counts()
returns table (
  sent_24h integer,
  sent_1h integer,
  bounced_24h integer,
  complained_24h integer,
  unsub_24h integer,
  soft_bounced_24h integer
)
language sql
stable
as $$
  select
    count(*) filter (where sent_at > now() - interval '24 hours' and status <> 'refused')::integer,
    count(*) filter (where sent_at > now() - interval '1 hour' and status <> 'refused')::integer,
    -- The reputation number. Permanent bounces only: a full mailbox says
    -- nothing about whether this domain should be trusted.
    count(*) filter (
      where sent_at > now() - interval '24 hours'
        and status = 'bounced'
        and coalesce(bounce_type, 'Permanent') <> 'Transient'
    )::integer,
    count(*) filter (where sent_at > now() - interval '24 hours' and status = 'complaint')::integer,
    count(*) filter (where sent_at > now() - interval '24 hours' and status = 'unsubscribed')::integer,
    -- Reported, never enforced. A rising soft-bounce count is worth a look
    -- even though no single one of them is worth stopping the day for.
    count(*) filter (
      where sent_at > now() - interval '24 hours'
        and status = 'bounced'
        and bounce_type = 'Transient'
    )::integer
  from public.acq_sends;
$$;

grant execute on function public.acq_rolling_send_counts() to authenticated, service_role;
