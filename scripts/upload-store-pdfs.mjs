#!/usr/bin/env node
/**
 * Upload store PDFs to the Supabase `store-products` bucket.
 *
 * Usage:
 *   node scripts/upload-store-pdfs.mjs <source-dir>
 *
 * Expects PDFs in <source-dir> matching the `pdfFileName` values in
 * `data/products.ts`. Will create the bucket if it does not exist.
 *
 * Requires:  supabase_url, supabase_service_role_key in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Tiny inline .env loader so we have no extra deps.
function loadEnv(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (process.env[k] === undefined) process.env[k] = v.replace(/^"|"$/g, '');
  }
}
loadEnv('.env.local');

const SRC = process.argv[2] || resolve(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
const BUCKET = 'store-products';

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('Missing Supabase env. Need supabase_url + supabase_service_role_key in .env.local.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const KNOWN_FILES = [
  'MMS_AI-Ready_Business_Blueprint_FINAL.pdf',
  'MMS_AI-Native_Business_Playbook_FINAL.pdf',
  'MMS_Shopify_Store_with_Claude_Code_FINAL.pdf',
  'MMS_Claude_Code_Masterclass_FINAL.pdf',
  'MMS_AI_Sales_Machine_FINAL.pdf',
  'MMS_Brand_Studio_Playbook_FINAL.pdf',
  'MMS_GEO_AI_Commerce_Playbook_FINAL.pdf',
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" exists`);
    return;
  }
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error) {
    console.error(`Bucket create failed:`, error.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" created (private)`);
}

async function uploadOne(fileName) {
  const sourcePath = resolve(SRC, fileName);
  if (!existsSync(sourcePath)) return { fileName, status: 'missing' };

  const bytes = readFileSync(sourcePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, bytes, { upsert: true, contentType: 'application/pdf' });
  if (error) return { fileName, status: 'failed', error: error.message };
  return { fileName, status: 'uploaded', size: bytes.length };
}

async function main() {
  console.log(`Source dir: ${SRC}`);
  console.log(`Available there:`, readdirSync(SRC).filter((f) => f.startsWith('MMS_') && f.endsWith('.pdf')));
  console.log('');
  await ensureBucket();
  console.log('');

  const results = await Promise.all(KNOWN_FILES.map(uploadOne));
  const ok = results.filter((r) => r.status === 'uploaded');
  const missing = results.filter((r) => r.status === 'missing');
  const failed = results.filter((r) => r.status === 'failed');

  console.log('');
  console.log('=== Upload Summary ===');
  for (const r of ok) console.log(`  ok    ${r.fileName} (${Math.round(r.size / 1024)}KB)`);
  for (const r of missing) console.log(`  miss  ${r.fileName} (not in source dir)`);
  for (const r of failed) console.log(`  FAIL  ${r.fileName} ${r.error}`);
  console.log('');
  console.log(`${ok.length}/${KNOWN_FILES.length} uploaded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
