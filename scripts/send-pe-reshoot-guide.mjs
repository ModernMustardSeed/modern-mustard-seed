/**
 * Sends Suellen the flat-lay re-shoot guide from Polly for the 4 pieces whose
 * original photos were folded/bunched. Warm voice, heart sign-off. Logs on her thread.
 * Sarah reviewed + approved the exact copy before this send. Run once.
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

const ink = '#20140e', cream = '#f7efe2', turq = '#1fa6a0', rust = '#b5582f';

const html = `<!doctype html><html><body style="margin:0;background:${cream}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:28px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:2px solid ${ink};border-radius:16px;box-shadow:5px 5px 0 0 ${ink}">
<tr><td style="padding:36px 36px 8px">
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${rust};font-weight:700">P &amp; E Clothing &middot; A quick photo tip</p>
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;color:${ink}">They&rsquo;re looking so good &#128247;</h1>
  <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">Hi Suellen, it&rsquo;s Polly &#128156;</p>
  <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">I&rsquo;ve been styling your pieces onto your new brand background and oh my goodness, they look so good. Your Sissy sets, the John Deere tank, the Nemo set, and the cow/duck western set turned out absolutely gorgeous and are ready for your store.</p>
  <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">For a few others I&rsquo;d love one quick favor so they shine just as bright: a fresh flat photo of these four.</p>
  <ul style="margin:0 0 16px;padding-left:20px;color:#3a3733;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7">
    <li>The Daddy&rsquo;s Girl checkered set</li>
    <li>The teal snakeskin + Aztec tank pair</li>
    <li>The &ldquo;Keep it Punchy&rdquo; tank</li>
    <li>The Americana halter romper + teal shorts</li>
  </ul>
  <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">These got a little folded or bunched in the original photos, and a quick re-shoot will make them pop. Here is all it takes (your phone is perfect):</p>
</td></tr>
<tr><td style="padding:0 36px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};border:1.5px solid ${ink};border-radius:12px">
   <tr><td style="padding:18px 22px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${ink}">
    <p style="margin:0 0 8px"><b style="color:${turq}">1.</b> &nbsp;<b>Lay it flat</b> on a plain sheet or poster board (white or cream is ideal).</p>
    <p style="margin:0 0 8px"><b style="color:${turq}">2.</b> &nbsp;<b>Smooth it out</b> like it is being worn. Untangle straps, lay shorts flat next to the top.</p>
    <p style="margin:0 0 8px"><b style="color:${turq}">3.</b> &nbsp;<b>Shoot from straight above</b>, phone flat and centered over the piece, looking straight down.</p>
    <p style="margin:0 0 8px"><b style="color:${turq}">4.</b> &nbsp;<b>Use daylight</b> by a window. No flash, no harsh shadows.</p>
    <p style="margin:0 0 8px"><b style="color:${turq}">5.</b> &nbsp;<b>Frame the whole piece</b> with a little breathing room around it.</p>
    <p style="margin:0"><b style="color:${turq}">6.</b> &nbsp;<b>Keep your tag/watermark in the shot</b> if you would like it to show. I will handle the rest.</p>
   </td></tr>
  </table>
</td></tr>
<tr><td style="padding:18px 36px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">
  <p style="margin:0 0 14px">Send them however is easiest and I&rsquo;ll drop them onto your brand background so they match the others perfectly. This same trick will make your own product photos look amazing once your store is live too. &#128156;</p>
  <p style="margin:0 0 4px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:${ink}">So excited for you to see everything come together,</p>
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

const text = `Hi Suellen, it's Polly.

I've been styling your pieces onto your new brand background and oh my goodness, they look so good. Your Sissy sets, the John Deere tank, the Nemo set, and the cow/duck western set turned out absolutely gorgeous and are ready for your store.

For a few others I'd love one quick favor so they shine just as bright: a fresh flat photo of these four.
- The Daddy's Girl checkered set
- The teal snakeskin + Aztec tank pair
- The "Keep it Punchy" tank
- The Americana halter romper + teal shorts

These got a little folded or bunched in the original photos, and a quick re-shoot will make them pop. Here is all it takes (your phone is perfect):

1. Lay it flat on a plain sheet or poster board (white or cream is ideal).
2. Smooth it out like it is being worn. Untangle straps, lay shorts flat next to the top.
3. Shoot from straight above, phone flat and centered over the piece, looking straight down.
4. Use daylight by a window. No flash, no harsh shadows.
5. Frame the whole piece with a little breathing room around it.
6. Keep your tag/watermark in the shot if you would like it to show. I will handle the rest.

Send them however is easiest and I'll drop them onto your brand background so they match the others perfectly. This same trick will make your own product photos look amazing once your store is live too.

So excited for you to see everything come together,
Polly
Modern Mustard Seed`;

const { data, error } = await resend.emails.send({
  from: FROM, to: TO, replyTo: REPLY_TO,
  subject: 'P & E Clothing, a quick photo tip for a few pieces',
  html, text,
});
if (error) { console.error('send failed', error); process.exit(1); }
console.log('Re-shoot guide sent to', TO, '| id:', data?.id);

await sb.from('messages').insert({
  direction: 'outbound', channel: 'email',
  from_addr: 'polly.thompson@modernmustardseed.com', to_addr: TO,
  subject: 'P & E Clothing, a quick photo tip for a few pieces',
  snippet: 'Flat-lay re-shoot guide for the 4 folded pieces (Daddy\'s Girl, snakeskin+Aztec, Keep it Punchy, Americana halter). 5 others ready. Building store now.',
  body: text, read: true, occurred_at: new Date().toISOString(),
});
console.log('Logged on correspondence thread.');
