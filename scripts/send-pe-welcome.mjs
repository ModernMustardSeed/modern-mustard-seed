/**
 * Sends the P & E Clothing welcome + brand-intake email to Suellen Matthis,
 * in Polly's voice (Polly is the point of contact). From the verified MMS
 * domain via Resend; replies route to Polly. Run once.
 */
import { Resend } from 'resend';
import { readFileSync } from 'node:fs';

function loadEnv(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\[rn]$/, '');
  }
  return null;
}

const resend = new Resend(loadEnv('RESEND_API_KEY') || loadEnv('resend_api_key'));

const TO = 'suellenmatthis1@icloud.com';
const REPLY_TO = ['polly@modernmustardseed.com', 'sarah@modernmustardseed.com'];
const INTAKE =
  'https://modernmustardseed.com/intake?brand=P%20%26%20E%20Clothing&owner=Suellen%20Matthis&email=suellenmatthis1@icloud.com';

const ink = '#161616';
const mustard = '#F5B700';
const cream = '#FBF6EA';
const body = '#3a3733';

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">A beautiful online store for P & E Clothing, on the house. One short form to start.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cream};padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:2px solid ${ink};border-radius:16px;box-shadow:5px 5px 0 0 ${ink}">
  <tr><td style="padding:40px 40px 8px">
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#E0301E;font-weight:700">P &amp; E Clothing &middot; Modern Mustard Seed</p>
    <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:${ink};font-weight:700">Let&rsquo;s build P &amp; E Clothing a real online home</h1>
  </td></tr>
  <tr><td style="padding:14px 40px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${body}">
    <p style="margin:0 0 16px">Hi Suellen,</p>
    <p style="margin:0 0 16px">I&rsquo;m Polly with Modern Mustard Seed, and I will be your point of contact through this whole thing. We are so glad to have you.</p>
    <p style="margin:0 0 16px">Here is the happy news. We are going to design and build P &amp; E Clothing a beautiful website and online store, the kind where people can actually shop your baby clothes, bows, and mommy-and-me sets right there on the page. This one is on us. There is no cost to you.</p>
    <p style="margin:0 0 16px">To make it truly yours, I need to learn about your brand, your products, and the heart behind the name. I put together one simple form that walks you through it. It takes about ten minutes, and you can skip anything you are not sure about.</p>
  </td></tr>
  <tr><td align="center" style="padding:10px 40px 6px">
    <a href="${INTAKE}" style="display:inline-block;background:${mustard};color:${ink};font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 30px;border:2px solid ${ink};border-radius:10px">Tell us about your brand &rarr;</a>
  </td></tr>
  <tr><td style="padding:14px 40px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${body}">
    <p style="margin:0 0 16px">The single most helpful thing is photos of your products, so add as many as you can. Phone photos are perfect.</p>
    <p style="margin:0 0 16px">Once it is in, we will design three directions for the look and feel, then send you a moodboard to choose from before we build a single page. The look will be yours from the very start.</p>
    <p style="margin:0 0 22px">Any question at all, just reply to this email. It comes straight to me.</p>
    <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;color:${ink}">Warmly,</p>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${ink};font-weight:700">Polly</p>
  </td></tr>
  <tr><td style="padding:26px 40px 38px">
    <div style="border-top:1px solid #e7e0cf;padding-top:18px">
      <img src="https://modernmustardseed.com/brand/sap-heart.png" width="64" height="60" alt="" style="display:block;border:0;margin:0 0 4px -2px" />
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;color:${ink};font-weight:700">SAP</p>
      <p style="margin:4px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${ink};font-weight:600">Sarah, Anthony &amp; Polly</p>
      <p style="margin:2px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b88a00;font-weight:700">Modern Mustard Seed</p>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

const text = `Hi Suellen,

I'm Polly with Modern Mustard Seed, and I will be your point of contact through this whole thing. We are so glad to have you.

Here is the happy news. We are going to design and build P & E Clothing a beautiful website and online store, the kind where people can actually shop your baby clothes, bows, and mommy-and-me sets right there on the page. This one is on us. There is no cost to you.

To make it truly yours, I need to learn about your brand, your products, and the heart behind the name. I put together one simple form that walks you through it. It takes about ten minutes, and you can skip anything you are not sure about:

${INTAKE}

The single most helpful thing is photos of your products, so add as many as you can. Phone photos are perfect.

Once it is in, we will design three directions for the look and feel, then send you a moodboard to choose from before we build a single page.

Any question at all, just reply to this email. It comes straight to me.

Warmly,
Polly
Modern Mustard Seed`;

const { data, error } = await resend.emails.send({
  from: 'Polly at Modern Mustard Seed <polly@modernmustardseed.com>',
  to: TO,
  replyTo: REPLY_TO,
  subject: "Let's build P & E Clothing a real online home",
  html,
  text,
});

if (error) {
  console.error('Send failed:', error);
  process.exit(1);
}
console.log('Welcome email sent to', TO, '| id:', data?.id);
