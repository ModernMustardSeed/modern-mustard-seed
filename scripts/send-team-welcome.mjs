/**
 * The team-partner WELCOME email. A warm note from the Mustard family (Mr. and
 * Mrs. Mustard) welcoming a new right hand to "learn and earn": call for us,
 * post for us, and bring us deals, and earn on everything they refer.
 *
 * Personalized per person with their partner code + tracked link. Features the
 * "Find Your Horizon" family film as the welcome video, and links to everything
 * they need on day one (admin login, onboarding academy, outbound, ads).
 *
 * Usage:
 *   node scripts/send-team-welcome.mjs --dump               # write a preview, no send
 *   node scripts/send-team-welcome.mjs --send <email>       # send to one recipient
 *   node scripts/send-team-welcome.mjs --all                # send to all four
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = 'https://modernmustardseed.com';
const VIDEO = `${SITE}/ads/partner-yacht-16x9.mp4`;
const POSTER = `${SITE}/ads/partner-yacht-poster.png`;
const CELL = '(406) 250-6076';

// The team. Each gets their real partner code + a tracked link.
const RECIPIENTS = [
  { first: 'Sarah', name: 'Sarah', email: 'makeourcitypretty@gmail.com', code: 'MAKEOURCITY' },
  { first: 'Polly', name: 'Polly Thompson', email: 'polly.thompson@modernmustardseed.com', code: 'POLLY' },
  { first: 'Easton', name: 'Easton Parker', email: 'easton12parrot@icloud.com', code: 'EASTON' },
  { first: 'Anthony', name: 'Anthony Scarano', email: 'bizyai2023@gmail.com', code: 'ANTH6YSR' },
];

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
const blue = '#1E50C8';
const serif = "Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const mono = "'Courier New', Courier, monospace";

const tier = (rate, label, detail) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid rgba(22,22,22,0.12);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${serif};font-size:24px;font-weight:bold;color:${ink};width:92px;white-space:nowrap;">${rate}</td>
        <td style="font-family:${sans};font-size:14px;color:#3A3733;line-height:1.5;"><strong style="color:${ink};">${label}.</strong> ${detail}</td>
      </table>
    </td>
  </tr>`;

const linkRow = (label, url, note) => `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid rgba(22,22,22,0.10);">
      <a href="${url}" style="font-family:${sans};font-size:15px;font-weight:700;color:${blue};text-decoration:none;">${label} &rarr;</a>
      <div style="font-family:${sans};font-size:12.5px;color:#6B675F;margin-top:2px;">${note}</div>
    </td>
  </tr>`;

function buildHtml(r) {
  const refLink = `${SITE}/?ref=${r.code}`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Welcome to the Mustard family</title></head>
<body style="margin:0;padding:0;background:#EDE6D4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">You're a true partner now. Learn and earn with us: call for us, post for us, and bring us deals.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6D4;padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${cream};border:2px solid ${ink};border-radius:16px;overflow:hidden;">

    <!-- header -->
    <tr><td style="padding:26px 32px 8px;">
      <div style="font-family:${mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${red};font-weight:bold;">You're family now</div>
      <div style="font-family:${sans};font-size:18px;font-weight:800;letter-spacing:1px;color:${ink};margin-top:6px;">MODERN MUSTARD SEED</div>
    </td></tr>

    <!-- welcome video -->
    <tr><td style="padding:14px 32px 0;">
      <a href="${VIDEO}" style="text-decoration:none;display:block;">
        <img src="${POSTER}" width="536" alt="A welcome from the Mustard family" style="display:block;width:100%;height:auto;border:3px solid ${ink};border-radius:12px;" />
      </a>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:14px;">
        <a href="${VIDEO}" style="font-family:${sans};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${ink};background:${gold};border:2px solid ${ink};border-radius:999px;padding:11px 24px;text-decoration:none;display:inline-block;">&#9654;&nbsp; Watch the family's welcome</a>
      </td></tr></table>
    </td></tr>

    <!-- headline + body -->
    <tr><td style="padding:26px 32px 6px;">
      <h1 style="font-family:${serif};font-size:32px;line-height:1.12;font-weight:bold;color:${ink};margin:0 0 16px;">Welcome to the family, ${r.first}.</h1>
      <p style="font-family:${sans};font-size:15px;line-height:1.65;color:#3A3733;margin:0 0 14px;">We are so glad you are here. You are a true Modern Mustard Seed partner now, and that means one simple, wonderful thing: you get to <strong>learn and earn</strong> right alongside us.</p>
      <p style="font-family:${sans};font-size:15px;line-height:1.65;color:#3A3733;margin:0 0 14px;">You call for us, you post for us, and you bring us deals. We do the building, you open the doors, and you get paid, again and again. No coding, no overhead, no ceiling. Just good work put in front of people who need it, and a family cheering you on the whole way.</p>
    </td></tr>

    <!-- their code -->
    <tr><td style="padding:6px 32px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border:2px solid ${ink};border-radius:12px;">
        <tr><td style="padding:18px 22px;">
          <div style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A8378;font-weight:bold;">Your partner code</div>
          <div style="font-family:${serif};font-size:26px;font-weight:bold;color:${ink};letter-spacing:1px;margin-top:3px;">${r.code}</div>
          <div style="font-family:${sans};font-size:13px;color:#3A3733;margin-top:8px;">Your tracked link (share it anywhere, it follows your people for 60 days):</div>
          <a href="${refLink}" style="font-family:${mono};font-size:13px;color:${blue};text-decoration:none;word-break:break-all;">${refLink}</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- earn ladder -->
    <tr><td style="padding:20px 32px 4px;">
      <div style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${red};font-weight:bold;margin-bottom:6px;">What you earn</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${tier('50%', 'On every product', 'Share a playbook or bundle and earn half, the moment someone buys.')}
        ${tier('25%', 'Every month', 'Put a business on a 24/7 AI receptionist and earn a quarter of their bill, every month, for a year.')}
        ${tier('10-20%', 'On all builds', 'Send a bigger client who needs a real build and earn on the project, from 10% up to 20% as a Producer.')}
      </table>
    </td></tr>

    <!-- where to start -->
    <tr><td style="padding:22px 32px 4px;">
      <div style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${red};font-weight:bold;margin-bottom:4px;">Where to start</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${linkRow('Log into your command center', `${SITE}/admin/login`, 'Your back office. A quick welcome tour meets you at the door.')}
        ${linkRow('Start your onboarding', `${SITE}/admin/onboarding`, 'The Right Hand academy. Learn the whole thing, rank up as you go.')}
        ${linkRow('Open the dial floor (Outbound)', `${SITE}/admin/outbound`, 'Your leads, the words to say, and one-tap outcomes. Book demos and calls.')}
        ${linkRow('Grab ads to post', `${SITE}/admin/ads`, 'The Mr. Mustard commercials, cut and ready. Post them, get seen, get paid.')}
      </table>
    </td></tr>

    <!-- sign-off -->
    <tr><td style="padding:24px 32px 8px;">
      <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#3A3733;margin:0 0 6px;">This is a real seat at a real table. Ask us anything, anytime. We have got you.</p>
      <p style="font-family:${serif};font-size:18px;color:${ink};margin:14px 0 2px;font-style:italic;">With love, the Mustard family</p>
      <p style="font-family:${sans};font-size:13px;color:#3A3733;margin:0;">Mr. &amp; Mrs. Mustard, and Sarah</p>
      <p style="font-family:${sans};font-size:14px;color:${ink};margin:10px 0 0;font-weight:700;">Text me anytime: <a href="tel:+14062506076" style="color:${ink};">${CELL}</a></p>
    </td></tr>

    <!-- footer -->
    <tr><td style="padding:22px 32px 28px;">
      <div style="border-top:1px solid rgba(22,22,22,0.12);padding-top:14px;">
        <p style="font-family:${sans};font-size:11px;line-height:1.6;color:rgba(22,22,22,0.5);margin:0;">Modern Mustard Seed, Kalispell MT. You are receiving this because you are on our team. Partners always disclose that they earn a commission. Welcome aboard.</p>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

function buildText(r) {
  const refLink = `${SITE}/?ref=${r.code}`;
  return `Welcome to the family, ${r.first}.

We are so glad you are here. You are a true Modern Mustard Seed partner now, and that means one simple thing: you get to learn and earn right alongside us.

You call for us, you post for us, and you bring us deals. We do the building, you open the doors, and you get paid, again and again. No coding, no overhead, no ceiling.

Watch the family's welcome: ${VIDEO}

YOUR PARTNER CODE: ${r.code}
Your tracked link (share it anywhere): ${refLink}

WHAT YOU EARN
- 50% on every product, the moment someone buys.
- 25% of the monthly bill, for a year, on any business you put on an AI receptionist.
- 10-20% on all builds, from 10% up to 20% as a Producer.

WHERE TO START
- Log into your command center: ${SITE}/admin/login
- Start your onboarding academy: ${SITE}/admin/onboarding
- Open the dial floor (Outbound): ${SITE}/admin/outbound
- Grab ads to post: ${SITE}/admin/ads

This is a real seat at a real table. Ask us anything, anytime.

With love, the Mustard family
Mr. & Mrs. Mustard, and Sarah
Text me anytime: ${CELL}`;
}

// ── run ──
const args = process.argv.slice(2);
const key = envKey('RESEND_API_KEY');

if (args.includes('--dump')) {
  const r = RECIPIENTS.find((x) => x.email === 'makeourcitypretty@gmail.com') || RECIPIENTS[0];
  const p = join(tmpdir(), 'team-welcome-email.html');
  writeFileSync(p, buildHtml(r));
  console.log('dumped preview html (no send):', p);
  process.exit(0);
}

async function send(r) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'The Mustard Family <sarah@modernmustardseed.com>',
      to: [r.email],
      reply_to: 'sarah@modernmustardseed.com',
      subject: `Welcome to the Mustard family, ${r.first}`,
      html: buildHtml(r),
      text: buildText(r),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok) console.log(`SENT to ${r.first} <${r.email}>  id: ${json.id || '(none)'}`);
  else {
    console.error(`FAILED ${r.email} (${res.status}):`, JSON.stringify(json));
    process.exitCode = 1;
  }
}

if (!key) {
  console.error('No RESEND_API_KEY in .env.local');
  process.exit(1);
}

const sendIdx = args.indexOf('--send');
let targets = [];
if (sendIdx >= 0 && args[sendIdx + 1]) {
  targets = RECIPIENTS.filter((r) => r.email.toLowerCase() === args[sendIdx + 1].toLowerCase());
  if (!targets.length) {
    console.error('No recipient matches', args[sendIdx + 1]);
    process.exit(1);
  }
} else if (args.includes('--all')) {
  targets = RECIPIENTS;
} else {
  console.error('Nothing to do. Use --dump, --send <email>, or --all.');
  process.exit(1);
}

for (const r of targets) {
  await send(r);
}
