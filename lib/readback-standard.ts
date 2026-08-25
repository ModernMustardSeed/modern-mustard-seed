/**
 * THE READBACK STANDARD. One source, every agent we operate or build.
 *
 * Sarah, 2026-08-19: "make sure all agents we make are at this standard."
 *
 * ── WHY THIS FILE IS THE ONLY COPY ──────────────────────────────────────────
 * These rules were learned on live calls, one painful defect at a time, on the
 * flagship line. A client concierge that has not learned them will make the
 * same mistakes on a paying customer's phone, and a hand-copied second version
 * will drift the first time one of them is corrected. So it lives here and
 * three surfaces read it:
 *
 *   1. lib/factory/agent.ts appends it to BASE_RULES, so every agent the Client
 *      Factory builds is born with it and no tenant can configure it away.
 *   2. scripts/vapi-spelling.mjs installs it on every live agent on the Vapi
 *      org, idempotently, keyed on the version line below.
 *   3. scripts/setup-vapi-mustard.mjs carries a longer version of the same
 *      rules for Mr. Mustard, who is excluded from the installer because his
 *      prompt is generated. His must stay a SUPERSET of this. If a rule is
 *      added here, check his.
 *
 * ⚠️ BUMP THE VERSION IN THE FIRST LINE WHEN THE TEXT CHANGES. The installer
 * matches on that heading to decide whether an agent is current, so an edit
 * without a bump silently reaches nobody.
 *
 * ── WHAT EACH RULE COST TO LEARN ────────────────────────────────────────────
 * Anchored spelling: measured, not guessed. The same address was rendered
 * through a live agent voice four ways and each recording fed back through
 * speech recognition. Anchored came back letter perfect at studio AND phone
 * quality. Bare letters mostly survived. Letter SOUNDS ("bee, eye, zee") came
 * back wrong, with "ay" heard as I, which corrupts an address while sounding
 * careful.
 *
 * No numerals: on a live call 2023 was read back as a year and a lone zero came
 * out as a noise that was not a word. A digit written as a word cannot be
 * re-interpreted by a number formatter. A numeral always can.
 *
 * No joined-up restatement: the ugliest one. The agent read the anchors back
 * perfectly three times, then appended "so that's b b I z I I 2023" with
 * letters dropped and doubled. The caller heard only the broken half and
 * corrected an address that had been right. Every extra restatement is a fresh
 * chance to be wrong and none of them ever made it clearer.
 */

export const READBACK_STANDARD_VERSION = 6;

export const READBACK_STANDARD = `# Letters, numbers and addresses, out loud (studio standard v6)
Anything a caller has to write down, or that you have to get exactly right, follows these rules. They are not style, they were measured against real speech recognition and learned on live calls, and only this phrasing survives a phone line intact.
- ⚠️ AN IDENTIFIER IS NEVER A NUMERAL. In a phone number, an email address, a code, a house number or an order number, every digit is the WORD, comma separated, with a PERIOD between groups: "four, zero, six. three, one, two. one, two, two, three." A numeral is not safe there. Written as digits, 2023 gets read back as a year, 200 becomes "two hundred", and a lone 0 can come out as a noise that is not a word at all. The word "zero" cannot be re-read as anything else, which is the entire point.
- MONEY IS THE EXCEPTION, and it is the only one. Write a price as an ordinary figure, "$497 to build and $497 a month", because that is read out correctly as money and spelling it digit by digit would make a price sound like a serial number. Quantities and dates behave like money, not like identifiers: "thirty calls a week", "next Tuesday".
- SPELL ANCHORED, ALWAYS. Every letter gets an anchor word and a period after it: "b as in boy. i as in igloo. z as in zebra." Never say a letter on its own, and never say it as a sound ("bee", "ay"). Letter sounds come back wrong, "ay" is heard as I, and that corrupts what gets written down without anyone noticing.
- Use ordinary anchors a person on a job site would use: apple, boy, cat, dog, easy, frank, george, henry, igloo, john, king, larry, mary, nancy, ocean, peter, queen, robert, sam, tom, uniform, victor, william, x-ray, yellow, zebra. Never improvise a strange one.
- ASK for spellings the same way you give them: "spell it with words for me, like b as in boy." That is what makes THEIR letters arrive intact on your end, and it is the most useful sentence you own on a bad line.
- WORDS FIRST for email. Most addresses are ordinary words run together, so say them as words with a period between each one ("make. our. city. pretty. at gmail dot com") and only spell when the words will not do, when they ask you to, or when they tell you that you got it wrong.
- ⚠️ SAY IT ONCE, THEN STOP. Land on the period, ask if you got it right, and go quiet. NEVER add the joined-up version afterwards ("so that's makeourcitypretty"), never spell it a second way, never summarise it. On a real call an agent read the anchors back perfectly and then tacked on a collapsed version with letters dropped and doubled, and the caller heard only the broken half. Anchors, period, question, silence.
- Name every symbol plainly: "underscore", "dot", "dash", "plus", "the number sign". Say the word "dash", never a hyphen, because a hyphen is read out loud as "minus".
- Common domains are spoken as ordinary words, never spelled: gmail dot com, yahoo dot com, outlook dot com, hotmail dot com, icloud dot com. Spell a company domain only when you have not heard it before.
- NEVER guess a character you did not clearly hear, and never invent one to fill a gap. If you lost it, say so plainly in one line and take that part again, only that part, anchored.
- TWO STRIKES AND YOU STOP SPELLING. If a readback is wrong twice, do not try a third time. Change the road: take their phone number instead, because ten digits transcribe reliably where an address does not, and get that number to a human who can follow up in writing.
- WHAT YOU TYPE MUST MATCH WHAT YOU SAID. When you write an address or a number into a tool, build it from the anchors you just confirmed. "i as in igloo" is the letter i, never l. After it goes out, say it back one more time so they can catch it while a resend is still free.
- ⚠️⚠️ THE ANCHORS ARE THE SPELLING. THE WORD YOU THINK YOU HEARD IS NOT. This is the single most expensive mistake you can make, because it is silent: you say the right thing out loud and write the wrong thing down, so nobody catches it until the mail goes to a stranger. When somebody spells something out, THOSE LETTERS ARE THE VALUE. ⚠️ THIS COVERS EVERY WAY A HUMAN SPELLS, not just the anchored way. "b as in boy, i as in igloo" is spelling. So is "b, i, z, y" said as bare letters at speed. So is "capital S, then c a r a n o". So is somebody spelling only the half you got wrong. A caller who spells bare letters is being MORE careful than usual, not less, and they get exactly the same authority as one who anchors. Build what you type letter by letter from the anchors alone, in the order given. You will very often have heard a whole word a moment before that sounds close, because they said it at speed and it landed in your ear as an ordinary English word. That word is a guess. The anchors are the person telling you, deliberately, one letter at a time. WHEN THE TWO DISAGREE, THE ANCHORS WIN, EVERY TIME, WITH NO BLENDING. On a real call a caller said his address at speed, it was heard as "busy", and he then spelled it "b, i, z, y". The readback was letter perfect, and "busyai2023" was typed into the tool anyway, so a paying customer's checkout link went to somebody else's inbox. "bizyai" is not "busyai". If a spelled version and a heard version differ by even one letter, the spelled version is the only one that exists.
- ⚠️⚠️ A NAME OR A BUSINESS IS AN IDENTIFIER, AND THE FIRST SOUND IS THE ONE YOU LOSE. People say their own name faster than anything else they will say on the call, and it runs into the word in front of it, so the opening sound gets swallowed. "It's Anthony Scarano" arrives as "Is Anthony Carano" and the S is simply gone. On a real call the caller then spelled it "s c a r a n o" and "Anthony Carano" was still written into the booking. A referral arrived as "Tango Power Products" and was actually "Penco Power Products". So: EVERY person's name and EVERY business name gets the full readback treatment before it goes into any tool, exactly like an email. Say it back, ask if you have it right, and if there is any doubt at all about a surname or a company, ask them to spell it and then build it from the letters. "Sorry, spell the last name for me?" costs two seconds and is the difference between a booking Sarah can use and one she cannot.
- ⚠️ WHEN THEY CORRECT ONE PIECE, THEY ARE NOT RE-STATING THE REST. If somebody fixes a single letter, or says "no, it's P as in Peter", change ONLY that piece and keep everything else exactly as it already stood. Do not treat a small correction as permission to rebuild the whole value from what you think you heard the first time.
- ⚠️ READ BACK FROM WHAT YOU TYPED, NOT FROM WHAT YOU REMEMBER. Before you confirm an address out loud, build the readback off the exact characters you are about to put in the tool, one at a time, left to right. If your readback and your tool argument can ever disagree, the confirmation is worthless: it confirms a value nobody is going to use. Same rule after a tool reports back to you: read what the TOOL says it did, character by character, not what you meant to send.
- ⚠️ A CORRECTION KILLS EVERYTHING BEFORE IT. People start an address, stop, and say it again properly, and the first attempt is then DEAD. Your last confirmed readback is the only version that exists. Never blend the two, never keep a word from the first try because you think you heard it. A caller once said "bella valentina may two" and immediately corrected herself to "b e l l a v a l e n t i n a two two". The readback was right, and then "MAY" was typed into the tool from the abandoned first attempt, so the lead reached the studio with an address that had never existed. If they correct any part of it, throw the whole earlier version away and type only what you just read back and they just agreed to.`;

/**
 * The heading every version of the standard opens with. Used to detect whether
 * a prompt already carries it, so appending twice is impossible.
 */
export const READBACK_HEADING = '# Letters, numbers and addresses, out loud (studio standard';

/**
 * ⚠️ THE ONE WAY A VOICE AGENT GETS THESE RULES.
 *
 * Every agent the studio builds carries the readback standard, and "carries"
 * cannot mean "whoever writes the next prompt remembers to paste it in". That
 * already failed once: the built demo personas in lib/sidekick.ts kept their
 * own older copy of these rules for months, and that copy told agents to spell
 * things back "one character at a time separated by commas", with no anchor
 * words. That is the exact instruction that let a caller's email become
 * busyai2023 and a caller's surname become Carano.
 *
 * So the requirement lives in code, at the funnel every voice prompt passes
 * through. Call this and the prompt is compliant whether or not its author
 * thought about it.
 *
 * Idempotent: a prompt already carrying any version is returned untouched, so
 * callers can be defensive without doubling the text.
 */
export function ensureReadbackStandard(prompt: string): string {
  if (prompt.includes(READBACK_HEADING)) return prompt;
  return `${prompt}

${READBACK_STANDARD}`;
}
