-- ============================================================================
-- 101  TELL THE OWNER
-- ============================================================================
-- The gap this closes is the one that would have hurt most.
--
-- The whole promise of this product is "we catch the calls you would have
-- missed". An emergency comes in at 2am, the agent handles it, flags
-- needs_human, and writes it to a dashboard nobody is looking at while
-- somebody's basement fills with water. That is WORSE than voicemail, because
-- voicemail at least leaves a light blinking on a phone.
--
-- A caught call nobody is told about is not a caught call.
-- ============================================================================

begin;

alter table fo_offices
  -- Where to reach the owner. Defaults to the account email at provisioning,
  -- so an office is never silently unreachable.
  add column if not exists notify_email text,
  add column if not exists notify_sms text,
  -- Which calls are worth waking somebody for. Deliberately narrow by default:
  -- an alert for every routine call gets muted within a week, and a muted
  -- alert channel is the same as no alert channel.
  add column if not exists notify_on text[] not null default array['emergency', 'needs_human', 'booked']::text[],
  add column if not exists notify_quiet_hours boolean not null default false;

alter table fo_calls
  -- Stamped when the owner has actually been told, so a retry, a replayed
  -- webhook, or a second tool call on the same call cannot send four emails
  -- about one emergency.
  add column if not exists notified_at timestamptz,
  add column if not exists notify_error text;

create index if not exists fo_calls_unnotified_idx
  on fo_calls (office_id, started_at desc)
  where notified_at is null and needs_human = true;

alter table fo_appointments
  add column if not exists reminder_error text;

-- Backfill: every existing office gets the account email, because an office
-- with no notification address is the failure this migration exists to stop.
update fo_offices set notify_email = client_email where notify_email is null;

commit;
