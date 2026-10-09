/**
 * wl-host-check: proves the agency-host routing in middleware.ts without a
 * server. Feeds it requests on an agency host and on our own domain and checks
 * where each one lands.
 *
 *   node_modules/.bin/tsx --tsconfig tsconfig.json scripts/wl-host-check.mts
 *
 * Run it after touching middleware.ts or data/white-label-hosts.ts. A real
 * request through Vercel is still the final word once the domain is attached.
 */
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

const ID = '4e2b458b-f096-4122-a768-ec3ff3bc741c';
type Want = { rewrite?: RegExp; redirect?: RegExp; pass?: true; body?: RegExp };
const cases: [string, Want][] = [
  ['https://ai.jcreativemt.com/', { redirect: /^https:\/\/ai\.jcreativemt\.com\/receptionist$/ }],
  ['https://ai.jcreativemt.com/pricing', { redirect: /\/receptionist$/ }],
  ['https://ai.jcreativemt.com/white-label', { redirect: /\/receptionist$/ }],
  ['https://ai.jcreativemt.com/admin', { redirect: /\/receptionist$/ }],
  ['https://ai.jcreativemt.com/receptionist', { rewrite: /\/white-label\/demo\?agency=JCreative&color=1C0950&view=client$/ }],
  ['https://ai.jcreativemt.com/receptionist?site=vannlawfirm.com', { rewrite: /\/white-label\/demo\?site=vannlawfirm\.com&agency=JCreative&color=1C0950&view=client$/ }],
  ['https://ai.jcreativemt.com/receptionist?k=abc', { rewrite: /\/white-label\/demo\?k=abc&agency=JCreative&color=1C0950$/ }],
  [`https://ai.jcreativemt.com/desk/${ID}?k=xyz`, { rewrite: new RegExp(`/white-label/hq/jcreative/c/${ID}\\?k=xyz$`) }],
  ['https://ai.jcreativemt.com/agency?k=xyz', { rewrite: /\/white-label\/hq\/jcreative\?k=xyz$/ }],
  [`https://ai.jcreativemt.com/api/white-label/desk/${ID}/handled`, { pass: true }],
  ['https://ai.jcreativemt.com/white-label/demo/opengraph-image?x=1', { pass: true }],
  ['https://ai.jcreativemt.com/robots.txt', { body: /Disallow: \// }],
  ['https://AI.JCreativeMT.com/receptionist', { rewrite: /\/white-label\/demo\?/ }],
  // Our own domain is untouched.
  ['https://modernmustardseed.com/Contact', { redirect: /\/contact$/ }],
  ['https://modernmustardseed.com/white-label/demo?agency=X', { pass: true }],
  ['https://modernmustardseed.com/receptionist', { pass: true }],
];

let bad = 0;
for (const [url, want] of cases) {
  const host = new URL(url).host;
  const res = await middleware(new NextRequest(url, { headers: { host } }));
  const rewrite = res.headers.get('x-middleware-rewrite');
  const location = res.headers.get('location');
  const passed = res.headers.get('x-middleware-next') === '1';
  let ok = false;
  let got = '';
  if (want.rewrite) [ok, got] = [!!rewrite && want.rewrite.test(rewrite), `rewrite ${rewrite}`];
  else if (want.redirect) [ok, got] = [!!location && want.redirect.test(location), `redirect ${location}`];
  else if (want.pass) [ok, got] = [passed && !rewrite && !location, `next=${passed} rewrite=${rewrite} location=${location}`];
  else if (want.body) {
    const text = await res.text();
    [ok, got] = [want.body.test(text), `body ${JSON.stringify(text)}`];
  }
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${url}${ok ? '' : `\n     got ${got}`}`);
}
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exitCode = bad ? 1 : 0;
