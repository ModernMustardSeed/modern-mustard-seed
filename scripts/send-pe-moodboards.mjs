/**
 * Uploads the 3 P&E moodboard PNGs to the public client-intake bucket, then
 * emails them to Suellen from Polly so she can choose a direction. Logs the
 * send on her correspondence thread. Run once.
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

const sb = createClient(
  loadEnv('supabase_url') || loadEnv('SUPABASE_URL'),
  loadEnv('supabase_service_role_key') || loadEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);
const resend = new Resend(loadEnv('RESEND_API_KEY'));

const SRC = 'C:/Users/moder/AppData/Local/Temp/claude/C--Users-moder/cf31c36e-c491-428b-a84b-599a9fb6283c/scratchpad/pe';
const TO = 'suellenmatthis1@icloud.com';
const FROM = 'Polly at Modern Mustard Seed <polly.thompson@modernmustardseed.com>';
const REPLY_TO = ['polly.thompson@modernmustardseed.com', 'sarah@modernmustardseed.com'];

const files = [
  { key: 'mood_a', letter: 'A', name: 'Heirloom', tag: 'warm, vintage, handmade', blurb: 'Soft and timeless. Warm paper, pretty serif type, your pieces like little keepsakes.' },
  { key: 'mood_b', letter: 'B', name: 'Wildflower & Turquoise', tag: 'boho western cowgirl', blurb: 'Turquoise, dusty rose, and caramel with your Sissy sets front and center. This is my personal favorite for you.' },
  { key: 'mood_c', letter: 'C', name: 'Sunshine State', tag: 'bright, vivid, playful', blurb: 'The most fun, colorful look. Loud, happy, made to pop on Facebook and at markets.' },
];

const urls = {};
for (const f of files) {
  const bytes = new Uint8Array(readFileSync(`${SRC}/${f.key}.png`));
  const path = `pe-clothing/moodboards/${f.key}.png`;
  const { error } = await sb.storage.from('client-intake').upload(path, bytes, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  urls[f.key] = sb.storage.from('client-intake').getPublicUrl(path).data.publicUrl;
  console.log(f.letter, '->', urls[f.key]);
}

const ink = '#20140e', turq = '#1fa6a0', cream = '#f7efe2';
const block = (f) => `
  <tr><td style="padding:26px 0 8px">
    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:${ink}"><b>Look ${f.letter} &middot; ${f.name}</b></p>
    <p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#6a5a4c"><i>${f.tag}.</i> ${f.blurb}</p>
    <a href="${urls[f.key]}"><img src="${urls[f.key]}" alt="Look ${f.letter}" style="width:100%;max-width:520px;border:2px solid ${ink};border-radius:14px;display:block"></a>
  </td></tr>`;

const html = `<!doctype html><html><body style="margin:0;background:${cream}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:28px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:2px solid ${ink};border-radius:16px;box-shadow:5px 5px 0 0 ${ink}">
<tr><td style="padding:36px 36px 6px">
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b5582f;font-weight:700">P &amp; E Clothing &middot; Three Looks</p>
  <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:28px;color:${ink}">Pick your favorite, Suellen</h1>
  <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">It&rsquo;s Polly, and I have the fun part for you. We took your brand, your colors, and your real pieces and designed three different looks for your store. Each one is its own whole vibe. Take a peek below and tell me which one feels the most like you and P &amp; E Clothing.</p>
</td></tr>
<tr><td style="padding:0 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${files.map(block).join('')}
  </table>
</td></tr>
<tr><td style="padding:14px 36px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3a3733">
  <p style="margin:0 0 16px">There is no wrong answer, they are all yours. Just <b>reply with A, B, or C</b> (or tell me you love bits of two and we will blend them). My pick for you is <b>B</b>, but I will build whichever one makes you smile.</p>
  <p style="margin:0 0 22px">Once you choose, I build your real shop around it, with your products and prices ready to go.</p>
  <p style="margin:0 0 4px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:${ink}">Can&rsquo;t wait to hear which one you love,</p>
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

const text = `Hi Suellen, it's Polly. We designed three different looks for your store, each its own vibe. Pick your favorite and reply with A, B, or C.

Look A - Heirloom (warm, vintage, handmade): ${urls.mood_a}
Look B - Wildflower & Turquoise (boho western cowgirl, my pick for you): ${urls.mood_b}
Look C - Sunshine State (bright, vivid, playful): ${urls.mood_c}

There is no wrong answer, they are all yours. Reply with A, B, or C (or tell me you love bits of two and we will blend). Once you choose, I build your real shop around it.

Warmly, Polly
Modern Mustard Seed`;

const { data, error } = await resend.emails.send({
  from: FROM, to: TO, replyTo: REPLY_TO,
  subject: 'Three looks for P & E Clothing, pick your favorite',
  html, text,
});
if (error) { console.error('send failed', error); process.exit(1); }
console.log('Moodboard email sent to', TO, '| id:', data?.id);

// Log outbound on her correspondence thread so it shows in the app.
await sb.from('messages').insert({
  direction: 'outbound', channel: 'email',
  from_addr: 'polly.thompson@modernmustardseed.com', to_addr: TO,
  subject: 'Three looks for P & E Clothing, pick your favorite',
  snippet: 'Sent Suellen 3 moodboard directions (A Heirloom, B Wildflower & Turquoise, C Sunshine State) to choose from.',
  body: text, read: true, occurred_at: new Date().toISOString(),
});
console.log('Logged on correspondence thread.');
