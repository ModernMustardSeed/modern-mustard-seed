#!/usr/bin/env node
// Carmen's Hidden Gems articles, seeded so the card in her portal opens with
// her own work already on it rather than an empty box. Idempotent: the table
// is unique on (client_email, url), so a second run changes nothing.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CLIENT = 'builtbyshan@gmail.com';
const PUBLISHER = 'Kalispell Montana Hidden Gems';
const ARTICLES = [
  { url: 'https://hiddengemsmt.com/local-guides/built-for-the-valley-fall-homeownership-and-4-season-design-in-northwest-montana/', title: 'Built for the Valley: Fall, Homeownership, and 4-Season Design in Northwest Montana', published_on: '2026-09-07' },
  { url: 'https://hiddengemsmt.com/local-guides/building-in-the-flathead-how-to-outsmart-wildfires-without-living-in-a-concrete-bunker/', title: 'Building in the Flathead: How to Outsmart Wildfires Without Living in a Concrete Bunker', published_on: '2026-08-11' },
  { url: 'https://hiddengemsmt.com/local-guides/the-wild-west-of-homebuilding-how-to-build-your-montana-legacy/', title: 'The Wild West of Homebuilding: How to Build Your Montana Legacy', published_on: '2026-07-08' },
];

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const a of ARTICLES) {
  const { error } = await sb.from('client_articles').upsert({ client_email: CLIENT, publisher: PUBLISHER, added_by: 'seed', status: 'new', ...a }, { onConflict: 'client_email,url' });
  console.log(error ? `failed  ${a.title}: ${error.message}` : `ok      ${a.published_on}  ${a.title}`);
}
const { count } = await sb.from('client_articles').select('id', { count: 'exact', head: true }).eq('client_email', CLIENT);
console.log(`\n${count} articles on the card`);
