import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')];}));
const secret = env.CLIENT_SESSION_SECRET || env.ADMIN_SESSION_SECRET;
const enc = new TextEncoder();
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
const payload = `magic:builtbyshan@gmail.com:${Date.now()+20*60*1000}`;
const sig = b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
const token = `${b64url(enc.encode(payload))}.${sig}`;
const r = await fetch(`https://modernmustardseed.com/api/portal/verify?token=${encodeURIComponent(token)}`, { redirect: 'manual' });
console.log('verify status', r.status, 'location', r.headers.get('location'));
const cookie = (r.headers.get('set-cookie')||'').split(';')[0];
console.log('cookie set:', cookie ? cookie.split('=')[0] : 'NONE');
if (cookie) {
  const d = await fetch('https://modernmustardseed.com/api/portal/data', { headers: { cookie } });
  const j = await d.json();
  console.log('data status', d.status, '| client:', j.client?.company, '| audience:', j.audience, '| projects:', j.projects?.length, '| products:', j.products?.length, '| files:', j.files?.length);
  const p = await fetch('https://modernmustardseed.com/portal', { headers: { cookie }, redirect: 'manual' });
  console.log('/portal status', p.status);
}
