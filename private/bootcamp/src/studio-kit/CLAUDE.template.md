# Operating Rules: FILL IN your business name

These rules apply to every session, every project and every agent. They are
not suggestions and they do not need to be restated.

Fill in every line marked FILL IN the first afternoon. Then read the twenty
laws at the bottom and keep, edit or delete each one. A law you keep is a law
every agent obeys from the next session on.

## Who we are

- Owner: FILL IN name, role
- Business: FILL IN name, what it does in one sentence, where
- Customer: FILL IN who buys, what they already have, what they want
- Framing: FILL IN the one idea everything we do carries (example: "we build
  things our customers own and can run without us")

## What we sell

FILL IN each package, its set price and what it includes. Agents quote only
from this list. A request that fits no package goes to the owner.

## Deliverable standard

Finished work only. No drafts, no outlines, no "starting points", nothing the
owner is expected to complete. If a password or decision is genuinely missing,
build everything that does not depend on it, state the assumption in one line,
and name the one thing needed.

## Writing rules

- Lead with the answer. No preamble.
- No hedging. "This will work" or "this will not work".
- Specific over general. Name the number, the file, the date.
- We, us, our. The business speaks as itself.
- FILL IN anything you never want written (a punctuation habit, a phrase, a
  retired name). Mirror each one in `~/.claude/studio-kit/studio-kit.json`
  under bannedPhrases so the words guard enforces it.

## Pricing language

FILL IN how prices are stated and how they are never stated. Example: "We sell
set packages. Never write a price by the hour. Adjustments to what we built are
included and never get a price."

## Tools

FILL IN the stack: website platform, email, calendar, payments, database, where
files live, which command-line tools you use.

## The twenty laws

Each law is one sentence, followed by the incident that paid for it. They are
written for a small business run with a crew of agents. Keep the ones that fit,
edit the nouns to match your business, delete the rest.

1. **Never put a customer's name, logo or claim onto a picture of their
   property, vehicle or sign unless it is verifiably already there.**
   Paid for by: a demo that painted a prospect's name on a truck they did not
   own. They noticed in the first second and stopped reading.

2. **Never tell anyone their website, listing or business lacks something
   unless a tool read the live page today and did not find it.**
   Paid for by: an email that told an owner their site had no phone number.
   It was in the footer. That email ended the conversation.

3. **A lead is marked "contacted" only by a person.**
   Paid for by: an automation that set the flag after sending a reminder. The
   pipeline showed forty people as worked who had never heard a human voice.

4. **A product sells on its own page at its own price. It is never thrown in
   free to close another sale.**
   Paid for by: a freebie offered to close a deal. The next three prospects
   asked for it free too, and the product never sold on its own again.

5. **Every piece of work we ship carries our signature, and the signature is a
   working link.**
   Paid for by: a year of finished work with our name in grey text and no link.
   Not one referral could find us.

6. **A retired word stays retired in everything a person reads. The database
   may keep the old spelling.**
   Paid for by: a renamed product whose old name kept appearing in emails for
   two months, confusing the customers who had just learned the new one.

7. **Production ships one way: merge to the main branch. Never deploy from a
   laptop, never point a domain by hand.**
   Paid for by: a deploy from a laptop that overwrote a change shipped an hour
   earlier, and a hand-pointed domain that took the site offline for an hour.

8. **No two scheduled jobs start on the same minute.**
   Paid for by: two jobs that both ran at the top of the hour. One finished;
   the other silently lost its write, and nobody knew for a week.

9. **One package manager, one lockfile.**
   Paid for by: a stray second lockfile. The site built on a laptop and failed
   on the host, and the error pointed nowhere near the cause.

10. **Our master keys never go into a customer's system. Every customer gets
    their own accounts in their own name.**
    Paid for by: a customer project built on the business's own database key.
    Handing it over meant rebuilding it.

11. **A demo shows the customer's own trade, never a generic placeholder.**
    Paid for by: a demo for a plumber with a stock photo of an office. The
    owner said it looked like it was made for someone else, because it was.

12. **Outreach never prints a guessed number about the recipient's business.
    The ask is something free for them, never a call with us.**
    Paid for by: an email that guessed a contractor's missed calls. He knew his
    real number, and ours was wrong.

13. **Customer email apologizes once at most, never in the subject line, and
    never explains our internal mistakes.**
    Paid for by: a three-paragraph apology for a bug the customer never saw.
    They saw it after that.

14. **Adjustments to what we built are included. Never quote a price for one.**
    Paid for by: a small invoice for a small change that cost a customer who
    had been about to buy the next package.

15. **A rejected style stays rejected. The build checks enforce it.**
    Paid for by: a design direction the owner turned down that kept reappearing
    in new work, because nothing remembered the no.

16. **Authority is earned. We never write pages about ourselves on neutral
    reference sites.**
    Paid for by: a self-written reference page that was deleted and flagged,
    which made the real coverage harder to get.

17. **Never automatically select a device or account found on a shared
    network or shared login.**
    Paid for by: a command that sent a video to the first TV it found. It was
    the neighbor's.

18. **Several agents run at once. Read what the others are doing before
    branching, committing or pushing.**
    Paid for by: two sessions editing the same file. The second push quietly
    erased a day of the first one's work.

19. **Everything we ship speaks as the business: we, us, our. Never "he will
    call you". A customer quote is the only third person allowed.**
    Paid for by: a website that talked about its owner in the third person.
    Customers asked who was writing it.

20. **Big files get their own workspace, never the shared one.**
    Paid for by: several sessions pulling video files into the shared copy at
    once. The disk filled to zero and every session stopped.

## Adding a law

A new law goes in only when all three are true:

1. Breaking it produces something a customer, a lead or a search engine sees.
2. It cannot be worked out from the files in front of the agent.
3. It has already been broken once, or the owner has stated it as a rule.

Everything else is a note in memory, not a law. Twenty is plenty; a law that
is never read is not a law.
