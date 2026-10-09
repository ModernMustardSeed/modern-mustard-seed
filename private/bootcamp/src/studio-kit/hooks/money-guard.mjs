// 7. THE MONEY GUARD. PreToolUse on Bash, PowerShell and every MCP tool.
//
// Charges, refunds, payouts, price changes and subscription edits move real
// money and show up on a customer's statement. Every one stops and asks.
// Reading (list, retrieve, balance) never asks, so reporting stays fast.

import { run, command, mcpTool, ask } from './lib.mjs';

const STRIPE_CLI =
  /\bstripe\s+(charges|refunds|payouts|payment_intents|setup_intents|subscriptions|subscription_items|invoices|invoiceitems|transfers|prices|products|coupons|customers|checkout\s+sessions|payment_links|credit_notes)\s+(create|update|delete|cancel|capture|confirm|pay|void|finalize|send|refund)/i;
const STRIPE_API = /api\.stripe\.com\/v1\//i;
const HTTP_WRITE = /(-X\s*(POST|DELETE|PUT|PATCH)\b|--data\b|\s-d\s|\s-F\s|-Method\s+['"]?(Post|Delete|Put|Patch)\b)/i;
const MCP_MONEY = /(stripe|square|paypal|quickbooks|xero|shopify)/i;
const MCP_MONEY_WRITE = /(create|update|cancel|refund|delete|capture|charge|pay|void|finalize)/i;

run((payload) => {
  const tool = mcpTool(payload);
  if (tool) {
    if (MCP_MONEY.test(tool) && MCP_MONEY_WRITE.test(tool.split('__').pop() ?? '')) {
      ask(`${tool} changes money or what a customer is charged. Check the amount, the customer and live versus test mode.`);
    }
    return;
  }
  const cmd = command(payload);
  if (!cmd) return;
  if (STRIPE_CLI.test(cmd) || /\bstripe\b[^\n]*\s--live\b/.test(cmd) || (STRIPE_API.test(cmd) && HTTP_WRITE.test(cmd))) {
    ask('This command moves money or changes what customers are charged. Check the amount, the customer and live versus test mode before approving.');
  }
});
