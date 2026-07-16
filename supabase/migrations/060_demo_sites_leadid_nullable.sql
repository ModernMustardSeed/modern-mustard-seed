-- 060: outbound_demo_sites.lead_id must be nullable.
--
-- The table was born when every forged site belonged to a LEAD, so lead_id was NOT
-- NULL. Migrations 052/056 then added PROJECT-keyed rows (rebuild, edit) whose natural
-- key is project_id, not a lead. The client "Adjust it" path inserts an edit with
-- lead_id = null on purpose (a draft refinement has no lead), which would trip the
-- NOT NULL exactly the way the kind check just did. A project row is validated by
-- carrying either a lead_id or a project_id; the drainers already route on that.
alter table outbound_demo_sites alter column lead_id drop not null;
