# The One-Person Company Bootcamp: go-to-market

The plan Sarah runs from. Facts, prices and dates are owned by `data/bootcamp.ts`; copy is in `data/bootcamp-marketing.ts`; this document says who does what, when, and what number means stop. Written 2026-10-08 for Launch 1. The same document is re-dated for Launches 2, 3 and 4.

## 1. The offer stack

| Door | What it is | Price | Where it sells |
| --- | --- | --- | --- |
| Learn | The One-Person Company Bootcamp. Three live sessions, February 2, 4 and 9, 2027, 1:00 to 2:30 PM Mountain. Two working agents built on Day 3. SeedSide office, first month included. | General Admission $97, VIP $297, Platinum $497 | `/bootcamp` |
| Build | The Operator Program. Eight weeks, live, cohort of 250, starts Tuesday, February 16, 2027. Rules, memory, skills, crew, hooks, idea engine, Build Week, graduation. | $4,997 | `/bootcamp/operator` |
| Build for me | Claude Operator and Agentic Native. We build the crew, hand over every key, teach the owner to run it. Fifty seats this launch. | Claude Operator $9,500, Agentic Native $12,000 | `/claude` |
| Run | SeedSide, the agentic office every ticket opens. Month to month after the included month. Mustard Studio for agencies that run offices for clients. | SeedSide $49 / $149 / $399 a month (set by go-live.ps1). Mustard Studio Crew $1,500 a month. | SeedSide and Mustard Studio |
| Resell | Host a Room. Hosts run the bootcamp for their audience under their name. 100% of ticket revenue, 20% of Operator seats ($999 a seat), own trade room at 100 registrations. First 25 are founding hosts on all four 2027 launches. | Free to host | `/bootcamp/host` |

The free masterclass on Tuesday, January 26, 2027 at 1:00 PM Mountain is the front door to all five. Nothing is sold cold. Every ad, post and email points at `/bootcamp/masterclass` first.

Assumption stated once: SeedSide plan prices are the ones `scripts/go-live.ps1` creates ($49 / $149 / $399, chosen 2026-09-30). If Sarah changes them in the script before go-live, the Run row and section 2's software line move with them. Nothing else in this plan depends on them.

## 2. The $40M ladder

Four launches in 2027. Ticket average is $140 (the blend of $97, $297 and $497 at roughly 70 / 20 / 10). Operator is $4,997. Done-for-you is split evenly between Claude Operator ($9,500) and Agentic Native ($12,000), so the blended build is $10,750.

| Launch | Masterclass | Tickets | Ticket revenue | Operator seats | Operator revenue | Builds | Build revenue | Launch total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1, February | Jan 26 | 5,000 | $700,000 | 250 | $1,249,250 | 50 | $537,500 | $2,486,750 |
| 2, May | Apr 27 | 12,000 | $1,680,000 | 600 | $2,998,200 | 120 | $1,290,000 | $5,968,200 |
| 3, August, plus trade editions | Jul 27 | 25,000 | $3,500,000 | 1,250 | $6,246,250 | 250 | $2,687,500 | $12,433,750 |
| 4, November | Oct 26 | 35,000 | $4,900,000 | 1,750 | $8,744,750 | 350 | $3,762,500 | $17,407,250 |
| Year | | 77,000 | $10,780,000 | 3,850 | $19,238,450 | 770 | $8,277,500 | $38,295,950 |

Launch 3 runs as four trade editions on the same dates: Builders, Clinics, Home Services and Agencies each get their own masterclass replay cut, their own Day 2 room schedule and their own host roster. Same product, four doors.

Host economics against the ladder: hosts keep 100% of the tickets they sell. If hosts sell 40% of tickets in Launch 1, the studio keeps $420,000 of the $700,000 ticket line and pays out $999 on every host-referred Operator seat. The ticket line is the host's income and our audience cost. The Operator and build lines are where the studio's money is, and both are ours after host commission.

The software line: every ticket opens a SeedSide office with the first month included. The plan assumes 15% of offices stay paying after the included month at a blended $79 a month (most on $49, some on $149, a few on $399). Mustard Studio takes agencies that run offices for their clients, 150 agencies on Crew at $1,500 a month by December.

| By December 2027 | Paying offices | Monthly | Annual run-rate |
| --- | --- | --- | --- |
| SeedSide, 15% of 77,000 tickets | 11,550 | $912,450 | $10,949,400 |
| Mustard Studio Crew | 150 agencies | $225,000 | $2,700,000 |
| Software total | | $1,137,450 | $13,649,400 |

Launch revenue of $38.3M plus a software run-rate of $13.6M by December is the $40M ladder. The launches are the engine; the software line is what is still running on January 1, 2028.

## 3. Channels

Every channel sends people to one place, `/bootcamp/masterclass`. No channel carries a ticket price except the warm retargeting text (`meta-guarantee`) from January 19 and the drip to registered attendees.

### Hosts: the outreach engine

- The engine is `lib/bootcamp/outreach.ts`, armed from `/admin/bootcamp`, Outreach tab. Twelve personal emails a day, weekday mornings Mountain, from Sarah's root address, text only, one to one. Three steps per target: day 0, day 4, day 13. Replies stop the sequence automatically; Sarah marks hosting by hand.
- Targets live in `data/bootcamp-outreach.json`, seeded by `scripts/bootcamp-seed-outreach.mjs`. Tier A targets are hosts who can bring 100 or more and get a room with their name on the door. Tier B targets are podcasts and newsletters (see podcasts below). Non-email targets (DM-only creators) show in the desk as `hand` with the message to paste.
- The 25 founding hosts are the first 25 approved. Sarah approves from the Hosts tab; approval mints the link, the dashboard and sends `hostApproved` with the swipe kit. Founding terms hold on all four 2027 launches, which is the reason to say yes in January instead of May.
- Rooms for 100+: the dashboard shows registrations through the host's link. At 100, the host gets the room announcement (`host-room` in the kit) and a named room on Day 2, February 4. Target for Launch 1: eight rooms of 100+, which is 800 or more of the 5,000 tickets from hosts alone.
- Host swipe is `HOST_SWIPE` in `data/bootcamp-marketing.ts`: the email, the social post, the DM, the three-line story and the room announcement. Hosts send the email on January 12 and January 25.

### Meta ads

- Budget ladder: $75 a day from Monday, November 2 through Monday, January 18 (78 days, $5,850). $500 a day from Tuesday, January 19 through Tuesday, January 26 (8 days, $4,000). Total $9,850 for Launch 1. Nothing runs after the masterclass; the drip takes it from there.
- Every ad lands on `/bootcamp/masterclass`. No price in any cold ad. Six primary texts in `META_PRIMARY`, eight headlines in `META_HEADLINES`. Run all six from November 2 at equal spend, cut to the best two by December 1, keep the trade texts (`meta-builders`, `meta-clinics-home`) on their own interest sets.
- `meta-guarantee` is the only text with a price. Warm audiences only (site visitors, the list, 50% video viewers) from January 19.
- Creative is screen recordings of the real office: the morning briefing, the crew panel, a live call. No stock, no renders. The ad is the proof.
- Conversion event is the masterclass registration (`/bootcamp/welcome?masterclass=1`). Target cost per registration: under $4. Stop line: $8 for three days running on the whole account.

### LinkedIn

- Sarah personal: three posts in `LINKEDIN_POSTS`, Tuesday January 5 (the one-person company), Thursday January 14 (charters), Tuesday January 19 (why I am teaching it). Each links to the masterclass. Max three hashtags.
- The MMS page reshares each post the following morning with one new first line, and posts the press blurb on January 26.
- Between posts, Sarah comments on ten builder, clinic and agency posts a day in the two weeks before the masterclass. Comments, not links.

### The Trade Secrets weekly post

- `TRADE_SECRETS_POSTS`: twelve posts for @sarahscaranobuilds, Tuesdays at 11:43 AM Mountain, October 13 through January 26, with no posts Thanksgiving week or the two weeks of Christmas. Each teaches one real thing from the method (a law, a hook, a skill, memory, the briefing, charters, the idea engine, Build Week, the brief, the skeptic, the phone agent, the day-of post) and ends on the masterclass. The link in bio is `/bootcamp/masterclass` from October 13.
- Rendered in the existing Trade Secrets templates. Real photos of Sarah where they exist; otherwise the post runs as a type card.

### The 397 queued agencies in the Partner Desk

- 397 agency prospects are queued in the Partner Desk, none sent. From the week of November 16 they get one pitch that sells two things together: Host a Room (their clients fill a room, they keep every ticket) and the White Label Program (they resell our services under their name). One email, two doors, sent by hand from `/admin/partner-desk` at twelve a day. That is 33 sending days, so the queue finishes the week of January 11.
- An agency that says yes to hosting is approved as a host the same day and pointed at `/bootcamp/host`. One that asks about white label gets the signed sheet from `/admin/white-label`.

### Mustard Studio agencies

- Every agency on Mustard Studio gets the host invitation in the product and by email the week of November 30. They already run offices for clients, so the Agencies trade room on Day 2 is built for them, and the Operator Program is the training their account managers need.

### Podcasts

- The outreach list's tier B targets are podcasts and newsletters for builders, clinics, home services and agency owners. The pitch is a guest spot, not a sponsorship: "one person runs an AI product studio with a crew of Claude agents; here is the live call to the phone agent." Twelve pitches a week inside the daily cap, December 1 through January 15, aiming for six recorded episodes airing between January 12 and January 25, each with the masterclass link in the show notes.

### The launch article

- `content/blog/the-one-person-company.mdx`, published October 8, 2026, is the long form of the thesis and the first place the masterclass date is public. It is linked from every Trade Secrets post bio through October, from the first LinkedIn post, and from the masterclass confirmation email as the read-before. It is the page the press blurb points reporters at.

## 4. The calendar

Owner is Sarah or the crew. The crew means the agents and the desks that run without her; Sarah means a thing only she can do or say.

| Week of | What happens | Owner |
| --- | --- | --- |
| Oct 12, 2026 | Launch article live. Trade Secrets post 1 (Oct 13). Bootcamp pages, checkout, drip and desk live on the domain. Section 5 list handed to Sarah. | Crew; Sarah for section 5 |
| Oct 19 | Trade Secrets 2. Outreach targets seeded, fit scored, tier A and B marked. Host swipe kit rendered. One $97 test purchase and refund. | Crew; Sarah for the purchase |
| Oct 26 | Trade Secrets 3. Sarah flips the outreach switch; first twelve host emails go. Masterclass rehearsal recorded and timed against the 20 beats. | Sarah |
| Nov 2 | Meta ads start at $75 a day, six texts. Trade Secrets 4. Outreach continues at twelve a day. First host approvals. | Crew; Sarah approves hosts |
| Nov 9 | Trade Secrets 5. Review the six ad texts after one week; no cuts yet. Volunteer for the live demos chosen from registrants (a builder or a clinic). | Crew |
| Nov 16 | Trade Secrets 6. Partner Desk agency pitch starts, twelve a day, Host a Room plus White Label. | Sarah sends; crew drafts |
| Nov 23 | Thanksgiving week. No Trade Secrets post. Ads and outreach run. Weekly host dashboard email goes out (`hostWeekly`). | Crew |
| Nov 30 | Trade Secrets 7. Mustard Studio agencies invited to host. Podcast pitches begin. Cut ads to the best two plus the two trade texts. | Crew |
| Dec 7 | Trade Secrets 8. Founding host count checked against 25; outreach cap raised to the ceiling if under 15. Day 2 room hosts confirmed for every host past 60 registrations. | Crew; Sarah on the cap |
| Dec 14 | Second masterclass rehearsal with the live demos on a real volunteer. Email drip dry-run (`?dry=1`) against every step. | Sarah rehearses; crew tests |
| Dec 21 | Christmas week. No Trade Secrets. Ads and outreach run. Replay studio set: camera, audio, screen capture checked. | Crew |
| Dec 28 | Ads and outreach run. Section 6 metrics board live on `/admin/bootcamp`. Agency pitch queue past halfway. | Crew |
| Jan 4, 2027 | Trade Secrets 9. LinkedIn post 1 (Jan 5). Host email reminder: send your list on Jan 12. Podcast episodes start airing. | Sarah posts; crew drafts |
| Jan 11 | Trade Secrets 10. Hosts email their lists (Jan 12). LinkedIn post 2 (Jan 14). Agency pitch queue finished. Press blurb sent to local and trade press. | Hosts; Sarah; crew |
| Jan 18 | Trade Secrets 11. Ads to $500 a day on Jan 19, `meta-guarantee` on warm. LinkedIn post 3 (Jan 19). Final rehearsal, timed. Registrant count checked against 15,000 target. | Crew; Sarah rehearses |
| Jan 25 | Hosts post and email again (Jan 25). Trade Secrets 12 on the day. Masterclass live Tuesday Jan 26, 1:00 PM Mountain. Replay out by 5:00 PM. Ads stop. Drip takes over: replay, offer 2 (Jan 28), offer 3 (Jan 31). | Sarah teaches; crew runs the drip |
| Feb 1 | Kickoff call Monday Feb 1. Day 1 Tuesday Feb 2. Enrollment closes 11:59 PM Mountain Feb 2. Refund requests answered the same night. Day 2 Thursday Feb 4 with trade rooms and host doors. | Sarah teaches; crew runs rooms and refunds |
| Feb 8 | Day 3 Tuesday Feb 9. Replay plus three doors by 5:00 PM. Operator invites 1 (Feb 9), 2 (Feb 11), 3 (Feb 14). VIP coaching sessions scheduled. The Director's Deck (VIP and up), the Studio Kit and the Operator's Playbook (Platinum and cohort) open in every eligible room at 2:30 PM Mountain on Feb 9, with the in-your-room letter on the next hourly run. | Sarah teaches; crew ships |
| Feb 15 | The Operator Program starts Tuesday Feb 16. Host payouts sent by Feb 19 (within ten days of Day 3). Launch 1 close-out numbers posted against section 2. Launch 2 calendar re-dated from this one. | Sarah teaches; crew pays and reports |

## 5. What is on Sarah only

Each of these needs Sarah's hands, keys or voice. Everything else in this plan runs without her.

1. Run `scripts/go-live.ps1` for SeedSide. It applies the schema, creates the Stripe prices by lookup key, and copies the keys. Until it runs, no bootcamp ticket can open an office. Needed before October 26.
2. Settle the Supabase invoice on the sarah@voicestaff.pro account. It blocks new projects across both orgs.
3. Settle the Vercel invoice. The team has been blocked with a 402 since September 9; a blocked team cannot promote the bootcamp deploy.
4. Open or unblock the Meta ad account and set the payment method. Ads start November 2.
5. Make one $97 General Admission purchase with a real card, check the welcome email and the SeedSide office, then refund it from the Stripe dashboard. The week of October 19.
6. Record the masterclass rehearsal, full sixty minutes, against `MASTERCLASS_SCRIPT`. The week of October 26, again December 14, final the week of January 18.
7. Approve the first 25 hosts from `/admin/bootcamp`, Hosts tab. They become founding hosts on approval.
8. Flip the outreach switch (Armed, cap 12) on `/admin/bootcamp`, Outreach tab. Nothing sends until she does.
9. Set the broadcast. Before each session, paste its live link on `/admin/bootcamp`, Stage tab (section 8 says which). After it, paste the replay link the same afternoon: that is what releases the replay letter.

## 6. The metrics board

On `/admin/bootcamp`, Desk tab, read every morning with the briefing.

| Number | Where | Watch for | Stop line |
| --- | --- | --- | --- |
| Masterclass registrations, cumulative | Desk | 15,000 by January 25 for 5,000 tickets at a 33% registrant-to-ticket rate | Under 4,000 on January 4 means double the ad budget and move the $500 a day up to January 11 |
| Cost per registration | Meta Ads Manager | Under $4 | $8 for three days running: pause the account, rewrite creative, restart |
| Outreach sent, replied, hosting | Outreach tab | 12 a day sent, 15% replied, 25 hosts by December 7 | Reply rate under 5% after 60 sends: stop, rewrite step 1, restart |
| Host registrations through links | Hosts tab | 40% of all registrations | Under 20% on January 11: Sarah calls the top ten hosts personally |
| Email delivery and bounce | Resend dashboard, `bootcamp_events` | Delivery over 98%, bounce under 2% | Bounce over 3% on any send: pause the drip, clean the list, resume |
| Show-up rate, masterclass | Attendance count against registrations | 30% live | Under 20%: the day-1 and day-3 reminders get a text version in Launch 2 |
| Tickets by tier | Desk | 70 / 20 / 10 | Platinum over 40 means the front row is full; stop selling the front-row line, not the tier |
| Refund rate after Day 1 | Stripe refunds against GA count | Under 3% | Over 8%: Sarah reads every refund email that night and Day 2 opens with the fix |
| Operator seats | Desk | 250 by February 15 | 250 is the cap. Close the checkout at 250; waitlist for Launch 2 |
| Build seats (Claude Operator, Agentic Native) | `/claude` inquiries and signed scopes | 50 | 50 is the cap. Close the door on the three-doors email and point to Launch 2 |
| SeedSide offices opened and errors | SeedSide admin | One office per ticket, error rate under 1% | Error rate over 5% during Day 3: stop opening offices, open them in batches after the session |

## 7. Risks and the answer to each

**Deliverability.** Thousands of drip emails from a domain that has sent one-to-one until now. Answer: drip and sequence mail goes from the outreach subdomain, never the root; every drip carries the one-click unsubscribe; the bounce brake pauses the drip at 3%; the list is cleaned against the suppression tables before every send; transactional mail (confirmations, receipts, welcomes) stays on the root address where it has always landed. The first 500 registrations are the warm-up. The dry run on December 14 sends every template to Sarah's own inboxes at Gmail, Outlook and Zoho and checks the folder it lands in.

**Show-up rate.** Free registrations show at 25 to 35%. Answer: three reminders (the day before, sixty minutes before, and the replay the same afternoon), a calendar file attached to the confirmation, the live call as the opening beat so the first three minutes are worth showing up for, and a replay that goes to everyone registered the same afternoon so a no-show still gets the offer. The ticket math assumes 33% of registrants buy, which includes replay buyers.

**Refund rate.** The guarantee refunds every dollar on a Day 1 email with no form. Answer: that is the point of it, and Day 1 is built to be worth more than $97 on its own: the live call, the org chart, the laws, the memory, the briefing and the money, with the attendee's own map as the leave-with. Refunds are read that night, answered that night, and the pattern in them sets the opening of Day 2. The plan carries 3%; the stop line is 8%.

**Delivery capacity: 250 Operator seats and 50 builds.** 250 people in eight weekly live sessions plus a Thursday build lab is a cohort, not a classroom. Answer: the cohort runs in the four trade rooms with a room host each, the crew runs the office setup, reviews and the morning briefings for every student office, and Sarah teaches the Tuesday session and takes the hard questions in the lab. The 50 builds are capped at 50, scoped in writing, delivered in two waves (25 from February 22, 25 from March 22), with the crew doing the building the way it does for the studio's own products. Both caps are hard. Past them, the answer is Launch 2, not a bigger room.

**SeedSide stability under 5,000 new offices.** Day 3 opens up to 5,000 offices with two agents each inside ninety minutes. Answer: offices are created at ticket purchase, not on Day 3, so the load spreads across the two weeks of enrollment; agent runs are queued per office, with the AI ceiling per plan enforced in dollars; the studio lane stays off for customer offices so no customer run touches the subscription; the go-live script runs before October 26 so the schema and prices are live three months early; a load test of 1,000 office creations and 2,000 agent runs is run the week of December 28 against production. If the error rate crosses 5% during Day 3, offices open in batches after the session and every attendee gets an email with the time theirs opened.

**Host concentration.** If three hosts bring 60% of registrations, those three hosts are the launch. Answer: the founding 25 are chosen across the four trades and across platforms (newsletters, podcasts, communities, agencies), the weekly host email shows every host their rank, and the outreach engine keeps sending at twelve a day through January 15 regardless of how the top three are doing.

**Sarah's time.** She teaches one masterclass, three sessions, one kickoff, eight Tuesday sessions and eight Thursday labs, and she is the only person who can approve hosts, flip the switch, and run go-live. Answer: section 5 is the whole list of what is on her. Everything else is on the crew, in writing, in this document.

## 8. Running a live session

Every attendee has one room: `/bootcamp/room`, a signed link in every letter and every calendar file. It is the live stream, the questions box, their replays, their transcripts (VIP and up), the Idea Director worksheet and, for a free seat, the ticket offer. Sarah runs it all from `/admin/bootcamp`, **Stage** tab.

**The broadcast.** Stream from StreamYard (or OBS) to an unlisted YouTube Live event, and paste the YouTube link as the session's live link. YouTube plays inside every room, takes any number of viewers, and the same link is the replay the moment the stream ends. Questions come through the room's questions box, not YouTube chat, so they land on the Stage tab with the person's name, business, trade and seat. A Zoom or Zoho Meeting link also works; the room shows it as a button that opens a new tab, which is right for the kickoff (setup together) and for the Thursday labs.

**Day 2 trade rooms.** The Day 2 row on the Stage tab takes four more links, one per trade room, each run by its room host on their own Zoom or StreamYard. Every room lists all four with the person's own trade first and lit. The main Day 2 link carries the opening; the rooms carry the rest.

**The clock, for every session.**

| When | What happens | Who |
| --- | --- | --- |
| The day before, 1:00 PM | Reminder with the room link | Drip |
| 8:00 AM the day of | "Today at 1:00 PM" letter with the room link | Drip |
| Any time before 12:45 PM | Live link pasted on the Stage tab | Sarah or crew |
| 12:00 PM | "Starts in an hour" letter | Drip |
| 12:45 PM | Rooms turn live: the stream plays, attendance is taken from the browser, questions queue for the session | Automatic |
| During | Stage tab: the question queue refreshes every 15 seconds; mark each one answered. The masterclass run of show lights the current beat by the clock | Sarah |
| Masterclass minute 52 | **Put the offer up.** The three seats appear under the stream in every free seat's room within about 30 seconds, checkout prefilled with their email and crediting their host | Sarah |
| End plus 30 minutes | Rooms close the live view; the session shows "Replay tonight" | Automatic |
| Same afternoon | Replay link (and the transcript link for VIP and up) pasted on the Stage tab. The replay letter goes on the next hourly run | Sarah or crew |

**What waits on a replay link.** The masterclass replay letter (with the ticket offer), the Day 1 and Day 2 replay letters, the Day 3 "three doors" letter and the cohort's Day 3 note. Each waits until its replay link is set, then sends inside its window (40 hours for the masterclass, Day 2 and Day 3; 20 hours for Day 1, so it never collides with the Day 2 reminders). The Stage tab flags every session holding a letter.

**The guarantee, on record.** A ticket holder in the room during Day 1 is marked present in `attended_days`. A refund request that night is checked against it.

**The worksheet.** Every ticket gets the pre-work letter the day after the masterclass; cohort seats get theirs after Day 3. Answers save into the room as people type. The Stage tab lists every worksheet, Platinum first, with the brief it writes: the Day 2 front row is picked from these.

**The tier deliverables.** The Director's Deck, the Studio Kit and the Operator's Playbook open by themselves in every VIP, Platinum and cohort room when Day 3 ends (`BOOTCAMP.dates.deliverables`), and the `kit-ready` letter goes on the next hourly run. Nothing to set on the Stage tab; it shows each file's size, build date and how many seat holders have downloaded it. The sources live in `private/bootcamp/src`; edit them and run `node scripts/bootcamp-deliverables-build.mjs` to rebuild the PDFs and zips in `private/bootcamp/dist`. Downloads go only through `/api/bootcamp/kit/[file]` with the person's signed room key.

**Lost links.** Anyone can ask for their room link again from the room page or the masterclass page. It only ever goes to the address on the registration.
