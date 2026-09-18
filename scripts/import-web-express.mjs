#!/usr/bin/env node
/**
 * Carry a client's Web Express Marketing App data into their Command Center.
 *
 * Reads the export folder written by hand from the Marketing App (contacts-raw.txt,
 * posts-published.md, posts-scheduled.md) and prints one SQL file that inserts the
 * contact book and the post archive. Every row carries an import key, so running it
 * twice changes nothing.
 *
 *   node scripts/import-web-express.mjs <export-dir> <client-email> > out.sql
 *   supabase db query --linked -f out.sql
 *
 * Contacts keep the name, phone and email exactly as Web Express held them. Only the
 * tags are tidied, because Web Express let the same tag be typed four ways and a filter
 * that splits "Supplier", "supplier" and "Suppleir" is no filter. The tag as typed is
 * kept in the notes.
 */
import fs from 'node:fs';
import path from 'node:path';

const [dir, clientEmail] = process.argv.slice(2);
if (!dir || !clientEmail) {
  console.error('usage: node scripts/import-web-express.mjs <export-dir> <client-email>');
  process.exit(1);
}

const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs) => (xs.length ? `array[${xs.map(q).join(',')}]::text[]` : `'{}'::text[]`);
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const isoDate = (s) => {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(s.trim());
  if (!m) return null;
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
};

/** Web Express tags as typed, mapped to one spelling each. */
const tagsFor = (raw) => {
  const t = raw.trim();
  if (!t) return [];
  if (t === 'BNISubcontractor') return ['BNI', 'Subcontractor'];
  if (/^supp(l|le)i?e?r$/i.test(t) || /^suppleir$/i.test(t)) return ['Supplier'];
  const realtor = /^Real(i)?tors?-(.+)$/i.exec(t);
  if (realtor) return ['Realtor', realtor[2]];
  if (/^WF Chamber/i.test(t)) return ['Whitefish Chamber'];
  if (/^Kalispell Chamber/i.test(t)) return ['Kalispell Chamber'];
  return [t];
};

// ── Contacts ────────────────────────────────────────────────────────────────
const lines = fs.readFileSync(path.join(dir, 'contacts-raw.txt'), 'utf8').split(/\r?\n/).filter((l) => l.trim());
const seen = new Set();
const contacts = lines.map((line) => {
  const [name, phone, email, tag, source, , created, company] = line.split('~').map((s) => (s ?? '').trim());
  const key = `wx:${name.toLowerCase()}|${phone.replace(/\D/g, '')}|${email.toLowerCase()}`;
  if (seen.has(key)) throw new Error(`duplicate import key ${key}`);
  seen.add(key);
  const tags = tagsFor(tag);
  const typed = tag && tags.join(', ') !== tag ? `Web Express tag: ${tag}` : null;
  return { name, phone, email, company, tags, source, firstSeen: isoDate(created), notes: typed, key };
});

// ── Posts ───────────────────────────────────────────────────────────────────
/** Reads "### 2026-09-18, 9:00 am" or "## 2026-09-19, 10:00 am" sections. */
const postsFrom = (file, status) => {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const out = [];
  const re = /^#{2,3} (\d{4}-\d{2}-\d{2}), (\d{1,2}):(\d{2}) (am|pm)\s*\n+([\s\S]*?)(?=\n#{2,3} |\s*$)/gm;
  let m;
  while ((m = re.exec(text))) {
    let h = Number(m[2]) % 12;
    if (m[4] === 'pm') h += 12;
    // Mountain Daylight Time, which Web Express shows its times in through October.
    const postedAt = `${m[1]}T${String(h).padStart(2, '0')}:${m[3]}:00-06:00`;
    out.push({ status, postedAt, body: m[5].trim(), date: m[1] });
  }
  return out;
};

const published = postsFrom('posts-published.md', 'published');
const scheduled = postsFrom('posts-scheduled.md', 'scheduled');

// What Web Express reported for each published post, read off the Social AI cards.
const STATS = {
  '2026-09-17': { likes: 3, comments: 0, reached: 18 },
  '2026-09-16': { likes: 4, comments: 0, reached: 26 },
  '2026-09-15': { likes: 4, comments: 0, reached: 20 },
  '2026-09-11': { likes: 5, comments: 0, reached: 118, plays: 147 },
  '2026-09-10': { likes: 4, comments: 0, reached: 34 },
  '2026-09-09': { likes: 3, comments: 0, reached: 53 },
  '2026-09-07': { likes: 0, comments: 0, reached: 23 },
  '2026-09-06': { likes: 1, comments: 0, reached: 18 },
};

const failed = {
  status: 'failed',
  postedAt: '2026-08-25T09:43:00-06:00',
  date: '2026-08-25',
  body: published.find((p) => p.date === '2026-09-18')?.body ?? '',
  networks: ['x'],
  error: 'X refused the post: credits depleted (402 Payment Required). X charges for posting through its API, and the credits Web Express posts with had run out.',
};

const posts = [
  ...published.map((p) => ({ ...p, networks: [], stats: STATS[p.date] ?? {} })),
  ...scheduled.map((p) => ({ ...p, networks: [], stats: {} })),
  { ...failed, stats: {} },
];

// ── SQL ─────────────────────────────────────────────────────────────────────
const out = [];
out.push('begin;');
for (const c of contacts) {
  out.push(
    `insert into public.client_contacts (client_email, name, phone, email, company, tags, source, origin, first_seen, notes, import_key) values (${[
      q(clientEmail), q(c.name), q(c.phone), q(c.email), q(c.company), arr(c.tags), q(c.source), q('web-express'), q(c.firstSeen), q(c.notes), q(c.key),
    ].join(', ')}) on conflict (client_email, import_key) where import_key is not null do nothing;`,
  );
}
for (const p of posts) {
  const key = `wx:${p.status}:${p.postedAt}`;
  out.push(
    `insert into public.client_archive_posts (client_email, origin, status, posted_at, body, networks, stats, error, import_key) values (${[
      q(clientEmail), q('web-express'), q(p.status), q(p.postedAt), q(p.body), arr(p.networks), `${q(JSON.stringify(p.stats))}::jsonb`, q(p.error ?? null), q(key),
    ].join(', ')}) on conflict (client_email, import_key) do nothing;`,
  );
}
out.push('commit;');
out.push(`select (select count(*) from public.client_contacts where client_email = ${q(clientEmail)} and origin = 'web-express') as contacts, (select count(*) from public.client_archive_posts where client_email = ${q(clientEmail)} and origin = 'web-express') as posts;`);
process.stdout.write(out.join('\n') + '\n');
console.error(`contacts ${contacts.length}, posts ${posts.length} (published ${published.length}, scheduled ${scheduled.length}, failed 1)`);
