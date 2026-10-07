// Read-only: dumps the live call, its pipeline log, and the live assistant.
import fs from 'node:fs';
import zlib from 'node:zlib';
const K = process.env.VAPI_API_KEY;
const H = { Authorization: `Bearer ${K}` };
const A = 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';
fs.mkdirSync('diag', { recursive: true });
const get = async (p) => { const r = await fetch('https://api.vapi.ai' + p, { headers: H }); return [r.status, r]; };
const scrub = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/secret|token|apikey|password/i.test(k) ? '[x]' : v)));
let [s, r] = await get(`/call?assistantId=${A}&limit=12`);
const calls = await r.json();
fs.writeFileSync('diag/calls.json', JSON.stringify(scrub(calls), null, 1));
for (const c of calls) console.log(c.id, c.createdAt, c.endedReason, c.type);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : calls.slice(0, 3).map((c) => c.id);
for (const id of ids) {
  [s, r] = await get(`/call/${id}`);
  fs.writeFileSync(`diag/call-${id}.json`, JSON.stringify(scrub(await r.json()), null, 1));
  [s, r] = await get(`/call/${id}/call-logs`);
  const buf = Buffer.from(await r.arrayBuffer());
  let txt; try { txt = zlib.gunzipSync(buf).toString(); } catch { txt = buf.toString(); }
  fs.writeFileSync(`diag/log-${id}.txt`, `status ${s}\n` + txt);
  console.log('call', id, 'log status', s, txt.length);
}
[s, r] = await get(`/assistant/${A}`);
fs.writeFileSync('diag/assistant.json', JSON.stringify(scrub(await r.json()), null, 1));
