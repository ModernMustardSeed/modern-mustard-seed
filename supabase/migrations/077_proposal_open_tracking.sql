-- 077: proposal open receipts. The token page bumps a counter on every view so
-- Sarah knows the moment a prospect actually reads the document (and how many
-- times), instead of sending into the void. One atomic statement via RPC.

alter table public.proposals add column if not exists viewed_at timestamptz;
alter table public.proposals add column if not exists last_viewed_at timestamptz;
alter table public.proposals add column if not exists view_count integer not null default 0;

create or replace function public.bump_proposal_view(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.proposals
     set viewed_at = coalesce(viewed_at, now()),
         last_viewed_at = now(),
         view_count = view_count + 1
   where share_token = p_token;
$$;
