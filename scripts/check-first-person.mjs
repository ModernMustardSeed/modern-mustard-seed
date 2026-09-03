#!/usr/bin/env node
/**
 * THE FIRST PERSON LAW HAS A GATE, AND THE GATE HAS A TEST (2026-09-03).
 *
 * Sarah, after D&D Landscaping's page said "Tell him what he is walking into":
 * "make that a law that it makes all of our websites, demo or otherwise,
 * personal and not third person."
 *
 * lib/demo-quality.mjs reads every finished build for its owner spoken of in
 * the third person, and the worker hands the lines back. A gate that silently
 * stops matching is the same as no gate, and one that flags a customer's own
 * review, a boat, or a pet is a gate that gets switched off. Both failure
 * modes are checked here, on fixtures, before every production build. The
 * false positives below are real: each one came out of a finished demo when
 * the scan was first run over thirty of them.
 *
 * Run:  node scripts/check-first-person.mjs
 */
import { thirdPersonLines, judgeDemo } from '../lib/demo-quality.mjs';

const problems = [];
let count = 0;
const expect = (name, html, want, owner = null) => {
  count++;
  const got = thirdPersonLines(html, owner);
  const ok = want === 0 ? got.length === 0 : got.length >= want;
  if (!ok) {
    const shown = got.length ? ': ' + got.map((l) => '"' + l + '"').join('; ') : '';
    problems.push(`${name}: expected ${want === 0 ? 'no lines' : 'at least ' + want + ' line(s)'}, got ${got.length}${shown}`);
  }
};

// 1. The sentence that started it. "Dalten" is in the sentence before, which puts the owner in view.
expect(
  'the D&D heading',
  '<h2>Tell him what he is walking into.</h2><p>Three taps, no email gate, so Dalten shows up already knowing the property.</p>',
  1,
  'Dalten',
);
// 2. The shapes a builder reaches for by reflex.
expect('owner will call', '<p>Greg will call you the day before. He prices every job himself after he walks it.</p>', 2, 'Greg');
expect('his crew', '<section class="crew"><p>Greg and his crew have been cutting lawns in Kalispell since 2009.</p></section>', 1, 'Greg');
expect('a woman owner', '<p>Olivia makes every batch herself, and she will not ship one she has not tasted.</p>', 1, 'Olivia');
expect("named owner's crew", "<p>Greg's crew leaves the place spotless.</p>", 1, 'Greg Miller');
// 3. The owner in view by the word, not the name: "Meet the owner" then "He started the shop".
expect('heading then paragraph', '<h3>Meet the owner</h3><p>He started the shop in 2009</p>', 1);
// 4. No name in the brief, but the sentence is the owner promising the customer something. These are real lines from finished demos.
expect('she will find you a chair', '<p>Tell her what you want done and roughly when, and she will find you a chair.</p>', 1);
expect('call back from him', '<p>Expect a call back from him today.</p>', 1);
expect('she is the one who calls you', '<p>She does the exam, she reads the result, and she is the one who calls you back about it.</p>', 1);
// 5. The same page, fixed, is clean.
expect(
  'the fixed page',
  '<h2>Let us know what we are walking into.</h2><p>Three taps, no email gate, so we show up already knowing the property. We will call you the day before. I price every job myself after I walk it.</p>',
  0,
  'Dalten',
);
// 6. A customer's own words are the one third person allowed.
expect(
  'a blockquote',
  '<blockquote><p>He showed up on time and his crew left the place spotless.</p><cite>Maria R.</cite></blockquote><p>We answer every call.</p>',
  0,
  'Greg',
);
expect(
  'a proof section',
  '<section id="proof" class="proof-wall"><h2>Word around town</h2><figure><p>Greg had our patio done in two days. He was great.</p></figure></section><p>Our work, our word.</p>',
  0,
  'Greg',
);
expect('a reviews list', '<ul class="reviews"><li>Greg fixed what two other guys could not. He is the best.</li></ul><p>Call us today.</p>', 0, 'Greg');
// 7. Scripts, styles and comments are not copy.
expect(
  'code is not copy',
  '<script>const he = 1; if (his) {}</script><style>.her{color:red}</style><!-- Greg said he would --><p>We build it right.</p>',
  0,
  'Greg',
);
// 8. "his or her" is about the visitor, not the owner.
expect('the visitor', '<p>Every customer gets his or her own written estimate. Greg signs it.</p>', 0, 'Greg');
// 9. The name on a button, under a letter, or as a sign-off is the personal form, not the distant one.
expect('name on a button', '<a href="tel:1">Call Greg</a><p class="sig">Greg Miller</p><p>Thanks for reading. Greg</p>', 0, 'Greg');
expect('a name that is a word', '<p>Will you call us? We will be there.</p>', 0, 'Will');
// 10. The three false positives from the first run over real demos. None of these is the owner.
expect('a boat', '<p>How long is she, and where does she sit</p><p>Bring the registration.</p>', 0);
expect('a pet', "<p>Yes, let's get her seen today.</p><p>Bring her in with an empty stomach, and if she gets worse before then, call straight back.</p>", 0);
expect('a passer-by', '<p>It also means the phone rings while somebody is halfway up a ladder with a nail gun in his hand.</p>', 0);
expect('scripture', '<p>"That believing ye might have life through his name."</p>', 0, 'Monte');

// The verdict carries it, so the cockpit badge and the worker both see it.
const q = judgeDemo('<p>Greg will call you the day before.</p>', null, 'Greg');
if (!Array.isArray(q.thirdPerson) || q.thirdPerson.length !== 1) {
  problems.push(`judgeDemo does not surface thirdPerson (got ${JSON.stringify(q.thirdPerson)})`);
}
if (!q.reasons.some((r) => /third person/.test(r))) problems.push('judgeDemo reasons do not name the third person fault');

if (problems.length) {
  console.error('\nTHE FIRST PERSON GATE IS BROKEN:\n');
  for (const p of problems) console.error('  x ' + p);
  console.error('\nThe site speaks as the business: we, us, our, or I. Never he, him, his, she, her,');
  console.error('never "{Owner} will call you". A customer quote in the proof wall is the one exception.\n');
  process.exit(1);
}
console.log(`first person: the gate reads third person and leaves customer quotes, boats and pets alone (${count} fixtures)`);
