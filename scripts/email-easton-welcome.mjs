/**
 * One-off: send Easton Parker his MMS caller welcome (login + how to start).
 * Preview by default; add --send to actually deliver via Resend.
 *   node scripts/email-easton-welcome.mjs          # prints the email
 *   node scripts/email-easton-welcome.mjs --send    # sends it
 */
import { readFileSync } from 'node:fs';

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const env = loadEnv('.env.local');
const KEY = env.resend_api_key;

const TO = 'easton12parrot@gmail.com';
const FROM = 'Sarah Scarano <sarah@modernmustardseed.com>';
const LOGIN_URL = 'https://modernmustardseed.com/admin/login';
const EMAIL = 'easton12parrot@gmail.com';
const PASSWORD = 'EastonKC2026!';
const SUBJECT = 'Welcome to the team, Easton — your login + 200 Kansas City leads';

const ink = '#1a1815', cream = '#f7f3e9', mustard = '#b58a2a', seed = '#3f5d34';

const html = `<!doctype html><html><body style="margin:0;background:${cream};font-family:'DM Sans',Segoe UI,Helvetica,Arial,sans-serif;color:${ink};">
  <div style="max-width:560px;margin:0 auto;padding:28px 22px;">
    <div style="text-align:center;margin-bottom:6px;font-size:30px;">🌱</div>
    <h1 style="font-family:Oswald,Arial,sans-serif;font-size:26px;line-height:1.15;text-align:center;margin:0 0 6px;">Welcome to Modern Mustard Seed, Easton.</h1>
    <p style="text-align:center;color:${ink}cc;font-size:15px;margin:0 0 24px;">You are set up to make calls whenever you have a little free time. No quotas, no pressure. Here is everything you need.</p>

    <div style="background:#fff;border:2px solid ${ink};border-radius:16px;box-shadow:5px 5px 0 ${ink};padding:20px 22px;margin-bottom:22px;">
      <div style="font-family:Oswald,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.14em;font-size:12px;color:${seed};margin-bottom:12px;">Your login</div>
      <table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:${ink}99;width:88px;">Website</td><td style="padding:5px 0;"><a href="${LOGIN_URL}" style="color:${seed};font-weight:600;">modernmustardseed.com/admin/login</a></td></tr>
        <tr><td style="padding:5px 0;color:${ink}99;">Email</td><td style="padding:5px 0;font-weight:600;">${EMAIL}</td></tr>
        <tr><td style="padding:5px 0;color:${ink}99;">Password</td><td style="padding:5px 0;font-weight:600;font-family:monospace;background:${mustard}22;border-radius:6px;padding:5px 8px;display:inline-block;">${PASSWORD}</td></tr>
      </table>
      <p style="font-size:13px;color:${ink}88;margin:12px 0 0;">You can change the password later. Keep this email somewhere safe.</p>
    </div>

    <div style="font-family:Oswald,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.14em;font-size:12px;color:${seed};margin:0 0 12px;">How to start (2 minutes)</div>
    <ol style="font-size:15px;line-height:1.6;color:${ink}dd;padding-left:20px;margin:0 0 22px;">
      <li style="margin-bottom:9px;">Log in with the details above. A quick welcome tour will pop up and walk you through it.</li>
      <li style="margin-bottom:9px;">In the top menu, open <b>Sales &rarr; Outbound</b>. That is your dial floor, the only page you need.</li>
      <li style="margin-bottom:9px;"><b>Your 200 Kansas City leads are already loaded</b>, picked just for you. Tap a phone number to call.</li>
      <li style="margin-bottom:9px;">Open with <i>"Hi, I am Easton, I am local here in Kansas City,"</i> then read the script on the screen and tap one outcome button.</li>
      <li>Stuck on anything? Tap the gold <b>Ask Mr. Mustard</b> button in the corner. It answers any question.</li>
    </ol>

    <div style="background:${seed}12;border-left:4px solid ${seed};border-radius:8px;padding:12px 16px;font-size:14px;color:${ink}cc;margin-bottom:24px;">
      <b>One rule:</b> call business lines only, always say who you are, and if anyone asks you to stop, thank them and tap "Not interested." That keeps everything above board.
    </div>

    <p style="font-size:15px;line-height:1.6;color:${ink}dd;margin:0 0 6px;">So proud of you for jumping in. Call when it suits you, have fun with it, and text me anytime you have a question.</p>
    <p style="font-size:15px;margin:18px 0 2px;">Love,</p>
    <p style="font-family:Oswald,Arial,sans-serif;font-size:18px;margin:0;">Mom 🤍</p>
    <p style="font-size:12px;color:${ink}77;margin:18px 0 0;">Modern Mustard Seed · modernmustardseed.com</p>
  </div>
</body></html>`;

if (!process.argv.includes('--send')) {
  console.log('PREVIEW ONLY (add --send to deliver)\n');
  console.log('To:      ', TO);
  console.log('From:    ', FROM);
  console.log('Subject: ', SUBJECT);
  console.log('\n--- text of key details ---');
  console.log('Login:', LOGIN_URL, '|', EMAIL, '|', PASSWORD);
  console.log('\n(HTML body built, ' + html.length + ' chars)');
  process.exit(0);
}

if (!KEY) throw new Error('resend_api_key missing in .env.local');
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: [TO], reply_to: 'sarah@modernmustardseed.com', subject: SUBJECT, html }),
});
const body = await res.json();
if (!res.ok) { console.error('SEND FAILED', res.status, JSON.stringify(body)); process.exit(1); }
console.log('SENT ✓ id=', body.id, 'to', TO);
