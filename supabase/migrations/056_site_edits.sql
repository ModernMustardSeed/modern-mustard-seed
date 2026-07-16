-- 056: Edit mode for the forge, and client-driven site edits with an approval gate.
--
-- Two features share one engine here. The forge queue (outbound_demo_sites) learns
-- a third kind, 'edit': instead of building a site from scratch, it takes a finished
-- site (base_html) plus one human instruction (brief) and returns the edited site.
--
--   #2 Reforge-from-prompt (admin): re-queue a lead's demo site as an edit.
--   #3 Portal auto-edit (client): a paying client's edit is applied agentically, but
--      it NEVER goes live unreviewed. The result lands in site_html_draft, a human
--      approves it on /admin/delivery, and only then is it published.

-- The source site to edit. Null for from-scratch builds and rebuilds.
alter table outbound_demo_sites add column if not exists base_html text;

-- A client's post-purchase edit, held for approval. The draft is the edited site;
-- it is copied onto site_html only when a human approves it, so an AI edit can never
-- reach a client's live domain without a signature.
alter table projects add column if not exists site_html_draft text;
-- null | 'queued' | 'building' | 'ready' | 'failed'
alter table projects add column if not exists edit_status text;
alter table projects add column if not exists edit_instruction text;
alter table projects add column if not exists edit_requested_by text;
alter table projects add column if not exists edit_requested_at timestamptz;
alter table projects add column if not exists edit_error text;

-- Find the queued/building edit for a project fast (the drainers check for one in flight).
create index if not exists outbound_demo_sites_edit_idx
  on outbound_demo_sites (project_id, status)
  where kind = 'edit';
