-- The client desk: the dashboard a white label client opens to see every call
-- its receptionist took. Written 2026-10-08 for Vann Law Firm (jcreative).
--
-- A client row now names the assistant that answers for it, so the desk and
-- the end-of-call email can find the client from the call alone, and keeps the
-- office's own "handled" marks: { "<vapi call id>": "<iso time handled>" }.

alter table white_label_clients add column if not exists vapi_assistant_id text;
alter table white_label_clients add column if not exists agent_name text;
alter table white_label_clients add column if not exists desk_handled jsonb not null default '{}'::jsonb;

create unique index if not exists white_label_clients_assistant_idx
  on white_label_clients (vapi_assistant_id) where vapi_assistant_id is not null;
