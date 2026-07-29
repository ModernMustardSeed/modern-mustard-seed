/**
 * Sends Suellen the "we're going with Direction B" approval email from Polly,
 * showing only the B moodboard, setting the next-week timeline + self-serve
 * admin expectation. Logs the send on her thread. Run once.
 */
import { createClient } from '@supabase/supabase-js';
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

const sb = createClient(loadEnv('supabase_url'), loadEnv('supabase_service_role_key'), { auth: { persistSession: false } });
const resend = new Resend(loadEnv('RESEND_API_KEY'));

const TO = 'suellenmatthis1@icloud.com';
const FROM = 'Polly at Modern Mustard Seed <polly.thompson@modernmustardseed.com>';
const REPLY_TO = ['polly.thompson@modernmustardseed.com', 'sarah@modernmustardseed.com'];
const B_URL = 'https://qqvohlvhynmtavdbvkha.supabase.co/storage/v1/object/public/client-intake/pe-clothing/moodboards/mood_b.png';

const ink = '#20140e', cream = '#f7efe2';

const html = `<!doctype html><html><body style="margin:0;background:${cream}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:28px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:2px solid ${ink};border-radius:16px;box-shadow:5px 5px 0 0 ${ink}">
<tr><td style="padding:36px 36px 8px">
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b5582f;font-weight:700">P &amp; E Clothing &middot; The Direction</p>
  <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;color:${ink}">I think this is the one</h1>
  <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">Hi Suellen, it&rsquo;s Polly. Quick note: I actually meant to send you just <b>one</b> look, not three. We sketch a few quietly behind the scenes, but for P &amp; E there was really only one that felt like <i>you</i>, so please ignore the other two from my last email. This is the one we love for you.</p>
  <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">We&rsquo;re leaning all the way toward <b>&ldquo;Wildflower &amp; Turquoise&rdquo;</b>: squash-blossom turquoise, dusty rose, and caramel, with your Sissy sets front and center. Boho, western, and unmistakably yours. <b>What do you think?</b></p>
</td></tr>
<tr><td style="padding:0 36px 8px"><a href="${B_URL}"><img src="${B_URL}" alt="Wildflower & Turquoise" style="width:100%;max-width:520px;border:2px solid ${ink};border-radius:14px;display:block"></a></td></tr>
<tr><td style="padding:16px 36px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">
  <p style="margin:0 0 14px">If you love it, here is what happens next:</p>
  <ul style="margin:0 0 16px;padding-left:20px;color:#3a3733">
    <li style="margin-bottom:8px">I&rsquo;ll have your full <b>website and online store</b> ready for you <b>next week</b>, with your products and prices built in.</li>
    <li style="margin-bottom:8px">You&rsquo;ll also get your own simple <b>dashboard</b> where you can <b>add and remove products and items</b> on the site yourself, anytime. No tech skills needed.</li>
    <li>It will keep track of all your <b>orders, leads, and products</b> in one place, so nothing slips through the cracks.</li>
  </ul>
  <p style="margin:0 0 22px">Just reply and tell me you love it (or one thing you&rsquo;d tweak) and I&rsquo;ll get started.</p>
  <p style="margin:0 0 4px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:${ink}">So excited to build this for you,</p>
  <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:${ink};font-weight:700">Polly</p>
</td></tr>
<tr><td style="padding:24px 36px 36px">
  <div style="border-top:1px solid #e7e0cf;padding-top:16px">
    <img src="https://modernmustardseed.com/brand/sap-heart.png" width="60" height="56" alt="" style="display:block;border:0;margin:0 0 4px -2px">
    <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:18px;color:${ink};font-weight:700">Sarah</p>
    <p style="margin:2px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b88a00;font-weight:700">Modern Mustard Seed</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

const text = `Hi Suellen, it's Polly. Quick note: I actually meant to send you just one look, not three. For P & E there was really only one that felt like you, so please ignore the other two from my last email.

We're leaning all the way toward "Wildflower & Turquoise": squash-blossom turquoise, dusty rose, and caramel with your Sissy sets front and center. Boho, western, and unmistakably yours. What do you think?

See it here: ${B_URL}

If you love it: I'll have your full website and online store ready next week (products and prices built in). You'll also get your own simple dashboard to add and remove products yourself anytime, and it will track all your orders, leads, and products in one place.

Just reply and tell me you love it (or one thing you'd tweak) and I'll get started.

So excited to build this for you,
Polly
Modern Mustard Seed`;

const { data, error } = await resend.emails.send({
  from: FROM, to: TO, replyTo: REPLY_TO,
  subject: 'P & E Clothing, I think this is the one',
  html, text,
});
if (error) { console.error('send failed', error); process.exit(1); }
console.log('Direction-B email sent to', TO, '| id:', data?.id);

await sb.from('messages').insert({
  direction: 'outbound', channel: 'email',
  from_addr: 'polly.thompson@modernmustardseed.com', to_addr: TO,
  subject: 'P & E Clothing, I think this is the one',
  snippet: 'Going with Direction B (Wildflower & Turquoise). Asked Suellen to approve; promised site+store next week + self-serve admin.',
  body: text, read: true, occurred_at: new Date().toISOString(),
});
console.log('Logged on correspondence thread.');
