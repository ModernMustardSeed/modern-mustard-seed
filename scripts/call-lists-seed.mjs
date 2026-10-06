/**
 * LOAD A CALL LIST INTO /admin/call-lists.
 *
 *   node --env-file=.env.local scripts/call-lists-seed.mjs data/call-lists-2026-10-05.json
 *
 * The file holds { lists: [{ slug, title, rows: [{ position, grp, business_name,
 * category, town, phone, opened, finding, website, maps_url, place_id }] }] },
 * written by the New Doors call-sheet builder. Rows already on a list (same
 * list slug and phone) are left alone, so re-running never wipes an outcome
 * or a note somebody marked while dialing.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node --env-file=.env.local scripts/call-lists-seed.mjs <data/call-lists-*.json>');
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}

const { lists } = JSON.parse(readFileSync(file, 'utf8'));
for (const list of lists) {
  const rows = list.rows.map((r) => ({ ...r, list_slug: list.slug, list_title: list.title }));
  const res = await fetch(`${url}/rest/v1/call_list_rows?on_conflict=list_slug,phone`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`${list.slug}: ${res.status} ${body.slice(0, 300)}`);
    process.exitCode = 1;
    continue;
  }
  const added = JSON.parse(body).length;
  console.log(`${list.slug}: ${added} added, ${rows.length - added} already there`);
}
