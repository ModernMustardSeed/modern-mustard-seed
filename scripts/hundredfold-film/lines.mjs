/**
 * THE SCRIPT for the HUNDREDFOLD films.
 *
 * Two cuts share one rig, because they are the same walkthrough at two lengths:
 *
 *   hero     ~2 min, sits on /hundredfold under the offer. It has to answer
 *            "what IS this" for somebody who arrived cold.
 *   webinar  ~5 min, sits at /hundredfold/webinar with no registration wall.
 *            It has room to actually teach the method, so it earns the ask.
 *
 * ⚠️ THE BEAT IDS ARE THE CONTRACT between this file, capture.mjs, and
 * build.mjs. The picture is cut TO THE VOICE: each beat is held on screen for
 * exactly as long as its narration takes to say, which is the only reason this
 * needs no editing pass. Renaming a beat in one file alone silently drops a
 * scene or leaves the camera parked on a dead one.
 *
 * ⚠️ EVERY CLAIM HERE IS CHECKED AGAINST WHAT IS ACTUALLY ON SCREEN. The film
 * shows Whitaker Med Spa, which is a FICTIONAL business running through the
 * REAL engine, and the narration says so out loud in the open. A walkthrough
 * that implies an invented med spa is a client would be a fabricated case study
 * ([[mms-proof-testimonials]]), and it would be the easiest thing in the world
 * to do by accident here, because every screen is real.
 *
 * No em dashes. Short declaratives, because Andrew at +4% reads them cleanly
 * and a comma-spliced sentence makes him rush the landing.
 */

/** Mr. Mustard narrates. Andrew is his established voice in the suite films. */
export const MUSTARD = {
  edge: process.env.HF_FILM_VOICE || 'en-US-AndrewMultilingualNeural',
  rate: '+4%',
};

/**
 * The hero cut. Twelve beats, roughly two minutes.
 *
 * The order is deliberate and it is the order the product actually happens in:
 * the free thing, the interview, the plan, the offer, the builds, the price.
 * A walkthrough that opens on the price is a pitch. This one earns it.
 */
export const HERO = [
  {
    id: 'open',
    say: 'This is Hundredfold. Before I explain it, I am going to show it to you running a business.',
  },
  {
    id: 'demo-disclosure',
    say: 'The business on screen is Whitaker Med Spa. It is invented. Every system you are about to watch is not.',
  },
  {
    id: 'roadmap-tool',
    say: 'It starts free. You hand us a web address and we tell you the one thing capping your growth.',
  },
  {
    id: 'interview',
    say: 'If you want the real version, I interview you. Thirty one questions, out loud, and I do not accept a vague answer.',
  },
  {
    id: 'plan-constraint',
    say: 'Out of that comes a plan built from your answers instead of your homepage. One constraint. Named.',
  },
  {
    id: 'plan-windows',
    say: 'Four windows across twelve months. Each one has a goal, a number to watch, and a gate. You do not advance because ninety days passed. You advance because the gate cleared.',
  },
  {
    id: 'offer',
    say: 'Then we rebuild what you sell. Named, promised, priced, and guaranteed. Most businesses do not have a traffic problem. They have an offer nobody can repeat.',
  },
  {
    id: 'arsenal',
    say: 'Here is the part nobody else does. Every window has work in it that a machine should be doing, so we build those machines into your business.',
  },
  {
    id: 'build-live',
    say: 'Watch. This is a price estimator, made for this business, live at its own address, and ready to paste onto their website.',
  },
  {
    id: 'tool-live',
    say: 'It is real. A customer fills it in, the answer reaches the owner, and the front desk stops answering the same question all day.',
  },
  {
    id: 'coach',
    say: 'And I stay. Not a call you save your questions for. Your own coach, who has read your whole file, at three in the morning if that is when you think.',
  },
  {
    id: 'close',
    say: 'Five thousand to start, then two thousand five hundred a month, month to month. The interview is free and it is the fastest way to understand any of this.',
  },
];

/**
 * The webinar cut. The hero beats plus the teaching the hero has no room for.
 *
 * Sarah's call on 2026-08-07 was that the webinar carries NO registration wall,
 * so it cannot be a teaser. Somebody who watches the whole thing and never buys
 * should still leave with a method they can run on their own. That is what the
 * extra beats are for, and it is why the ask sits under the player rather than
 * in front of it.
 */
export const WEBINAR = [
  {
    id: 'open',
    say: 'This is Hundredfold. I am going to show you the whole method, and I am going to show it running on a real system rather than on slides.',
  },
  {
    id: 'demo-disclosure',
    say: 'The business on screen is Whitaker Med Spa. It is invented, so nobody real is being exposed. The engine underneath it is the same one you would get.',
  },
  {
    id: 'why-constraint',
    say: 'Here is the idea the whole thing rests on. At any moment, exactly one thing is capping your business. Fixing anything else changes nothing until you fix that.',
  },
  {
    id: 'roadmap-tool',
    say: 'So we start by naming it. This is free, it reads your website, and it comes back with one constraint out of six. Leads, sales, delivery, cash, offer, or the owner.',
  },
  {
    id: 'roadmap-limit',
    say: 'It is honest about its own limits. A website is the thinnest possible read on a business. It cannot hear what your customers say on the phone or what you quietly discount.',
  },
  {
    id: 'interview',
    say: 'Which is why the real version is a conversation. Thirty one questions. What you sell and to whom. What happens to the people who say no. What breaks first if you double tomorrow.',
  },
  {
    id: 'interview-why',
    say: 'Most owners have never been asked these out loud. The answers are uncomfortable, and they are the whole plan.',
  },
  {
    id: 'plan-constraint',
    say: 'Here is what came back for this one. A constraint, the evidence underneath it, and the first move. Notice it is one move, not eleven.',
  },
  {
    id: 'plan-windows',
    say: 'Then twelve months in four windows. Each window has a goal, one number to watch, and a gate that has to clear before you are allowed to move on.',
  },
  {
    id: 'plan-gate',
    say: 'That gate is the part people skip. A plan without a number on it is a wish. You do not advance because ninety days passed. You advance because the number cleared.',
  },
  {
    id: 'offer',
    say: 'Window one is almost always the offer. Named, promised, priced, and guaranteed, with the sales copy and the call script written underneath it.',
  },
  {
    id: 'offer-why',
    say: 'Most businesses do not have a traffic problem. They have an offer nobody can repeat to their spouse and a price nobody can justify. More traffic makes that worse, not better.',
  },
  {
    id: 'arsenal',
    say: 'Now the part nobody else does. Every window has work in it that a machine should be doing, so we build those machines into your business, one window at a time.',
  },
  {
    id: 'build-live',
    say: 'This is one of them. A price estimator, built for this business, live at its own address, with a line of code the owner pastes onto their own site.',
  },
  {
    id: 'tool-live',
    say: 'And it works. A customer fills it in, the estimate reaches the owner while that customer is still on the page, and the front desk stops answering the same question all day.',
  },
  {
    id: 'arsenal-limits',
    say: 'Pages, images, documents, sequences, and tools are unlimited and you fire them yourself. The things that spend real money wait for your yes, with the cost shown first.',
  },
  {
    id: 'coach',
    say: 'And I stay. Not a weekly call you save your questions for. Your own coach, who has read your interview, your plan, your offer, and every number you have logged.',
  },
  {
    id: 'guarantee',
    say: 'Your first thirty days produce your offer, your roadmap, and your first working system. If all three are not in your hands by day thirty, you do not pay the second month and you keep everything we made.',
  },
  {
    id: 'close',
    say: 'Five thousand to start, then two thousand five hundred a month, month to month. If you only do one thing after this, do the interview. It is free, and it will tell you more about your business than the rest of this video did.',
  },
];

export const CUTS = { hero: HERO, webinar: WEBINAR };
