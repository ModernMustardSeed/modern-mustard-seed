/**
 * Reconcile local delivery state with Resend's actual outcomes.
 *
 *  1. Seed / refresh the `email_suppressions` mirror from every recent Resend
 *     send whose last_event is a drop (bounced / complained / suppressed) — this
 *     is how the app learns that sarah@ and the Newk's addresses are blocked
 *     (Resend has no API to read its suppression list; we derive it here).
 *  2. Sync `emails.status` for any logged send we can match by Resend id, so the
 *     Sent folder shows the real outcome even if a webhook was missed.
 *
 * Run: node scripts/email-reconcile.mjs
 * Idempotent. Safe to run on a schedule.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const RESEND_KEY = (env.RESEND_API_KEY || '').replace(/[\r\n]/g, '').trim();
const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!RESEND_KEY || !SUPABASE_URL || !KEY) {
  console.error('Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const DROP = new Set(['bounced', 'complained', 'suppressed', 'failed']);
const norm = (a) => (a || '').trim().toLowerCase();

// Pull recent Resend emails (newest first).
const r = await fetch('https://api.resend.com/emails?limit=100', {
  headers: { Authorization: `Bearer ${RESEND_KEY}` },
});
if (!r.ok) {
  console.error('Resend list failed:', r.status, (await r.text()).slice(0, 300));
  process.exit(1);
}
const arr = (await r.json())?.data ?? [];
console.log(`Resend returned ${arr.length} recent emails.`);

const sb = (table, method, body, headers = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

const rcp = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// Collapse to the latest event per recipient so a since-corrected address isn't
// re-suppressed. (List is newest-first; first occurrence wins.)
const latestDrop = new Map(); // email -> {reason, detail, id}
let statusSynced = 0;

for (const e of arr) {
  const ev = e.last_event;
  if (!ev) continue;
  const tos = rcp(e.to);

  // 1. Sync status onto any logged send we can match by Resend id.
  const patch = { status: ev, status_detail: DROP.has(ev) ? ev : null };
  if (ev === 'delivered') patch.delivered_at = e.created_at || new Date(0).toISOString();
  const up = await sb(
    `emails?provider_message_id=eq.${encodeURIComponent(e.id)}`,
    'PATCH',
    patch,
    { Prefer: 'return=minimal' },
  );
  if (up.ok) statusSynced++;

  // 2. Track drops for the suppression mirror. Only block on an UNAMBIGUOUS
  // drop: an email with exactly one recipient across to+cc+bcc. The list API
  // hides bcc, so a "suppressed" event on a single-`to` email may actually have
  // been dropped because of a suppressed BCC (the Newk's outreach bcc'd the
  // already-suppressed sarah@ — that must NOT blacklist the Newk's execs).
  // Fetch the full recipient set to be sure before blocking anyone.
  if (!DROP.has(ev)) {
    if (tos.length === 1) {
      const k = norm(tos[0]);
      if (k && !latestDrop.has(k)) latestDrop.set(k, null); // a clean event clears intent
    }
    continue;
  }
  const det = await fetch(`https://api.resend.com/emails/${e.id}`, {
    headers: { Authorization: `Bearer ${RESEND_KEY}` },
  }).then((x) => (x.ok ? x.json() : null), () => null);
  const all = det ? [...rcp(det.to), ...rcp(det.cc), ...rcp(det.bcc)] : tos;
  if (all.length !== 1) continue; // ambiguous (co-recipient/bcc could be the cause) — never block
  const k = norm(all[0]);
  if (k && !latestDrop.has(k)) latestDrop.set(k, { reason: ev, detail: ev, id: e.id });
}

const toSuppress = [...latestDrop.entries()].filter(([, v]) => v);
console.log(`Status rows patched (matched by id): ${statusSynced}`);
console.log(`Addresses to suppress (latest event is a drop): ${toSuppress.length}`);

const now = new Date().toISOString();
for (const [email, v] of toSuppress) {
  const res = await sb('email_suppressions', 'POST', {
    email,
    reason: v.reason,
    detail: v.detail,
    provider: 'resend',
    resend_email_id: v.id,
    resolved: false,
    last_seen_at: now,
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  console.log(`  ${res.ok ? 'suppressed' : 'FAILED ' + res.status} ${email} (${v.reason})`);
}

console.log('\nReconcile complete.');
