/**
 * Trial send of the "Find Your Horizon" partner-recruiting email.
 * Sends the pretty, production HTML to a preview address via Resend (the app's
 * own verified sender), so Sarah can approve the whole thing before the campaign
 * goes out. Run: node scripts/send-partner-yacht-trial.mjs [recipient]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TO = process.argv[2] || 'wildhopehouse@gmail.com';
const SITE = 'https://modernmustardseed.com';
// Clean links, no "utm_medium=campaign". Gmail reads those params and they are
// one of the surest ways to get filed under Promotions. A bare /partners link
// reads as a personal note, not a blast.
const LANDING = `${SITE}/partners`;
const VIDEO = `${SITE}/ads/partner-yacht-16x9.mp4`;
const POSTER = `${SITE}/ads/partner-yacht-poster.png`;
const CELL = '(406) 250-6076';

// Read RESEND_API_KEY from .env.local without pulling in a dotenv dep.
function envKey(name) {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

const ink = '#161616';
const cream = '#FBF6EA';
const gold = '#F5B700';
const red = '#E0301E';
const serif = "Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const mono = "'Courier New', Courier, monospace";

const tier = (rate, label, detail) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid rgba(22,22,22,0.12);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${serif};font-size:26px;font-weight:bold;color:${ink};width:96px;white-space:nowrap;">${rate}</td>
        <td style="font-family:${sans};font-size:14px;color:#3A3733;line-height:1.5;"><strong style="color:${ink};">${label}.</strong> ${detail}</td>
      </table>
    </td>
  </tr>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Sell what every business now needs</title></head>
<body style="margin:0;padding:0;background:#EDE6D4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Up to 50% on our products, and recurring income every month on the subscriptions that renew. You open the door, we do the work.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6D4;padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${cream};border:2px solid ${ink};border-radius:16px;overflow:hidden;">

    <!-- header -->
    <tr><td style="padding:26px 32px 8px;">
      <div style="font-family:${mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${red};font-weight:bold;">The Partner Program</div>
      <div style="font-family:${sans};font-size:18px;font-weight:800;letter-spacing:1px;color:${ink};margin-top:6px;">MODERN MUSTARD SEED</div>
    </td></tr>

    <!-- video thumbnail -->
    <tr><td style="padding:14px 32px 0;">
      <a href="${LANDING}" style="text-decoration:none;display:block;">
        <img src="${POSTER}" width="536" alt="Watch the film: Find Your Horizon" style="display:block;width:100%;height:auto;border:3px solid ${ink};border-radius:12px;" />
      </a>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:14px;">
        <a href="${VIDEO}" style="font-family:${sans};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${ink};background:${gold};border:2px solid ${ink};border-radius:999px;padding:11px 24px;text-decoration:none;display:inline-block;">&#9654;&nbsp; Watch the 60-second film</a>
      </td></tr></table>
    </td></tr>

    <!-- headline + body -->
    <tr><td style="padding:26px 32px 6px;">
      <h1 style="font-family:${serif};font-size:34px;line-height:1.1;font-weight:bold;color:${ink};margin:0 0 16px;">Sell what every business now needs.</h1>
      <p style="font-family:${sans};font-size:15px;line-height:1.65;color:#3A3733;margin:0 0 14px;">How does a little seed end up on a yacht in the Mediterranean? He sells the one thing every business on earth suddenly needs: an AI website, a voice agent that answers the phone, and custom software that runs the busywork. Modern Mustard Seed builds all of it. You just open the door.</p>
      <p style="font-family:${sans};font-size:15px;line-height:1.65;color:#3A3733;margin:0 0 4px;">Refer a client, we build it, you earn. No coding, no inventory, no overhead. You make the introductions from anywhere, we do the work, and you get paid, again and again:</p>
    </td></tr>

    <!-- the ladder -->
    <tr><td style="padding:8px 32px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${tier('50%', 'On every product', 'Share a playbook or bundle and earn half, the moment someone buys.')}
        ${tier('25%', 'Every month', 'Put a business on a 24/7 AI receptionist and earn a quarter of their bill, every month, for a year.')}
        ${tier('10-20%', 'On all builds', 'Send a bigger client who needs a real build and earn on the project, from 10% up to 20% as a Producer.')}
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td align="center" style="padding:26px 32px 8px;">
      <a href="${LANDING}" style="font-family:${sans};font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${ink};background:${gold};border:2px solid ${ink};border-radius:999px;padding:16px 40px;text-decoration:none;display:inline-block;">Become a partner &rarr;</a>
    </td></tr>

    <!-- sign-off with cell -->
    <tr><td style="padding:16px 32px 4px;">
      <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#3A3733;margin:0 0 6px;">You bring the trust. We do the work and pay you well. Come find your own horizon.</p>
      <p style="font-family:${serif};font-size:17px;color:${ink};margin:14px 0 2px;font-style:italic;">Sarah</p>
      <p style="font-family:${sans};font-size:13px;color:#3A3733;margin:0;">Sarah Scarano, Modern Mustard Seed</p>
      <p style="font-family:${sans};font-size:14px;color:${ink};margin:10px 0 0;font-weight:700;">Questions? Text me directly: <a href="tel:+14062506076" style="color:${ink};">${CELL}</a></p>
    </td></tr>

    <!-- footer -->
    <tr><td style="padding:24px 32px 28px;">
      <div style="border-top:1px solid rgba(22,22,22,0.12);padding-top:14px;">
        <p style="font-family:${sans};font-size:11px;line-height:1.6;color:rgba(22,22,22,0.5);margin:0;">Modern Mustard Seed, Kalispell MT. You are receiving this because we think you would be a great partner. Partners always disclose that they earn a commission. Not interested? Just reply and we will not reach out again.</p>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;

// A real text/plain alternative. A multipart email with a genuine text part
// reads as personal mail, not a promo blast, and is one of the strongest
// signals for landing in the Primary tab rather than Promotions.
const text = `Sell what every business now needs.

How does a little seed end up on a yacht in the Mediterranean? He sells the one thing every business on earth suddenly needs: an AI website, a voice agent that answers the phone, and custom software that runs the busywork. Modern Mustard Seed builds all of it. You just open the door.

Refer a client, we build it, you earn. No coding, no inventory, no overhead. You make the introductions from anywhere, we do the work, and you get paid, again and again:

- 50% on every product. Share a playbook or bundle and earn half, the moment someone buys.
- 25% every month. Put a business on a 24/7 AI receptionist and earn a quarter of their bill, every month, for a year.
- 10-20% on all builds. Send a bigger client who needs a real build and earn on the project, from 10% up to 20% as a Producer.

Watch the 60-second film: ${VIDEO}
Become a partner: ${LANDING}

You bring the trust. We do the work and pay you well. Come find your own horizon.

Sarah
Sarah Scarano, Modern Mustard Seed
Questions? Text me directly: ${CELL}`;

// Always dump a local copy for visual review; --dump exits before sending.
const previewPath = join(tmpdir(), 'partner-yacht-email.html');
try {
  writeFileSync(previewPath, html);
} catch {}
if (process.argv.includes('--dump')) {
  console.log('dumped preview html (no send):', previewPath);
  process.exit(0);
}

const key = envKey('RESEND_API_KEY');
if (!key) {
  console.error('No RESEND_API_KEY in .env.local');
  process.exit(1);
}

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: [TO],
    reply_to: 'sarah@modernmustardseed.com',
    // A personal, 1:1 subject (names a real person, no hype words) tabs to
    // Primary far more reliably than a salesy "Sell what every business needs".
    subject: 'A partner idea from Sarah at Modern Mustard Seed',
    html,
    text,
  }),
});
const json = await res.json().catch(() => ({}));
if (res.ok) {
  console.log(`SENT to ${TO}. Resend id: ${json.id || '(none returned)'}`);
} else {
  console.error(`SEND FAILED (${res.status}):`, JSON.stringify(json));
  process.exit(1);
}
