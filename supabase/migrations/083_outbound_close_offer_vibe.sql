-- 083_outbound_close_offer_vibe.sql
-- Sarah's register for the unforged close (2026-08-05): "I'd love to make you
-- one, where should I send it." Generous gift energy, and under forge-on-yes
-- the cell number IS the yes, so the card must ask for it plainly. The old
-- body explained mechanics and ended on "Fair?" without collecting the cell.
-- Still no "demo" out loud (feedback_sell_value_not_build_time): it is "build
-- it for you", theirs from the first sentence.

update public.outbound_scripts set
  body = $mms$(Nothing forged yet. The cell number IS the yes, ask for it plainly:)
[First name], tell you what. Instead of me describing it, I'd love to just build it for you, so you're looking at the real thing instead of imagining it. My studio starts the minute we hang up, and it lands in your texts today with a short video of me walking you through it. What's the best cell to send it to? (Got it? Then:) Done. I'll call you Thursday, and all I want to hear is what you'd change.$mms$,
  updated_at = now()
where name = 'Close: build it today' and source = 'MMS v3';
