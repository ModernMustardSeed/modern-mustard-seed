/**
 * ROOT-DOMAIN MAIL RULES.
 *
 *   pnpm mail:test
 *
 * Pins the three rules lib/send-email.ts enforces at the one choke point every
 * send passes:
 *
 *  1. Every message carries a Reply-To somebody can answer. hello@,
 *     notifications@ and outbound@modernmustardseed.com return
 *     `550 5.1.1 User does not exist` (live probe 2026-08-22), and the outreach
 *     subdomain has no mailbox at all.
 *  2. Root-domain mail never carries the open pixel.
 *  3. Nothing with an unsubscribe header leaves from the root domain.
 *
 * A regression in any of them is silent: the mail goes out looking perfect and
 * either the reply bounces or Sarah's own address pays the reputation bill.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { routableReplyTo, oneToOneHtml, bulkOnRootRefusal } from '../lib/send-email';
import { outreachAddressFor, OUTREACH_FROM } from '../lib/outreach-domain';

const SARAH = 'sarah@modernmustardseed.com';
const PIXEL =
  '<tr><td style="padding:0;height:1px;line-height:1px;font-size:1px"><img src="https://modernmustardseed.com/api/track/open?p=abc" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px"></td></tr>';
const BODY = `<table><tr><td>Hi Dana</td></tr>${PIXEL}</table>`;

test('a dead From on our domain gets a Reply-To that works', () => {
  assert.equal(routableReplyTo('Modern Mustard Seed <hello@modernmustardseed.com>'), SARAH);
  assert.equal(routableReplyTo('notifications@modernmustardseed.com'), SARAH);
});

test('the outreach subdomain has no mailbox, so it routes to the root', () => {
  assert.equal(routableReplyTo(OUTREACH_FROM), SARAH);
});

test('a real mailbox is left alone, plus tags included', () => {
  assert.equal(routableReplyTo(`Sarah Scarano <${SARAH}>`), undefined);
  assert.equal(routableReplyTo('polly.thompson@modernmustardseed.com'), undefined);
  assert.equal(routableReplyTo('sarah+forge@modernmustardseed.com'), undefined);
});

test('a Reply-To the caller set is respected unless it is dead', () => {
  assert.equal(
    routableReplyTo('Modern Mustard Seed <hello@modernmustardseed.com>', 'polly.thompson@modernmustardseed.com'),
    'polly.thompson@modernmustardseed.com',
  );
  assert.equal(routableReplyTo(`Sarah <${SARAH}>`, 'hello@modernmustardseed.com'), SARAH);
});

test('other domains are never rewritten', () => {
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

test('root-domain mail loses the open pixel, outreach mail keeps it', () => {
  const root = oneToOneHtml(`Sarah <${SARAH}>`, BODY) ?? '';
  assert.ok(!root.includes('/api/track/open'));
  assert.ok(root.includes('Hi Dana'));
  assert.equal(oneToOneHtml(OUTREACH_FROM, BODY), BODY);
  assert.equal(oneToOneHtml(`Sarah <${SARAH}>`, undefined), undefined);
});

test('bulk mail is refused on the root domain and allowed on the subdomain', () => {
  assert.match(bulkOnRootRefusal(`Sarah <${SARAH}>`, true) ?? '', /outreach\.modernmustardseed\.com/);
  assert.equal(bulkOnRootRefusal(`Sarah <${SARAH}>`, false), null);
  assert.equal(bulkOnRootRefusal(OUTREACH_FROM, true), null);
});

test('a rep address maps to its outreach twin', () => {
  assert.equal(outreachAddressFor(SARAH), 'sarah@outreach.modernmustardseed.com');
  assert.equal(outreachAddressFor('Polly.Thompson@ModernMustardSeed.com'), 'polly.thompson@outreach.modernmustardseed.com');
  assert.equal(outreachAddressFor('dalten@ddlandscapingfl.com'), 'dalten@ddlandscapingfl.com');
});
