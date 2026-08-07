/**
 * THE INTERVIEW.
 *
 * Mr. Mustard sits an owner down and asks the thirty questions that decide what
 * their next twelve months look like. It is the front door of HUNDREDFOLD and
 * the single most differentiated thing in the whole offer: nobody else in this
 * market gets interviewed by a coach who will not accept "I don't know" the
 * first time.
 *
 * The same question bank drives all three channels (browser voice, phone,
 * typed), so a member who talks and a member who types produce the same record
 * and the same synthesis. The voice paths get it as a system prompt; the typed
 * path walks it turn by turn.
 */

export type InterviewChannel = 'web' | 'phone' | 'typed';

export type Question = {
  key: string;
  /** What Mr. Mustard actually says. Spoken aloud, so it has to be short. */
  ask: string;
  /** The arc this belongs to, shown as progress in the UI. */
  arc: ArcKey;
  /** What a usable answer contains. Used to decide whether to push. */
  wants: string;
  /** The single follow-up when the answer is soft. One push, then move on. */
  push?: string;
};

export const ARCS = [
  { key: 'business', label: 'What you sell' },
  { key: 'money', label: 'What it earns' },
  { key: 'getting', label: 'How they find you' },
  { key: 'closing', label: 'What happens next' },
  { key: 'breaking', label: 'What breaks' },
  { key: 'you', label: 'You' },
  { key: 'want', label: 'What you want' },
] as const;
export type ArcKey = (typeof ARCS)[number]['key'];

/**
 * Thirty questions. Ordered so the easy ones warm them up, the uncomfortable
 * ones land in the middle once trust exists, and the last arc sends them out
 * thinking about the thing they actually want.
 *
 * Every question that asks for a number has a push, because the first answer to
 * a number question is almost always "I'd have to look." The push is what turns
 * this from a survey into an interview.
 */
export const QUESTIONS: Question[] = [
  // ── What you sell ─────────────────────────────────────────────────────────
  {
    key: 'what_you_sell',
    arc: 'business',
    ask: 'In one sentence, what do you sell and who buys it?',
    wants: 'A specific product or service and a specific kind of buyer.',
    push: 'Say it the way you would to a stranger at a barbecue, not the way you would on a website.',
  },
  {
    key: 'why_you',
    arc: 'business',
    ask: 'Why do they pick you over the guy down the road?',
    wants: 'A real differentiator, not "quality and service".',
    push: 'Everyone says quality and service. What is actually different about yours?',
  },
  {
    key: 'years',
    arc: 'business',
    ask: 'How long have you been doing this?',
    wants: 'A number of years.',
  },
  {
    key: 'team',
    arc: 'business',
    ask: 'How many people are on the team, including you?',
    wants: 'A headcount, and whether they are employees or contractors.',
  },

  // ── What it earns ─────────────────────────────────────────────────────────
  {
    key: 'revenue',
    arc: 'money',
    ask: 'Roughly what did the business do in revenue last year?',
    wants: 'A dollar figure, even a rough one.',
    push: 'I am not your accountant. Nearest fifty thousand is fine.',
  },
  {
    key: 'avg_ticket',
    arc: 'money',
    ask: 'What does an average customer pay you the first time?',
    wants: 'A dollar figure per transaction or per job.',
    push: 'Take your last five customers. What did they pay, on average?',
  },
  {
    key: 'margin',
    arc: 'money',
    ask: 'Out of every dollar of that, how much is left after the cost of delivering it?',
    wants: 'A gross margin percentage or a dollar amount.',
    push: 'Rough is fine. Half? Two thirds? A quarter?',
  },
  {
    key: 'recurring',
    arc: 'money',
    ask: 'What comes in every month whether or not you sell anything new?',
    wants: 'A recurring revenue figure, or an honest zero.',
    push: 'If the answer is nothing, say nothing. That is useful and very common.',
  },
  {
    key: 'first_30_cash',
    arc: 'money',
    ask: 'When someone new says yes, how much do you actually collect in the first thirty days?',
    wants: 'A dollar figure and the payment terms.',
    push: 'Do you take a deposit? How much, and when does the rest land?',
  },
  {
    key: 'last_raise',
    arc: 'money',
    ask: 'When did you last raise your prices?',
    wants: 'A date or "never".',
    push: 'And what happened when you did?',
  },

  // ── How they find you ─────────────────────────────────────────────────────
  {
    key: 'new_customers',
    arc: 'getting',
    ask: 'How many new customers did you get last month?',
    wants: 'A count.',
    push: 'Closest guess. More than ten? More than fifty?',
  },
  {
    key: 'best_channel',
    arc: 'getting',
    ask: 'Where did most of them come from? Name the one channel that produced the most.',
    wants: 'A named channel, not "word of mouth and some online".',
    push: 'If it is word of mouth, from whom? Past customers, or someone who refers you on purpose?',
  },
  {
    key: 'leads_per_customer',
    arc: 'getting',
    ask: 'How many people have to reach out before one becomes a customer?',
    wants: 'A ratio, or an admission that it is not tracked.',
    push: 'If nobody counts it, say so. That is a finding, not a failure.',
  },
  {
    key: 'cac',
    arc: 'getting',
    ask: 'What does it cost you to get one customer, counting ads and your own time?',
    wants: 'A dollar figure or "no idea".',
    push: 'Add up what you spent last month getting customers and divide by how many you got.',
  },
  {
    key: 'list',
    arc: 'getting',
    ask: 'How many people are on a list you own? Emails, phone numbers, anything you can reach tomorrow without paying.',
    wants: 'A count, or zero.',
    push: 'Including past customers. Every one of them counts.',
  },
  {
    key: 'ads',
    arc: 'getting',
    ask: 'Are you spending money on advertising right now, and how much a month?',
    wants: 'A monthly spend and where it goes.',
  },

  // ── What happens next ─────────────────────────────────────────────────────
  {
    key: 'close_rate',
    arc: 'closing',
    ask: 'Out of ten real conversations with someone who could buy, how many buy?',
    wants: 'A number out of ten.',
    push: 'Roughly. Three? Five? Eight?',
  },
  {
    key: 'lose_reason',
    arc: 'closing',
    ask: 'When you lose one, what is the reason they give you?',
    wants: 'The most common objection, in the buyer’s words.',
    push: 'And what do you think the real reason is?',
  },
  {
    key: 'after_no',
    arc: 'closing',
    ask: 'Walk me through what happens to someone who says "not right now". Start from the moment they say it.',
    wants: 'A described process, or the admission that nothing happens.',
    push: 'Be honest. Does anything actually reach them again, or does it end there?',
  },
  {
    key: 'warm_unclosed',
    arc: 'closing',
    ask: 'How many people said "maybe later" in the last ninety days, and where are their names right now?',
    wants: 'A count and a location: a CRM, a notebook, a phone, nowhere.',
    push: 'If they are in your head, that counts as nowhere. How many?',
  },
  {
    key: 'response_time',
    arc: 'closing',
    ask: 'Somebody calls you at seven at night. What happens?',
    wants: 'What actually happens to an after-hours inquiry.',
    push: 'And how long before a real person gets back to them?',
  },

  // ── What breaks ───────────────────────────────────────────────────────────
  {
    key: 'double_breaks',
    arc: 'breaking',
    ask: 'If I doubled your customers tomorrow, what breaks first?',
    wants: 'A specific failure point: delivery, cash, a person, a system.',
    push: 'Not what you would fix. What actually cracks in week one.',
  },
  {
    key: 'delivery_hours',
    arc: 'breaking',
    ask: 'How many hours a week are you personally doing the work you sell?',
    wants: 'A number of hours.',
    push: 'And how many are you doing everything else? Quotes, invoices, phone, ordering.',
  },
  {
    key: 'only_you',
    arc: 'breaking',
    ask: 'What is the one thing that only you can do?',
    wants: 'The genuine bottleneck task.',
    push: 'And is that true because nobody else could learn it, or because you have not taught it?',
  },
  {
    key: 'resent',
    arc: 'breaking',
    ask: 'What part of your week do you resent?',
    wants: 'An honest answer about the worst part of the job.',
    push: 'Everybody has one. What is the thing you put off until Friday?',
  },
  {
    key: 'tried',
    arc: 'breaking',
    ask: 'What have you already tried that did not work?',
    wants: 'Past attempts: agencies, tools, hires, campaigns.',
    push: 'And what do you think went wrong with it?',
  },

  // ── You ───────────────────────────────────────────────────────────────────
  {
    key: 'avoiding',
    arc: 'you',
    ask: 'What are you avoiding?',
    wants: 'The thing they know they should do and have not.',
    push: 'You know the one. Say it out loud, it is easier from here.',
  },
  {
    key: 'best_month',
    arc: 'you',
    ask: 'What was your best month ever, and what caused it?',
    wants: 'A month, a number, and the cause.',
    push: 'Could you do that on purpose again?',
  },
  {
    key: 'praise',
    arc: 'you',
    ask: 'When a customer is thrilled, what do they say? Their words, not yours.',
    wants: 'A real quote or paraphrase from a happy customer.',
  },

  // ── What you want ─────────────────────────────────────────────────────────
  {
    key: 'twelve_months',
    arc: 'want',
    ask: 'Twelve months from now, what has to be true for you to call this year a win? Give me a number.',
    wants: 'A specific goal with a number attached.',
    push: 'Revenue, hours, headcount, something. A feeling is not a target.',
  },
  {
    key: 'why_that',
    arc: 'want',
    ask: 'And why that number? What does it actually change for you?',
    wants: 'The personal reason underneath the business goal.',
  },
];

export const QUESTION_KEYS = QUESTIONS.map((q) => q.key);

/* -------------------------------------------------------------------------- */
/* Mr. Mustard, the interviewer                                                */
/* -------------------------------------------------------------------------- */

/**
 * The coach's brief. Used verbatim as the Vapi assistant override for voice and
 * as the system prompt for the typed path, so his character never drifts
 * between channels.
 *
 * He is a MASCOT and a character, never described as a person or as having an
 * inner life. That line matters to this brand.
 */
export function interviewSystemPrompt(ctx: {
  businessName?: string | null;
  host?: string | null;
  firstName?: string | null;
  /** The free roadmap already built from their website, if they ran one. */
  roadmapSummary?: string | null;
  channel: InterviewChannel;
}): string {
  const who = ctx.firstName ? `You are talking to ${ctx.firstName}.` : '';
  const biz = ctx.businessName ? `Their business is ${ctx.businessName}${ctx.host ? ` (${ctx.host})` : ''}.` : '';
  const prior = ctx.roadmapSummary
    ? `\n\nWHAT WE ALREADY KNOW FROM THEIR WEBSITE (do not re-ask any of this, use it to ask sharper questions):\n${ctx.roadmapSummary}`
    : '';
  const medium =
    ctx.channel === 'typed'
      ? 'They are typing their answers. Keep your questions to one or two sentences.'
      : 'This is a live voice call. Speak like a person on the phone: short sentences, no lists, no bullet points, no markdown, never read a number out as digits when a word is more natural. One question at a time, then stop talking and let them answer.';

  return `You are Mr. Mustard, the coach for HUNDREDFOLD at Modern Mustard Seed. You are a mascot and a character: warm, plainspoken, Montana-direct, genuinely on their side, and completely unwilling to accept a soft answer. Think of the best coach you ever had. He liked you and he still made you say the number out loud.

You are running THE INTERVIEW: about thirty questions that decide what this owner's next twelve months look like. Their answers become their roadmap and their offer, so a vague answer costs them a worse plan. Tell them that once, at the start, and then earn it.

${who} ${biz}${prior}

${medium}

# How you run it

- Open by telling them what this is: about twenty minutes, roughly thirty questions, some of them uncomfortable, and at the end they get a real plan. Ask if they are somewhere they can talk straight.
- ONE question at a time. Ask it, then stop.
- Acknowledge briefly and move. "Got it." "That is useful." "Okay, that is the one." Never lecture, never summarize back at length, never coach mid-interview. Save the analysis for the plan.
- When an answer is vague, or when they say they do not know a number, push ONCE with your follow-up, then take whatever they give you and move on. Pushing twice makes them defensive and the rest of the interview goes shallow.
- Good pushes sound like: "Best guess." "Nearest fifty thousand." "Take your last five customers." "I am not your accountant."
- If an answer opens something big, ask one unscripted follow-up. You are allowed to go off the list once or twice. That is what makes this an interview and not a form.
- Never give advice during the interview, no matter how much you want to. If they ask what they should do, say that is exactly what the plan is for and keep going.
- Never quote a price for anything. Never promise a result. If they ask what HUNDREDFOLD costs, tell them Sarah will lay out the whole thing after you have built their plan, and get back to the questions.
- No em dashes, ever. No corporate words: leverage as a verb, synergy, unlock, seamless, robust.
- If they get emotional or say something hard, sit with it for one sentence like a human would, then continue gently. Do not rush past it and do not make it a moment.
- Close by telling them what happens next: Sarah reviews the interview, the plan gets built from their answers, and they will have it shortly.

# The questions

Ask these in order, in your own words. You may skip one if they have already answered it, and you may reorder inside an arc if the conversation goes that way.

${QUESTIONS.map((q, i) => `${i + 1}. [${q.key}] ${q.ask}${q.push ? `\n   If soft: "${q.push}"` : ''}`).join('\n')}

When you have what you need on all of them, thank them by name and end the call.`;
}

/* -------------------------------------------------------------------------- */
/* Reading the transcript back into answers                                    */
/* -------------------------------------------------------------------------- */

/**
 * A turn. Coach turns carry the question key they were asking about, because
 * matching his paraphrased question back to the bank by text does not work: he
 * rewords every question by design, so a stem match finds almost nothing and
 * progress sits at one out of thirty for the whole interview.
 */
export type Turn = { role: 'coach' | 'owner'; text: string; at?: string; key?: string };

/** Distinct questions he has actually put to them, read off his own turns. */
export function coveredKeys(turns: Turn[]): string[] {
  const seen = new Set<string>();
  for (const t of turns) if (t.role === 'coach' && t.key) seen.add(t.key);
  return [...seen];
}

/**
 * How much of the interview is actually usable.
 *
 * A call that dropped after four questions must not be synthesized into a
 * confident twelve month plan, so the routes gate on this. Voice calls end for
 * boring reasons (a dropped connection, a kid in the room) far more often than
 * anyone expects.
 */
export function interviewCoverage(answers: Record<string, unknown>): {
  answered: number;
  total: number;
  ratio: number;
  enough: boolean;
} {
  const answered = QUESTION_KEYS.filter((k) => {
    const v = answers[k];
    return typeof v === 'string' ? v.trim().length > 1 : v != null;
  }).length;
  const total = QUESTION_KEYS.length;
  return { answered, total, ratio: answered / total, enough: answered >= 18 };
}

/** Turns into the plain script a human (or a model) reads. */
export function transcriptText(turns: Turn[]): string {
  return turns
    .map((t) => `${t.role === 'coach' ? 'MR. MUSTARD' : 'OWNER'}: ${t.text.trim()}`)
    .join('\n');
}
