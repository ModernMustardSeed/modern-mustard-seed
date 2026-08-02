#!/usr/bin/env node
/**
 * codex-image-relay: the bridge that lets DEPLOYED apps render on the Codex
 * subscription.
 *
 * Sarah, 2026-08-01: "use codex for all image gen everywhere from now on."
 * "Everywhere" includes cxc-studio, mms-youtube-studio, adforge-studio,
 * fiat-lux-design and Mustard Pictures, all of which generate images inside
 * Vercel functions where there is no Codex CLI and no Codex login. Without this
 * they would have stayed on the metered fal wallet forever, which is exactly
 * the bill she asked to stop paying.
 *
 * So: one small local service wrapping the same verified renderer, reachable
 * over an authenticated tunnel.
 *
 *   node scripts/codex-image-relay.mjs [--port 8787] [--host 127.0.0.1]
 *
 * Setup, once:
 *   1. Put a long random secret in CODEX_RELAY_TOKEN (both here and in the
 *      calling app's env). The relay REFUSES to start without one, because an
 *      open renderer on a tunnel is someone else's free image API.
 *   2. Expose it:  cloudflared tunnel --url http://127.0.0.1:8787
 *   3. Set CODEX_RELAY_URL in the app to the tunnel's https URL.
 *
 * Endpoints:
 *   GET  /health  -> {ok, busy, queued, capacity}      (no auth, no secrets)
 *   POST /image   -> {ok, base64, mime, width, height, bytes, seconds}
 *
 * Design notes that matter:
 *   - Renders are SERIALIZED (the renderer's own machine-wide lock plus a queue
 *     here). Codex quota is flat-rate but finite and a parallel batch burns a
 *     day of it. A serial queue is the feature, not a limitation.
 *   - The queue is BOUNDED and rejects with 503 when full. A user request that
 *     waits eight renders deep has already failed; better to say so at once and
 *     let the caller fall back.
 *   - /health is deliberately cheap and unauthenticated so a serverless caller
 *     can probe it in ~50ms and skip the relay entirely when the machine is
 *     asleep, instead of hanging a checkout on a dead socket.
 */
import http from 'node:http';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { generateImage } from './codex-image.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const PORT = Number(flag('port', process.env.CODEX_RELAY_PORT || 8787));
const HOST = flag('host', process.env.CODEX_RELAY_HOST || '127.0.0.1');
const MAX_QUEUE = Number(flag('queue', 4));
const MAX_PIXELS = 4096 * 4096;

const TOKEN = (process.env.CODEX_RELAY_TOKEN || '').trim();
if (!TOKEN || TOKEN.length < 16) {
  console.error('codex-image-relay: refusing to start without CODEX_RELAY_TOKEN set to at least 16 characters.');
  console.error('An unauthenticated renderer behind a tunnel is a free image API for whoever finds it.');
  console.error("Generate one:  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(2);
}

const TMP = path.join(os.tmpdir(), 'codex-image-relay');
mkdirSync(TMP, { recursive: true });

let busy = false;
let queued = 0;
let served = 0;
const startedAt = new Date().toISOString();

const send = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
};

/** Constant-time-ish compare so the token cannot be probed byte by byte. */
function tokenOk(header) {
  const given = String(header || '').replace(/^Bearer\s+/i, '').trim();
  if (given.length !== TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < TOKEN.length; i++) diff |= given.charCodeAt(i) ^ TOKEN.charCodeAt(i);
  return diff === 0;
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return send(res, 200, { ok: true, service: 'codex-image-relay', busy, queued, capacity: MAX_QUEUE, served, startedAt });
  }

  if (url.pathname !== '/image') return send(res, 404, { ok: false, error: 'not found' });
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  if (!tokenOk(req.headers.authorization)) return send(res, 401, { ok: false, error: 'bad or missing bearer token' });

  // Bounded queue. Saying "no" immediately beats a request that waits six
  // renders deep and times out at the CDN anyway.
  if (queued >= MAX_QUEUE) {
    return send(res, 503, { ok: false, error: `relay busy: ${queued} render(s) already queued`, retryable: true });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return send(res, 400, { ok: false, error: `unreadable body: ${e.message}` });
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) return send(res, 400, { ok: false, error: 'prompt is required' });
  if (prompt.length > 8000) return send(res, 400, { ok: false, error: 'prompt too long' });

  const width = Math.max(64, Math.min(4096, Number(body.width) || 1600));
  const height = Math.max(64, Math.min(4096, Number(body.height) || 900));
  if (width * height > MAX_PIXELS) return send(res, 400, { ok: false, error: 'requested image is too large' });
  const format = String(body.format || 'jpeg').toLowerCase() === 'png' ? 'png' : 'jpeg';

  // References arrive as URLs, because a serverless caller holds a blob URL
  // rather than a file. Only http(s) is accepted: a caller that could name a
  // local path could ask the relay to read anything on Sarah's disk.
  const refs = (Array.isArray(body.refs) ? body.refs : []).slice(0, 4).map(String);
  if (refs.some((r) => !/^https:\/\//i.test(r))) {
    return send(res, 400, { ok: false, error: 'refs must be https URLs' });
  }

  queued++;
  const out = path.join(TMP, `${Date.now()}-${Math.round(process.hrtime()[1] / 1000)}.${format === 'png' ? 'png' : 'jpg'}`);
  const t0 = Date.now();
  try {
    busy = true;
    const result = await generateImage({
      prompt,
      out,
      width,
      height,
      format,
      quality: Math.max(40, Math.min(100, Number(body.quality) || 85)),
      tries: Math.max(1, Math.min(3, Number(body.tries) || 2)),
      allowText: Boolean(body.allowText),
      refs,
      refMode: String(body.refMode || 'subject'),
      // The relay never spends money on Sarah's behalf without being told to.
      // A caller that truly cannot ship without an image asks for it explicitly.
      fallbackFal: Boolean(body.fallbackFal),
      log: (...a) => console.error(`[${new Date().toISOString()}]`, ...a),
    });

    if (!result.ok) return send(res, 502, { ok: false, error: result.error });

    const bin = readFileSync(result.path);
    served++;
    console.error(`[${new Date().toISOString()}] served ${width}x${height} in ${result.seconds}s (${(bin.length / 1024).toFixed(0)}KB), ${served} total`);
    return send(res, 200, {
      ok: true,
      base64: bin.toString('base64'),
      mime: format === 'png' ? 'image/png' : 'image/jpeg',
      width: result.width,
      height: result.height,
      bytes: bin.length,
      seconds: result.seconds,
      source: result.source,
    });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] render threw after ${((Date.now() - t0) / 1000).toFixed(0)}s:`, e.message);
    return send(res, 500, { ok: false, error: String(e.message || e) });
  } finally {
    busy = false;
    queued--;
    rmSync(out, { force: true });
  }
});

// A render legitimately takes 60-120s, and Node's 2-minute default would cut
// its own successful response off at the knees.
server.requestTimeout = 15 * 60 * 1000;
server.headersTimeout = 16 * 60 * 1000;
server.keepAliveTimeout = 75 * 1000;

server.listen(PORT, HOST, () => {
  console.error(`codex-image-relay listening on http://${HOST}:${PORT}`);
  console.error(`  health:  curl http://${HOST}:${PORT}/health`);
  console.error(`  expose:  cloudflared tunnel --url http://${HOST}:${PORT}`);
  console.error(`  queue:   ${MAX_QUEUE} deep, renders run one at a time (Codex quota)`);
});

const bye = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000); };
process.on('SIGINT', bye);
process.on('SIGTERM', bye);

export const relayEntry = fileURLToPath(import.meta.url);
