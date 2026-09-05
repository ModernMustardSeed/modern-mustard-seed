/**
 * "YES, BUILD IT" ARRIVING BY EMAIL.
 *
 * Mr. Mustard could always build on a call. A prospect who replied to the cold
 * email saying "yes please" got nothing: lib/zoho-inbox.ts matched the reply to
 * the right lead and stamped `reply_at`, and then no code anywhere read the
 * words. The warmest moment in the funnel sat in an inbox until Sarah opened it.
 *
 * This reads them.
 *
 * ── THE COST OF BEING WRONG IS ASYMMETRIC ────────────────────────────────────
 * A build is 24 to 60 minutes of headless Claude on one machine with two lanes.
 * Firing one at somebody who wrote "sure, what would that cost?" burns an hour
 * of the floor that a real yes was queued behind. So the classifier has three
 * answers, not two, and the middle one is a text to Sarah rather than a guess.
 *
 * ── THE QUOTED HISTORY IS THE TRAP ───────────────────────────────────────────
 * Every reply carries our own email quoted underneath it, and our own email is
 * full of the words "build", "website" and "free". Classifying the raw body
 * makes every single reply, including "unsubscribe", read as an enthusiastic
 * yes. The quoted block is stripped first, and that is not a refinement, it is
 * the difference between this working and this being actively harmful.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueue } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import { sendViaResend } from '@/lib/send-email';
import { pageAskNeedsHuman } from '@/lib/acq/pager';
import type { AcqProspect } from '@/lib/acq/types';

export type AskVerdict = 'clear' | 'ambiguous' | 'none';

export type AskClassification = {
  verdict: AskVerdict;
  /** The reply with quoted history removed. What the human actually typed. */
  said: string;
  /** Why it landed where it did, in words, for the timeline and the text. */
  why: string;
};

/* ───────────────────────────── reading the reply ─────────────────────────── */

/**
 * Everything below one of these is our own words coming back at us.
 *
 * Ordered longest-signal first. Gmail, Outlook, Apple Mail and Zoho each mark
 * the boundary differently and a reply usually carries only one of them.
 */
const QUOTE_BOUNDARY = [
  /^\s*-{2,}\s*original message\s*-{2,}/im,
  /^\s*_{5,}\s*$/m,
  /^\s*on .{4,120}\bwrote:\s*$/im,
  /^\s*from:\s*.+\bsent:\s*/im,
  /^\s*>{1,}\s?/m,
  /^\s*sent from my /im,
];

/** Signature and footer noise that is never the message. */
const TRAILING_NOISE = [
  /\byou got this because modern mustard seed\b[\s\S]*$/i,
  /\bunsubscribe here\b[\s\S]*$/i,
  /\bconfidentiality notice\b[\s\S]*$/i,
];

/** The human's own words, with our quoted email and the footers taken off. */
export function stripQuoted(raw: string): string {
  let text = String(raw ?? '').replace(/\r\n/g, '\n');
  for (const re of QUOTE_BOUNDARY) {
    const m = re.exec(text);
    if (m && m.index > 0) text = text.slice(0, m.index);
    else if (m && m.index === 0) return ''; // the whole body is quoted history
  }
  for (const re of TRAILING_NOISE) text = text.replace(re, '');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * A machine wrote this, not a person.
 *
 * An out-of-office that happens to contain the word "building" must never fire
 * a build, and vacation autoresponders are the single most common inbound we
 * get after a cold send.
 */
const AUTOMATED = /\b(out of (the )?office|auto[- ]?repl(y|ied)|automatic reply|on (vacation|annual leave|holiday|maternity|paternity)|i am (currently )?(away|out)|delivery status notification|undeliverable|mail delivery|do not reply|no longer with|has left the company)\b/i;

/** A no is a no, and it outranks every affirmative word in the same message. */
const REFUSAL = /\b(unsubscribe|remove me|take me off|stop emailing|not interested|no thanks|no thank you|do not contact|don'?t contact|leave me alone|spam|opt.?out|cease)\b/i;

/**
 * An unmistakable yes.
 *
 * Deliberately narrow. Everything here is a sentence a person writes when they
 * have already decided, and none of it is something written while still asking.
 */
const CLEAR_YES = [
  /^\s*(yes|yep|yeah|yup|sure|ok|okay|perfect|great|sounds good|please do|absolutely|definitely)\b[\s!.,]*$/im,
  /\b(go ahead and (build|make)|please build|build (it|mine|one|me one)|make (it|mine|me one)|send it over|send it through|let'?s do it|lets do it|i'?m in|count me in|do it)\b/i,
  /\b(yes|yeah|sure|ok|okay)[,\s]+(please|go ahead|build|do it|send)\b/i,
  /\bi'?d like (one|it|a demo|to see it)\b/i,
];

/**
 * Present in a message that is still a question, whatever else it says.
 *
 * A price question is the commonest one, and it is exactly the message that
 * reads as a yes to a naive matcher: "sure, how much to build that?"
 */
const STILL_ASKING =
  /\b(how much|what (does|would|will) (it|this|that) cost|what'?s the (cost|price|catch)|pricing|price|cost\b|fee|charge|contract|obligation|per month|monthly|free\?|is it free|who are you|how did you get|what is this|what'?s this|not sure|maybe|thinking about|call me|give me a call|can we (talk|chat|meet)|schedule|before i|first i|if i|would i)\b/i;

/** Any mention that this is about a build at all. Used only for the middle verdict. */
const BUILD_TOPIC = /\b(build|built|demo|website|web site|site|receptionist|voice agent|agent|talking website|mustard)\b/i;

/**
 * Where a reply lands: fire it, wake Sarah, or ignore it.
 *
 * The order is the policy. A refusal short-circuits everything, an automated
 * message is never a person, and an affirmative that still contains a question
 * is a conversation rather than an instruction.
 */
export function classifyBuildAsk(rawBody: string, subject = ''): AskClassification {
  const said = stripQuoted(rawBody);
  const hay = `${subject}\n${said}`;

  if (!said) return { verdict: 'none', said, why: 'The reply was nothing but quoted history.' };
  if (AUTOMATED.test(hay)) return { verdict: 'none', said, why: 'An automated reply, not a person.' };
  if (REFUSAL.test(hay)) return { verdict: 'none', said, why: 'They said no or asked to be removed.' };

  const yes = CLEAR_YES.some((re) => re.test(said));
  const asking = STILL_ASKING.test(said);

  if (yes && !asking) return { verdict: 'clear', said, why: 'An unambiguous yes with nothing still being asked.' };
  if (yes && asking) return { verdict: 'ambiguous', said, why: 'Reads as a yes but still contains a question.' };

  /*
   * A question on its own is still an ambiguous ask, even with no build word in
   * it, and this is the case a word matcher gets wrong every time.
   *
   * "How much does it cost?" contains nothing about websites or receptionists.
   * The subject it is asking about lives entirely in OUR email, quoted below
   * theirs, which stripQuoted has just correctly thrown away. But we only ever
   * see this message because it is a reply to the thing we sent, so the context
   * is not in the text, it is in the fact that the text exists at all.
   *
   * Treating it as nothing is how a hand-raise gets filed and forgotten, which
   * is the exact failure this module was written to end.
   */
  if (asking) return { verdict: 'ambiguous', said, why: 'They replied with a question rather than an instruction.' };
  if (BUILD_TOPIC.test(said)) return { verdict: 'ambiguous', said, why: 'On the topic of a build, but not an instruction to start one.' };

  return { verdict: 'none', said, why: 'A reply about something else.' };
}

/* ──────────────────────────── acting on the reply ────────────────────────── */

export type AskOutcome = {
  verdict: AskVerdict;
  action: 'queued' | 'already-built' | 'paged' | 'ignored' | 'blocked';
  note: string;
};

/** Already has everything a build would produce, so there is nothing to make. */
function alreadyHasSuite(lead: AcqProspect): boolean {
  return Boolean(lead.hub_demo_url) && lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
}

/**
 * A prospect replied. Decide what the machine does about it.
 *
 * Never throws: this runs inside the mailbox sync, and a classifier problem
 * must not stop the rest of the inbox from being read.
 */
export async function handleInboundBuildAsk(
  db: SupabaseClient,
  lead: AcqProspect,
  args: { body: string; subject?: string },
): Promise<AskOutcome> {
  try {
    const c = classifyBuildAsk(args.body, args.subject ?? '');
    if (c.verdict === 'none') return { verdict: c.verdict, action: 'ignored', note: c.why };

    // Somebody who opted out or hard bounced is not a build request no matter
    // what the words say, and a row we already know is unmailable cannot be
    // told when the build finishes, which makes the build pointless.
    if (lead.unsubscribed_at || lead.bounced || lead.dnc_checked || lead.status === 'dnc') {
      return { verdict: c.verdict, action: 'blocked', note: 'They are unsubscribed, bounced or on the do-not-contact list.' };
    }

    if (c.verdict === 'ambiguous') {
      await db
        .from('outbound_leads')
        .update({ needs_human: `Replied and may be asking for a build: "${c.said.slice(0, 160)}"` })
        .eq('id', lead.id);
      await recordEvent(db, {
        leadId: lead.id,
        campaignId: lead.acq_campaign_id,
        type: 'needs_human',
        label: 'Reply might be a build request, held for a person',
        detail: { why: c.why, said: c.said.slice(0, 600) },
      });
      await pageAskNeedsHuman({ db, lead, campaignId: lead.acq_campaign_id, quote: c.said.slice(0, 400) });
      return { verdict: c.verdict, action: 'paged', note: c.why };
    }

    // A clear yes from somebody whose suite is already finished does not need a
    // second build, it needs the email they are effectively asking for. The
    // demo_email job picks the suite or the receptionist version on its own.
    if (alreadyHasSuite(lead)) {
      await enqueue(db, { kind: 'demo_email', leadId: lead.id, campaignId: lead.acq_campaign_id, step: 0 });
      await recordEvent(db, {
        leadId: lead.id,
        campaignId: lead.acq_campaign_id,
        type: 'forge_requested',
        label: 'They asked by email; it was already built, so it is being sent',
        detail: { said: c.said.slice(0, 600) },
      });
      return { verdict: c.verdict, action: 'already-built', note: 'Suite already built; the email was queued instead.' };
    }

    const job = await enqueue(db, {
      kind: 'forge',
      leadId: lead.id,
      campaignId: lead.acq_campaign_id,
      payload: { site: true, designTier: 2, by: 'email-reply', mailWhenReady: true },
    });
    if (!job.ok) return { verdict: c.verdict, action: 'blocked', note: job.error };

    await recordEvent(db, {
      leadId: lead.id,
      campaignId: lead.acq_campaign_id,
      type: 'forge_requested',
      label: 'They asked for a build by replying to our email',
      detail: { why: c.why, said: c.said.slice(0, 600) },
    });
    await db.from('outbound_leads').update({ demo_status: 'forging' }).eq('id', lead.id);
    await sendAck(lead);

    return { verdict: c.verdict, action: 'queued', note: 'Build queued from their reply.' };
  } catch (err) {
    return { verdict: 'none', action: 'ignored', note: err instanceof Error ? err.message : 'The reply handler threw.' };
  }
}

/**
 * Tell them it started.
 *
 * A website takes up to an hour, and an hour of silence after somebody types
 * "yes please" is how a warm lead cools. This is a transactional answer to
 * their own email, from a mailbox that exists and accepts replies, and it
 * promises only the thing that is actually running.
 */
async function sendAck(lead: AcqProspect): Promise<void> {
  if (!lead.email) return;
  const business = lead.business_name ?? 'your business';
  const text = [
    `Got it, building it now.`,
    ``,
    `Your receptionist is ready in a few minutes. The website takes up to an hour,`,
    `because it is designed from scratch for ${business} rather than dropped into a`,
    `template. Both land in this inbox on one page when they are done.`,
    ``,
    `Free, no card, nothing to sign up for. Reply here if you want anything changed.`,
    ``,
    `Sarah`,
    `Modern Mustard Seed`,
  ].join('\n');

  await sendViaResend({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: lead.email,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `Building it now`,
    text,
    html: text
      .split('\n\n')
      .map((p) => `<p style="margin:0 0 14px;font:15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#161616">${p.replace(/\n/g, ' ')}</p>`)
      .join(''),
    mailbox: 'sarah@modernmustardseed.com',
  });
}
