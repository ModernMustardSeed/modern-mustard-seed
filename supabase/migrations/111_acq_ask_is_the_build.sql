-- THE ASK IS THE FREE BUILD, NOT A CALL (2026-08-25, Sarah: "we aren't asking
-- them if Mr. Mustard can call them, we were supposed to ask if they want one
-- made for them"). The variant rows were seeded when the button collected a
-- phone number. lib/acq/campaign.ts also rewrites any label or subject that
-- still asks for a call at render time, so this is hygiene the admin can read.

-- Every email asks the same question, so every row carries the same label.
update public.acq_variants
   set cta_label = 'YES, BUILD MY DEMO';

update public.acq_variants
   set subject = 'Can we build {{business_name}} a demo? It is free'
 where subject ~* '\mcall\M';

alter table public.acq_variants
  alter column cta_label set default 'YES, BUILD MY DEMO';
