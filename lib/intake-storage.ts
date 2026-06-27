/**
 * Storage helper for the client brand-intake form. Logos, product photos, and
 * price lists land in the public `client-intake` bucket so the team can view
 * and reuse them directly in the build. Files arrive one-at-a-time from the
 * browser (already client-side compressed) to stay well under request limits.
 */
import { getSupabase } from './supabase';

const BUCKET = 'client-intake';

export async function uploadIntakeFile(
  file: File,
  prefix: string
): Promise<{ url: string; path: string } | null> {
  const client = getSupabase();
  if (!client) return null;

  const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = rawExt.slice(0, 5) || 'bin';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${prefix}/${Date.now()}-${rand}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    console.error('Intake upload error:', error);
    return null;
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
