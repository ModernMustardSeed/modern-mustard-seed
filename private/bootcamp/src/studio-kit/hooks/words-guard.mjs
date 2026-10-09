// 1. THE WORDS GUARD. PreToolUse on Write, Edit, MultiEdit and shell writes.
//
// Every business has sentences it never puts in writing: a pricing shape it
// does not sell, a retired product name, a promise it cannot keep. Those live
// in bannedPhrases in studio-kit.json. The guard blocks the write and tells
// Claude why, so the sentence gets rewritten instead of shipped.
//
// Only writes are checked. A search for a banned phrase is not a use of it.

import { run, writtenBody, deny } from './lib.mjs';

run((payload, cfg) => {
  const w = writtenBody(payload);
  if (!w || !w.body) return;
  const skip = (cfg.wordsSkip ?? []).some((p) => new RegExp(p, 'i').test(w.path) || (w.shell && new RegExp(p, 'i').test(w.body)));
  if (skip) return;
  for (const entry of cfg.bannedPhrases ?? []) {
    let re;
    try {
      re = new RegExp(entry.pattern, 'i');
    } catch {
      continue;
    }
    const m = w.body.match(re);
    if (m) {
      deny(
        'a phrase this business never writes',
        `The text about to be written contains "${m[0]}". ${entry.why ?? ''}\n` +
          'Rewrite the sentence so it says what the business actually offers. The list lives in studio-kit.json, bannedPhrases.',
      );
    }
  }
});
