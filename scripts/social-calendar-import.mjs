/**
 * Load a social calendar file into social_posts, the table behind /admin/social.
 *
 *   node scripts/social-calendar-import.mjs <path-to-calendar.json> [--dry-run] [--keep-missing]
 *
 * The file is an array of rows (or { rows: [...] }) in the social_posts shape:
 *   id, date (YYYY-MM-DD or null), time_mt, platform, account, series, title,
 *   kind, status, ref, caption, source, verified (bool), note, and cover: an
 *   absolute local image path, or null for no cover.
 *
 * The file is the whole calendar: a table row whose id is gone from the file is
 * deleted (idsToPrune), unless --keep-missing. An empty file deletes nothing.
 *
 * Idempotent. Rows upsert on id. Each cover uploads once to the public Storage
 * bucket social-covers, keyed by the sha256 of its bytes, so the same image on
 * eight platforms is one object and a rerun uploads nothing new. A row the
 * database already marks posted stays posted with its ref, whatever the file
 * says (lib/social-calendar.ts mergeImported). Covers never go in public/.
 *
 * Env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the process, or from
 * .env.local in this repo, or from .env.local in the working directory.
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORMS, STATUSES, idsToPrune, isRowId, mergeImported } from '../lib/social-calendar.ts';

const BUCKET = 'social-covers';
const FIELDS = ['id', 'date', 'time_mt', 'platform', 'account', 'series', 'title', 'kind', 'status', 'ref', 'caption', 'source', 'note'];
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepMissing = args.includes('--keep-missing');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Usage: node scripts/social-calendar-import.mjs <path-to-calendar.json> [--dry-run] [--keep-missing]');
  process.exit(2);
}

function envFrom(path, key) {
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_]+)=(.*)$/.exec(line);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\[rn]$/, '') || null;
  }
  return null;
}
function env(...keys) {
  const files = [fileURLToPath(new URL('../.env.local', import.meta.url)), resolve(process.cwd(), '.env.local')];
  for (const k of keys) if (process.env[k]) return process.env[k];
  for (const f of files) for (const k of keys) {
    const v = envFrom(f, k);
    if (v) return v;
  }
  return null;
}

const text = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v));

function validate(raw, i) {
  const where = `row ${i + 1}${raw && raw.id ? ` (${raw.id})` : ''}`;
  if (!raw || typeof raw !== 'object') throw new Error(`${where}: not an object`);
  if (typeof raw.id !== 'string' || !isRowId(raw.id)) throw new Error(`${where}: id must be a slug of letters, digits, . _ : -`);
  if (!PLATFORMS.includes(raw.platform)) throw new Error(`${where}: platform "${raw.platform}" is not one of ${PLATFORMS.join(', ')}`);
  const status = raw.status ?? 'planned';
  if (!STATUSES.includes(status)) throw new Error(`${where}: status "${status}" is not one of ${STATUSES.join(', ')}`);
  const date = text(raw.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${where}: date "${date}" is not YYYY-MM-DD`);
  if (raw.verified !== undefined && raw.verified !== null && typeof raw.verified !== 'boolean') {
    throw new Error(`${where}: verified must be true or false`);
  }
  return { ...raw, date, status };
}

const parsed = JSON.parse(readFileSync(resolve(file), 'utf8').replace(/^﻿/, ''));
const list = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.posts;
if (!Array.isArray(list)) throw new Error('The file must be an array of rows, or { rows: [...] }.');
const rows = list.map(validate);
const dupes = rows.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) throw new Error(`Duplicate ids in the file: ${[...new Set(dupes)].join(', ')}`);

const url = env('SUPABASE_URL', 'supabase_url');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'supabase_service_role_key');
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set (process env or .env.local).');
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Covers: one upload per distinct file, keyed by content hash.
const byPath = new Map();
let uploaded = 0;
let reused = 0;
const missing = [];
async function coverUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!isAbsolute(path)) path = resolve(path);
  if (byPath.has(path)) return byPath.get(path);
  if (!existsSync(path)) {
    missing.push(path);
    byPath.set(path, null);
    return null;
  }
  const body = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const object = `${createHash('sha256').update(body).digest('hex').slice(0, 32)}${ext || '.jpg'}`;
  const publicUrl = sb.storage.from(BUCKET).getPublicUrl(object).data.publicUrl;
  if (!dryRun) {
    const { error } = await sb.storage.from(BUCKET).upload(object, body, {
      contentType: TYPES[ext] ?? 'application/octet-stream',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`Cover upload failed for ${path}: ${error.message}`);
    if (error) reused++;
    else uploaded++;
  }
  byPath.set(path, publicUrl);
  return publicUrl;
}

// What the database already holds, so a posted row is never walked back.
const existing = new Map();
for (let i = 0; i < rows.length; i += 200) {
  const ids = rows.slice(i, i + 200).map((r) => r.id);
  const { data, error } = await sb.from('social_posts').select('id,status,ref,cover_url').in('id', ids);
  if (error) throw new Error(`Could not read social_posts: ${error.message}`);
  for (const r of data ?? []) existing.set(r.id, r);
}

const now = new Date().toISOString();
const out = [];
let kept = 0;
for (const r of rows) {
  const record = { updated_at: now };
  for (const f of FIELDS) record[f] = text(r[f]);
  record.status = r.status;
  record.verified = r.verified === true;
  // A null cover means no cover. A cover path whose file is missing keeps
  // whatever cover the row already had rather than blanking it.
  const src = r.cover !== undefined ? text(r.cover) : text(r.cover_url);
  const url = await coverUrl(src);
  record.cover_url = url ?? (src ? existing.get(r.id)?.cover_url ?? null : null);
  const merged = mergeImported(record, existing.get(r.id));
  if (merged.status !== record.status) kept++;
  out.push(merged);
}

// Every id in the table, to find the rows that left the file.
const tableIds = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('social_posts').select('id').order('id').range(from, from + 999);
  if (error) throw new Error(`Could not list social_posts: ${error.message}`);
  tableIds.push(...(data ?? []).map((r) => r.id));
  if (!data || data.length < 1000) break;
}
const prune = keepMissing ? [] : idsToPrune(tableIds, out.map((r) => r.id));

if (!dryRun) {
  for (let i = 0; i < prune.length; i += 200) {
    const { error } = await sb.from('social_posts').delete().in('id', prune.slice(i, i + 200));
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }
  for (let i = 0; i < out.length; i += 200) {
    const { error } = await sb.from('social_posts').upsert(out.slice(i, i + 200), { onConflict: 'id' });
    if (error) throw new Error(`Upsert failed at row ${i + 1}: ${error.message}`);
  }
}

const isNew = out.filter((r) => !existing.has(r.id)).length;
console.log(`${dryRun ? 'DRY RUN, nothing written. ' : ''}${out.length} rows from ${resolve(file)}`);
console.log(`  new ${isNew}, updated ${out.length - isNew}, kept posted ${kept}, deleted ${prune.length}${keepMissing ? ' (--keep-missing)' : ''}`);
if (prune.length) console.log(`  ${dryRun ? 'would delete' : 'deleted'}: ${prune.slice(0, 12).join(', ')}${prune.length > 12 ? `, and ${prune.length - 12} more` : ''}`);
console.log(`  covers: ${byPath.size} distinct, uploaded ${uploaded}, already stored ${reused}, missing ${missing.length}`);
for (const m of missing) console.log(`  missing cover: ${m}`);

if (!dryRun) {
  const { count, error } = await sb.from('social_posts').select('id', { count: 'exact', head: true });
  if (error) throw new Error(`Read back failed: ${error.message}`);
  console.log(`  social_posts now holds ${count} rows`);
}
