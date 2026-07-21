-- The client moodboard: a direction board forged after intake, approved by
-- the client in their portal BEFORE the site goes live. Payload is JSON so
-- admin and portal render the same board from one source. Status walks
-- none -> draft -> sent -> (changes -> sent)* -> approved. The reveal cron
-- only gates when a board was actually sent, so every existing project and
-- any project Sarah skips the board on behaves exactly as before.

alter table projects
  add column if not exists moodboard jsonb,
  add column if not exists moodboard_status text not null default 'none',
  add column if not exists moodboard_note text,
  add column if not exists moodboard_sent_at timestamptz,
  add column if not exists moodboard_approved_at timestamptz;

comment on column projects.moodboard is 'Moodboard payload JSON (direction, palette, type pairing, imagery, signature moment). Rendered by components/moodboard/MoodboardCanvas.tsx in both admin and portal.';
comment on column projects.moodboard_status is 'none | draft | sent | changes | approved';
