#!/usr/bin/env node
// One cinematic storefront plate for the see-yours direction study v2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'fal.env'), 'utf8').trim();
const MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';

const prompt =
  'Cinematic editorial illustration, painterly and richly colored. A small-town Main Street storefront at blue-hour dusk, warm golden light glowing from inside and spilling across the wet sidewalk, striped awning, big glass display window, string lights, deep teal-blue evening sky, a few silhouetted passersby drawn toward the light. Completely blank awning and blank sign board, no lettering anywhere. Warm amber against cool dusk blue, soft glow, inviting, atmospheric depth. Absolutely no text, no letters, no numbers, no words, no watermark.';

const res = await fetch(`https://queue.fal.run/${MODEL}`, {
  method: 'POST',
  headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, image_size: { width: 1024, height: 1536 }, num_images: 1 }),
});
const sub = await res.json();
if (!res.ok || !sub.status_url) throw new Error(`submit ${res.status}: ${JSON.stringify(sub).slice(0, 300)}`);
const t0 = Date.now();
for (;;) {
  if (Date.now() - t0 > 120000) throw new Error('timed out / treat as locked');
  const st = await (await fetch(sub.status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  if (st.status === 'COMPLETED') break;
  if (st.status === 'FAILED' || st.detail) throw new Error(JSON.stringify(st).slice(0, 200));
  await new Promise((r) => setTimeout(r, 3000));
}
const result = await (await fetch(sub.response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer());
fs.mkdirSync(path.join(HERE, 'art'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'art', 'storefront-dusk.png'), buf);
console.log(`OK storefront-dusk.png (${(buf.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
