import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken } from './accounts';

/**
 * BRING THEIR OWN POSTING HISTORY HOME.
 *
 * A business that changes who posts for it loses its own record. The agency
 * has the calendar, the drafts, the numbers, and on the last day of the
 * contract all of that simply stops being available. What the business keeps
 * is whatever is still visible on the feed, which is not a record, it is a
 * shop window.
 *
 * So the moment a Page or an Instagram account is connected, everything it has
 * ever posted is pulled into their own Command Center: the words, the date,
 * the picture, the permalink, and the numbers the platform will give us. From
 * then on their history is theirs, whoever posts next.
 *
 * READ ONLY, ALWAYS. This never writes a post, never deletes one, never edits
 * one. It is an archive, and `client_archive_posts` is deliberately a table
 * the posting engine cannot read, so nothing imported here can ever be
 * republished by accident.
 *
 * Idempotent on the platform's own id, so importing twice imports nothing
 * twice, and a second run months later simply catches up.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export type ImportResult = { ok: true; added: number; seen: number; oldest: string | null } | { ok: false; error: string };

type ArchiveRow = {
  client_email: string;
  origin: string;
  /** "facebook:<post id>". The table's own unique key, which is what makes a second import free. */
  import_key: string;
  status: string;
  posted_at: string;
  body: string;
  networks: string[];
  url: string | null;
  image_url: string | null;
  stats: Record<string, number>;
};

async function writeRows(sb: SupabaseClient, rows: ArchiveRow[]): Promise<number> {
  if (!rows.length) return 0;
  // Which of these do we already hold? One query, not one per post. The unique
  // index on (client_email, import_key) is the real guard; this only keeps the
  // insert from being mostly conflicts.
  const { data: had } = await sb
    .from('client_archive_posts')
    .select('import_key')
    .eq('client_email', rows[0].client_email)
    .in('import_key', rows.map((r) => r.import_key));
  const seen = new Set((had ?? []).map((r) => String(r.import_key)));
  const fresh = rows.filter((r) => !seen.has(r.import_key));
  if (!fresh.length) return 0;
  const { error } = await sb.from('client_archive_posts').upsert(fresh, { onConflict: 'client_email,import_key', ignoreDuplicates: true });
  return error ? 0 : fresh.length;
}

/**
 * Every post on their Facebook Page, newest first, as far back as the Graph
 * will go. `published_posts` is the Page's own timeline: what the Page said,
 * not what other people said on it.
 */
export async function importFacebookHistory(sb: SupabaseClient, clientEmail: string, max = 400): Promise<ImportResult> {
  const acct = await accessToken(sb, clientEmail, 'facebook');
  if (!acct) return { ok: false, error: 'Facebook is not connected.' };
  const pageId = acct.row.external_id;
  if (!pageId) return { ok: false, error: 'That connection has no Page on it.' };

  const rows: ArchiveRow[] = [];
  let url: string | null = `${GRAPH}/${pageId}/published_posts?fields=id,message,created_time,permalink_url,full_picture,shares,reactions.summary(true),comments.summary(true)&limit=50&access_token=${encodeURIComponent(acct.token)}`;

  try {
    while (url && rows.length < max) {
      const res: Response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      const j = (await res.json().catch(() => ({}))) as {
        data?: Array<Record<string, unknown>>;
        paging?: { next?: string };
        error?: { message?: string };
      };
      if (!res.ok || j.error) return { ok: false, error: j.error?.message ?? `Facebook answered ${res.status}` };

      for (const p of j.data ?? []) {
        const body = String(p.message ?? '').trim();
        const at = String(p.created_time ?? '');
        if (!at) continue;
        rows.push({
          client_email: clientEmail.toLowerCase().trim(),
          origin: 'facebook',
          import_key: `facebook:${String(p.id)}`,
          status: 'published',
          posted_at: at,
          body: body || '(a photo with no words)',
          networks: ['facebook'],
          url: (p.permalink_url as string) ?? null,
          image_url: (p.full_picture as string) ?? null,
          stats: {
            likes: ((p.reactions as { summary?: { total_count?: number } } | undefined)?.summary?.total_count ?? 0) as number,
            comments: ((p.comments as { summary?: { total_count?: number } } | undefined)?.summary?.total_count ?? 0) as number,
            shares: ((p.shares as { count?: number } | undefined)?.count ?? 0) as number,
          },
        });
      }
      url = j.paging?.next ?? null;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Facebook did not answer.' };
  }

  const added = await writeRows(sb, rows);
  return { ok: true, added, seen: rows.length, oldest: rows.length ? rows[rows.length - 1].posted_at : null };
}

/** The same for Instagram, which lives on the Page's token. */
export async function importInstagramHistory(sb: SupabaseClient, clientEmail: string, max = 400): Promise<ImportResult> {
  const acct = await accessToken(sb, clientEmail, 'instagram');
  if (!acct) return { ok: false, error: 'Instagram is not connected.' };
  const igId = acct.row.external_id;
  if (!igId) return { ok: false, error: 'That connection has no account on it.' };

  const rows: ArchiveRow[] = [];
  let url: string | null = `${GRAPH}/${igId}/media?fields=id,caption,timestamp,permalink,media_url,thumbnail_url,like_count,comments_count&limit=50&access_token=${encodeURIComponent(acct.token)}`;

  try {
    while (url && rows.length < max) {
      const res: Response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      const j = (await res.json().catch(() => ({}))) as { data?: Array<Record<string, unknown>>; paging?: { next?: string }; error?: { message?: string } };
      if (!res.ok || j.error) return { ok: false, error: j.error?.message ?? `Instagram answered ${res.status}` };

      for (const m of j.data ?? []) {
        const at = String(m.timestamp ?? '');
        if (!at) continue;
        rows.push({
          client_email: clientEmail.toLowerCase().trim(),
          origin: 'instagram',
          import_key: `instagram:${String(m.id)}`,
          status: 'published',
          posted_at: at,
          body: String(m.caption ?? '').trim() || '(a photo with no caption)',
          networks: ['instagram'],
          url: (m.permalink as string) ?? null,
          image_url: ((m.media_url as string) ?? (m.thumbnail_url as string)) ?? null,
          stats: { likes: (m.like_count as number) ?? 0, comments: (m.comments_count as number) ?? 0 },
        });
      }
      url = j.paging?.next ?? null;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Instagram did not answer.' };
  }

  const added = await writeRows(sb, rows);
  return { ok: true, added, seen: rows.length, oldest: rows.length ? rows[rows.length - 1].posted_at : null };
}
