/**
 * REPLY ROUTING TESTS.
 *
 *   npx tsx --test scripts/mail-routing-test.mts
 *
 * Pins the rule that every message we send carries a Reply-To somebody can
 * actually answer. Live probe on 2026-08-22 proved hello@, notifications@ and
 * outbound@modernmustardseed.com all return `550 5.1.1 User does not exist`,
 * and roughly forty send sites use hello@ as their From. A regression here is
 * silent: the mail goes out looking perfect and the customer's reply bounces.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { routableReplyTo } from '../lib/send-email';

const SARAH = 'sarah@modernmustardseed.com';

test('a dead From on our domain gets a Reply-To that works', () => {
  assert.equal(routableReplyTo('Modern Mustard Seed <hello@modernmustardseed.com>'), SARAH);
  assert.equal(routableReplyTo('notifications@modernmustardseed.com'), SARAH);
  assert.equal(routableReplyTo('Mr. Mustard at MUSTARD PRESS <hello@modernmustardseed.com>'), SARAH);
});

test('a real mailbox is left alone', () => {
  assert.equal(routableReplyTo(`Sarah Scarano <${SARAH}>`), undefined);
  assert.equal(routableReplyTo('polly.thompson@modernmustardseed.com'), undefined);
});

test('a plus tag still lands in the base mailbox, so it is routable', () => {
  assert.equal(routableReplyTo('sarah+forge@modernmustardseed.com'), undefined);
});

test('a Reply-To the caller set is respected', () => {
  assert.equal(
    routableReplyTo('Modern Mustard Seed <hello@modernmustardseed.com>', 'polly.thompson@modernmustardseed.com'),
    'polly.thompson@modernmustardseed.com',
  );
});

test('a Reply-To pointing at a dead address is corrected, not trusted', () => {
  assert.equal(routableReplyTo(`Sarah <${SARAH}>`, 'hello@modernmustardseed.com'), SARAH);
});

test('other domains are never rewritten', () => {
  // Client and tenant mail must keep the identity its own office chose.
  assert.equal(routableReplyTo('D&D Landscaping <dalten@ddlandscapingfl.com>'), undefined);
  assert.equal(
    routableReplyTo('Kyler <kyler@kylerslawnandsnow.com>', 'dndlandscaping7@gmail.com'),
    'dndlandscaping7@gmail.com',
  );
});

test('case and display names do not fool the check', () => {
  assert.equal(routableReplyTo('Modern Mustard Seed <HELLO@ModernMustardSeed.com>'), SARAH);
  assert.equal(routableReplyTo(`  <${SARAH.toUpperCase()}>  `), undefined);
});
