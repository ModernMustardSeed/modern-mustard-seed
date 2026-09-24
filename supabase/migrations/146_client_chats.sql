-- EVERY CONVERSATION THE WEBSITE HAD, KEPT.
--
-- The chat on a client's site runs on a Vapi text assistant. Until now the
-- Command Center read those conversations live from Vapi on every page view and
-- stored nothing, which was a deliberate choice ("it is their data and a copy is
-- one more place it can leak from") and it cost more than it saved:
--
--   A chat that never produced a lead left no trace anybody could act on. The
--   visitor who asked three good questions about a Whitefish build and left
--   without giving a name is the most qualified traffic the site gets, and it
--   was invisible unless somebody happened to scroll.
--
--   Nothing could be counted over time. The live read is capped at 200 chats
--   and 30 days, so the weekly report and every "how many" question silently
--   changed its answer as the window slid.
--
--   A provider outage read as a quiet month. The fetch returns null and the
--   room says "could not be read", which is honest, and still leaves the
--   business with no history to look at.
--
--   The back office could not see any of it. Nothing outside the client's own
--   signed-in session could answer "is the agent doing its job".
--
-- So the conversation is stored, and the leak concern is answered where it
-- actually lives: the row is scoped to one client_email, nothing here is ever
-- served cross-client, and the sync writes only what the client's own assistant
-- already returned.
--
-- The unit is the CONVERSATION, not the chat. Vapi chains each exchange to the
-- one before it; chat_id here is the ROOT of that chain, so one visitor is one
-- row that grows, and re-syncing the same visitor updates rather than duplicates.

create table if not exists public.client_chats (
  id uuid primary key default gen_random_uuid(),
  -- Who owns this conversation. Every read is scoped by this and nothing else.
  client_email text not null,
  assistant_id text not null,
  -- The root of the Vapi chat chain. One visitor, one value, forever.
  chat_id text not null,
  started_at timestamptz not null,
  last_at timestamptz not null,
  -- The page the chat was opened on, when the widget remembered one.
  page text,
  -- [{ role, content, at }], oldest first. The conversation in their words.
  turns jsonb not null default '[]'::jsonb,
  -- How many request/response pairs. Cheap to sort and filter on without
  -- opening the jsonb.
  exchanges integer not null default 0,
  -- The lead this conversation produced, when it produced one. Null is the
  -- common and interesting case: someone talked and never left a name.
  lead_id uuid references public.client_leads(id) on delete set null,
  -- Written by the agent's analysis plan when one is enabled, or by us later.
  -- Never invented: null means nobody has read it yet, not "nothing happened".
  summary text,
  first_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

-- One row per conversation per assistant. This is what makes the sync an upsert
-- instead of an append, and it is the whole reason a re-run is safe.
create unique index if not exists client_chats_assistant_chat_idx
  on public.client_chats (assistant_id, chat_id);

-- The room's only query: this client's conversations, newest first.
create index if not exists client_chats_client_started_idx
  on public.client_chats (client_email, started_at desc);

-- "Who talked to us and never left a name." The reason this table exists.
create index if not exists client_chats_no_lead_idx
  on public.client_chats (client_email, started_at desc)
  where lead_id is null;

-- The other direction: open a lead, read the conversation that produced it.
-- Nullable, because most leads come through a form and never had a chat.
alter table public.client_leads
  add column if not exists chat_id text;

create index if not exists client_leads_chat_idx
  on public.client_leads (chat_id)
  where chat_id is not null;
