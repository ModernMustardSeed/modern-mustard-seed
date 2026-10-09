// 2. THE SECRETS GUARD. PreToolUse on Write, Edit, MultiEdit and shell writes.
//
// A key written into a file is a key in git history, whether or not the line
// survives the next edit. The guard recognises the shapes of the keys small
// businesses actually hold and blocks the write. A real env file is where a
// key belongs, so .env files are never checked.

import { run, writtenBody, deny } from './lib.mjs';

const SHAPES = [
  ['a Supabase or JWT key', /eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}/],
  ['a live Stripe key', /\b(sk|rk)_live_[A-Za-z0-9]{20,}/],
  ['a Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{24,}/],
  ['a Google API key', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['an AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a GitHub token', /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{30,}/],
  ['an Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{30,}/],
  ['an OpenAI key', /\bsk-(proj-)?[A-Za-z0-9_-]{40,}/],
  ['a Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/],
  ['a SendGrid key', /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['a Resend key', /\bre_[A-Za-z0-9]{24,}/],
  ['a Twilio auth token', /\bTWILIO_AUTH_TOKEN\s*[=:]\s*['"]?[a-f0-9]{32}\b/i],
  ['a private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
];

run((payload) => {
  const w = writtenBody(payload);
  if (!w || !w.body) return;
  const envTarget = /(^|[\\/])\.env(\.[\w-]+)?$/i.test(w.path) || (w.shell && /(^|[\s\\/'"])\.env(\.[\w-]+)?\b/i.test(w.body));
  if (envTarget) return;
  for (const [name, re] of SHAPES) {
    const m = w.body.match(re);
    if (m) {
      deny(
        'a live key never goes into a file',
        `This write puts what looks like ${name} (starting ${m[0].slice(0, 10)}...) into ${w.path || 'a file through the shell'}. ` +
          'Put the value in an environment variable (.env.local, or your host\'s settings) and read it from there. ' +
          'If this key was already committed anywhere, rotate it today.',
      );
    }
  }
});
