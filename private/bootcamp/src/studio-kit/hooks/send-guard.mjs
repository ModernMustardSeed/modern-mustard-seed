// 6. THE SEND GUARD. PreToolUse on Bash, PowerShell and every MCP tool.
//
// A draft can be rewritten. A sent email, a text, a posted update cannot.
// Anything that reaches a person outside the building stops and asks first:
// mail and SMS APIs, social posting endpoints, chat webhooks, MCP tools whose
// names send or publish, and any of your own send scripts listed in
// sendCommands.

import { run, command, mcpTool, ask } from './lib.mjs';

const ENDPOINTS = [
  /api\.resend\.com/i,
  /api\.sendgrid\.com/i,
  /api\.mailgun\.net/i,
  /api\.postmarkapp\.com/i,
  /api\.twilio\.com/i,
  /graph\.facebook\.com\/[^\s'"]*\/(feed|photos|videos|messages|media_publish)/i,
  /api\.linkedin\.com\/[^\s'"]*(ugcPosts|posts|shares)/i,
  /hooks\.slack\.com\/services/i,
  /slack\.com\/api\/chat\.postMessage/i,
  /discord(app)?\.com\/api\/webhooks/i,
  /gmail\.googleapis\.com\/[^\s'"]*\/send/i,
  /\bSend-MailMessage\b/i,
  /\b(sendmail|mailx?)\s+-/,
];

const MCP_SEND = /(^|_)(send|post|publish|reply|tweet|broadcast)(_|$)/i;

run((payload, cfg) => {
  const tool = mcpTool(payload);
  if (tool) {
    const name = tool.split('__').pop() ?? '';
    if (MCP_SEND.test(name)) {
      ask(`${tool} sends or publishes something a person outside the business will see. Read it before it goes.`);
    }
    return;
  }
  const cmd = command(payload);
  if (!cmd) return;
  const own = (cfg.sendCommands ?? [])
    .map((p) => {
      try {
        return new RegExp(p, 'i');
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  for (const re of [...ENDPOINTS, ...own]) {
    if (re.test(cmd)) {
      ask(`This command sends something to a person outside the business (matched ${re}). Read the message and the recipient list before approving.`);
    }
  }
});
