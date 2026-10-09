import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Where a welcome intake's files live, and how the form finds them again.
 *
 * Why the browser uploads straight to storage (2026-10-08). Every intake photo
 * used to go through /api/intake/upload, a Vercel function, and Vercel refuses
 * any request body over 4.5 MB with `413 FUNCTION_PAYLOAD_TOO_LARGE` before our
 * code runs. A phone photo is 3 to 10 MB. So Tami Ellis (Blue Mountain PT) could
 * not add a single photo, the form showed nothing, and no log line was written
 * because the request never reached a function. Now the server signs a one-time
 * upload URL for the client's own folder and the phone sends the file directly
 * to Supabase Storage, which takes up to the bucket's 50 MB limit.
 *
 * Every file is filed on client_files the moment it lands, not on submit, so a
 * client who uploads and walks away has still handed us their photos.
 */

export const INTAKE_BUCKET = 'client-intake';

/** The bucket's own limit is 50 MB; the form compresses photos well under it. */
export const INTAKE_MAX_BYTES = 50 * 1024 * 1024;

/** A ceiling per client, so a leaked link cannot fill the bucket. */
export const INTAKE_MAX_FILES = 300;

/** client_files.kind values an intake may write (the table's check constraint allows all three). */
export const INTAKE_FILE_KINDS = ['photo', 'logo', 'doc'] as const;
export type IntakeFileKind = (typeof INTAKE_FILE_KINDS)[number];

/**
 * Mirrors storage.buckets.allowed_mime_types for client-intake. A type outside
 * it is sent as application/octet-stream, which the bucket also allows, so an
 * odd file (a .pages document, a Word file from an old phone) still lands.
 */
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

export function storableType(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase().trim();
  return ALLOWED_TYPES.has(t) ? t : 'application/octet-stream';
}

/** One folder per client, keyed by email so it never collides across clients. */
export function intakeFolder(email: string): string {
  const slug = email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'client';
  return `intake/client/${slug}`;
}

export function intakeObjectPath(email: string, fileName: string): string {
  const rawExt = (fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = rawExt.slice(0, 5) || 'bin';
  const rand = Math.random().toString(36).slice(2, 10);
  return `${intakeFolder(email)}/${Date.now()}-${rand}.${ext}`;
}

export function intakePublicUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(INTAKE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** True when a public URL points inside this client's intake folder. */
export function isClientIntakeUrl(url: string, email: string): boolean {
  return url.includes(`/${INTAKE_BUCKET}/${intakeFolder(email)}/`);
}

export type IntakeFileRow = { id: string; label: string; url: string; kind: string; created_at: string };

/** The files this client has added through the welcome form, oldest first. */
export async function listIntakeFiles(supabase: SupabaseClient, email: string): Promise<IntakeFileRow[]> {
  const { data } = await supabase
    .from('client_files')
    .select('id, label, url, kind, created_at')
    .eq('client_email', email)
    .like('url', `%/${INTAKE_BUCKET}/${intakeFolder(email)}/%`)
    .order('created_at', { ascending: true })
    .limit(INTAKE_MAX_FILES);
  return (data ?? []) as IntakeFileRow[];
}

/** Every answer is a short string. Anything else is dropped, never stored. */
export function cleanAnswers(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 120) break;
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(k)) continue;
    if (typeof v !== 'string') continue;
    out[k] = v.slice(0, 8000);
    n++;
  }
  return out;
}
